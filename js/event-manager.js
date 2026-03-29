class EventManager {
        constructor(app) {
          this.app = app;
        }
        initialize() {
    try {
      console.group('EventManager Initialization');

          this.bindEvents();
    } catch (error) {
      console.error('[EventManager] Initialization failed:', error);
    } finally {
      console.groupEnd();
    }
        }
        bindEvents() {
          this.app.elements["start-btn"].addEventListener("click", () =>
            this.app.stopwatch.start(),
          );
          this.app.elements["stop-btn"].addEventListener("click", () =>
            this.app.stopwatch.stop(),
          );
          this.app.elements["sleep-btn"].addEventListener("click", () =>
            this.app.stopwatch.startSleep(),
          );
          this.app.elements["add-favorite"].addEventListener("click", () =>
            this.app.taskManager.addFavorite(),
          );
          this.app.elements["task-input"].addEventListener("keypress", (e) => {
            if (e.key === "Enter" && !this.app.stopwatch.isRunning)
              this.app.stopwatch.start();
          });
          this.app.elements["view-report"].addEventListener("click", () =>
            this.app.uiManager.showReport(),
          );
          this.app.elements["view-yearly-report"].addEventListener("click", () =>
            this.app.uiManager.showYearlyReport(),
          );
          this.app.elements["open-trainer"].addEventListener("click", () => {
            this.app.trainerEngine.showWindow();
            const keyInput = this.app.elements["gemini-api-key"];
            if (keyInput && !keyInput.value) {
                const savedKey = localStorage.getItem("gemini_api_key_saved");
                if (savedKey) keyInput.value = savedKey;
            }
          });
          const genBtn = this.app.elements["generate-roadmap-btn"];
          if (genBtn) {
              genBtn.addEventListener("click", () => this.app.trainerEngine.generateAIRoadmap());
          }

          // Roadmap mode switcher
          const modeAiBtn = document.getElementById("mode-ai-btn");
          const modeImportBtn = document.getElementById("mode-import-btn");
          const aiPanel = document.getElementById("ai-gen-panel");
          const importPanel = document.getElementById("import-json-panel");
          if (modeAiBtn && modeImportBtn) {
            modeAiBtn.addEventListener("click", () => {
              aiPanel.style.display = "block";
              importPanel.style.display = "none";
              modeAiBtn.classList.add("btn-primary");
              modeImportBtn.classList.remove("btn-primary");
            });
            modeImportBtn.addEventListener("click", () => {
              importPanel.style.display = "block";
              aiPanel.style.display = "none";
              modeImportBtn.classList.add("btn-primary");
              modeAiBtn.classList.remove("btn-primary");
            });
          }

          // Import JSON roadmap
          const importBtn = document.getElementById("import-roadmap-btn");
          if (importBtn) {
            importBtn.addEventListener("click", () => this.app.trainerEngine.importJsonRoadmap());
          }

          // Fill example JSON
          const exampleBtn = document.getElementById("import-json-example-btn");
          if (exampleBtn) {
            exampleBtn.addEventListener("click", () => {
              const ta = document.getElementById("json-import-input");
              if (ta) ta.value = JSON.stringify({
                topic: "Analog IC Design",
                modules: [
                  { moduleNumber: 1, moduleTitle: "DIODES", days: [
                    { day: 1, title: "Basic Semiconductor Physics", status: "completed" },
                    { day: 2, title: "Different Models of Diodes", status: "active" },
                    { day: 3, title: "Operating Point & Small Signal Analysis", status: "locked" }
                  ]},
                  { moduleNumber: 2, moduleTitle: "BJT AMPLIFIERS", days: [
                    { day: 4, title: "BJT Basics & DC Analysis", status: "locked" },
                    { day: 5, title: "Small Signal Models", status: "locked" }
                  ]}
                ]
              }, null, 2);
            });
          }

          this.app.elements["export-data"].addEventListener("click", () =>
            (this.app.uiManager.exportData(), this.app.cloudManager.closeProfileMenu()),
          );
          this.app.elements["import-data"].addEventListener("click", () =>
            (this.app.uiManager.triggerImportPicker(), this.app.cloudManager.closeProfileMenu()),
          );
          this.app.elements["import-file"].addEventListener("change", (e) => {
            const file = e.target.files?.[0];
            this.app.uiManager.importDataFromFile(file);
          });
          this.app.elements["close-modal"].addEventListener("click", () =>
            this.app.uiManager.hideReport(),
          );
          this.app.elements["close-report"].addEventListener("click", () =>
            this.app.uiManager.hideReport(),
          );
          this.app.elements["print-report"].addEventListener("click", () =>
            window.print(),
          );
          this.app.elements["close-trainer"].addEventListener("click", () =>
            this.app.trainerEngine.hideWindow(),
          );
          this.app.elements["close-trainer-modal"].addEventListener(
            "click",
            () => this.app.trainerEngine.hideWindow(),
          );
          this.app.elements["refresh-trainer"].addEventListener("click", () => {
            this.app.trainerEngine.state.roadmap.editMode =
              !this.app.trainerEngine.state.roadmap.editMode;
            this.app.trainerEngine.refresh();
          });
          this.app.elements["next-day-btn"].addEventListener("click", () =>
            this.app.trainerEngine.handleNextDayClick(),
          );
          const deleteRoadmapBtn = document.getElementById("delete-roadmap-btn");
          if (deleteRoadmapBtn) {
            deleteRoadmapBtn.addEventListener("click", () =>
              this.app.trainerEngine.deleteRoadmap()
            );
          }

          this.app.elements["close-streak"].addEventListener("click", () =>
            this.app.uiManager.hideStreakPopup(),
          );
          this.app.elements["report-modal"].addEventListener("click", (e) => {
            if (e.target === this.app.elements["report-modal"])
              this.app.uiManager.hideReport();
          });
          this.app.elements["trainer-modal"].addEventListener("click", (e) => {
            if (e.target === this.app.elements["trainer-modal"])
              this.app.trainerEngine.hideWindow();
          });

          // Task Editor Modal
          this.app.elements["save-task-edit"].addEventListener("click", () =>
            this.app.taskManager.saveTaskEdit()
          );
          this.app.elements["close-task-editor"].addEventListener("click", () => {
            this.app.elements["task-editor-modal"].style.display = "none";
            this.app.taskManager.editingTaskId = null;
          });
          this.app.elements["task-editor-modal"].addEventListener("click", (e) => {
            if (e.target === this.app.elements["task-editor-modal"]) {
              this.app.elements["task-editor-modal"].style.display = "none";
              this.app.taskManager.editingTaskId = null;
            }
          });
        }
      }
