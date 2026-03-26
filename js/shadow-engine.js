// ── BehaviorStore ────────────────────────────────────────────────────────────
// Handles loading and persisting all Shadow Engine 2.0 behavioral signals.
// All data is stored locally in localStorage. No external API required.
class BehaviorStore {
  constructor() {
    this._signals = null; // lazy-loaded cache
  }

  _defaultSignals() {
    return {
      sleep_history: [],          // [{date, minutes}]
      wake_history: [],           // [{date, hour}]
      task_log_history: [],       // [{date, task, minutes}]
      daily_win_rate: {},         // {date: boolean}
      weekly_win_rate: 0,         // rolling 7-day win fraction
      delay_map: {},              // {task_label: avg_delay_minutes}
      skip_frequency: {},         // {task_label: skip_count}
      success_probability_map: {},// {task_label: 0–1}
      energy_map: {},             // {hour_str: 0–1}
      resistance_scores: {},      // {task_label: 0–1}
      sleep_compromise_count_7d: 0,
      flex_abuse_skip_counts: {}, // {task_label: recent_skip_count}
      flexibility_buffer: CONFIG.SE2.FLEXIBLE_TASK_MULTIPLIER,
      last_behavioral_state: "STABLE",
      last_updated: null,
    };
  }

  load() {
    if (this._signals) return this._signals;
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.BEHAVIOR_SIGNALS);
      const parsed = raw ? JSON.parse(raw) : null;
      this._signals = parsed && typeof parsed === "object"
        ? Object.assign(this._defaultSignals(), parsed)
        : this._defaultSignals();
    } catch {
      this._signals = this._defaultSignals();
    }
    return this._signals;
  }

  save() {
    if (!this._signals) return;
    this._signals.last_updated = Date.now();
    try {
      localStorage.setItem(
        CONFIG.STORAGE_KEYS.BEHAVIOR_SIGNALS,
        JSON.stringify(this._signals),
      );
    } catch (e) {
      console.warn("[BehaviorStore] Failed to save:", e);
    }
  }

  get(key) { return this.load()[key]; }
  set(key, val) { this.load()[key] = val; }

  // Rolling 7-day sleep compromise count
  getSleepCompromiseCount() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.SLEEP_COMPROMISE_LOG);
      const log = raw ? JSON.parse(raw) : [];
      const cutoff = Date.now() - 7 * 86400000;
      return log.filter((entry) => entry.ts >= cutoff).length;
    } catch {
      return 0;
    }
  }

  logSleepCompromise(dateStr) {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.SLEEP_COMPROMISE_LOG);
      const log = raw ? JSON.parse(raw) : [];
      const cutoff = Date.now() - 7 * 86400000;
      const cleaned = log.filter((entry) => entry.ts >= cutoff);
      // Avoid double-logging the same date
      if (!cleaned.some((e) => e.date === dateStr)) {
        cleaned.push({ date: dateStr, ts: Date.now() });
      }
      localStorage.setItem(CONFIG.STORAGE_KEYS.SLEEP_COMPROMISE_LOG, JSON.stringify(cleaned));
      this.set("sleep_compromise_count_7d", cleaned.length);
      this.save();
    } catch (e) {
      console.warn("[BehaviorStore] Failed to log sleep compromise:", e);
    }
  }
}

// ── ShadowEngine ─────────────────────────────────────────────────────────────
class ShadowEngine {
  constructor(app) {
    this.app = app;
    this.shadowSevenDayAverage = 0;
    this.behaviorStore = new BehaviorStore();
    this.rankTiers = [
      { min: 0,   title: "Initiate",  badge: "Baseline" },
      { min: 120, title: "Builder",   badge: "Builder"  },
      { min: 180, title: "Operator",  badge: "Operator" },
      { min: 240, title: "Executor",  badge: "Executor" },
      { min: 300, title: "Elite",     badge: "Elite"    },
      { min: 360, title: "Apex",      badge: "Apex"     },
      { min: 420, title: "Overdrive", badge: "Legend"   },
    ];
  }

