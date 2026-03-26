class TrainerEngine {
        constructor(app) {
          this.app = app;
          this.state = this.loadState();
          this.state.roadmap = this.getRoadmapState();
          this.levels = [
            { name: "Dormant", min: 0, max: 60 },
            { name: "Initiate", min: 60, max: 120 },
            { name: "Competitor", min: 120, max: 180 },
            { name: "Dominator", min: 180, max: 240 },
            { name: "Elite", min: 240, max: Infinity },
          ];
        }

        loadState() {
          return (
            this.app.loadFromStorage(CONFIG.STORAGE_KEYS.TRAINER_STATE) || {
              penaltyMinutes: 0,
              shadowBuffDays: 0,
              userBuffDays: 0,
              lastProcessedDate: null,
              manualMissionChecks: {},
            }
          );
        }

        initialize() {
          this.refresh();
        }

        getDailyProductiveMap() {
          const map = new Map();
          this.app.state.tasks.forEach((task) => {
            if (!this.app.isProductiveCategory(task.category)) return;
            map.set(task.date, (map.get(task.date) || 0) + task.duration);
          });
          return map;
        }

        getDailySeries(days = 14) {
          const map = this.getDailyProductiveMap();
          const series = [];
          const today = new Date(this.app.getDateString());
          for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = this.app.getDateString(d);
            series.push({ date: key, minutes: map.get(key) || 0 });
          }
          return series;
        }

        getLevel(minutes) {
          let current = this.levels[0];
          for (const l of this.levels) if (minutes >= l.min) current = l;
          const idx = this.levels.findIndex((l) => l.name === current.name);
          const next = this.levels[idx + 1] || null;
          return { current, next };
        }

        getMicroLevel(minutes) {
          const clamped = Math.max(
            0,
            Math.min(100, Math.floor((minutes / 600) * 100) + 1),
          );
          return clamped;
        }

        getMilestoneProgress(level, sevenDayAvg, winsInLast5) {
          const series5 = this.getDailySeries(5);
          const maintainedDays = series5.filter(
            (d) => d.minutes >= level.min,
          ).length;
          const daysRemaining = Math.max(0, 5 - maintainedDays);
          const winsRemaining = Math.max(0, 3 - winsInLast5);
          const nextTarget = this.levels.find((l) => l.min > level.min);
          const toNext = nextTarget
            ? Math.max(0, Math.ceil(nextTarget.min - sevenDayAvg))
            : 0;
          return `Maintain: ${maintainedDays}/5 days, Wins: ${winsInLast5}/3, Days remaining: ${daysRemaining}, Wins remaining: ${winsRemaining}${nextTarget ? `, +${toNext}m to ${nextTarget.name}` : ", Top level locked"}`;
        }

        getShadowTrend(last3, prev3) {
          if (last3 > prev3 + 5) return "Rising";
          if (last3 < prev3 - 5) return "Declining";
          return "Stable";
        }

        getMode(currentMinutes, effectiveShadow, requiredPace) {
          if (currentMinutes > effectiveShadow * 1.15) return "DOMINANCE";
          if (currentMinutes >= effectiveShadow) return "CONTROL";
          if (requiredPace <= 45) return "RECOVERY";
          return "COLLAPSE";
        }

        getConsecutiveSignal(series, predicate) {
          let run = 0;
          let triggerDate = null;
          for (const day of series) {
            if (predicate(day)) {
              run += 1;
              triggerDate = day.date;
            } else {
              run = 0;
            }
          }
          return { run, triggerDate };
        }

        getDaysSince(dateStr) {
          if (!dateStr) return Infinity;
          const d = new Date(dateStr);
          const t = new Date(this.app.getDateString());
          d.setHours(0, 0, 0, 0);
          t.setHours(0, 0, 0, 0);
          return Math.round((t - d) / 86400000);
        }

        // ── SE2: Progressive Correction Formula ──────────────────────────────
        // next_target = current + (ideal - current) * learning_rate
        // Clamped to MAX_DAILY_SHIFT_LIMIT (30 min) per day.
        progressiveCorrection(current, ideal, state) {
          const { SE2 } = CONFIG;
          let rate;
          if (state === "RECOVERY") {
            // Determine severity: if current < 50% of ideal → severe
            rate = (current / Math.max(1, ideal)) < 0.5
              ? SE2.LEARNING_RATE_FAILURE_SEVERE
              : SE2.LEARNING_RATE_FAILURE_MODERATE;
          } else {
            rate = SE2.LEARNING_RATE_STABLE; // STABLE or GROWTH both use 0.3
          }
          const raw = current + (ideal - current) * rate;
          // Clamp shift to MAX_DAILY_SHIFT_LIMIT
          const shift = raw - current;
          const clamped = Math.sign(shift) * Math.min(Math.abs(shift), SE2.MAX_DAILY_SHIFT_LIMIT);
          return Math.max(0, Math.round(current + clamped));
        }

        // ── SE2: Behavioral Analysis ─────────────────────────────────────────
        // Reads state from shadowEngine.detectBehavioralState() and returns
        // a structured behavioral snapshot for decision making.
        analyzeBehavior() {
          const se = this.app.shadowEngine;
          if (!se) return { state: "STABLE", winRate: 0, slope: 0 };
          const state = se.detectBehavioralState();
          const signals = se.behaviorStore ? se.behaviorStore.load() : {};
          return {
            state,
            winRate: signals.weekly_win_rate || 0,
            energyMap: signals.energy_map || {},
            resistanceScores: signals.resistance_scores || {},
            successProbs: signals.success_probability_map || {},
            sleepCompromiseCount: se.behaviorStore
              ? se.behaviorStore.getSleepCompromiseCount()
              : 0,
            flexibilityBuffer: signals.flexibility_buffer || CONFIG.SE2.FLEXIBLE_TASK_MULTIPLIER,
          };
        }

        // ── SE2: Sleep Compromise Check ──────────────────────────────────────
        // Returns true if a sleep compromise is approved for the given timetable result.
        // Approves only when: high effort + not too frequent + above min sleep.
        checkSleepCompromise(timetableResult) {
          const { SE2 } = CONFIG;
          const { sleepMinutes, highEffort } = timetableResult;
          if (!highEffort) return false;
          if (sleepMinutes < SE2.MIN_SLEEP_LIMIT) return false; // below absolute floor

          const compromiseCount = this.app.shadowEngine?.behaviorStore
            ? this.app.shadowEngine.behaviorStore.getSleepCompromiseCount()
            : 0;
          if (compromiseCount >= SE2.MAX_SLEEP_COMPROMISES_PER_7_DAYS) return false;

          return true; // approved
        }

        // ── SE2: Anti-Misuse (Flexible Task Buffer Control) ──────────────────
        // If flexible tasks are being skipped excessively, reduce the buffer multiplier.
        // Buffer auto-decreases toward 1.0 (strict) when abuse is detected.
        computeFlexibilityBuffer() {
          const { SE2 } = CONFIG;
          const signals = this.app.shadowEngine?.behaviorStore?.load() || {};
          const skipCounts = signals.flex_abuse_skip_counts || {};
          const goals = CONFIG.DAILY_GOALS.filter(
            (g) => g.discipline_type === "flexible",
          );
          if (!goals.length) return SE2.FLEXIBLE_TASK_MULTIPLIER;

          let abuseDetected = false;
          goals.forEach((goal) => {
            const skips = skipCounts[goal.label] || 0;
            const totalDays = Math.max(1, Object.keys(signals.daily_win_rate || {}).length);
            const skipRate = skips / Math.min(totalDays, 7);
            if (skipRate > SE2.FLEX_ABUSE_SKIP_RATE_THRESHOLD) {
              abuseDetected = true;
            }
          });

          let buffer = signals.flexibility_buffer ?? SE2.FLEXIBLE_TASK_MULTIPLIER;
          if (abuseDetected) {
            // Reduce buffer gradually (floor at 1.0)
            buffer = Math.max(1.0, parseFloat((buffer - 0.1).toFixed(2)));
          } else if (buffer < SE2.FLEXIBLE_TASK_MULTIPLIER) {
            // Recovery: restore buffer slowly when abuse stops
            buffer = Math.min(
              SE2.FLEXIBLE_TASK_MULTIPLIER,
              parseFloat((buffer + 0.05).toFixed(2)),
            );
          }

          // Persist updated buffer
          if (this.app.shadowEngine?.behaviorStore) {
            this.app.shadowEngine.behaviorStore.set("flexibility_buffer", buffer);
            this.app.shadowEngine.behaviorStore.save();
          }
          return buffer;
        }

        // ── SE2: Mission Target Generator ────────────────────────────────────
        // Returns adjusted daily mission targets for each DAILY_GOAL based on
        // behavioral state, sleep compromise status, and flexibility buffer.
        generateMissionTargets(behavioralState, sleepCompromised) {
          const { SE2 } = CONFIG;
          const flexBuffer = this.computeFlexibilityBuffer();
          const goals = CONFIG.DAILY_GOALS || [];
          const dailyMap = this.getDailyProductiveMap();

          // Compute current 7-day average per-task (approximate via total)
          const today = new Date();
          let avgMinutes = 0;
          for (let i = 1; i <= 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const ds = this.app.getDateString(d);
            avgMinutes += dailyMap.get(ds) || 0;
          }
          avgMinutes = avgMinutes / 7;

          return goals.map((goal) => {
            const ideal = goal.target_minutes || goal.minutesTarget || 0;
            let target = this.progressiveCorrection(avgMinutes, ideal, behavioralState);

            // Apply sleep compromise load reduction (−15%)
            if (sleepCompromised) {
              target = Math.round(target * (1 - SE2.RECOVERY_LOAD_REDUCTION));
            }
            // Recovery state: additional load reduction
            if (behavioralState === "RECOVERY") {
              target = Math.round(target * (1 - SE2.RECOVERY_LOAD_REDUCTION));
            }

            // Flexible task: show buffer range
            const isFlexible = goal.discipline_type === "flexible";
            const displayMin = target;
            const displayMax = isFlexible
              ? Math.round(target * flexBuffer)
              : target;

            return {
              id: goal.id,
              label: goal.label,
              discipline_type: goal.discipline_type || "flexible",
              target_minutes: target,
              display_range: isFlexible ? `${displayMin}–${displayMax} min` : `${target} min`,
              buffer_multiplier: isFlexible ? flexBuffer : 1.0,
            };
          });
        }

        computeAntiSandbagSignals(baseShadow) {
          const threshold = Math.max(1, baseShadow);
          const recentSeries = this.getDailySeries(45);
          const withMargin = recentSeries.map((day) => {
            const margin = day.minutes - threshold;
            const pct = margin / threshold;
            return { ...day, margin, pct, win: margin >= 0 };
          });

          const minimalSignal = this.getConsecutiveSignal(
            withMargin,
            (day) => day.win && day.pct > 0 && day.pct < 0.03,
          );
          const squeezeSignal = this.getConsecutiveSignal(
            withMargin,
            (day) => day.win && day.margin <= 5,
          );

          const daysSinceMinimal = this.getDaysSince(minimalSignal.triggerDate);
          const adaptiveActive =
            minimalSignal.run >= 3 &&
            daysSinceMinimal >= 1 &&
            daysSinceMinimal <= 5;
          const adaptiveDaysLeft = adaptiveActive ? 6 - daysSinceMinimal : 0;

          const daysSinceSqueeze = this.getDaysSince(squeezeSignal.triggerDate);
          const aggressionActive =
            squeezeSignal.run >= 5 &&
            daysSinceSqueeze >= 1 &&
            daysSinceSqueeze <= 3;
          const aggressionDaysLeft = aggressionActive
            ? 4 - daysSinceSqueeze
            : 0;

          return {
            minimalDominanceDetected:
              minimalSignal.run >= 3 || squeezeSignal.run >= 5,
            adaptivePressure: {
              active: adaptiveActive,
              daysLeft: adaptiveDaysLeft,
              buffPct: adaptiveActive ? 0.03 : 0,
            },
            aggressionMode: {
              active: aggressionActive,
              daysLeft: aggressionDaysLeft,
              minWinPct: aggressionActive ? 0.05 : 0,
            },
            minimalRun: minimalSignal.run,
            squeezeRun: squeezeSignal.run,
          };
        }

        evaluateTimetable(tasks, dateStr) {
          const { SE2 } = CONFIG;
          const todaysTasks = tasks.filter((t) => t.date === dateStr);
          let sleepMinutes = 0;
          let deepWorkMinutes = 0;
          let projectMinutes = 0;
          let learnRevisionMinutes = 0;
          let earlyDeepWorkStart = null;
          const strictViolations = []; // SE2: strict task failure log

          todaysTasks.forEach((t) => {
            const cat = (t.category || "").toLowerCase();
            const sub = (t.subcategory || "").toLowerCase();
            const startHour = t.startTime ? new Date(t.startTime).getHours() : 0;

            if (cat === "sleep" || cat === "rest") {
              sleepMinutes += t.duration;
            } else if (this.app.isProductiveCategory(t.category)) {
              if (sub.includes("project")) {
                projectMinutes += t.duration;
              } else if (sub.includes("revision") || sub.includes("learn") || startHour >= 16) {
                learnRevisionMinutes += t.duration;
              } else {
                deepWorkMinutes += t.duration;
                if (startHour >= 4 && startHour <= 6) {
                  if (!earlyDeepWorkStart || t.startTime < earlyDeepWorkStart)
                    earlyDeepWorkStart = t.startTime;
                }
              }
            }

            // SE2: Strict-task violation detection via TIMETABLE_LOGIC
            if (t.startTime && typeof TIMETABLE_LOGIC !== "undefined") {
              const tMin = new Date(t.startTime).getHours() * 60 + new Date(t.startTime).getMinutes();
              TIMETABLE_LOGIC.forEach((slot) => {
                if (!slot.time) return;
                const [sH, sM] = slot.time.split(":").map(Number);
                const slotMin = sH * 60 + sM;
                const labelMatch = sub.includes((slot.label || "").toLowerCase())
                  || cat.includes((slot.label || "").toLowerCase());
                if (labelMatch && tMin > slotMin + SE2.STRICT_TASK_GRACE_MINUTES) {
                  const isStrict = (CONFIG.DAILY_GOALS || []).some(
                    (g) => g.discipline_type === "strict"
                      && g.keywords?.some((k) => sub.includes(k) || cat.includes(k)),
                  );
                  if (isStrict) strictViolations.push({ task: slot.label, lateBy: tMin - slotMin });
                }
              });
            }
          });

          const missedEarlyStart = !earlyDeepWorkStart && new Date().getHours() >= 8;
          const highEffort = (deepWorkMinutes + projectMinutes) >= 300;

          // SE2: Sleep classification using config constants + rolling compromise check
          let sleepStatus = "OPTIMAL";
          if (sleepMinutes > 0) {
            if (sleepMinutes < SE2.MIN_SLEEP_LIMIT) {
              sleepStatus = "DANGER";
            } else if (sleepMinutes < SE2.IDEAL_SLEEP) {
              const approved = this.checkSleepCompromise({ sleepMinutes, highEffort });
              if (approved) {
                sleepStatus = "COMPROMISED_OK";
                // Log to BehaviorStore so rolling count is accurate
                if (this.app.shadowEngine?.behaviorStore) {
                  this.app.shadowEngine.behaviorStore.logSleepCompromise(dateStr);
                }
              } else {
                sleepStatus = "SHORT";
              }
            }
          } else {
            sleepStatus = "PENDING";
          }

          return {
            missedEarlyStart, sleepStatus, highEffort,
            sleepMinutes, deepWorkMinutes, projectMinutes,
            learnRevisionMinutes, strictViolations,
          };
        }

        buildTrainerSnapshot() {
          const metrics = this.app.shadowEngine.computeRollingMetrics();
          const shadow7DayAverage = Math.max(
            this.app.shadowEngine.shadowSevenDayAverage || 0,
            metrics.bestAvg || 0,
          );
          const map = this.getDailyProductiveMap();
          const competition = this.app.shadowEngine.countShadowWinsThisMonth(
            map,
            shadow7DayAverage,
          );
          const now = new Date();
          const dayEnd = new Date(now);
          dayEnd.setHours(23, 59, 59, 999);
          const timeRemainingToday = Math.max(
            0,
            Math.round((dayEnd - now) / 60000),
          );

          const recent = this.getDailySeries(6);
          const last3DayAverage =
            recent.slice(-3).reduce((s, d) => s + d.minutes, 0) / 3;
          const previous3DayAverage =
            recent.slice(0, 3).reduce((s, d) => s + d.minutes, 0) / 3;

          const antiSandbag = this.computeAntiSandbagSignals(shadow7DayAverage);
          const lossChainBuffPct = this.state.shadowBuffDays > 0 ? 0.05 : 0;
          let adaptiveBuffPct = antiSandbag.adaptivePressure.buffPct;
          
          const todayDate = this.app.getDateString(new Date());
          const timetable = this.evaluateTimetable(this.app.state.tasks, todayDate);
          
          if (timetable.sleepStatus === "COMPROMISED_OK") {
             adaptiveBuffPct -= 0.05; 
          }

          const effectiveShadow =
            shadow7DayAverage * (1 + lossChainBuffPct + adaptiveBuffPct);
          const userEffectiveToday =
            metrics.todayMinutes *
            (1 + (this.state.userBuffDays > 0 ? 0.05 : 0));
          const effectiveWinTarget = antiSandbag.aggressionMode.active
            ? effectiveShadow * 1.05
            : effectiveShadow + 1;
          const weeklyGap = effectiveShadow - metrics.currentAvg;
          const missionProgress =
            this.app.shadowEngine.getTodayGoalProgress(todayDate);
          const missionScore =
            this.app.shadowEngine.calculateMissionScore(missionProgress);
          const distractionMinutes =
            this.app.shadowEngine.getTodayDistractionMinutes(todayDate);
          const computedPenalty = this.app.shadowEngine.getPenalty(
            metrics.todayMinutes,
            effectiveShadow,
            weeklyGap,
            competition.recentWinRate,
            distractionMinutes,
            missionScore,
          );
          const ladder = this.app.shadowEngine.getWinLadder(
            map,
            effectiveShadow,
          );

          const gap = effectiveShadow - userEffectiveToday;
          const minutesToTie = Math.max(0, Math.ceil(gap));
          const minutesToWin = Math.max(
            0,
            Math.ceil(effectiveWinTarget - userEffectiveToday),
          );
          const hoursLeft = Math.max(1, timeRemainingToday / 60);
          const requiredPace = Math.ceil(minutesToWin / hoursLeft);

          const winsInLast5 = this.getDailySeries(5).filter(
            (d) => d.minutes >= effectiveShadow,
          ).length;
          const userLevel = this.getLevel(metrics.currentAvg);
          const shadowLevel = this.getLevel(effectiveShadow);

          return {
            currentMinutesToday: metrics.todayMinutes,
            shadow7DayAverage,
            monthlyScoreUser: competition.myWins,
            monthlyScoreShadow: competition.shadowWins,
            monthlyWinRate: competition.activeDays
              ? competition.myWins / competition.activeDays
              : 0,
            timeRemainingToday,
            penaltyMinutes: computedPenalty.minutes,
            penaltyPoints: computedPenalty.points,
            penaltyReasons: computedPenalty.reasons,
            strongestHistorical7DayAverage: shadow7DayAverage,
            last3DayAverage,
            previous3DayAverage,
            currentStreakDays: this.app.state.streak,
            effectiveShadow,
            effectiveWinTarget,
            userEffectiveToday,
            gap,
            minutesToTie,
            minutesToWin,
            requiredPace,
            mode: this.getMode(
              userEffectiveToday,
              effectiveShadow,
              requiredPace,
            ),
            userLevel,
            shadowLevel,
            winsInLast5,
            antiSandbag,
            userMicroLevel: this.getMicroLevel(metrics.currentAvg),
            shadowMicroLevel: this.getMicroLevel(effectiveShadow),
            missionScore,
            distractionMinutes,
            distractionOverBudget: computedPenalty.overBudget,
            winLadder: ladder,
            timetable,
          };
        }

        buildReport(d = this.buildTrainerSnapshot()) {
          // SE2: Deterministic, command-based report. No emotional or motivational language.
          const trend = this.getShadowTrend(d.last3DayAverage, d.previous3DayAverage);
          const anti = d.antiSandbag;
          const phase1 = Math.min(60, Math.max(45, Math.ceil(d.minutesToWin * 0.5)));

          // SE2: Behavioral state from shadow engine
          const behaviorAnalysis = this.analyzeBehavior();
          const { state: behavioralState } = behaviorAnalysis;

          // SE2: Mission targets per goal (progressive correction applied)
          const sleepCompromised = d.timetable.sleepStatus === "COMPROMISED_OK";
          const missionTargets = this.generateMissionTargets(behavioralState, sleepCompromised);
          const targetsText = missionTargets.map((t) =>
            `${t.label} [${t.discipline_type.toUpperCase()}]: ${t.display_range}`,
          ).join("\n");

          // SE2: Sleep status — structural, no emotional framing
          let sleepReport = "";
          const { sleepStatus, missedEarlyStart, strictViolations = [] } = d.timetable;
          if (sleepStatus === "DANGER") {
            sleepReport = `Sleep.Status: DANGER — recorded sleep below minimum (${CONFIG.SE2.MIN_SLEEP_LIMIT} min). Structural risk. Prioritize rest.`;
          } else if (sleepStatus === "COMPROMISED_OK") {
            sleepReport = `Sleep.Status: COMPROMISED_OK — high effort acknowledged. Load reduced by ${Math.round(CONFIG.SE2.RECOVERY_LOAD_REDUCTION * 100)}% tomorrow.`;
          } else if (sleepStatus === "SHORT") {
            sleepReport = `Sleep.Status: SHORT — below ideal (${CONFIG.SE2.IDEAL_SLEEP} min), no high-effort justification. Realign rest window.`;
          } else if (sleepStatus === "PENDING") {
            sleepReport = `Sleep.Status: PENDING — no sleep entry logged yet.`;
          }
          if (missedEarlyStart) {
            sleepReport += (sleepReport ? "\n" : "") + `Strict.Violation: 05:00 deep-work block missed. Zero grace on this habit.`;
          }
          if (strictViolations.length > 0) {
            strictViolations.forEach((v) => {
              sleepReport += `\nStrict.Violation: ${v.task} — started ${v.lateBy} min late (grace: ${CONFIG.SE2.STRICT_TASK_GRACE_MINUTES} min).`;
            });
          }

          // SE2: Correction summary
          const correctionNote = behavioralState === "RECOVERY"
            ? `Correction.Mode: RECOVERY — load reduced. Learning rate: ${CONFIG.SE2.LEARNING_RATE_FAILURE_MODERATE}.`
            : behavioralState === "GROWTH"
            ? `Correction.Mode: GROWTH — targets incrementing. Learning rate: ${CONFIG.SE2.LEARNING_RATE_STABLE}.`
            : `Correction.Mode: STABLE — targets held near current baseline. Learning rate: ${CONFIG.SE2.LEARNING_RATE_STABLE}.`;

          return `=== SYSTEM STATE ===
Behavioral.State: ${behavioralState}
Shadow.Level: ${d.shadowLevel.current.name} | L${d.shadowMicroLevel}/100
Effective.Target: ${this.app.formatDuration(d.effectiveShadow)}
Trend: ${trend}
${correctionNote}
${sleepReport ? sleepReport + "\n" : ""}
=== MISSION TARGETS (TOMORROW) ===
${targetsText}
Flexible.Buffer: ${behaviorAnalysis.flexibilityBuffer.toFixed(2)}x — reduces if flexibility is abused.
Strict.Tasks: no timing compromise permitted.

=== TRACKING SNAPSHOT ===
Mission.Score: ${d.missionScore}/100
Distraction: ${this.app.formatDuration(d.distractionMinutes)} / ${this.app.formatDuration(CONFIG.DISTRACTION_BUDGET_MINUTES)}${d.distractionOverBudget > 0 ? ` (over by ${this.app.formatDuration(d.distractionOverBudget)})` : ""}
Win.Ladder: 3/5 ${d.winLadder.status3in5}${d.winLadder.clear3in5 ? " ✓" : ""} | 5/7 ${d.winLadder.status5in7}${d.winLadder.clear5in7 ? " ✓" : ""}
Mode: ${d.mode}
Gap: ${d.gap > 0 ? "-" : "+"}${this.app.formatDuration(Math.abs(d.gap))}
Adaptive.Pressure: ${anti.adaptivePressure.active ? `active — ${anti.adaptivePressure.daysLeft}d remaining` : "none"}

=== DAILY OBJECTIVE ===
Minutes.To.Win: ${this.app.formatDuration(d.minutesToWin)}
Required.Pace: ${d.requiredPace} min/hour

=== COMMAND ===
Execute ${this.app.formatDuration(phase1)} focused session. No distractions. Log immediately after.`;
        }

        escapeHtml(value = "") {
          return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        renderStructuredReport(reportText, snapshot) {
          const overview = this.app.elements["trainer-overview"];
          const content = this.app.elements["trainer-content"];
          if (!overview || !content) return;

          overview.innerHTML = `
          <div class="trainer-overview-card"><div class="trainer-overview-label">Mode</div><div class="trainer-overview-value">${this.escapeHtml(snapshot.mode)}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Minutes to Win</div><div class="trainer-overview-value">${this.escapeHtml(this.app.formatDuration(snapshot.minutesToWin))}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Required Pace</div><div class="trainer-overview-value">${this.escapeHtml(String(snapshot.requiredPace))} min/hour</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Effective Shadow</div><div class="trainer-overview-value">${this.escapeHtml(this.app.formatDuration(snapshot.effectiveShadow))}</div></div>
        `;

          const sections = reportText.split(/^===\s*(.+?)\s*===\s*$/gm);
          let html = "";
          for (let i = 1; i < sections.length; i += 2) {
            const title = sections[i];
            const body = (sections[i + 1] || "").trim();
            if (!body) continue;
            const lines = body.split("\n").filter(Boolean);
            let rows = "";
            lines.forEach((line) => {
              const idx = line.indexOf(":");
              if (idx > 0) {
                const key = this.escapeHtml(line.slice(0, idx).trim());
                const val = this.escapeHtml(line.slice(idx + 1).trim());
                rows += `<div class="trainer-row"><div class="trainer-key">${key}</div><div class="trainer-val">${val}</div></div>`;
              } else {
                rows += `<div class="trainer-row"><div class="trainer-val">${this.escapeHtml(line)}</div></div>`;
              }
            });
            if (title.trim() === "COMMAND") {
              html += `<section class="trainer-section"><div class="trainer-section-title">${this.escapeHtml(title)}</div><div class="trainer-command">${this.escapeHtml(lines.join(" "))}</div></section>`;
            } else {
              html += `<section class="trainer-section"><div class="trainer-section-title">${this.escapeHtml(title)}</div>${rows}</section>`;
            }
          }
          content.innerHTML = html;
        }

        getRoadmapState() {
          const createFromTemplate = () => ({
            modules: ANALOG_IC_ROADMAP_TEMPLATE.map((m) => ({
              name: m.module,
              days: m.days.map((task) => ({
                day: "",
                text: task,
                completed: false,
              })),
            })),
            editMode: false,
            startedAt: Date.now(),
          });

          const stored = this.app.loadFromStorage(
            CONFIG.STORAGE_KEYS.ROADMAP_STATE,
          );
          if (!stored?.modules?.length) return createFromTemplate();

          const allCompleted = stored.modules.every(
            (mod) => mod.days?.length && mod.days.every((day) => day.completed),
          );
          if (allCompleted) return createFromTemplate();

          const merged = createFromTemplate();
          merged.editMode = !!stored.editMode;
          merged.startedAt = stored.startedAt || merged.startedAt;
          merged.modules.forEach((module, mi) => {
            const fromStored = stored.modules[mi];
            if (!fromStored) return;
            module.name = fromStored.name || module.name;
            module.days.forEach((day, di) => {
              const storedDay = fromStored.days?.[di];
              if (!storedDay) return;
              day.text = storedDay.text || day.text;
              day.completed = !!storedDay.completed;
            });
          });
          return merged;
        }

        normalizeRoadmapDays() {
          let counter = 1;
          this.state.roadmap.modules.forEach((mod) => {
            mod.days.forEach((day) => {
              day.day = `Day ${counter++}`;
              if (
                day.day === "Day 29" &&
                typeof day.text === "string" &&
                day.text.includes("Differential Amplifier using OpAmp")
              ) {
                day.text = "Differential Amplifier using OpAmp\nActive Load";
              }
            });
          });
        }

        ensureRoadmap() {
          if (!this.state.roadmap) this.state.roadmap = this.getRoadmapState();
          this.normalizeRoadmapDays();
        }

        normalizeTopic(text = "") {
          return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }

        saveTrainerState() {
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.TRAINER_STATE, this.state);
        }

        getTodayManualMissionChecks() {
          const today = this.app.getDateString(new Date());
          if (!this.state.manualMissionChecks[today]) {
            this.state.manualMissionChecks[today] = {};
          }
          return this.state.manualMissionChecks[today];
        }

        getMissionCheckId(topic = "") {
          return this.normalizeTopic(topic).replace(/\s+/g, "-") || "mission";
        }

        getThresholdForTopic(topic = "") {
          const key = this.normalizeTopic(topic);
          return MISSION_THRESHOLDS[key] || MISSION_THRESHOLDS.default;
        }

        getRoadmapProgress() {
          this.ensureRoadmap();
          let moduleIndex = 0;
          while (moduleIndex < this.state.roadmap.modules.length) {
            const mod = this.state.roadmap.modules[moduleIndex];
            if (!mod.days.every((d) => d.status === "completed" || d.completed)) break;
            moduleIndex += 1;
          }
          const activeModule =
            this.state.roadmap.modules[
              Math.min(moduleIndex, this.state.roadmap.modules.length - 1)
            ] || null;
          return { moduleIndex, activeModule };
        }

        getActiveRoadmapDay() {
          const { moduleIndex } = this.getRoadmapProgress();
          const module = this.state.roadmap.modules[moduleIndex];
          if (!module) return null;
          const dayIndex = module.days.findIndex((d) => d.status !== "completed" && !d.completed);
          if (dayIndex < 0) return null;
          return { moduleIndex, dayIndex, day: module.days[dayIndex], module };
        }

        getTopicProgress(topic, dateStr = this.app.getDateString(new Date())) {
          const normalizedTopic = this.normalizeTopic(topic);
          const topicWords = normalizedTopic
            .split(" ")
            .filter((w) => w.length > 3);
          let minutes = 0;
          let sessions = 0;

          this.app.state.tasks.forEach((task) => {
            if (
              !task ||
              task.date !== dateStr ||
              !this.app.isProductiveCategory(task.category)
            )
              return;
            const taskTopic = this.normalizeTopic(
              task.missionTopic || task.topic || "",
            );
            const haystack = this.normalizeTopic(
              `${task.description || ""} ${task.subcategory || ""} ${task.category || ""}`,
            );
            const matchesTopic =
              taskTopic === normalizedTopic ||
              topicWords.some((w) => haystack.includes(w));
            if (!matchesTopic) return;
            minutes += Number(task.duration || 0);
            sessions += 1;
          });

          return {
            minutes,
            sessions,
            threshold: this.getThresholdForTopic(topic),
          };
        }

        getDailyMissionTasks() {
          const active = this.getActiveRoadmapDay();
          const learning = [];

          if (active) {
            const moduleDays = active.module.days;
            for (let i = 0; i <= active.dayIndex; i++) {
              const day = moduleDays[i];
              const isDone = day.status === "completed" || day.completed;
              if (!isDone) learning.push(day);
            }
            if (!learning.length) learning.push(active.day);
          }

          const learningTasks = learning.slice(0, 1).map((day) => {
            const topic = (day.text || "").split("\n")[0].trim();
            const progress = this.getTopicProgress(topic);
            const done = progress.minutes >= progress.threshold;
            return { type: "learning", topic, progress, done };
          });

          const projectProgress = this.getTopicProgress("Project Work");
          const projectDone =
            projectProgress.minutes >=
            this.getThresholdForTopic("Project Work");
          const revisionProgress = this.getTopicProgress("Revision");
          const revisionThreshold = this.getThresholdForTopic("Revision");
          const revisionDone = revisionProgress.minutes >= revisionThreshold;

          return [
            ...learningTasks,
            {
              type: "project",
              topic: "Project Work",
              progress: projectProgress,
              done: projectDone,
            },
            {
              type: "revision",
              topic: "Revision",
              progress: revisionProgress,
              done: revisionDone,
              active: learningTasks.every((t) => t.done) && projectDone,
            },
          ];
        }

        syncMissionFromRoadmap() {
          try {

          // ── 2. Render the shadow-goal-list DOM from roadmap tasks ────
          const tasks = this.getDailyMissionTasks();
          const container = document.querySelector(".shadow-goal-list");
          if (!container) return;

          const taskIds = ["mission-task-1","mission-task-2","mission-task-3"];
          const checks = this.getTodayManualMissionChecks();

          container.innerHTML = tasks.map((item, idx) => {
            const autoDone = !!item.done;
            const checkId = this.getMissionCheckId(item.topic);
            const manualDone = !!checks[checkId];
            const done = autoDone || manualDone;
            const labelId = idx < 3 ? ` id="${taskIds[idx]}"` : "";
            const doneCls = done ? " shadow-goal-done" : "";
            return `<div class="shadow-goal-item${doneCls}"><span${labelId}>${idx + 1}. ${this.escapeHtml(item.topic)}</span><input class="mission-check" type="checkbox" data-mission-check-id="${this.escapeHtml(checkId)}" ${done ? "checked" : ""} /></div>`;
          }).join("");

          container.querySelectorAll(".mission-check").forEach(checkbox => {
            checkbox.addEventListener("change", (e) => {
              const checkId = e.target.getAttribute("data-mission-check-id");
              if (!checkId) return;
              checks[checkId] = !!e.target.checked;
              e.target.closest(".shadow-goal-item")?.classList.toggle("shadow-goal-done", !!e.target.checked);
              // Also mark on the roadmap day if this matches the active day
              if (this.state.roadmap?.modules?.length) {
                const { moduleIndex, activeModule } = this.getRoadmapProgress();
                if (activeModule) {
                  const activeDayIdx = activeModule.days.findIndex(d => d.status === "active" && this.getMissionCheckId((d.text||"").split("\n")[0].trim()) === checkId);
                  if (activeDayIdx >= 0 && e.target.checked) {
                    this.setRoadmapDayStatus(moduleIndex, activeDayIdx, true);
                    this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, this.state.roadmap);
                  }
                }
              }
              this.saveTrainerState();
              // Refresh scores after manual check
              if (this.app.shadowEngine) this.app.shadowEngine.refresh(false);
            });
          });

          // ── 3. Auto-complete via time tracking ───────────────────────
          const active = this.getActiveRoadmapDay();
          if (active) {
            const topic = (active.day.text || "").split("\n")[0].trim();
            const progress = this.getTopicProgress(topic);
            if (active.day.status !== "completed" && !active.day.completed &&
                progress.minutes >= this.getThresholdForTopic(topic)) {
              this.setRoadmapDayStatus(active.moduleIndex, active.dayIndex, true);
              this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, this.state.roadmap);
              this.normalizeRoadmapDays();
            }
          }
          } catch (err) {
            console.error("[syncMissionFromRoadmap] failed:", err);
          }
        }

        updatePenaltyTimer() {
          const el = this.app.elements["roadmap-penalty-timer"];
          if (!el) return;
          const { activeModule } = this.getRoadmapProgress();
          if (!activeModule) {
            el.textContent = "No active penalty";
            return;
          }
          const pending = activeModule.days.filter((d) => d.status !== "completed" && !d.completed).length;
          if (!pending) {
            el.textContent = "Module complete • no penalty";
            return;
          }

          const due = new Date();
          due.setHours(23, 59, 59, 999);
          const ms = Math.max(0, due - new Date());
          const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
          const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
          const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
          el.textContent = `Pending ${pending} task(s) • penalty countdown ${h}:${m}:${s} (applies if module is incomplete at deadline)`;
        }

        // Helper: manage completion and auto-unlock explicitly
        setRoadmapDayStatus(moduleIdx, dayIdx, isCompleted) {
          const day = this.state.roadmap.modules[moduleIdx]?.days[dayIdx];
          if (!day) return;

          if (isCompleted) {
            day.status = "completed";
            day.completed = true; // For backwards compat

            // Find next day and set to active
            let nextDayFound = false;
            for (let nextDi = dayIdx + 1; nextDi < this.state.roadmap.modules[moduleIdx].days.length; nextDi++) {
              const nDay = this.state.roadmap.modules[moduleIdx].days[nextDi];
              if (nDay.status !== "completed" && !nDay.completed) {
                nDay.status = "active";
                nextDayFound = true;
                break;
              }
            }

            // If no next day in module, check the next module
            if (!nextDayFound && this.state.roadmap.modules[moduleIdx + 1]) {
               const nDay = this.state.roadmap.modules[moduleIdx + 1].days[0];
               if (nDay && nDay.status !== "completed" && !nDay.completed) {
                 nDay.status = "active";
               }
            }
          } else {
             day.status = "active";
             day.completed = false;
          }
        }

        // Helper: show status message in roadmap generator
        _showRoadmapStatus(msg, type = "info") {
          const el = document.getElementById("ai-roadmap-status");
          if (!el) return;
          el.style.display = "block";
          el.textContent = msg;
          const colors = { info: "var(--text-secondary)", success: "var(--success)", error: "var(--danger)", loading: "var(--primary)" };
          el.style.color = colors[type] || colors.info;
          const borders = { info: "var(--border)", success: "var(--success)", error: "var(--danger)", loading: "var(--primary)" };
          el.style.borderLeftColor = borders[type] || borders.info;
        }

        // Helper: normalize any AI/imported JSON into internal schema
        _normalizeRoadmapJson(rawJson, topic, type = "ai") {
          const modules = rawJson.modules.map((m, idx) => ({
            name: m.moduleTitle || m.module || m.name || `Module ${m.moduleNumber || idx + 1}`,
            days: (m.days || []).map((d, di) => {
              const isCompleted = d.status === "completed" || d.completed;
              return {
                day: `Day ${d.day || di + 1}`,
                text: d.title || d.topic || d.text || `Day ${di + 1}`,
                status: isCompleted ? "completed" : "locked",
              };
            }),
          }));
          return {
            topic: topic || rawJson.topic || "Untitled",
            type,
            createdAt: Date.now(),
            modules,
            editMode: false,
          };
        }

        // Helper: save roadmap to state + Firebase + re-render
        _saveRoadmap(roadmap) {
          this.state.roadmap = roadmap;
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, roadmap);
          this.refresh();
        }

        // Helper: check if a roadmap for this topic already exists in Firebase
        async _checkDuplicateTopic(topic) {
          const cloudManager = this.app.cloudManager;
          if (!cloudManager?.isReady) return false;
          const ref = window.FirebaseServices.doc(cloudManager.db, "users", cloudManager.user.uid, "roadmap", "main");
          const snap = await window.FirebaseServices.getDoc(ref).catch(() => null);
          if (!snap?.exists()) return false;
          const existing = snap.data();
          return existing?.topic?.toLowerCase().trim() === topic.toLowerCase().trim();
        }

        async generateAIRoadmap() {
          const topicEl = document.getElementById("ai-roadmap-topic");
          const keyEl = document.getElementById("gemini-api-key");
          const genBtn = document.getElementById("generate-roadmap-btn");

          const topic = topicEl?.value.trim();
          const apiKey = keyEl?.value.trim();

          if (!topic) { this._showRoadmapStatus("⚠️ Please enter a topic.", "error"); return; }
          if (!apiKey) { this._showRoadmapStatus("⚠️ Please enter your Gemini API key.", "error"); return; }

          localStorage.setItem("gemini_api_key_saved", apiKey);
          if (genBtn) genBtn.disabled = true;

          try {
            // Step 1: Duplicate check
            this._showRoadmapStatus("🔍 Checking for existing roadmap...", "loading");
            const isDuplicate = await this._checkDuplicateTopic(topic);
            if (isDuplicate) {
              const overwrite = confirm(`A roadmap for "${topic}" already exists.\n\nDo you want to overwrite it?`);
              if (!overwrite) {
                this._showRoadmapStatus("ℹ️ Kept your existing roadmap.", "info");
                return;
              }
            }

            // Step 2: Generate
            this._showRoadmapStatus(`✨ Generating AI roadmap for "${topic}"… Please wait.`, "loading");

            const prompt = `Create a structured learning roadmap for the topic: "${topic}".
Return ONLY valid JSON — absolutely NO markdown, NO extra text outside the JSON.
Use this EXACT schema:
{"topic":"${topic}","modules":[{"moduleNumber":1,"moduleTitle":"MODULE NAME","days":[{"day":1,"title":"Day topic","status":"completed"},{"day":2,"title":"Day topic","status":"active"},{"day":3,"title":"Day topic","status":"locked"}]}]}
Rules:
- Include at least 3 modules with 5-8 days each.
- Day numbers continue sequentially across ALL modules (1, 2, 3, 4...).
- Day 1 of the FIRST module: status="completed".
- Day 2 of the FIRST module: status="active".
- All other days: status="locked".
- Return ONLY the JSON object, nothing else.`;

            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
              }
            );

            // Precise API error messages
            if (!response.ok) {
              const errBody = await response.json().catch(() => ({}));
              const errMsg = errBody?.error?.message || "";
              if (response.status === 400 || response.status === 403) {
                throw new Error(`Invalid API key. Please check your key at https://aistudio.google.com (Status: ${response.status})`);
              } else if (response.status === 404) {
                throw new Error(`Model not found. The 'gemini-2.0-flash' model may not be available for your key yet. Try again or check https://aistudio.google.com.`);
              } else if (response.status === 429) {
                throw new Error("Rate limit hit — you sent too many requests in a short time. Wait 60 seconds and try again. (Your free daily quota is fine.)");
              } else if (response.status === 503) {
                throw new Error("Gemini API is temporarily unavailable. Try again in a few minutes.");
              } else {
                throw new Error(`API error ${response.status}: ${errMsg || "Unknown error"}`);
              }
            }

            // Step 3: Parse + validate
            this._showRoadmapStatus("📦 Parsing response...", "loading");
            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textResponse) throw new Error("AI returned an empty response. Try again.");

            let jsonStr = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
            // Extract JSON object if surrounded by extra text
            const match = jsonStr.match(/\{[\s\S]*\}/);
            if (match) jsonStr = match[0];

            const rawJson = JSON.parse(jsonStr);
            if (!rawJson.modules || !Array.isArray(rawJson.modules) || rawJson.modules.length === 0) {
              throw new Error("AI returned a roadmap with no modules. Try again with a more specific topic.");
            }

            // Step 4: Normalize + save
            this._showRoadmapStatus("💾 Saving roadmap...", "loading");
            const roadmap = this._normalizeRoadmapJson(rawJson, topic, "ai");
            this._saveRoadmap(roadmap);
            if (topicEl) topicEl.value = "";

            const title = document.getElementById("trainer-modal-title");
            if (title) title.textContent = `Roadmap: ${topic}`;

            this._showRoadmapStatus(`✅ Roadmap for "${topic}" generated and saved!`, "success");

          } catch (e) {
            console.error("generateAIRoadmap error:", e);
            this._showRoadmapStatus("❌ " + e.message, "error");
          } finally {
            if (genBtn) genBtn.disabled = false;
          }
        }

        async importJsonRoadmap() {
          const textarea = document.getElementById("json-import-input");
          const importBtn = document.getElementById("import-roadmap-btn");
          const raw = textarea?.value.trim();

          if (!raw) { this._showRoadmapStatus("⚠️ Please paste your JSON roadmap first.", "error"); return; }

          if (importBtn) importBtn.disabled = true;

          try {
            this._showRoadmapStatus("🔍 Validating JSON...", "loading");

            let rawJson;
            try {
              rawJson = JSON.parse(raw);
            } catch {
              throw new Error("Invalid JSON syntax. Check for missing commas, brackets, or quotes.");
            }

            // Validate required fields
            if (!rawJson.topic) throw new Error("Missing required field: 'topic'");
            if (!Array.isArray(rawJson.modules) || rawJson.modules.length === 0) throw new Error("Missing or empty 'modules' array");
            for (const mod of rawJson.modules) {
              if (mod.moduleNumber === undefined) throw new Error(`Module missing 'moduleNumber'`);
              if (!Array.isArray(mod.days) || mod.days.length === 0) throw new Error(`Module '${mod.moduleTitle || mod.moduleNumber}' has no days`);
              for (const day of mod.days) {
                if (day.day === undefined) throw new Error("A day entry is missing the 'day' field");
                if (!day.title) throw new Error("A day entry is missing the 'title' field");
                if (!day.status) throw new Error("A day entry is missing the 'status' field");
              }
            }

            // Duplicate check
            const topic = rawJson.topic.trim();
            this._showRoadmapStatus("🔍 Checking for existing roadmap...", "loading");
            const isDuplicate = await this._checkDuplicateTopic(topic);
            if (isDuplicate) {
              const overwrite = confirm(`A roadmap for "${topic}" already exists.\n\nDo you want to overwrite it?`);
              if (!overwrite) {
                this._showRoadmapStatus("ℹ️ Import cancelled. Existing roadmap kept.", "info");
                return;
              }
            }

            this._showRoadmapStatus("💾 Saving roadmap...", "loading");
            const roadmap = this._normalizeRoadmapJson(rawJson, topic, "imported");
            this._saveRoadmap(roadmap);

            const title = document.getElementById("trainer-modal-title");
            if (title) title.textContent = `Roadmap: ${topic}`;

            if (textarea) textarea.value = "";
            this._showRoadmapStatus(`✅ Roadmap "${topic}" imported and saved successfully!`, "success");

          } catch (e) {
            console.error("importJsonRoadmap error:", e);
            this._showRoadmapStatus("❌ " + e.message, "error");
          } finally {
            if (importBtn) importBtn.disabled = false;
          }
        }


        renderRoadmap() {
          this.ensureRoadmap();
          const overview = this.app.elements["trainer-overview"];
          const content = this.app.elements["trainer-content"];
          if (!overview || !content) return;
          
          if (!this.state.roadmap || !this.state.roadmap.modules || this.state.roadmap.modules.length === 0) {
             overview.innerHTML = ``;
             content.innerHTML = `
               <div style="text-align: center; padding: 40px 20px;">
                 <h3 style="color: var(--text-accent); margin-bottom: 12px;">Roadmap not generated yet</h3>
                 <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95rem;">Enter a topic and your Gemini API key above to generate your private AI roadmap.</p>
               </div>
             `;
             return;
          }

          const { moduleIndex, activeModule } = this.getRoadmapProgress();
          const completedModules = this.state.roadmap.modules.filter((m) =>
            m.days.every((d) => d.status === "completed" || d.completed),
          ).length;
          overview.innerHTML = `
          <div class="trainer-overview-card"><div class="trainer-overview-label">Active Module</div><div class="trainer-overview-value">${this.escapeHtml(activeModule?.name || "Completed")}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Modules Complete</div><div class="trainer-overview-value">${completedModules}/${this.state.roadmap.modules.length}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Unlocked Module</div><div class="trainer-overview-value">${moduleIndex + 1}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Edit Mode</div><div class="trainer-overview-value">${this.state.roadmap.editMode ? "ON" : "OFF"}</div></div>
        `;

          let html = "";
          this.state.roadmap.modules.forEach((mod, mi) => {
            const unlocked = mi <= moduleIndex;
            const done = mod.days.every((d) => d.status === "completed" || d.completed);
            const moduleTitle = this.state.roadmap.editMode
              ? `<input class="roadmap-module-edit" data-module="${mi}" value="${this.escapeHtml(mod.name)}"/>`
              : this.escapeHtml(mod.name);
            html += `<section class="trainer-section"><div class="trainer-section-title">${moduleTitle} ${done ? "✔" : ""}</div>`;
            mod.days.forEach((day, di) => {
              // Backward comp logic for old 'completed' boolean vs new 'status' string
              let status = day.status;
              if (!status) status = day.completed ? "completed" : "locked";

              // Map unlocked to first locked item or already active items
              const dayUnlocked = unlocked && (status === "active" || (di === 0 && !status) || (di === 0 && status === "locked") || (di > 0 && (mod.days[di - 1].status === "completed" || mod.days[di - 1].completed)));
              if (status === "locked" && dayUnlocked) status = "active";

              const disabled = status === "locked" ? "disabled" : "";
              const checked = status === "completed" ? "checked" : "";
              const stateIcon = status === "completed" ? "✔" : status === "active" ? "●" : "🔒";
              const stateLabel = status === "completed" ? "Completed" : status === "active" ? "Active" : "Locked";
              if (this.state.roadmap.editMode) {
                html += `<div class="trainer-row"><div class="trainer-key">${day.day} ${stateIcon}</div><div class="trainer-val"><textarea data-module="${mi}" data-day="${di}" class="roadmap-edit">${this.escapeHtml(day.text)}</textarea></div><label><input type="checkbox" data-module="${mi}" data-day="${di}" class="roadmap-check" ${checked} ${disabled}/> ${stateLabel}</label></div>`;
              } else {
                html += `<div class="trainer-row"><div class="trainer-key">${day.day} ${stateIcon}</div><div class="trainer-val">${this.escapeHtml(day.text)}</div><label><input type="checkbox" data-module="${mi}" data-day="${di}" class="roadmap-check" ${checked} ${disabled}/> ${stateLabel}</label></div>`;
              }
            });
            html += `</section>`;
          });
          content.innerHTML = html;

          content.querySelectorAll(".roadmap-check").forEach((cb) =>
            cb.addEventListener("change", (e) => {
              const m = Number(e.target.getAttribute("data-module"));
              const d = Number(e.target.getAttribute("data-day"));
              this.setRoadmapDayStatus(m, d, !!e.target.checked);
              this.app.saveToStorage(
                CONFIG.STORAGE_KEYS.ROADMAP_STATE,
                this.state.roadmap,
              );
              this.refresh();
              this.app.shadowEngine?.refresh(false);
            }),
          );

          if (this.state.roadmap.editMode) {
            content.querySelectorAll(".roadmap-module-edit").forEach((inp) =>
              inp.addEventListener("change", (e) => {
                const m = Number(e.target.getAttribute("data-module"));
                if (this.state.roadmap.modules[m])
                  this.state.roadmap.modules[m].name =
                    e.target.value.trim() || this.state.roadmap.modules[m].name;
              }),
            );

            content.querySelectorAll(".roadmap-edit").forEach((area) =>
              area.addEventListener("change", (e) => {
                const m = Number(e.target.getAttribute("data-module"));
                const d = Number(e.target.getAttribute("data-day"));
                const day = this.state.roadmap.modules[m]?.days[d];
                if (!day) return;
                day.text = e.target.value.trim() || day.text;
              }),
            );
          }
        }

        refresh() {
          // ── SE2 Daily Cycle (deterministic, sequential) ──────────────────
          // Step 1: readTodayData
          const todayDate = this.app.getDateString(new Date());
          const todayTasks = this.app.state.tasks || [];

          // Step 2: analyzeBehavior — reads from BehaviorStore + shadowEngine
          const behaviorSnapshot = this.analyzeBehavior();

          // Step 3: detectBehavioralState (via shadow engine)
          const behavioralState = behaviorSnapshot.state; // RECOVERY | STABLE | GROWTH

          // Step 4: applyCorrection — evaluate timetable & sleep compromise
          const timetable = this.evaluateTimetable(todayTasks, todayDate);
          const sleepCompromised = timetable.sleepStatus === "COMPROMISED_OK";

          // Step 5: generateMissions — produces corrected targets per goal
          const missionTargets = this.generateMissionTargets(behavioralState, sleepCompromised);

          // Step 6: applyRules — anti-misuse (computeFlexibilityBuffer already mutates BehaviorStore)
          this.computeFlexibilityBuffer();

          // Step 7: Persist all updated behavioral signals immediately
          if (this.app.shadowEngine?.behaviorStore) {
            const todayMinutes = this.getDailyProductiveMap().get(todayDate) || 0;
            this.app.shadowEngine.updateBehaviorSignals(
              todayDate,
              todayMinutes,
              this.app.shadowEngine.shadowSevenDayAverage || 0,
            );
          }

          // Step 8: Render roadmap UI and mission panel
          this.ensureRoadmap();
          this.renderRoadmap();
          this.syncMissionFromRoadmap();
          this.updatePenaltyTimer();
        }

        showWindow() {
          this.refresh();
          this.app.elements["trainer-modal"].style.display = "flex";
        }

        copyPlan() {
          this.ensureRoadmap();
          this.app.saveToStorage(
            CONFIG.STORAGE_KEYS.ROADMAP_STATE,
            this.state.roadmap,
          );
        }

        async deleteRoadmap() {
          if (!this.state.roadmap?.modules?.length) {
            alert("No roadmap to delete.");
            return;
          }
          const topicLabel = this.state.roadmap.topic ? `"${this.state.roadmap.topic}"` : "your current roadmap";
          const confirmed = confirm(`Are you sure you want to permanently delete ${topicLabel}?\n\nThis cannot be undone.`);
          if (!confirmed) return;

          // Clear local state
          this.state.roadmap = { modules: [], editMode: false };
          this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, this.state.roadmap);

          // Delete from Firebase
          const cloudManager = this.app.cloudManager;
          if (cloudManager?.isReady) {
            const ref = window.FirebaseServices.doc(cloudManager.db, "users", cloudManager.user.uid, "roadmap", "main");
            window.FirebaseServices.setDoc(ref, { modules: [], editMode: false }, { merge: false })
              .catch(e => console.warn("Failed to clear roadmap in Firebase", e));
          }

          const title = document.getElementById("trainer-modal-title");
          if (title) title.textContent = "Roadmap Console";

          this.refresh();
          this._showRoadmapStatus("🗑️ Roadmap deleted.", "info");
        }

        hideWindow() {
          this.app.elements["trainer-modal"].style.display = "none";
        }
      }