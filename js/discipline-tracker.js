class DisciplineTracker {
        constructor() {
          this.saveTimers = {};
          this.state = {
            tasks: (this.loadFromStorage(CONFIG.STORAGE_KEYS.TASKS) || []).map(
              (t) => this.normalizeTask(t),
            ),
            favorites:
              this.loadFromStorage(CONFIG.STORAGE_KEYS.FAVORITES) || [],
            streak:
              parseInt(this.loadFromStorage(CONFIG.STORAGE_KEYS.STREAK)) || 0,
            lastActivityDate: this.loadFromStorage(
              CONFIG.STORAGE_KEYS.LAST_ACTIVITY,
            ),
            activeTask: this.loadFromStorage(CONFIG.STORAGE_KEYS.ACTIVE_TASK),
            charts: { productivity: null, sleep: null },
          };
          this.elements = this.initializeElements();
          this.syncManager = new SyncManager(this);
          this.cloudManager = new FirebaseCloudManager(this);
          this.stopwatch = new StopwatchManager(this);
          this.taskManager = new TaskManager(this);
          this.uiManager = new UIManager(this);
          this.shadowEngine = new ShadowEngine(this);
          this.trainerEngine = new TrainerEngine(this);
          this.graphManager = new GraphManager(this);
          this.eventManager = new EventManager(this);
          this.migrateSchema();
        }
        initializeElements() {
          const elements = {};
          [
            "stopwatch",
            "task-input",
            "start-btn",
            "stop-btn",
            "sleep-btn",
            "add-favorite",
            "active-task-indicator",
            "active-task-name",
            "active-task-start",
            "favorites-grid",
            "tasks-list",
            "productive-time",
            "sleep-time",
            "total-time",
            "streak-display",
            "current-date",
            "current-time",
            "motivation-line",
            "prod-range",
            "prod-filter",
            "prod-filter-total",
            "graph-productivity-total",
            "graph-total-distraction",
            "graph-logged-distraction",
            "sleep-range",
            "productivity-chart",
            "sleep-chart",
            "streak-popup",
            "streak-count",
            "streak-message",
            "close-streak",
            "view-report",
            "export-data",
            "import-data",
            "import-file",
            "report-modal",
            "report-content",
            "close-modal",
            "print-report",
            "close-report",
            "open-trainer",
            "trainer-modal",
            "ai-roadmap-topic",
            "gemini-api-key",
            "generate-roadmap-btn",
            "ai-roadmap-status",
            "trainer-overview",
            "trainer-content",
            "close-trainer",
            "close-trainer-modal",
            "refresh-trainer",
            "next-day-btn",
            "shadow-current-card",
            "shadow-standard-card",
            "shadow-current-minutes",
            "shadow-percent",
            "shadow-gap",
            "shadow-status",
            "shadow-progress-fill",
            "shadow-average",
            "shadow-rank",
            "shadow-badge",
            "shadow-duel",
            "shadow-note",
            "shadow-weekly-average",
            "shadow-momentum",
            "shadow-weekly-gap",
            "shadow-target",
            "shadow-pressure",
            "shadow-score",
            "shadow-needed-tie",
            "shadow-needed-lead",
            "shadow-defense-target",
            "shadow-verdict",
            "shadow-trend",
            "shadow-lead-margin",
            "shadow-duel-you-fill",
            "shadow-duel-shadow-fill",
            "shadow-penalty",
            "shadow-penalty-reason",
            "shadow-penalty-expiry",
            "shadow-distraction-budget",
            "shadow-win-ladder",
            "shadow-mission-score",
            "mission-task-1",
            "mission-task-2",
            "mission-task-3",
            "mission-task-4",
            "mission-task-5",
            "mission-task-6",
            "mission-task-7",
            "mission-task-8",
            "shadow-standard-metric",
            "shadow-momentum-score",
            "shadow-consistency-index",
            "shadow-growth-trend",
            "roadmap-penalty-timer",
            "google-login-btn",
            "google-logout-btn",
            "auth-user-name",
            "profile-menu-container",
            "profile-menu-toggle",
            "profile-menu",
          ].forEach((id) => (elements[id] = document.getElementById(id)));
          return elements;
        }
        loadFromStorage(key) {
          try {
            const d = localStorage.getItem(key);
            return d ? JSON.parse(d) : null;
          } catch {
            return null;
          }
        }
        saveToStorage(key, data, immediate = false) {
          // Always save critical keys immediately — debounce loses them if tab closes
          const criticalKeys = [CONFIG.STORAGE_KEYS.SHADOW_AVG, CONFIG.STORAGE_KEYS.ACTIVE_TASK, CONFIG.STORAGE_KEYS.TASKS];
          if (immediate || criticalKeys.includes(key)) {
            this._executeSave(key, data);
            return;
          }
          if (this.saveTimers[key]) clearTimeout(this.saveTimers[key]);
          this.saveTimers[key] = setTimeout(() => this._executeSave(key, data), 2000);
        }
        _executeSave(key, data) {
          try {
            localStorage.setItem(key, JSON.stringify(data));
          } catch (e) {
            console.error("storage save failed", e);
          }
          this.cloudManager?.syncByStorageKey?.(key, data);
        }
        migrateSchema() {
          const current =
            parseInt(
              this.loadFromStorage(CONFIG.STORAGE_KEYS.SCHEMA_VERSION),
            ) || 1;
          if (current < CONFIG.DB_SCHEMA_VERSION) {
            this.state.tasks = this.state.tasks.map((t) =>
              this.normalizeTask(t),
            );
            this.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.state.tasks);
            this.saveToStorage(
              CONFIG.STORAGE_KEYS.SCHEMA_VERSION,
              CONFIG.DB_SCHEMA_VERSION,
            );
          }
        }
        normalizeTask(task) {
          const isLegacySleep =
            task.isSleep === true || task.category === "Sleep";
          const category = this.resolveCategory(
            task.category || (isLegacySleep ? "Sleep" : "Miscellaneous"),
          );
          const fallbackSub = CATEGORY_DEFINITIONS[category]?.[0] || "General";
          const subcategory =
            task.subcategory || (isLegacySleep ? "Night Sleep" : fallbackSub);
          const description = task.description || task.name || "";
          const parsedStart = Number(task.startTime);
          const startTime = Number.isFinite(parsedStart) ? parsedStart : Date.now();
          const parsedEnd = Number(task.endTime);
          const endTime = Number.isFinite(parsedEnd) ? parsedEnd : startTime;
          
          let duration = 0;
          if (task.duration !== undefined && task.duration !== null && !Number.isNaN(Number(task.duration))) {
              duration = Number(task.duration);
          } else {
              duration = Math.round((endTime - startTime) / 60000);
          }
          
          duration = Math.min(24 * 60, Math.max(0, Number.isFinite(duration) ? duration : 0));

          const classifierInput = (task.description || task.name || "").trim();
          const classification = ActivityClassifier.classify(classifierInput);

          // Context-aware correction so graph filters remain reliable:
          // category intent from user selection is respected over weak text hints.
          if (category === "Time Waste / Distraction") {
            classification.category = "DISTRACTION";
            classification.graph_tag = "distraction";
            if (classification.waste_level === "NONE")
              classification.waste_level =
                duration >= 90 ? "HIGH" : duration >= 30 ? "MODERATE" : "LOW";
            classification.confidence = Math.max(75, classification.confidence);
          } else if (PRODUCTIVE_CATEGORIES.has(category)) {
            classification.category = "PRODUCTIVE";
            classification.graph_tag = "productivity";
            classification.waste_level = "NONE";
            classification.confidence = Math.max(70, classification.confidence);
          } else if (category === "Sleep" || category === "Miscellaneous") {
            classification.category = "NEUTRAL";
            classification.graph_tag = "neutral";
            classification.waste_level = "NONE";
            classification.confidence = Math.max(60, classification.confidence);
          }

          const graphTag = task.graph_tag || classification.graph_tag;
          const wasteLevel = task.waste_level || classification.waste_level;
          const growthCategory =
            task.growth_category || classification.category;
          const confidence = Number(
            task.confidence ?? classification.confidence,
          );

          return {
            id:
              task.id ||
              `${startTime}-${Math.random().toString(36).slice(2, 8)}`,
            category,
            subcategory,
            description,
            startTime,
            endTime,
            duration,
            date: task.date || this.getDateString(new Date(startTime)),
            sourceDevice:
              task.sourceDevice || this.syncManager?.getDeviceId?.() || "local",
            createdAt: task.createdAt || Date.now(),
            // Preserve original updatedAt — overwriting it breaks the cloud dedup guard in applyRemoteTaskChanges
            updatedAt: task.updatedAt || Date.now(),
            growth_category: growthCategory,
            confidence,
            waste_level: wasteLevel,
            graph_tag: graphTag,
            missionTopic: task.missionTopic || task.topic || "",
            missionType: task.missionType || "",
            sourceAgnostic: !!task.sourceAgnostic,
            classification_json: {
              activity: task.description || task.name || "",
              category: growthCategory,
              confidence,
              waste_level: wasteLevel,
              graph_tag: graphTag,
            },
          };
        }
        getDateString(date = new Date()) {
          const d = new Date(date);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
        getInferredWasteMinutesForDate(
          dateStr,
          sourceTasks = this.state.tasks,
        ) {
          const trackedMinutes = sourceTasks
            .filter(
              (task) =>
                task.date === dateStr &&
                Number.isFinite(task.duration) &&
                task.duration > 0,
            )
            .reduce((sum, task) => sum + task.duration, 0);
          return Math.max(0, 1440 - Math.min(1440, trackedMinutes));
        }
        formatDuration(minutes) {
          const h = Math.floor(minutes / 60),
            m = Math.round(minutes % 60);
          return `${h}h ${String(m).padStart(2, "0")}m`;
        }
        formatDecimalTime(h) {
          const hr = Math.floor(h);
          const min = Math.round((h - hr) * 60);
          return `${hr}h ${String(min).padStart(2, "0")}m`;
        }
        formatTimestamp(ts) {
          return new Date(ts).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
        isProductiveCategory(category) {
          return PRODUCTIVE_CATEGORIES.has(category);
        }
        resolveCategory(inputCategory) {
          const categories = Object.keys(CATEGORY_DEFINITIONS);
          if (!inputCategory) return "Miscellaneous";
          const normalized = String(inputCategory).trim().toLowerCase();
          const exact = categories.find((c) => c.toLowerCase() === normalized);
          if (exact) return exact;
          if (CATEGORY_ALIASES[normalized]) return CATEGORY_ALIASES[normalized];
          const loose = categories.find(
            (c) =>
              c.toLowerCase().includes(normalized) ||
              normalized.includes(c.toLowerCase()),
          );
          return loose || "Miscellaneous";
        }
        async initialize() {
    try {
      console.group('DisciplineTracker Initialization');
      if (this.state.tasks.length > 0) {
          this.saveToStorage(CONFIG.STORAGE_KEYS.TASKS, this.state.tasks, true);
      }

    } catch (error) {
      console.error('[DisciplineTracker] Initialization failed:', error);
    } finally {
      console.groupEnd();
    }
          if (!window.Chart) {
            try {
              await this.loadChartJS();
            } catch {}
          }
          this.uiManager.initialize();
          this.taskManager.initialize();
          this.shadowEngine.initialize();
          this.trainerEngine.initialize();
          this.graphManager.initialize();
          this.eventManager.initialize();
          this.updateStreak();
          if (this.state.activeTask)
            this.stopwatch.resumeActiveTask(this.state.activeTask);
          window.addEventListener("online", () => this.syncManager.syncNow());
          await this.syncManager.syncNow();
          await this.cloudManager.initialize();
        }
        loadChartJS() {
          return new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/chart.js";
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        updateStreak(showPopup = false) {
          const dates = [
            ...new Set(this.state.tasks.map((t) => t.date)),
          ].sort();
          if (!dates.length) {
            this.state.streak = 0;
            this.elements["streak-display"].textContent = 0;
            return;
          }
          const set = new Set(dates);
          const today = this.getDateString();
          let streak = 0;
          let cursor = set.has(today)
            ? today
            : this.getDateString(new Date(Date.now() - 86400000));
          while (set.has(cursor)) {
            streak++;
            const d = new Date(cursor);
            d.setDate(d.getDate() - 1);
            cursor = this.getDateString(d);
          }
          const old = this.state.streak;
          this.state.streak = streak;
          this.saveToStorage(CONFIG.STORAGE_KEYS.STREAK, streak);
          this.elements["streak-display"].textContent = streak;
          if (showPopup && streak > old && streak > 1)
            this.uiManager.showStreakPopup();
        }
      }