  initialize() {
    try {
      console.group("ShadowEngine Initialization");
      const stored = parseFloat(
        this.app.loadFromStorage(CONFIG.STORAGE_KEYS.SHADOW_AVG),
      );
      this.shadowSevenDayAverage = Number.isFinite(stored) ? stored : 0;
      this.refresh(false);
    } catch (error) {
      console.error("[ShadowEngine] Initialization failed:", error);
    } finally {
      console.groupEnd();
    }
  }

  // ── Data Access ─────────────────────────────────────────────────────────

  getDailyProductiveMap() {
    const dailyMap = new Map();
    this.app.state.tasks.forEach((task) => {
      if (!this.app.isProductiveCategory(task.category)) return;
      dailyMap.set(task.date, (dailyMap.get(task.date) || 0) + task.duration);
    });
    return dailyMap;
  }

  getTodayGoalProgress(dateStr = this.app.getDateString(new Date()), sourceTasks = null) {
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
        discipline_type: goal.discipline_type || "flexible",
        target_minutes: goal.target_minutes || goal.minutesTarget || 0,
      };
    });

    // PERFORMANCE: Use provided sourceTasks (filtered for today) if available
    const tasksToProcess = sourceTasks || this.app.state.tasks;

    tasksToProcess.forEach((task) => {
      if (!task || task.date !== dateStr || !Number.isFinite(task.duration) || task.duration <= 0) return;
      
      const haystack = `${task.description || ""} ${task.subcategory || ""} ${task.category || ""}`.toLowerCase();
      goals.forEach((goal) => {
        if (goal.type === "checkbox") return;
        if (!goal.keywords?.some((word) => haystack.includes(word))) return;
        progress[goal.id].minutes += task.duration;
        progress[goal.id].sessions += 1;
      });
    });

    return progress;
  }


  // ── SE2: Smart Success Evaluation ───────────────────────────────────────
  // Success is not binary. ≥ 70% of target = partial credit.
  // Full credit at 100%, partial credit from 70–99%.
  _getGoalEffortRatio(goal) {
    if (goal.type === "checkbox") return goal.completed ? 1 : 0;
    const target = Math.max(1, goal.minutesTarget);
    return Math.min(1, goal.minutes / target);
  }

  _smartSuccessScore(effortRatio) {
    const threshold = CONFIG.SE2.EFFORT_SUCCESS_THRESHOLD; // 0.7
    if (effortRatio >= 1.0) return 1.0;
    if (effortRatio >= threshold) {
      // Partial credit: scale 0.7–1.0 effort → 0.7–1.0 score
      return threshold + (effortRatio - threshold) * ((1 - threshold) / (1 - threshold));
    }
    // Below threshold: linear score from 0 to threshold
    return (effortRatio / threshold) * threshold;
  }

  calculateMissionScore(progress) {
    const keys = Object.keys(progress);
    if (keys.length === 0) return 100;

    const weightPerGoal = 100 / keys.length;
    let totalScore = 0;

    keys.forEach((key) => {
      const goal = progress[key];
      const effortRatio = this._getGoalEffortRatio(goal);
      const smartScore = this._smartSuccessScore(effortRatio);
      totalScore += smartScore * weightPerGoal;
    });

    return Math.round(Math.min(100, totalScore));
  }

  // ── SE2: Behavioral State Detection ─────────────────────────────────────
  // Analyzes the last 7 days (min 3 required) and classifies the user into:
  // RECOVERY | STABLE | GROWTH
  detectBehavioralState() {
    const dailyMap = this.getDailyProductiveMap();
    const shadow = Math.max(1, this.shadowSevenDayAverage);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = this.app.getDateString(d);
      days.push({ ds, minutes: dailyMap.get(ds) || 0 });
    }

    // Need at least 3 days of data
    const populated = days.filter((d) => d.minutes > 0);
    if (populated.length < 3) {
      return "STABLE"; // insufficient history — default safe state
    }

    // Compute 7-day win rate
    const wins = days.filter((d) => d.minutes >= shadow).length;
    const winRate = wins / days.length;

    // Compute slope (trend) using least-squares over last 7 days
    const n = days.length;
    const xMean = (n - 1) / 2;
    const yMean = days.reduce((s, d) => s + d.minutes, 0) / n;
    let num = 0, den = 0;
    days.forEach((d, i) => {
      const dx = i - xMean;
      num += dx * (d.minutes - yMean);
      den += dx * dx;
    });
    const slope = den ? num / den : 0;

    const { STATE_RECOVERY_WIN_RATE_MAX, STATE_GROWTH_WIN_RATE_MIN } = CONFIG.SE2;

    if (winRate < STATE_RECOVERY_WIN_RATE_MAX && slope < 0) return "RECOVERY";
    if (winRate > STATE_GROWTH_WIN_RATE_MIN && slope > 0) return "GROWTH";
    return "STABLE";
  }

  // ── SE2: Behavioral Signal Updates ──────────────────────────────────────
  updateBehaviorSignals(dateStr, todayMinutes, shadow) {
    try {
      const signals = this.behaviorStore.load();

      // 1. Daily win rate
      signals.daily_win_rate[dateStr] = todayMinutes >= shadow;

      // 2. Weekly win rate (last 7 days)
      const recentDates = Object.keys(signals.daily_win_rate).sort().slice(-7);
      const recentWins = recentDates.filter((d) => signals.daily_win_rate[d]).length;
      signals.weekly_win_rate = recentDates.length ? recentWins / recentDates.length : 0;

      // 3. Behavioral state
      const state = this.detectBehavioralState();
      signals.last_behavioral_state = state;

      // 4. Update energy_map per hour based on today's logged tasks
      // PERFORMANCE: use pre-filtered todayTasks instead of filtering all tasks again
      const todayDateTasks = this.app.state.tasks.filter(t => t.date === dateStr && this.app.isProductiveCategory(t.category));
      todayDateTasks.forEach((task) => {
        if (!task.startTime) return;
        const hour = String(new Date(task.startTime).getHours()).padStart(2, "0") + ":00";
        const existing = signals.energy_map[hour] || 0;
        const effort = Math.min(1, (task.duration || 0) / 60);
        signals.energy_map[hour] = parseFloat((existing * 0.7 + effort * 0.3).toFixed(3));
      });


      // 5. Task log history (last 30 entries)
      if (todayMinutes > 0) {
        const entry = { date: dateStr, minutes: todayMinutes };
        const exists = signals.task_log_history.some((e) => e.date === dateStr);
        if (!exists) {
          signals.task_log_history.push(entry);
          if (signals.task_log_history.length > 60) {
            signals.task_log_history = signals.task_log_history.slice(-60);
          }
        } else {
          // Update existing entry
          const idx = signals.task_log_history.findIndex((e) => e.date === dateStr);
          if (idx >= 0) signals.task_log_history[idx].minutes = todayMinutes;
        }
      }

      // 6. Living behavioral state persistency
      try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.BEHAVIORAL_STATE, state);
      } catch { /* silent */ }

      this.behaviorStore.set("last_behavioral_state", state);
      this.behaviorStore.save();
    } catch (err) {
      console.warn("[ShadowEngine] updateBehaviorSignals failed:", err);
    }
  }

  // ── SE2: Task-level skip/resistance tracking ─────────────────────────────
  recordSkip(taskLabel) {
    const signals = this.behaviorStore.load();
    signals.skip_frequency[taskLabel] = (signals.skip_frequency[taskLabel] || 0) + 1;
    signals.flex_abuse_skip_counts[taskLabel] =
      (signals.flex_abuse_skip_counts[taskLabel] || 0) + 1;
    this.behaviorStore.save();
  }

  recordSuccess(taskLabel, ratio) {
    const signals = this.behaviorStore.load();
    const prev = signals.success_probability_map[taskLabel] ?? 0.5;
    // EMA update
    signals.success_probability_map[taskLabel] = parseFloat(
      (prev * 0.7 + ratio * 0.3).toFixed(3),
    );
    // Reduce resistance if successful
    const prevR = signals.resistance_scores[taskLabel] ?? 0.5;
    signals.resistance_scores[taskLabel] = parseFloat(
      Math.max(0, prevR - 0.05).toFixed(3),
    );
    this.behaviorStore.save();
  }

  // ── Existing metric methods ──────────────────────────────────────────────

  getTodayDistractionMinutes(dateStr = this.app.getDateString(new Date()), sourceTasks = null) {
    const tasks = sourceTasks || this.app.state.tasks;
    return tasks
      .filter(
        (t) =>
          t.date === dateStr &&
          (t.category === "Time Waste / Distraction" || t.graph_tag === "distraction"),
      )
      .reduce((sum, task) => sum + task.duration, 0);
  }


  getWinLadder(dailyMap, shadowAvg) {
    const cascade = this.app.trainerEngine?.ensureCascadeState();
    const anchorDate = cascade?.date || this.app.getDateString(new Date());
    const days = [];
    const today = new Date(anchorDate);

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
      return { color: "#28a745", shadow: "0 0 12px rgba(40,167,69,0.45)" };
    if (percentage >= 90) return { color: "#007bff", shadow: "none" };
    if (percentage >= 70) return { color: "#ffc107", shadow: "none" };
    return { color: "#dc3545", shadow: "none" };
  }

  getMomentum(currentAvg, previousAvg, hasBaseline) {
    if (!hasBaseline)
      return { label: "Insufficient history", cls: "shadow-momentum-flat" };
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
    const weeklyPenalty = weeklyGap > 0 ? 1 : 0;
    const trendPenalty =
      recentWinRate < 0.35 ? 2 : recentWinRate < 0.55 ? 1 : 0;

    let level = 0;
    if (percentage >= 100) level = 0;
    else if (percentage >= 90) level = 1;
    else if (percentage >= 70) level = 2;
    else level = 3;

    const missionPenalty = missionScore < 50 ? 1 : 0;
    level = Math.min(3, level + weeklyPenalty + trendPenalty + missionPenalty);

    if (level <= 0) return { label: "Pressure: Controlled", cls: "shadow-pressure-low" };
    if (level === 1) return { label: "Pressure: Elevated", cls: "shadow-pressure-mid" };
    if (level === 2) return { label: "Pressure: High", cls: "shadow-pressure-mid" };
    return { label: "Pressure: Critical", cls: "shadow-pressure-high" };
  }

  countShadowWinsThisMonth(dailyMap, shadowAvg) {
    if (shadowAvg <= 0)
      return { myWins: 0, shadowWins: 0, activeDays: 0, recentWinRate: 0 };
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

      if (minutes === 0) continue;

      const isToday = date === todayStr;
      const isWin = minutes >= shadowAvg;

      if (isWin) {
        myWins++;
        activeDays++;
      } else if (!isToday) {
        shadowWins++;
        activeDays++;
      }

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
    return { points, minutes, untracked, reasons, budget, distractionMinutes, overBudget };
  }

  render(data) {
    const { todayMinutes, shadowAvg, currentAvg, previousAvg, hasMomentumBaseline, isNewStandard, todayTasks } = data;
    const safeShadow = shadowAvg > 0 ? shadowAvg : 1;
    const gap = shadowAvg - todayMinutes;
    const weeklyGap = shadowAvg - currentAvg;
    const percentage = (todayMinutes / safeShadow) * 100;

    const dailyMap = this.getDailyProductiveMap();
    const competition = this.countShadowWinsThisMonth(dailyMap, shadowAvg);
    const scoreDiff = competition.myWins - competition.shadowWins;
    const targetToday = shadowAvg > 0 ? Math.ceil(shadowAvg + 1) : 0;
    const neededTie = Math.max(0, shadowAvg - todayMinutes);
    const neededLead = Math.max(0, shadowAvg - todayMinutes + 1);
    const targetDate = this.app.trainerEngine?.ensureCascadeState()?.date || this.app.getDateString(new Date());
    const isFutureDay = targetDate > this.app.getDateString(new Date());

    const goalProgress = this.getTodayGoalProgress(targetDate, todayTasks);

    const missionScore = this.calculateMissionScore(goalProgress);
    const distractionMinutes = this.getTodayDistractionMinutes(targetDate, todayTasks);


    const penalty = this.getPenalty(
      todayMinutes,
      shadowAvg,
      weeklyGap,
      competition.recentWinRate,
      distractionMinutes,
      missionScore,
    );
    const ladder = this.getWinLadder(dailyMap, shadowAvg);
    const defenseTarget = Math.max(0, Math.ceil(shadowAvg + penalty.minutes));
    const totalDuel = Math.max(1, competition.myWins + competition.shadowWins);
    const youShare = Math.max(0, Math.min(100, (competition.myWins / totalDuel) * 100));
    const shadowShare = Math.max(0, Math.min(100, (competition.shadowWins / totalDuel) * 100));

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - i);
      const ds = this.app.getDateString(d);

      last7.push(dailyMap.get(ds) || 0);
    }
    const sorted7 = [...last7].sort((a, b) => a - b);
    const p70Index = Math.max(0, Math.ceil(0.7 * sorted7.length) - 1);
    const shadowStandard = sorted7[p70Index] || shadowAvg;
    const momentumScore = shadowStandard > 0 ? todayMinutes / shadowStandard : 0;
    const daysAboveShadow = last7.filter(
      (v) => v >= shadowStandard && shadowStandard > 0,
    ).length;
    const consistencyIndex = `${daysAboveShadow}/7`;
    const xMean = 3;
    const yMean = last7.reduce((a, b) => a + b, 0) / 7;
    let num = 0, den = 0;
    last7.forEach((v, i) => {
      const dx = i - xMean;
      num += dx * (v - yMean);
      den += dx * dx;
    });
    const slope = den ? num / den : 0;
    const growthTrend = slope > 2 ? "UP" : slope < -2 ? "DOWN" : "STABLE";

    // ── SE2: Behavioral state annotation ──────────────────────────────────
    const behavioralState = this.detectBehavioralState();
    // Persist updated signals
    this.updateBehaviorSignals(todayDate, todayMinutes, shadowAvg);

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
    setText("shadow-penalty", `-${this.app.formatDuration(penalty.minutes)}`);

    const reasonMap = {
      "Monthly win-rate under 50%": "win-rate <50%",
      "High untracked time today (5h+)": "untracked >5h",
      "Untracked time today (2h+)": "untracked >2h",
      "Behind daily shadow target": "below shadow target",
      "Weekly average below shadow standard": "weekly avg low",
      "Mission score below 60/100": "mission <60",
    };
    const shortReasons = penalty.reasons.map((r) => reasonMap[r] || r.toLowerCase());
    setText(
      "shadow-penalty-reason",
      shortReasons.length ? shortReasons.join(" · ") : "no active penalty triggers",
    );

    const expiryEl = this.app.elements["shadow-penalty-expiry"];
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
    setText("shadow-lead-margin", `Lead Margin: ${Math.abs(scoreDiff)}`);
    setText("shadow-trend", `Monthly trend: ${(competition.recentWinRate * 100).toFixed(0)}% win rate`);
    setText("shadow-verdict", scoreDiff >= 0
      ? `You lead monthly by ${Math.abs(scoreDiff)} day-win(s); hold at least ${this.app.formatDuration(defenseTarget)} tomorrow. Mission ${missionScore}/100.`
      : `You are behind by ${this.app.formatDuration(neededTie)} today and ${Math.abs(scoreDiff)} monthly day-win(s). Mission ${missionScore}/100.`);

    // VS Duel YOU panel
    const duelYouTimeEl = document.getElementById("sd-duel-you-time");
    if (duelYouTimeEl) duelYouTimeEl.textContent = this.app.formatDuration(todayMinutes);
    const duelYouPctEl = document.getElementById("sd-duel-you-pct");
    if (duelYouPctEl) duelYouPctEl.textContent = `${percentage.toFixed(1)}% reached`;
    const duelGapEl = document.getElementById("sd-duel-gap");
    if (duelGapEl) {
      duelGapEl.textContent = `${gap >= 0 ? "-" : "+"}${this.app.formatDuration(Math.abs(gap))}`;
      duelGapEl.className = gap < 0 ? "sd-row-value sd-num green" : gap > 0 ? "sd-row-value sd-num red" : "sd-row-value sd-num";
    }
    const duelTieDupEl = document.getElementById("shadow-needed-tie-dup");
    if (duelTieDupEl) duelTieDupEl.textContent = this.app.formatDuration(neededTie);
    const duelDefDupEl = document.getElementById("shadow-defense-target-dup");
    if (duelDefDupEl) duelDefDupEl.textContent = this.app.formatDuration(defenseTarget);

    const duelMonthlyEl = document.getElementById("sd-duel-monthly-score");
    if (duelMonthlyEl) duelMonthlyEl.textContent = `${competition.myWins} days`;

    const duelWinRateEl = document.getElementById("sd-duel-win-rate");
    if (duelWinRateEl) {
      const wr = (competition.recentWinRate * 100).toFixed(0);
      duelWinRateEl.textContent = `${wr}%`;
      duelWinRateEl.className = competition.recentWinRate < 0.5 ? "sd-row-value sd-num red" : "sd-row-value sd-num green";
    }

    const duelShadowTimeEl = document.getElementById("sd-duel-shadow-time");
    if (duelShadowTimeEl) duelShadowTimeEl.textContent = this.app.formatDuration(shadowAvg);

    const battleYouEl = document.getElementById("sd-battle-you");
    if (battleYouEl) battleYouEl.textContent = competition.myWins;
    const battleShadowEl = document.getElementById("sd-battle-shadow");
    if (battleShadowEl) battleShadowEl.textContent = competition.shadowWins;

    const leadMarginDupEl = document.getElementById("shadow-lead-margin-val");
    if (leadMarginDupEl) {
      leadMarginDupEl.textContent = `${scoreDiff >= 0 ? "+" : ""}${scoreDiff} days`;
      leadMarginDupEl.className = scoreDiff < 0 ? "sd-row-value sd-num red" : "sd-row-value sd-num green";
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
    const todayDate = this.app.getDateString(new Date());
    const todayTasks = (this.app.state.tasks || []).filter(t => t.date === todayDate);
    const metrics = this.computeRollingMetrics();
    const resolvedShadow = Math.max(this.shadowSevenDayAverage, metrics.bestAvg);
    const isNewStandard = resolvedShadow > this.shadowSevenDayAverage;

    if (resolvedShadow !== this.shadowSevenDayAverage) {
      this.shadowSevenDayAverage = resolvedShadow;
      this.app.saveToStorage(CONFIG.STORAGE_KEYS.SHADOW_AVG, resolvedShadow);
    }

    this.render({
      todayMinutes: metrics.todayMinutes,
      shadowAvg: resolvedShadow,
      currentAvg: metrics.currentAvg,
      previousAvg: metrics.previousAvg,
      hasMomentumBaseline: metrics.hasMomentumBaseline,
      isNewStandard: allowAnimation && isNewStandard,
      todayTasks,
    });
    if (this.app.trainerEngine) this.app.trainerEngine.refresh();
  }


}
