class StopwatchManager {
        constructor(app) {
          this.app = app;
          this.startTime = null;
          this.elapsedBeforePause = 0;
          this.elapsedTime = 0;
          this.tickIntervalId = null;
          this.isRunning = false;
          this.pendingMeta = null;
          this.lastRenderedTime = null;
        }
        formatElapsed(ms) {
          const h = Math.floor(ms / 3600000);
          const m = Math.floor((ms % 3600000) / 60000);
          const s = Math.floor((ms % 60000) / 1000);
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        }

        getElapsedNow() {
          if (!this.startTime) return this.elapsedBeforePause;
          return this.elapsedBeforePause + Math.max(0, Date.now() - this.startTime);
        }

        renderTime() {
          const elapsed = this.getElapsedNow();
          this.elapsedTime = elapsed;
          const newFormatted = this.formatElapsed(elapsed);
          if (this.lastRenderedTime !== newFormatted) {
            this.app.elements["stopwatch"].textContent = newFormatted;
            this.lastRenderedTime = newFormatted;
          }
        }

        startTicking() {
          if (this.tickIntervalId) clearInterval(this.tickIntervalId);
          this.renderTime();
          this.tickIntervalId = setInterval(() => this.renderTime(), 1000);
        }

        stopTicking() {
          if (!this.tickIntervalId) return;
          clearInterval(this.tickIntervalId);
          this.tickIntervalId = null;
        }

        getTaskInputValue() {
          return (this.app.elements["task-input"]?.value || "").trim();
        }

        promptForCategory() {
          const categoryInput = window.prompt(
            "Choose task category: Productive Work / Study / Physical Training / Time Waste / Sleep / Miscellaneous",
            "Productive Work",
          );
          if (categoryInput === null) return null;
          return this.app.resolveCategory(categoryInput.trim()) || "Productive Work";
        }

        promptForSubcategory(category) {
          const subList = CATEGORY_DEFINITIONS[category] || ["General"];
          const defaultSubcategory = subList[0] || "General";
          const subcategoryInput = window.prompt(
            `Choose subcategory for ${category} (${subList.join(" / ")})`,
            defaultSubcategory,
          );
          if (subcategoryInput === null) return null;
          return (subcategoryInput.trim() || defaultSubcategory).slice(0, 60);
        }

