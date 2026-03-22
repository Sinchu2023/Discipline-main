class FlowProtocolEngine {
        constructor(app) {
          this.app = app;
          this.state = this.app.loadFromStorage(
            CONFIG.STORAGE_KEYS.FLOW_PROTOCOL,
          ) || { byDate: {} };
          this.killTimer = null;
        }

        initialize() {
    try {
      console.group('FlowProtocolEngine Initialization');

          this.ensureTodayRecord();
          this.refresh();
    } catch (error) {
      console.error('[FlowProtocolEngine] Initialization failed:', error);
    } finally {
      console.groupEnd();
    }
        }

        save() {
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.FLOW_PROTOCOL, this.state);
        }

        ensureTodayRecord() {
          const today = this.app.getDateString(new Date());
          if (!this.state.byDate[today]) {
            this.state.byDate[today] = {
              flowBeforePhone: false,
              wakeAt: null,
              firstActionAt: null,
              attentionStretchMin: 0,
              warMode: {
                cold_shower: false,
                pushups: false,
                deep_work_30: false,
                speak_up: false,
                wake_before_sun: false,
              },
            };
            this.save();
          }
          return this.state.byDate[today];
        }

        getTodayRecord() {
          return this.ensureTodayRecord();
        }

        markWakeNow() {
          const r = this.getTodayRecord();
          r.wakeAt = Date.now();
          this.save();
          this.refresh();
        }

        markFirstActionNow() {
          const r = this.getTodayRecord();
          const now = Date.now();
          if (!r.wakeAt) r.wakeAt = now;
          r.firstActionAt = now;
          this.save();
          this.refresh();
        }

        toggleFlowBeforePhone(checked) {
          const r = this.getTodayRecord();
          r.flowBeforePhone = !!checked;
          this.save();
          this.refresh();
        }

        incrementAttentionStretch() {
          const r = this.getTodayRecord();
          r.attentionStretchMin = Math.min(
            180,
            (r.attentionStretchMin || 0) + 1,
          );
          this.save();
          this.refresh();
        }

        decrementAttentionStretch() {
          const r = this.getTodayRecord();
          r.attentionStretchMin = Math.max(0, (r.attentionStretchMin || 0) - 1);
          this.save();
          this.refresh();
        }

        toggleWarMode(key, checked) {
          const r = this.getTodayRecord();
          if (!r.warMode) r.warMode = {};
          r.warMode[key] = !!checked;
          this.save();
          this.refresh();
        }

        getWarScore() {
          const r = this.getTodayRecord();
          const vals = Object.values(r.warMode || {});
          const done = vals.filter(Boolean).length;
          return { done, total: vals.length || 5 };
        }

        getFlowCycleStatus() {
          if (!this.app.stopwatch?.isRunning) return "recovery / reset";
          const elapsedMin = Math.max(
            0,
            Math.round(
              (Date.now() - (this.app.stopwatch.startTime || Date.now())) /
                60000,
            ),
          );
          if (elapsedMin < 10) return "struggle (persist)";
          if (elapsedMin < 15) return "release";
          if (elapsedMin < 90) return "flow";
          return "recovery needed";
        }

        getBlockersStatus() {
          const today = this.app.getDateString(new Date());
          const untracked = this.app.getInferredWasteMinutesForDate(
            today,
            this.app.state.tasks,
          );
          if (untracked >= 240) return "high";
          if (untracked >= 90) return "moderate";
          return "low";
        }

        getPronenessStatus() {
          const r = this.getTodayRecord();
          if (r.wakeAt && r.firstActionAt) {
            const delta = Math.round((r.firstActionAt - r.wakeAt) / 60000);
            if (delta < 0) return "error";
            return `${delta}m from wake`;
          }
          return "set wake + first action";
        }

        getTriggersStatus() {
          const goalProgress =
            this.app.shadowEngine?.getTodayGoalProgress?.() || {};
          const missionScore =
            this.app.shadowEngine?.calculateMissionScore?.(goalProgress) || 0;
          if (missionScore >= 80) return "strong";
          if (missionScore >= 50) return "moderate +4%";
          return "weak + focus needed";
        }

        getActionSteps() {
          const r = this.getTodayRecord();
          const steps = [];
          if (!r.wakeAt)
            steps.push(
              "Log wake time now, then start first focused action within 90 minutes.",
            );
          if (r.wakeAt && !r.firstActionAt)
            steps.push(
              "Press First Action when your first meaningful work block starts.",
            );
          if (!r.flowBeforePhone)
            steps.push(
              "Complete one 120+ minute priority block before phone exposure.",
            );
          if ((r.attentionStretchMin || 0) < 10)
            steps.push(
              "Add attention stretch reps until you hit at least 10 minutes today.",
            );
          const war = this.getWarScore();
          if (war.done < 3)
            steps.push(
              `Complete at least ${3 - war.done} more war-mode ritual(s) to hit minimum daily pressure training.`,
            );
          const triggers = this.getTriggersStatus();
          if (triggers === "weak + focus needed")
            steps.push(
              "Define one clear output for current block and set immediate feedback checkpoint at 25 minutes.",
            );
          if (!steps.length)
            steps.push(
              "Protocol green: run next deep-work block at +4% difficulty and protect recovery after 90 minutes.",
            );
          return steps.slice(0, 5);
        }

        async runKillSwitch() {
          if (this.app.stopwatch?.isRunning) {
            alert("Stop current task first to run Kill Switch.");
            return;
          }
          const el = this.app.elements["kill-switch-countdown"];
          if (!el) return;
          const seq = ["3", "2", "1", "MOVE"];
          let i = 0;
          if (this.killTimer) clearInterval(this.killTimer);
          el.textContent = seq[0];
          this.killTimer = setInterval(() => {
            i += 1;
            if (i >= seq.length) {
              clearInterval(this.killTimer);
              this.killTimer = null;
              this.markFirstActionNow();
              this.app.stopwatch.start("Kill Switch Deep Work", {
                category: "Productive Work",
                subcategory: "Execution",
                description: "3-second kill switch deep work block",
              });
              el.textContent = "Deep work started";
              return;
            }
            el.textContent = seq[i];
          }, 700);
        }

        refresh() {
          const r = this.getTodayRecord();
          const blockersEl = this.app.elements["flow-blockers-status"];
          const pronenessEl = this.app.elements["flow-proneness-status"];
          const triggersEl = this.app.elements["flow-triggers-status"];
          const cycleEl = this.app.elements["flow-cycle-status"];
          const stretchEl = this.app.elements["attention-stretch-value"];
          const warScoreEl = this.app.elements["war-score"];
          const flowBeforeEl = this.app.elements["flow-before-phone-check"];
          const stepsEl = this.app.elements["flow-action-steps"];
          if (blockersEl) blockersEl.textContent = this.getBlockersStatus();
          if (pronenessEl) pronenessEl.textContent = this.getPronenessStatus();
          if (triggersEl) triggersEl.textContent = this.getTriggersStatus();
          if (cycleEl) cycleEl.textContent = this.getFlowCycleStatus();
          if (stretchEl)
            stretchEl.textContent = `${r.attentionStretchMin || 0} min`;
          const ws = this.getWarScore();
          if (warScoreEl) warScoreEl.textContent = `${ws.done}/${ws.total}`;
          if (flowBeforeEl) flowBeforeEl.checked = !!r.flowBeforePhone;
          if (stepsEl)
            stepsEl.innerHTML = this.getActionSteps()
              .map((step) => `<li>${step}</li>`)
              .join("");

          document.querySelectorAll(".war-mode-check").forEach((cb) => {
            const key = cb.getAttribute("data-key");
            cb.checked = !!(r.warMode && r.warMode[key]);
          });
        }
      }
