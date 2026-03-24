class ShadowEngine {
        constructor(app) {
          this.app = app;
          this.shadowSevenDayAverage = 0;
          this.rankTiers = [
            { min: 0, title: "Initiate", badge: "Baseline" },
            { min: 120, title: "Builder", badge: "Builder" },
            { min: 180, title: "Operator", badge: "Operator" },
            { min: 240, title: "Executor", badge: "Executor" },
            { min: 300, title: "Elite", badge: "Elite" },
            { min: 360, title: "Apex", badge: "Apex" },
            { min: 420, title: "Overdrive", badge: "Legend" },
          ];
        }

        initialize() {
    try {
      console.group('ShadowEngine Initialization');

          const stored = parseFloat(
            this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_AVG),
          );
          this.shadowSevenDayAverage = Number.isFinite(stored) ? stored : 0;
          this.refresh(false);
    } catch (error) {
      console.error('[ShadowEngine] Initialization failed:', error);
    } finally {
      console.groupEnd();
    }
        }

        getDailyProductiveMap() {
          const dailyMap = new Map();
          this.app.state.tasks.forEach((task) => {
            if (!this.app.isProductiveCategory(task.category)) return;
            dailyMap.set(
              task.date,
              (dailyMap.get(task.date) || 0) + task.duration,
            );
          });
          return dailyMap;
        }

        getTodayGoalProgress(dateStr = this.app.getDateString(new Date())) {
          const goals = CONFIG.DAILY_GOALS || [];
          const progress = {};

          goals.forEach((goal) => {
            progress[goal.id] = {
              type: goal.type || "time",
              minutes: 0,
              sessions: 0,
              minutesTarget: goal.minutesTarget || 0,
              sessionsTarget: goal.sessionsTarget || 0,
              completed: goal.completed || false,
            };
          });

          this.app.state.tasks.forEach((task) => {
            if (
              !task ||
              task.date !== dateStr ||
              !Number.isFinite(task.duration) ||
              task.duration <= 0
            )
              return;
            const haystack =
              `${task.description || ""} ${task.subcategory || ""} ${task.category || ""}`.toLowerCase();
            goals.forEach((goal) => {
              if (goal.type === "checkbox") return;
              if (!goal.keywords?.some((word) => haystack.includes(word)))
                return;
              progress[goal.id].minutes += task.duration;
              progress[goal.id].sessions += 1;
            });
          });

          return progress;
        }

        calculateMissionScore(progress) {
          const keys = Object.keys(progress);
          if (keys.length === 0) return 100;

          const weightPerGoal = 100 / keys.length;
          let totalScore = 0;

          keys.forEach((key) => {
            const goal = progress[key];
            if (goal.type === "checkbox") {
              totalScore += goal.completed ? weightPerGoal : 0;
            } else {
              const minRatio = Math.min(1, goal.minutes / Math.max(1, goal.minutesTarget));
              const sesRatio = goal.sessionsTarget > 0 ? Math.min(1, goal.sessions / goal.sessionsTarget) : minRatio;
              totalScore += (minRatio * 0.6 + sesRatio * 0.4) * weightPerGoal;
            }
          });

          return Math.round(Math.min(100, totalScore));
        }

        getTodayDistractionMinutes(
          dateStr = this.app.getDateString(new Date()),
        ) {
          return this.app.state.tasks
            .filter(
              (task) =>
                task.date === dateStr &&
                (task.category === "Time Waste / Distraction" ||
                  task.graph_tag === "distraction"),
            )
            .reduce((sum, task) => sum + task.duration, 0);
        }

        getWinLadder(dailyMap, shadowAvg) {
          const days = [];
          const today = new Date(this.app.getDateString());
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const ds = this.app.getDateString(d);
            const minutes = dailyMap.get(ds) || 0;
            days.push({ date: ds, win: minutes >= shadowAvg });
          }
          const winsIn5 = days.slice(-5).filter((d) => d.win).length;
          const winsIn7 = days.filter((d) => d.win).length;
          return {
            winsIn5,
            winsIn7,
            status3in5: `${winsIn5}/3`,
            status5in7: `${winsIn7}/5`,
            clear3in5: winsIn5 >= 3,
            clear5in7: winsIn7 >= 5,
          };
        }

        buildDailyProductiveSeries() {
          const dailyMap = this.getDailyProductiveMap();
          if (dailyMap.size === 0) return [];

          const sorted = [...dailyMap.keys()].sort();
          const start = new Date(sorted[0]);
          const end = new Date(this.app.getDateString());
          const series = [];

          for (
            let cursor = new Date(start);
            cursor <= end;
            cursor.setDate(cursor.getDate() + 1)
          ) {
            const key = this.app.getDateString(cursor);
            series.push(dailyMap.get(key) || 0);
          }
          return series;
        }

        computeRollingMetrics() {
          const series = this.buildDailyProductiveSeries();
          if (!series.length)
            return {
              bestAvg: 0,
              currentAvg: 0,
              previousAvg: 0,
              todayMinutes: 0,
              hasMomentumBaseline: false,
            };

          const prefix = new Array(series.length + 1).fill(0);
          for (let i = 0; i < series.length; i++)
            prefix[i + 1] = prefix[i] + series[i];

          const lastIdx = series.length - 1;
          const todayMinutes = series[lastIdx] || 0;

          // Historical shadow excludes today (completed history only)
          const historicalEnd = Math.max(0, lastIdx);
          let bestAvg = 0;
          if (historicalEnd > 0) {
            if (historicalEnd < 7) bestAvg = prefix[historicalEnd] / 7;
            else {
              for (let i = 7; i <= historicalEnd; i++) {
                const avg = (prefix[i] - prefix[i - 7]) / 7;
                if (avg > bestAvg) bestAvg = avg;
              }
            }
          }

          const endIdx = series.length;
          const currentAvg =
            (prefix[endIdx] - prefix[Math.max(0, endIdx - 7)]) / 7;

          const prevEnd = Math.max(0, endIdx - 7);
          const prevStart = Math.max(0, prevEnd - 7);
          const previousAvg =
            prevEnd > 0 ? (prefix[prevEnd] - prefix[prevStart]) / 7 : 0;
          const hasMomentumBaseline = prevEnd - prevStart >= 4;

          return {
            bestAvg,
            currentAvg,
            previousAvg,
            todayMinutes,
            hasMomentumBaseline,
          };
        }

        getShadowRank(minutes) {
          let selected = this.rankTiers[0];
          for (const tier of this.rankTiers)
            if (minutes >= tier.min) selected = tier;
          return selected;
        }

        getCurrentStatus(percentage) {
          if (percentage >= 100) return "STANDARD BROKEN";
          if (percentage >= 90) return "AT THE GATE";
          if (percentage >= 70) return "TRAILING";
          return "OUT OF RANGE";
        }

        getProgressStyle(percentage) {
          if (percentage >= 100)
            return {
              color: "#28a745",
              shadow: "0 0 12px rgba(40,167,69,0.45)",
            };
          if (percentage >= 90) return { color: "#007bff", shadow: "none" };
          if (percentage >= 70) return { color: "#ffc107", shadow: "none" };
          return { color: "#dc3545", shadow: "none" };
        }

        getMomentum(currentAvg, previousAvg, hasBaseline) {
          if (!hasBaseline)
            return {
              label: "Insufficient history",
              cls: "shadow-momentum-flat",
            };
          const delta = currentAvg - previousAvg;
          if (delta > 8)
            return {
              label: `Rising (+${this.app.formatDuration(delta)})`,
              cls: "shadow-momentum-positive",
            };
          if (delta < -8)
            return {
              label: `Drifting (-${this.app.formatDuration(Math.abs(delta))})`,
              cls: "shadow-momentum-negative",
            };
          return { label: "Stable", cls: "shadow-momentum-flat" };
        }

        getPressure(percentage, weeklyGap, recentWinRate, missionScore = 100) {
          // Penalty-only pressure model: no positive buff reductions.
          const weeklyPenalty = weeklyGap > 0 ? 1 : 0;
          const trendPenalty =
            recentWinRate < 0.35 ? 2 : recentWinRate < 0.55 ? 1 : 0;

          let level = 0; // 0 controlled, 1 elevated, 2 high, 3 critical
          if (percentage >= 100) level = 0;
          else if (percentage >= 90) level = 1;
          else if (percentage >= 70) level = 2;
          else level = 3;

          const missionPenalty = missionScore < 50 ? 1 : 0;
          level = Math.min(
            3,
            level + weeklyPenalty + trendPenalty + missionPenalty,
          );

          if (level <= 0)
            return {
              label: "Pressure: Controlled",
              cls: "shadow-pressure-low",
            };
          if (level === 1)
            return { label: "Pressure: Elevated", cls: "shadow-pressure-mid" };
          if (level === 2)
            return { label: "Pressure: High", cls: "shadow-pressure-mid" };
          return { label: "Pressure: Critical", cls: "shadow-pressure-high" };
        }

        countShadowWinsThisMonth(dailyMap, shadowAvg) {
          if (shadowAvg <= 0)
            return {
              myWins: 0,
              shadowWins: 0,
              activeDays: 0,
              recentWinRate: 0,
            };
          const now = new Date();
          const month = now.getMonth();
          const year = now.getFullYear();
          const todayStr = this.app.getDateString(now);
          const monthDays = [];
          
          let myWins = 0;
          let activeDays = 0;
          let shadowWins = 0;

          for (let day = 1; day <= now.getDate(); day++) {
            const d = new Date(year, month, day);
            const date = this.app.getDateString(d);
            const minutes = dailyMap.get(date) || 0;
            
            if (minutes === 0) continue; // skip unlogged / rest days
            
            const isToday = (date === todayStr);
            const isWin = minutes >= shadowAvg;
            
            if (isWin) {
              myWins++;
              activeDays++;
            } else if (!isToday) {
              // Only count as a loss if the day is in the past!
              shadowWins++;
              activeDays++;
            }
            
            // Only add to recent history if the day's result is finalized or won
            if (isWin || !isToday) {
              monthDays.push({ date, isWin });
            }
          }

          monthDays.sort((a, b) => a.date.localeCompare(b.date));
          const recent = monthDays.slice(-7);
          const recentWins = recent.filter((d) => d.isWin).length;
          const recentWinRate = recent.length ? recentWins / recent.length : 0;

          return { myWins, shadowWins, activeDays, recentWinRate };
        }

        getPenalty(
          todayMinutes,
          shadowAvg,
          weeklyGap,
          recentWinRate,
          distractionMinutes = 0,
          missionScore = 0,
        ) {
          let points = 0;
          const reasons = [];
          if (todayMinutes < shadowAvg) {
            points += 1;
            reasons.push("Behind daily shadow target");
          }
          if (weeklyGap > 0) {
            points += 1;
            reasons.push("Weekly average below shadow standard");
          }
          if (recentWinRate < 0.5) {
            points += 1;
            reasons.push("Monthly win-rate under 50%");
          }
          if (missionScore < 60) {
            points += 1;
            reasons.push("Mission score below 60/100");
          }
          const today = this.app.getDateString();
          const untracked = this.app.getInferredWasteMinutesForDate(
            today,
            this.app.state.tasks,
          );
          if (untracked >= 300) {
            points += 2;
            reasons.push("High untracked time today (5h+)");
          } else if (untracked >= 120) {
            points += 1;
            reasons.push("Untracked time today (2h+)");
          }

          const budget = CONFIG.DISTRACTION_BUDGET_MINUTES;
          const overBudget = Math.max(0, distractionMinutes - budget);
          if (overBudget > 0) {
            const overPoints = Math.max(1, Math.ceil(overBudget / 30));
            points += overPoints;
            reasons.push(
              `Distraction budget exceeded by ${this.app.formatDuration(overBudget)}`,
            );
          }

          const minutes = points * 15;
          return {
            points,
            minutes,
            untracked,
            reasons,
            budget,
            distractionMinutes,
            overBudget,
          };
        }

        render({
          todayMinutes,
          shadowAvg,
          currentAvg,
          previousAvg,
          hasMomentumBaseline,
          isNewStandard,
        }) {
          const safeShadow = shadowAvg > 0 ? shadowAvg : 1;
          const gap = shadowAvg - todayMinutes;
          const weeklyGap = shadowAvg - currentAvg;
          const percentage = (todayMinutes / safeShadow) * 100;

          const dailyMap = this.getDailyProductiveMap();
          const competition = this.countShadowWinsThisMonth(
            dailyMap,
            shadowAvg,
          );
          const scoreDiff = competition.myWins - competition.shadowWins;
          const targetToday = shadowAvg > 0 ? Math.ceil(shadowAvg + 1) : 0;
          const neededTie = Math.max(0, shadowAvg - todayMinutes);
          const neededLead = Math.max(0, shadowAvg - todayMinutes + 1);
          const todayDate = this.app.getDateString(new Date());
          const goalProgress = this.getTodayGoalProgress(todayDate);
          const missionScore = this.calculateMissionScore(goalProgress);
          const distractionMinutes = this.getTodayDistractionMinutes(todayDate);
          const penalty = this.getPenalty(
            todayMinutes,
            shadowAvg,
            weeklyGap,
            competition.recentWinRate,
            distractionMinutes,
            missionScore,
          );
          const ladder = this.getWinLadder(dailyMap, shadowAvg);
          const defenseTarget = Math.max(
            0,
            Math.ceil(shadowAvg + penalty.minutes),
          );
          const totalDuel = Math.max(
            1,
            competition.myWins + competition.shadowWins,
          );
          const youShare = Math.max(
            0,
            Math.min(100, (competition.myWins / totalDuel) * 100),
          );
          const shadowShare = Math.max(
            0,
            Math.min(100, (competition.shadowWins / totalDuel) * 100),
          );

          const last7 = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = this.app.getDateString(d);
            last7.push(dailyMap.get(ds) || 0);
          }
          const sorted7 = [...last7].sort((a, b) => a - b);
          const p70Index = Math.max(0, Math.ceil(0.7 * sorted7.length) - 1);
          const shadowStandard = sorted7[p70Index] || shadowAvg;
          const momentumScore =
            shadowStandard > 0 ? todayMinutes / shadowStandard : 0;
          const daysAboveShadow = last7.filter(
            (v) => v >= shadowStandard && shadowStandard > 0,
          ).length;
          const consistencyIndex = `${daysAboveShadow}/7`;
          const xMean = 3;
          const yMean = last7.reduce((a, b) => a + b, 0) / 7;
          let num = 0;
          let den = 0;
          last7.forEach((v, i) => {
            const dx = i - xMean;
            num += dx * (v - yMean);
            den += dx * dx;
          });
          const slope = den ? num / den : 0;
          const growthTrend = slope > 2 ? "UP" : slope < -2 ? "DOWN" : "STABLE";

          const setText = (id, text) => { if (this.app.elements[id]) this.app.elements[id].textContent = text; };
          const setClass = (id, cls) => { if (this.app.elements[id]) this.app.elements[id].className = cls; };
          const setStyle = (id, prop, val) => { if (this.app.elements[id]) this.app.elements[id].style[prop] = val; };

          setText("shadow-current-minutes", this.app.formatDuration(todayMinutes));
          setText("shadow-average", this.app.formatDuration(shadowAvg));
          setText("shadow-weekly-average", this.app.formatDuration(currentAvg));
          setText("shadow-standard-metric", this.app.formatDuration(shadowStandard));
          setText("shadow-momentum-score", `${momentumScore.toFixed(2)}x`);
          setText("shadow-consistency-index", consistencyIndex);
          setText("shadow-growth-trend", growthTrend);
          setText("shadow-target", this.app.formatDuration(targetToday));
          setText("shadow-needed-tie", this.app.formatDuration(neededTie));
          setText("shadow-needed-lead", this.app.formatDuration(neededLead));
          setText("shadow-defense-target", this.app.formatDuration(defenseTarget));
          // Fix 5: Concise penalty text
          setText("shadow-penalty", `-${this.app.formatDuration(penalty.minutes)}`);

          // Fix 2: Penalty reason — concise, lowercase
          const reasonMap = {
            "Monthly win-rate under 50%": "win-rate <50%",
            "High untracked time today (5h+)": "untracked >5h",
            "Untracked time today (2h+)": "untracked >2h",
            "Behind daily shadow target": "below shadow target",
            "Weekly average below shadow standard": "weekly avg low",
            "Mission score below 60/100": "mission <60",
          };
          const shortReasons = penalty.reasons.map(r => reasonMap[r] || r.toLowerCase());
          setText("shadow-penalty-reason", shortReasons.length ? shortReasons.join(" · ") : "no active penalty triggers");

          const expiryEl = this.app.elements["shadow-penalty-expiry"];
          // Always clear before potentially creating a new one — prevents interval stacking
          if (this.penaltyCountdownTimer) {
            clearInterval(this.penaltyCountdownTimer);
            this.penaltyCountdownTimer = null;
          }
          if (penalty.points > 0) {
            const updateCountdown = () => {
              const now = new Date();
              const end = new Date(now);
              end.setHours(23, 59, 59, 999);
              const ms = Math.max(0, end - now);
              const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
              const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
              const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
              // Fix 5: Short expiry text
              expiryEl.textContent = `${h}:${m}:${s}`;
            };
            updateCountdown();
            this.penaltyCountdownTimer = setInterval(updateCountdown, 1000);
          } else {
            expiryEl.textContent = "--:--:--";
          }

          const budgetEl = this.app.elements["shadow-distraction-budget"];
          budgetEl.textContent = `${this.app.formatDuration(penalty.distractionMinutes)} / ${this.app.formatDuration(penalty.budget)}`;
          budgetEl.className = penalty.overBudget > 0 ? "shadow-overbudget" : "";

          setText("shadow-win-ladder", `3/5: ${ladder.status3in5}${ladder.clear3in5 ? " ✓" : ""} · 5/7: ${ladder.status5in7}${ladder.clear5in7 ? " ✓" : ""}`);
          setText("shadow-mission-score", `${missionScore}/100`);
          setText("shadow-weekly-gap", `${weeklyGap >= 0 ? "-" : "+"}${this.app.formatDuration(Math.abs(weeklyGap))}`);
          setClass("shadow-weekly-gap", weeklyGap > 0 ? "sd-row-value sd-num red" : weeklyGap < 0 ? "sd-row-value sd-num green" : "sd-row-value sd-num");

          const momentum = this.getMomentum(currentAvg, previousAvg, hasMomentumBaseline);
          setText("shadow-momentum", momentum.label);
          setClass("shadow-momentum", momentum.cls);

          // Hero cards
          setText("shadow-percent", `${percentage.toFixed(1)}% reached`);
          setText("shadow-gap", `${gap >= 0 ? "-" : "+"}${this.app.formatDuration(Math.abs(gap))}`);
          setClass("shadow-gap", gap > 0 ? "sd-hero-value sd-num gap red" : gap < 0 ? "sd-hero-value sd-num gap green" : "sd-hero-value sd-num gap");

          setText("shadow-status", this.getCurrentStatus(percentage));
          const pressure = this.getPressure(percentage, weeklyGap, competition.recentWinRate, missionScore);
          setText("shadow-pressure", pressure.label.toLowerCase());
          setClass("shadow-pressure", `sd-strip-badge amber`);

          const rank = this.getShadowRank(shadowAvg);
          setText("shadow-rank", `Rank: ${rank.title}`);
          setText("shadow-badge", rank.badge);
          setText("shadow-score", `Monthly Score (days): You ${competition.myWins} - Shadow ${competition.shadowWins}`);
          setText("shadow-duel", scoreDiff > 0 ? `Leader: You (+${scoreDiff})` : scoreDiff < 0 ? `Leader: Shadow (+${Math.abs(scoreDiff)})` : "Leader: Even");

          // Fix 4: Lead margin — value + days, red if losing
          setText("shadow-lead-margin", `Lead Margin: ${Math.abs(scoreDiff)}`);

          setText("shadow-trend", `Monthly trend: ${(competition.recentWinRate * 100).toFixed(0)}% win rate`);
          setText("shadow-verdict", scoreDiff >= 0 ? `You lead monthly by ${Math.abs(scoreDiff)} day-win(s); hold at least ${this.app.formatDuration(defenseTarget)} tomorrow. Mission ${missionScore}/100.` : `You are behind by ${this.app.formatDuration(neededTie)} today and ${Math.abs(scoreDiff)} monthly day-win(s). Mission ${missionScore}/100.`);

          // Fix 2: VS Duel YOU panel — bind to computed shadow values
          const duelYouTimeEl = document.getElementById('sd-duel-you-time');
          if (duelYouTimeEl) duelYouTimeEl.textContent = this.app.formatDuration(todayMinutes);
          const duelYouPctEl = document.getElementById('sd-duel-you-pct');
          if (duelYouPctEl) duelYouPctEl.textContent = `${percentage.toFixed(1)}% reached`;
          const duelGapEl = document.getElementById('sd-duel-gap');
          if (duelGapEl) {
            duelGapEl.textContent = `${gap >= 0 ? "-" : "+"}${this.app.formatDuration(Math.abs(gap))}`;
            duelGapEl.className = gap < 0 ? 'sd-row-value sd-num green' : gap > 0 ? 'sd-row-value sd-num red' : 'sd-row-value sd-num';
          }
          const duelTieDupEl = document.getElementById('shadow-needed-tie-dup');
          if (duelTieDupEl) duelTieDupEl.textContent = this.app.formatDuration(neededTie);
          const duelDefDupEl = document.getElementById('shadow-defense-target-dup');
          if (duelDefDupEl) duelDefDupEl.textContent = this.app.formatDuration(defenseTarget);

          // Fix 3: Monthly score in VS Duel
          const duelMonthlyEl = document.getElementById('sd-duel-monthly-score');
          if (duelMonthlyEl) duelMonthlyEl.textContent = `${competition.myWins} days`;

          // Fix: Win rate in VS Duel
          const duelWinRateEl = document.getElementById('sd-duel-win-rate');
          if (duelWinRateEl) {
            const wr = (competition.recentWinRate * 100).toFixed(0);
            duelWinRateEl.textContent = `${wr}%`;
            duelWinRateEl.className = competition.recentWinRate < 0.5 ? 'sd-row-value sd-num red' : 'sd-row-value sd-num green';
          }

          // VS Duel SHADOW header
          const duelShadowTimeEl = document.getElementById('sd-duel-shadow-time');
          if (duelShadowTimeEl) duelShadowTimeEl.textContent = this.app.formatDuration(shadowAvg);

          // Fix 3: Monthly Battle big scores
          const battleYouEl = document.getElementById('sd-battle-you');
          if (battleYouEl) battleYouEl.textContent = competition.myWins;
          const battleShadowEl = document.getElementById('sd-battle-shadow');
          if (battleShadowEl) battleShadowEl.textContent = competition.shadowWins;

          // Fix 4: Lead margin in VS Duel
          const leadMarginDupEl = document.getElementById('shadow-lead-margin-val');
          if (leadMarginDupEl) {
            leadMarginDupEl.textContent = `${scoreDiff >= 0 ? '+' : ''}${scoreDiff} days`;
            leadMarginDupEl.className = scoreDiff < 0 ? 'sd-row-value sd-num red' : 'sd-row-value sd-num green';
          }

          if (this.app.trainerEngine?.syncMissionFromRoadmap)
            this.app.trainerEngine.syncMissionFromRoadmap();
          if (this.app.trainerEngine?.updatePenaltyTimer)
            this.app.trainerEngine.updatePenaltyTimer();

          setStyle("shadow-duel-you-fill", "width", `${youShare}%`);
          setStyle("shadow-duel-shadow-fill", "width", `${shadowShare}%`);
          setText("shadow-note", "Calculated from real historical data only");

          const fill = this.app.elements["shadow-progress-fill"];
          const cappedWidth = Math.min(130, Math.max(0, percentage));
          const style = this.getProgressStyle(percentage);
          fill.style.width = `${cappedWidth}%`;
          fill.style.background = style.color;
          fill.style.boxShadow = style.shadow;

          if (isNewStandard) {
            const card = this.app.elements["shadow-standard-card"];
            card.classList.remove("shadow-new-standard");
            void card.offsetWidth;
            card.classList.add("shadow-new-standard");
          }
        }

        refresh(allowAnimation = true) {
          const metrics = this.computeRollingMetrics();
          const historicalBest = metrics.bestAvg;
          const resolvedShadow = Math.max(
            this.shadowSevenDayAverage,
            historicalBest,
          );
          const isNewStandard = resolvedShadow > this.shadowSevenDayAverage;

          if (resolvedShadow !== this.shadowSevenDayAverage) {
            this.shadowSevenDayAverage = resolvedShadow;
            this.app.saveToStorage(
              CONFIG.STORAGE_KEYS.SHADOW_AVG,
              resolvedShadow,
            );
          }

          this.render({
            todayMinutes: metrics.todayMinutes,
            shadowAvg: resolvedShadow,
            currentAvg: metrics.currentAvg,
            previousAvg: metrics.previousAvg,
            hasMomentumBaseline: metrics.hasMomentumBaseline,
            isNewStandard: allowAnimation && isNewStandard,
          });
          if (this.app.trainerEngine) this.app.trainerEngine.refresh();
        }
      }