        collectEntryMetadata(taskName, forceCategory = null) {
          const description = (
            this.getTaskInputValue() ||
            taskName ||
            ""
          ).slice(0, 120);

          const category = forceCategory
            ? this.app.resolveCategory(forceCategory) || "Productive Work"
            : this.promptForCategory();
          if (!category) return null;

          const subcategory = forceCategory
            ? (CATEGORY_DEFINITIONS[category]?.[0] || "General")
            : this.promptForSubcategory(category);
          if (!subcategory) return null;

          return { category, subcategory, description };
        }
        start(taskName = null, meta = null) {
          if (this.isRunning)
            return alert("A task is already running. Stop it first.");
          const rawName = (taskName || this.getTaskInputValue() || "").trim();
          if (!meta && !rawName) {
            alert("Task name cannot be empty.");
            return;
          }
          const name = rawName;
          const resolvedMeta = meta || this.collectEntryMetadata(name, null);
          if (!resolvedMeta) return;
          this.startTime = Date.now();
          this.isRunning = true;
          this.elapsedBeforePause = 0;
          this.elapsedTime = 0;
          this.app.state.activeTask = {
            name: name || resolvedMeta.subcategory,
            startTime: this.startTime,
            ...resolvedMeta,
          };
          this.app.saveToStorage(
            CONFIG.STORAGE_KEYS.ACTIVE_TASK,
            this.app.state.activeTask,
          );
          this.app.elements["start-btn"].disabled = true;
          this.app.elements["stop-btn"].disabled = false;
          this.app.elements["task-input"].disabled = true;
          this.app.elements["active-task-name"].textContent =
            `${this.app.state.activeTask.category} • ${this.app.state.activeTask.subcategory}`;
          this.app.elements["active-task-start"].textContent =
            this.app.formatTimestamp(this.startTime);
          this.app.elements["active-task-indicator"].style.display = "block";
          // Fire-and-forget to avoid blocking UI on network
          if (this.app.cloudManager?.setTimerState) {
            setTimeout(() => {
              this.app.cloudManager.setTimerState({
                status: "running",
                startTime: this.startTime,
                elapsedBeforePause: 0,
                activeTask: this.app.state.activeTask,
              }).catch(e => console.warn("Timer start cloud sync delayed", e));
            }, 0);
          }
          this.startTicking();
        }
  startSleep() {
    this.start("Sleep", {
      category: "Sleep",
      subcategory: "Night Sleep",
      description: "Sleep Session",
    });
    // SE2: Automatically finalize the day and generate next schedule
    if (this.app.trainerEngine?.autoFinalizeAtSleep) {
      this.app.trainerEngine.autoFinalizeAtSleep();
    }
  }
        stop() {
          if (!this.isRunning) return;
          this.stopTicking();
          const totalElapsed = this.getElapsedNow();
          this.elapsedBeforePause = totalElapsed;
          this.isRunning = false;
          // Guard against system clock jumps (NTP, sleep/wake) — endTime must be >= startTime
          const endTime = Math.max(this.startTime + 1000, Date.now());
          // Use crypto.randomUUID when available to eliminate same-millisecond ID collisions
          const taskId = (typeof crypto !== "undefined" && crypto.randomUUID)
            ? crypto.randomUUID()
            : `${endTime}-${Math.random().toString(36).slice(2, 10)}`;
          const entry = this.app.normalizeTask({
            id: taskId,
            ...this.app.state.activeTask,
            startTime: this.startTime,
            endTime,
            duration: Math.max(
              1,
              Math.round(totalElapsed / 60000),
            ),
            date: this.app.getDateString(new Date(this.startTime)),
          });
          this.app.taskManager.addTask(entry);
          
          // Execute network update asynchronously, unblocking UI thread immediately
          if (this.app.cloudManager?.setTimerState) {
            setTimeout(() => {
                this.app.cloudManager.setTimerState({
                  status: "paused",
                  startTime: null,
                  elapsedBeforePause: 0,
                  activeTask: null,
                }).catch(e => console.warn("Timer stop cloud sync delayed", e));
            }, 0);
          }
          this.reset();
        }
        reset() {
          this.isRunning = false;
          this.startTime = null;
          this.elapsedBeforePause = 0;
          this.elapsedTime = 0;
          this.stopTicking();
          this.app.state.activeTask = null;
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK, null);
          this.app.elements["stopwatch"].textContent = "00:00:00";
          this.app.elements["start-btn"].disabled = false;
          this.app.elements["stop-btn"].disabled = true;
          this.app.elements["task-input"].disabled = false;
          this.app.elements["active-task-indicator"].style.display = "none";
          this.app.elements["task-input"].value = "";
        }
        resumeActiveTask(activeTask) {
          if (!activeTask?.startTime || this.isRunning) return;
          this.startTime = Number(activeTask.startTime);
          this.elapsedBeforePause = Number(activeTask.elapsedBeforePause || 0);
          this.isRunning = true;
          this.app.state.activeTask = activeTask;
          this.app.elements["start-btn"].disabled = true;
          this.app.elements["stop-btn"].disabled = false;
          this.app.elements["task-input"].disabled = true;
          this.app.elements["active-task-name"].textContent =
            `${activeTask.category || "Productive Work"} • ${activeTask.subcategory || "General"}`;
          this.app.elements["active-task-start"].textContent =
            this.app.formatTimestamp(activeTask.startTime);
          this.app.elements["active-task-indicator"].style.display = "block";
          this.startTicking();
        }

        resumeRemoteMission(activeTask) {
          this.resumeActiveTask(activeTask);
          this.app.state.activeTask = activeTask;
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK, activeTask);
        }

        stopFromRemote() {
          if (!this.isRunning) return;
          this.reset();
        }

        restoreFromCloud(timerState) {
          if (this.isRunning || !timerState || timerState.status !== "running")
            return;
          const activeTask = timerState.activeTask;
          const startTime = Number(timerState.startTime);
          if (!activeTask || !startTime) return;
          
          // Check if we are already perfectly synced
          if (this.isRunning && this.startTime === startTime) return;

          this.resumeActiveTask({
            ...activeTask,
            startTime,
            elapsedBeforePause: Number(timerState.elapsedBeforePause || 0),
          });
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK, {
            ...activeTask,
            startTime,
          });
        }
      }
