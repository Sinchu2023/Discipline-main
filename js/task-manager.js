class TaskManager {
        constructor(app) {
          this.app = app;
        }
        initialize() {
    try {
      console.group('TaskManager Initialization');

          this.updateStats();
          this.renderTasks();
          this.renderFavorites();
    } catch (error) {
      console.error('[TaskManager] Initialization failed:', error);
    } finally {
      console.groupEnd();
    }
        }
        mergeTasks(incoming, fromCloud = false) {
          const map = new Map(this.app.state.tasks.map((t) => [t.id, t]));
          incoming.forEach((t) => map.set(t.id, this.app.normalizeTask(t)));
          this.app.state.tasks = [...map.values()].sort(
            (a, b) => a.startTime - b.startTime,
          );
          // Skip re-upload if data came from cloud — prevents write loop
          if (!fromCloud) {
            incoming.forEach((t) => this.app.cloudManager?.syncTaskUpsert?.(t));
          }
          this.app.saveToStorage(
            CONFIG.STORAGE_KEYS.TASKS,
            this.app.state.tasks,
          );
          this.refreshViews();
        }

        refreshViews(updateStreakWithActivity = false) {
          this.updateStats();
          this.renderTasks();
          this.app.graphManager.updateCharts();
          this.app.updateStreak(updateStreakWithActivity);
        }

        applyRemoteTaskChanges(changes) {
          let changed = false;
          const byId = new Map(this.app.state.tasks.map((t) => [String(t.id), t]));
          changes.forEach((change) => {
            const id = String(change.id);
            if (change.type === "removed") {
              if (byId.delete(id)) changed = true;
              return;
            }
            const normalized = this.app.normalizeTask({ id, ...(change.data || {}) });
            const existing = byId.get(id);
            if (
              existing &&
              Number(existing.updatedAt || 0) >= Number(normalized.updatedAt || 0) &&
              Number(existing.endTime || 0) === Number(normalized.endTime || 0) &&
              Number(existing.duration || 0) === Number(normalized.duration || 0)
            )
              return;
            byId.set(id, normalized);
            changed = true;
          });
          if (!changed) return;
          this.app.state.tasks = [...byId.values()].sort((a, b) => a.startTime - b.startTime);
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.app.state.tasks);
          this.refreshViews();
        }

        addTask(task) {
          this.app.state.tasks.push(this.app.normalizeTask(task));
          this.app.saveToStorage(
            CONFIG.STORAGE_KEYS.TASKS,
            this.app.state.tasks,
          );
          this.app.cloudManager?.syncTaskUpsert?.(task);
          this.app.syncManager.queue({
            type: "upsert",
            entry: task,
            ts: Date.now(),
          });
          this.app.syncManager.flushQueue();
          this.refreshViews(true);
        }
        deleteTask(taskId) {
          this.app.state.tasks = this.app.state.tasks.filter(
            (task) => task.id !== taskId,
          );
          this.app.saveToStorage(
            CONFIG.STORAGE_KEYS.TASKS,
            this.app.state.tasks,
          );
          this.app.cloudManager?.syncTaskDelete?.(taskId);
          this.app.syncManager.queue({
            type: "delete",
            id: taskId,
            ts: Date.now(),
          });
          this.refreshViews();
        }
        updateStats() {
          const today = this.app.getDateString();
          const todayTasks = this.app.state.tasks.filter(
            (task) => task.date === today,
          );
          const productiveTime = todayTasks
            .filter((task) => this.app.isProductiveCategory(task.category))
            .reduce((t, task) => t + task.duration, 0);
          const sleepTime = todayTasks
            .filter((task) => task.category === "Sleep")
            .reduce((t, task) => t + task.duration, 0);
          const totalTime = todayTasks.reduce(
            (t, task) => t + task.duration,
            0,
          );
          const pEl = this.app.elements["productive-time"];
          if (pEl) pEl.textContent = this.app.formatDuration(productiveTime);
          
          const sEl = this.app.elements["sleep-time"];
          if (sEl) sEl.textContent = this.app.formatDuration(sleepTime);
          
          const tEl = this.app.elements["total-time"];
          if (tEl) tEl.textContent = this.app.formatDuration(totalTime);

          if (this.app.shadowEngine) this.app.shadowEngine.refresh();
        }
        renderTasks() {
          const today = this.app.getDateString();
          const tasks = this.app.state.tasks
            .filter((task) => task.date === today)
            .sort((a, b) => b.startTime - a.startTime);
            
          const fingerprint = tasks.map(t => `${t.id}-${t.updatedAt || t.endTime}`).join("|");
          if (this.lastTasksFingerprint === fingerprint) return;
          this.lastTasksFingerprint = fingerprint;

          const c = this.app.elements["tasks-list"];
          c.innerHTML = "";
          if (!tasks.length) {
            c.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-secondary);"><i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem;"></i><p>No tasks recorded today</p><p style="font-size: 0.9rem;">Start tracking your first task</p></div>`;
            return;
          }
          tasks.forEach((task) => {
            const el = document.createElement("div");
            const isSleep = task.category === "Sleep";
            el.className = `task-card ${isSleep ? "sleep" : "productive"}`;
            el.innerHTML = `<div class="task-header"><div class="task-name">${isSleep ? "💤" : "⚡"} ${task.category} • ${task.subcategory}</div><div class="task-duration">${this.app.formatDuration(task.duration)}</div></div><div class="task-time">${this.app.formatTimestamp(task.startTime)} - ${this.app.formatTimestamp(task.endTime)}</div><div class="task-description">${task.description || ""}</div><div class="task-actions"><button class="btn edit-task-btn" data-id="${task.id}"><i class="fas fa-pen"></i> Edit</button><button class="btn delete-task-btn" data-id="${task.id}"><i class="fas fa-trash"></i> Delete</button></div>`;
            c.appendChild(el);
          });
          document
            .querySelectorAll(".delete-task-btn")
            .forEach((btn) =>
              btn.addEventListener("click", (e) =>
                this.deleteTask(e.currentTarget.getAttribute("data-id")),
              ),
            );
          document
            .querySelectorAll(".edit-task-btn")
            .forEach((btn) =>
              btn.addEventListener("click", (e) =>
                this.editTask(e.currentTarget.getAttribute("data-id")),
              ),
            );
        }

        editTask(taskId) {
          const task = this.app.state.tasks.find((t) => t.id === taskId);
          if (!task) return;

          this.editingTaskId = taskId;
          
          const toLocalISO = (ts) => {
            const d = new Date(ts);
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().slice(0, 16);
          };

          const modal = document.getElementById("task-editor-modal");
          document.getElementById("edit-task-description").value = task.description || "";
          document.getElementById("edit-task-category").value = task.category || "Miscellaneous";
          document.getElementById("edit-task-subcategory").value = task.subcategory || "";
          document.getElementById("edit-task-start").value = toLocalISO(task.startTime);
          document.getElementById("edit-task-end").value = toLocalISO(task.endTime);

          modal.style.display = "flex";
        }

        saveTaskEdit() {
          if (!this.editingTaskId) return;
          const task = this.app.state.tasks.find((t) => t.id === this.editingTaskId);
          if (!task) return;

          const desc = document.getElementById("edit-task-description").value.trim();
          const cat = document.getElementById("edit-task-category").value;
          const sub = document.getElementById("edit-task-subcategory").value.trim();
          const startVal = document.getElementById("edit-task-start").value;
          const endVal = document.getElementById("edit-task-end").value;

          if (!startVal || !endVal) return alert("Please provide both start and end times.");
          
          const newStart = new Date(startVal).getTime();
          const newEnd = new Date(endVal).getTime();

          if (isNaN(newStart) || isNaN(newEnd) || newEnd <= newStart) {
            return alert("Invalid time range provided.");
          }

          // Update task properties
          task.description = desc;
          task.category = cat;
          task.subcategory = sub || "General";
          task.startTime = newStart;
          task.endTime = newEnd;
          task.updatedAt = Date.now();
          
          // Re-normalize to ensure duration, category consistency, and classifier fields are updated
          const normalized = this.app.normalizeTask(task);
          Object.assign(task, normalized);

          this.app.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.app.state.tasks);
          this.app.cloudManager?.syncTaskUpsert?.(task);
          this.app.syncManager.queue({ type: "upsert", entry: task, ts: Date.now() });
          this.app.syncManager.flushQueue();

          document.getElementById("task-editor-modal").style.display = "none";
          this.editingTaskId = null;
          this.refreshViews();
        }
        renderFavorites() {
          const container = this.app.elements["favorites-grid"];
          
          const fingerprint = JSON.stringify(this.app.state.favorites);
          if (this.lastFavFingerprint === fingerprint) return;
          this.lastFavFingerprint = fingerprint;

          container.innerHTML = "";
          if (!this.app.state.favorites.length) {
            container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);"><i class="far fa-star" style="font-size: 2rem; margin-bottom: 0.5rem;"></i><p>No favorites yet</p><p style="font-size: 0.9rem;">Add tasks to favorites for quick start</p></div>`;
            return;
          }
          this.app.state.favorites.forEach((f, idx) => {
            const fav =
              typeof f === "string"
                ? {
                    label: f,
                    category: "Productive Work",
                    subcategory: "Execution",
                  }
                : f;
            const el = document.createElement("div");
            el.className = "favorite-card";
            el.innerHTML = `<div class="favorite-name">${fav.label}</div><div class="favorite-actions"><button class="btn start-favorite-btn" data-index="${idx}"><i class="fas fa-play"></i></button><button class="btn remove-favorite-btn" data-index="${idx}"><i class="fas fa-times"></i></button></div>`;
            container.appendChild(el);
          });
          document.querySelectorAll(".start-favorite-btn").forEach((btn) =>
            btn.addEventListener("click", (e) => {
              const fav =
                this.app.state.favorites[
                  parseInt(e.currentTarget.getAttribute("data-index"), 10)
                ];
              const f =
                typeof fav === "string"
                  ? {
                      label: fav,
                      category: "Productive Work",
                      subcategory: "Execution",
                    }
                  : fav;
              this.app.stopwatch.start(f.label, {
                category: f.category,
                subcategory: f.subcategory,
                description: f.label,
              });
            }),
          );
          document
            .querySelectorAll(".remove-favorite-btn")
            .forEach((btn) =>
              btn.addEventListener("click", (e) =>
                this.removeFavorite(
                  parseInt(e.currentTarget.getAttribute("data-index"), 10),
                ),
              ),
            );
        }
        addFavorite() {
          const label = this.app.elements["task-input"].value.trim();
          if (!label)
            return alert("Please enter a task name to add to favorites");
          const category = this.app.resolveCategory(
            prompt("Favorite category", "Productive Work"),
          );
          const subcategory =
            prompt(
              "Favorite subcategory",
              CATEGORY_DEFINITIONS[category]?.[0] || "General",
            ) || "General";
          const fav = { label, category, subcategory };
          this.app.state.favorites.push(fav);
          this.app.saveToStorage(
            CONFIG.STORAGE_KEYS.FAVORITES,
            this.app.state.favorites,
          );
          this.renderFavorites();
        }
        removeFavorite(index) {
          this.app.state.favorites.splice(index, 1);
          this.app.saveToStorage(
            CONFIG.STORAGE_KEYS.FAVORITES,
            this.app.state.favorites,
          );
          this.renderFavorites();
        }
      }
