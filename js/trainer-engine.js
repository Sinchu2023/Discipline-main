class TrainerEngine {
  constructor(app) {
    this.app = app;
    this.state = this.loadState();
    this.state.roadmap = this.getRoadmapState();
    this.todayTasksCache = []; // Optimization: cache today's tasks for the current frame
    this.levels = [
      { name: "Dormant", min: 0, max: 60 },
      { name: "Initiate", min: 60, max: 120 },
      { name: "Competitor", min: 120, max: 180 },
      { name: "Dominator", min: 180, max: 240 },
      { name: "Elite", min: 240, max: Infinity },
    ];
  }

  loadState() {
    const saved = this.app.loadFromStorage(CONFIG.STORAGE_KEYS.TRAINER_STATE) || {};
    return {
      penaltyMinutes: saved.penaltyMinutes || 0,
      shadowBuffDays: saved.shadowBuffDays || 0,
      userBuffDays: saved.userBuffDays || 0,
      lastProcessedDate: saved.lastProcessedDate || null,
      manualMissionChecks: saved.manualMissionChecks || {},
      // SE2: Persist the evolving standard (TIMETABLE_LOGIC)
      timetable: saved.timetable || JSON.parse(JSON.stringify(TIMETABLE_LOGIC)),
    };
  }

  initialize() {
    // Attach mission listeners ONCE here instead of every render
    const container = document.querySelector(".shadow-goal-list");
    if (container) {
      this._missionDelegateHandler = (e) => {
        if (e.type === "click" || e.type === "dblclick") {
          const circleBtn = e.target.closest(".mission-circle-btn");
          if (circleBtn && !circleBtn.hasAttribute("disabled")) {
            e.preventDefault();
            this.triggerCascadeComplete(circleBtn.getAttribute("data-slot-key"));
          }
          if (e.target.id === "btn-undo-cascade") { e.preventDefault(); this.undoCascade(); }
          if (e.target.id === "btn-finalize-day") { e.preventDefault(); this.triggerFinalizeDay(); }
          if (e.target.id === "btn-revert-yesterday") { e.preventDefault(); this.switchToYesterday(); }

          // SE2: Auto-start stopwatch when clicking mission text
          const missionLabel = e.target.closest(".mission-task-label");
          if (missionLabel) {
            const label = missionLabel.getAttribute("data-label");
            const subtext = missionLabel.getAttribute("data-subtext");
            if (this.app.stopwatch?.startTaskFromRoadmap) {
              this.app.stopwatch.startTaskFromRoadmap(label, subtext);
            }
          }
        }
      };
      // No longer need 'change' for checkboxes, just 'click' for circle buttons
      container.addEventListener("click", this._missionDelegateHandler);
      container.addEventListener("dblclick", this._missionDelegateHandler);
    }

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
    } else if (state === "GROWTH") {
      // GROWTH: slightly faster progression than STABLE, still within the 30-min cap
      rate = SE2.LEARNING_RATE_GROWTH || 0.35;
    } else {
      // STABLE: balanced correction
      rate = SE2.LEARNING_RATE_STABLE;
    }
    const raw = current + (ideal - current) * rate;
    // Clamp shift to MAX_DAILY_SHIFT_LIMIT
    const shift = raw - current;
    const clamped = Math.sign(shift) * Math.min(Math.abs(shift), SE2.MAX_DAILY_SHIFT_LIMIT);
    return Math.max(0, Math.round(current + clamped));
  }

  // ── SE2: Daily Timetable Time Shifting ───────────────────────────────────
  // Reads last 7 days of actual task start times per slot category and
  // progressively shifts TIMETABLE_LOGIC times toward IDEAL_TIMETABLE.
  // Formula: next_time = current + (ideal - current) * LR, clamped ≤ 30 min.
  shiftTimetableTimes(behavioralState, targetTimetable = null) {
    try {
      const timetable = targetTimetable || this.state.timetable;
      if (typeof IDEAL_TIMETABLE === "undefined" || !timetable) return;

      const { SE2 } = CONFIG;
      const today = new Date();
      const last7Dates = [];
      for (let i = 0; i < 7; i++) { // Include TODAY (i=0) so the current day's performance applies!
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        last7Dates.push(this.app.getDateString(d));
      }

      const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      const toTime = (m) => {
        const wrapped = ((Math.round(m) % 1440) + 1440) % 1440;
        return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
      };

      timetable.forEach((slot, idx) => {
        const ideal = IDEAL_TIMETABLE[idx];
        if (!ideal) return;
        if (slot.mapsTo === "static") return;

        const actualMins = [];
        last7Dates.forEach((dateStr) => {
          this.app.state.tasks.forEach((task) => {
            if (task.date !== dateStr || !task.startTime) return;
            const slotMap = { learning: ["Study / Skill Development", "Productive Work"], project: ["Productive Work"], revision: ["Study / Skill Development"] };
            const cats = slotMap[slot.mapsTo] || [];
            if (!cats.includes(task.category)) return;
            const mins = new Date(task.startTime).getHours() * 60 + new Date(task.startTime).getMinutes();
            if (Math.abs(mins - toMin(slot.time)) <= 90) actualMins.push(mins);
          });
        });

        if (actualMins.length === 0) return;
        const avgActual = actualMins.reduce((s, v) => s + v, 0) / actualMins.length;
        const idealMin = toMin(ideal.time);
        const currentMin = toMin(slot.time);

        const isRecovery = behavioralState === "RECOVERY";
        const lr = behavioralState === "GROWTH" ? 0.35 : isRecovery ? SE2.LEARNING_RATE_FAILURE_MODERATE : SE2.LEARNING_RATE_STABLE;
        const maxLimit = isRecovery ? SE2.MAX_DAILY_SHIFT_RECOVERY_LIMIT : SE2.MAX_DAILY_SHIFT_LIMIT;

        const raw = avgActual + (idealMin - avgActual) * lr;
        const shift = raw - currentMin;
        const clamped = Math.sign(shift) * Math.min(Math.abs(shift), maxLimit);
        slot.time = toTime(currentMin + clamped);
      });

      // Special handling for Sleep/Rest (Midnight Wrapping)
      const sleepSlotIdx = timetable.findIndex(s => s.label?.toLowerCase() === "sleep" || s.label?.toLowerCase() === "rest");
      if (sleepSlotIdx >= 0 && IDEAL_TIMETABLE[sleepSlotIdx]) {
        const slot = timetable[sleepSlotIdx];
        const ideal = IDEAL_TIMETABLE[sleepSlotIdx];
        const sleepMins = [];
        last7Dates.forEach((dateStr) => {
          this.app.state.tasks.forEach((task) => {
            if (task.date !== dateStr || task.category !== "Sleep" || !task.startTime) return;
            let m = new Date(task.startTime).getHours() * 60 + new Date(task.startTime).getMinutes();
            if (m < 480) m += 1440;
            sleepMins.push(m);
          });
        });

        if (sleepMins.length > 0) {
          const avgSleep = sleepMins.reduce((s, v) => s + v, 0) / sleepMins.length;
          let idealMin = toMin(ideal.time);
          if (idealMin < 480) idealMin += 1440;

          let currentMin = toMin(slot.time);
          if (currentMin < 480) currentMin += 1440;

          const lr = SE2.LEARNING_RATE_STABLE;
          const isRecovery = behavioralState === "RECOVERY";
          const maxShift = isRecovery ? SE2.MAX_DAILY_SHIFT_RECOVERY_LIMIT : SE2.MAX_DAILY_SHIFT_LIMIT;

          const raw = avgSleep + (idealMin - avgSleep) * lr;
          const shift = raw - currentMin;
          const clamped = Math.sign(shift) * Math.min(Math.abs(shift), maxShift);
          slot.time = toTime(currentMin + clamped);
        }
      }
    } catch (err) {
      console.warn("[shiftTimetableTimes] failed:", err);
    }
  }

  // ── SE2: Wake-Time Rerouting (GPS mode) ──────────────────────────────────
  // On load: detects actual wake/start time from first task today.
  // If later than planned, shifts all remaining slot times forward by that delta.
  // This is the "GPS rerouting" — the engine adapts TO today, not against it.
  rerouteScheduleForToday() {
    try {
      const todayStr = this.app.getDateString(new Date());
      const todayTasks = this.app.state.tasks.filter(
        t => t.date === todayStr && t.startTime && this.app.isProductiveCategory(t.category)
      );
      if (!todayTasks.length) return;

      // Earliest productive task today = effective wake/start time
      const earliestMs = Math.min(...todayTasks.map(t => new Date(t.startTime).getTime()));
      const actualStart = new Date(earliestMs);
      const actualMin = actualStart.getHours() * 60 + actualStart.getMinutes();

      // Planned first slot time
      const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      const toTime = (m) => {
        const wrapped = ((Math.round(m) % 1440) + 1440) % 1440;
        return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
      };
      const plannedMin = toMin(TIMETABLE_LOGIC[0].time);
      const delta = actualMin - plannedMin;

      // If delta is +/- 5 mins, ignore (jitter)
      if (Math.abs(delta) <= 5) return;

      // Cap the shift (don't shift more than 2 hours in either direction)
      const cappedDelta = Math.sign(delta) * Math.min(Math.abs(delta), 120);

      // Shift all future slots by delta
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      TIMETABLE_LOGIC.forEach(slot => {
        const slotMin = toMin(slot.time);
        if (slotMin > nowMin - 30) { // Shift slots that are upcoming or just started
          slot.time = toTime(slotMin + cappedDelta);
        }
      });
    } catch (err) {
      console.warn("[rerouteScheduleForToday] failed:", err);
    }
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
  // Each goal uses its OWN 7-day keyword-matched average (not total daily minutes).
  generateMissionTargets(behavioralState, sleepCompromised, isFatigued = false) {
    const { SE2 } = CONFIG;
    const flexBuffer = this.computeFlexibilityBuffer();
    const goals = CONFIG.DAILY_GOALS || [];
    const today = new Date();
    const todayStr = this.app.getDateString(today);

    // Build per-day task arrays for last 7 days (excluding today)
    const last7Days = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7Days.push(this.app.getDateString(d));
    }

    return goals.map((goal) => {
      const ideal = goal.target_minutes || goal.minutesTarget || 0;
      const keywords = goal.keywords || [];

      // Compute per-goal 7-day average using keyword matching
      let goalTotalMinutes = 0;
      last7Days.forEach((dayStr) => {
        const dayGoalMinutes = this.app.state.tasks
          .filter((t) => {
            if (t.date !== dayStr || !this.app.isProductiveCategory(t.category)) return false;
            const haystack = `${t.description || ""} ${t.subcategory || ""} ${t.category || ""}`.toLowerCase();
            return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
          })
          .reduce((sum, t) => sum + (t.duration || 0), 0);
        goalTotalMinutes += dayGoalMinutes;
      });
      const avgMinutes = goalTotalMinutes / 7;

      let target = this.progressiveCorrection(avgMinutes, ideal, behavioralState);

      // Apply sleep compromise load reduction (−15%)
      if (sleepCompromised) {
        target = Math.round(target * (1 - SE2.RECOVERY_LOAD_REDUCTION));
      }
      // Recovery state: additional load reduction
      if (behavioralState === "RECOVERY") {
        target = Math.round(target * (1 - SE2.RECOVERY_LOAD_REDUCTION));
      }
      // SE2 Fatigue: Poor sleep load reduction (-20%)
      if (isFatigued) {
        target = Math.round(target * (1 - (SE2.FATIGUE_LOAD_REDUCTION_FACTOR || 0.2)));
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

  buildTrainerSnapshot(targetDate = null) {
    const cascade = this.ensureCascadeState();
    const todayDate = targetDate || cascade.date || this.app.getDateString(new Date());

    // Step 2: analyzeBehavior — reads from BehaviorStore + shadowEngine
    const behaviorSnapshot = this.analyzeBehavior();
    const behavioralState = behaviorSnapshot.state;

    const metrics = this.app.shadowEngine.computeRollingMetrics(todayDate);
    const shadow7DayAverage = Math.max(
      this.app.shadowEngine.shadowSevenDayAverage || 0,
      metrics.bestAvg || 0,
    );
    const map = this.getDailyProductiveMap();
    const competition = this.app.shadowEngine.countShadowWinsThisMonth(
      map,
      shadow7DayAverage,
      todayDate
    );
    const now = new Date();
    // If it's a future logical date, timeRemaining is 0 or 24h? Use 0 for safety.
    const isFuture = todayDate > this.app.getDateString(now);

    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const timeRemainingToday = isFuture ? 0 : Math.max(
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
    if (key && key !== "project work" && key !== "revision") {
      return 180;
    }
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

  getTopicProgress(topic) {
    const normalizedTopic = this.normalizeTopic(topic);
    const topicWords = normalizedTopic.split(" ").filter((w) => w.length > 3);
    const missionType = normalizedTopic.includes("project") ? "project" : normalizedTopic.includes("revision") ? "revision" : "learning";
    const mapByType = { learning: ["learning"], project: ["project"], revision: ["revision"] };

    const slotForTask = (task) => {
      if (!task?.startTime || typeof TIMETABLE_LOGIC === "undefined") return null;
      const dt = new Date(task.startTime);
      const taskMinutes = dt.getHours() * 60 + dt.getMinutes();
      let nearest = null; let minDiff = Infinity;
      TIMETABLE_LOGIC.forEach((slot) => {
        const [h, m] = (slot.time || "00:00").split(":").map(Number);
        const diff = Math.abs(taskMinutes - (h * 60 + m));
        if (diff < minDiff) { minDiff = diff; nearest = slot; }
      });
      return minDiff <= 120 ? nearest : null;
    };

    let minutes = 0; let sessions = 0;
    const completedSlots = new Set();

    // PERFORMANCE: Use cached today's tasks instead of iterating the entire history
    (this.todayTasksCache || []).forEach((task) => {
      if (!this.app.isProductiveCategory(task.category)) return;
      const taskTopic = this.normalizeTopic(task.missionTopic || task.topic || "");
      const haystack = this.normalizeTopic(`${task.description || ""} ${task.subcategory || ""} ${task.category || ""}`);
      const nearestSlot = slotForTask(task);
      const slotType = nearestSlot?.mapsTo || "";
      const matchesTimetable = mapByType[missionType]?.includes(slotType);
      const matchesTopic = taskTopic === normalizedTopic || topicWords.some((w) => haystack.includes(w));
      if (!matchesTopic && !matchesTimetable) return;
      minutes += Number(task.duration || 0);
      sessions += 1;
      if (nearestSlot && nearestSlot.time) completedSlots.add(nearestSlot.time);
    });

    const totalTargetSlots = missionType === "learning" ? 3 : 1;
    const reqSlots = missionType === "learning" ? Math.ceil(totalTargetSlots * 0.7) : 1;

    return { minutes, sessions, completedSlots: completedSlots.size, reqSlots, threshold: this.getThresholdForTopic(topic) };
  }


  getRoadmapMissionTopic() {
    const active = this.getActiveRoadmapDay();
    if (active?.day?.text) {
      const text = (active.day.text || "").split("\n")[0].trim();
      if (text) return text;
    }
    return "Shunt Clipper Circuits Clamper Circuits";
  }

  getDailyMissionTasks() {
    const roadmapTopic = this.getRoadmapMissionTopic();
    const learningProgress = this.getTopicProgress(roadmapTopic);
    // SE2 update: roadmap day completes if >= 70% of learning slots are handled
    const learningDone = learningProgress.completedSlots >= learningProgress.reqSlots;

    const projectProgress = this.getTopicProgress("Project Work");
    const projectDone = projectProgress.completedSlots >= projectProgress.reqSlots;

    const revisionProgress = this.getTopicProgress("Revision");
    const revisionDone = revisionProgress.completedSlots >= revisionProgress.reqSlots;

    return [
      {
        type: "learning",
        topic: roadmapTopic,
        progress: learningProgress,
        done: learningDone,
      },
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
        active: learningDone && projectDone,
      },
    ];
  }

  getFullRoadmapQueue() {
    this.ensureRoadmap();
    const queue = [];
    this.state.roadmap.modules.forEach(m => {
      m.days.forEach(d => {
        if (d.status !== "completed" && !d.completed) {
          queue.push({
            text: (d.text || "").split("\n")[0].trim(),
            moduleIndex: this.state.roadmap.modules.indexOf(m),
            dayIndex: m.days.indexOf(d)
          });
        }
      });
    });
    return queue;
  }

  ensureCascadeState() {
    const today = this.app.getDateString(new Date());
    let cascade = this.app.loadFromStorage("cascade_state");
    // Rebuild state if stale (new day) or missing required schema fields
    const isSchemaValid = cascade && cascade.roadmapQueue !== undefined
      && cascade.activeSlots && typeof cascade.activeSlots === "object" && !Array.isArray(cascade.activeSlots)
      && cascade.completion && cascade.slotStatus;
    const now = new Date();
    const nowHour = now.getHours();

    // SE2: Don't auto-advance to a new day if it's currently between 12 AM and 4 AM
    // This allows the user to finish their "Night" (e.g. Sleep at 1:39 AM) 
    // without the system resetting to tomorrow prematurely.
    const isMidNightBuffer = nowHour < 4;
    const isStaleDate = cascade && cascade.date < today;
    const isFutureDate = cascade && cascade.date > today;

    // Only reset if it's a completely new state, schema invalid, it's past 4 AM on a new day,
    // or if the user accidentally finalized their day early and jumped into the future.
    const shouldReset = !cascade || !isSchemaValid || (isStaleDate && !isMidNightBuffer) || isFutureDate;

    if (shouldReset) {
      const q = this.getFullRoadmapQueue();
      
      // SE2: If we are initializing a FRESH state between 12 AM and 4 AM,
      // assume we are still working on "Yesterday" and use that as the starting date.
      let effectiveDate = today;
      if (nowHour < 4) {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        effectiveDate = this.app.getDateString(d);
      }

      cascade = {
        date: effectiveDate,
        roadmapQueue: q,
        activeSlots: {
          slot1: q[0] || null,
          slot2: q[1] || null,
          slot3: q[2] || null,
        },
        completion: { slot1: false, slot2: false, slot3: false },
        slotStatus: { slot1: "active", slot2: "active", slot3: "active" },
        stateHistory: [],
      };
      this.app.saveToStorage("cascade_state", cascade);
    }
    return cascade;
  }

  // ── Cascade: compute slot time statuses ─────────────────────────────────
  // Marks slots as 'expired' if their scheduled time has passed and they
  // were not completed. Slots remain editable even when expired (improve.md §9).
  _refreshSlotStatuses(cascade) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const realDate = this.app.getDateString(new Date());
    const isFutureDay = (cascade.date || realDate) > realDate;

    // 1. Identify all learning slots and their physical status
    const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    const learningSlots = (this.state.timetable || []).filter(s => s.mapsTo === "learning").map((slot, idx) => {
      let slotMin = toMin(slot.time);
      if (slotMin < 240) slotMin += 1440; // Night shift buffer

      let compNowMinutes = nowMinutes;
      if (!isFutureDay && cascade.date < realDate && nowMinutes < 480) {
        compNowMinutes += 1440;
      }

      const key = `slot${idx + 1}`;
      let status = "pending";
      if (cascade.completion[key]) status = "completed";
      else if (!isFutureDay && compNowMinutes > slotMin + 30) status = "expired";
      else if (!isFutureDay && compNowMinutes >= slotMin) status = "active";

      return { key, status, slotMin, originalLabel: slot.label };
    });

    // 2. Dynamic Task Allocation (Cascading)
    // We treat the roadmapQueue as a FIFO queue that flows into the first available non-expired slots.
    let queueIdx = 0;
    const roadmapQueue = cascade.roadmapQueue || [];
    const newActiveSlots = {};

    learningSlots.forEach(slot => {
      cascade.slotStatus[slot.key] = slot.status;

      if (slot.status === "completed") {
        // If it was completed here, it consumed the task that was in it.
        // We preserve whatever was in activeSlots to avoid state drift.
        newActiveSlots[slot.key] = cascade.activeSlots[slot.key];
        queueIdx++; 
      } else if (slot.status === "expired") {
        // Expired incomplete slots are "Missed". They DON'T consume a task.
        // Instead, the task moves to the next available slot.
        newActiveSlots[slot.key] = null;
      } else {
        // Active or Pending slots take the next available task from the queue.
        const task = roadmapQueue[queueIdx++];
        if (task) {
          // Identify if it's cascaded (pushed from its original priority)
          // Original priority for a slot index X is roadmapQueue[X]
          const originalTaskIdx = parseInt(slot.key.replace("slot", "")) - 1;
          const isShifted = roadmapQueue.indexOf(task) !== originalTaskIdx;
          newActiveSlots[slot.key] = { ...task, cascaded: isShifted };
        } else {
          newActiveSlots[slot.key] = null;
        }
      }
    });

    // Update the cascade state with the new dynamic assignments
    cascade.activeSlots = { ...cascade.activeSlots, ...newActiveSlots };

    // Standard static slots (non-cascading)
    (this.state.timetable || []).forEach((slot, idx) => {
      if (slot.mapsTo !== "learning") {
        const key = `static${idx}`;
        let slotMin = toMin(slot.time);
        if (slotMin < 240) slotMin += 1440;
        let compNow = nowMinutes;
        if (!isFutureDay && cascade.date < realDate && nowMinutes < 480) compNow += 1440;

        if (cascade.completion[key]) cascade.slotStatus[key] = "completed";
        else if (!isFutureDay && compNow > slotMin + 30) cascade.slotStatus[key] = "expired";
        else if (!isFutureDay && compNow >= slotMin) cascade.slotStatus[key] = "active";
        else cascade.slotStatus[key] = "pending";
      }
    });
  }

  // ── Cascade: save non-destructive snapshot before any mutation ──────────
  // ── Restore: Core Action Methods ──────────────────────────────────────────

  triggerCascadeComplete(slotKey) {
    const cascade = this.ensureCascadeState();
    this._pushCascadeHistory(cascade);

    const completedTask = cascade.activeSlots[slotKey];
    if (completedTask) {
      this.setRoadmapDayStatus(completedTask.moduleIndex, completedTask.dayIndex, true);
      this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, this.state.roadmap);
    }

    // Mark completion. In SE2, the slot ONLY cascades to the next task 
    // when the next slot trigger fires or on manual "Continue".
    // This allows the "Tick" to appear immediately and stay visible.
    cascade.completion[slotKey] = true;
    cascade.slotStatus[slotKey] = "completed";

    this.app.saveToStorage("cascade_state", cascade);
    this.syncMissionFromRoadmap();
  }

  triggerCascadeMiss() {
    const cascade = this.ensureCascadeState();
    this._pushCascadeHistory(cascade);

    // Manual or automatic rotation of slots
    ["slot1", "slot2", "slot3"].forEach(key => {
      if (!cascade.completion[key]) {
        cascade.slotStatus[key] = "expired";
      }
    });

    this.app.saveToStorage("cascade_state", cascade);
    this.syncMissionFromRoadmap();
  }

  undoCascade() {
    const cascade = this.ensureCascadeState();
    if (!cascade.stateHistory || cascade.stateHistory.length === 0) return;

    const lastState = cascade.stateHistory.pop();
    cascade.roadmapQueue = lastState.roadmapQueue;
    cascade.activeSlots = lastState.activeSlots;
    cascade.completion = lastState.completion;
    cascade.slotStatus = lastState.slotStatus;

    this.app.saveToStorage("cascade_state", cascade);
    this.syncMissionFromRoadmap();
  }

  _pushCascadeHistory(cascade) {
    cascade.stateHistory = cascade.stateHistory || [];
    cascade.stateHistory.push(JSON.parse(JSON.stringify({
      roadmapQueue: cascade.roadmapQueue,
      activeSlots: cascade.activeSlots,
      completion: cascade.completion,
      slotStatus: cascade.slotStatus,
    })));
    if (cascade.stateHistory.length > 20) cascade.stateHistory.shift();
  }



  triggerFinalizeDay() {
    if (!confirm("Finalize today's performance and generate tomorrow's schedule?")) return;
    this._performDayFinalization();
  }

  autoFinalizeAtSleep() {
    this._performDayFinalization(true);
  }

  _performDayFinalization(isSilent = false) {
    // 1. Run dynamic timetable shift based on behavior
    const behavior = this.analyzeBehavior();
    this.shiftTimetableTimes(behavior.state);

    // 2. Clear cascade state for fresh start
    localStorage.removeItem("cascade_state");

    // 3. Save updated roadmap & refresh
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.ROADMAP_STATE, this.state.roadmap);
    if (!isSilent) alert("Day finalized. Schedule updated based on your performance!");
    this.refresh();
  }



  // ── syncMissionFromRoadmap ───────────────────────────────────────────────
  // Performance: debounced via rAF + single container event delegation.
  // No manual buttons — slot expiry is time-driven automatically.
  syncMissionFromRoadmap() {
    if (this._syncMissionRaf) return;
    this._syncMissionRaf = requestAnimationFrame(() => {
      this._syncMissionRaf = null;
      this._doSyncMission();
    });
  }

  _doSyncMission() {
    try {
      // Step 1: Canonical goals
      CONFIG.DAILY_GOALS = [
        {
          id: "roadmap_learning", label: "Roadmap Tasks", minutesTarget: 270, sessionsTarget: 0,
          keywords: ["deep work", "learn", "learning", "study"],
          discipline_type: "strict", target_minutes: 270, category: "learning", priority: 0,
        },
        {
          id: "project", label: "Project Work", minutesTarget: 180, sessionsTarget: 0,
          keywords: ["project", "build"],
          discipline_type: "flexible", target_minutes: 180, category: "deep_work", priority: 1,
        },
        {
          id: "revision", label: "Revision", minutesTarget: 120, sessionsTarget: 0,
          keywords: ["revision"],
          discipline_type: "flexible", target_minutes: 120, category: "learning", priority: 2,
        },
      ];

      // Step 2: State + slot statuses
      const cascade = this.ensureCascadeState();
      this._refreshSlotStatuses(cascade);
      this.app.saveToStorage("cascade_state", cascade);
      this._scheduleAutoExpiry(cascade);

      // Step 3: Slot display config
      const formatTime = (t) => {
        const [h, m] = t.split(":").map(Number);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 || 12;
        return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
      };

      const SLOT_CONFIG = [];

      if (this.state.timetable) {
        let learningCount = 1;
        this.state.timetable.forEach((slot, idx) => {
          const type = slot.mapsTo === "learning" ? "learning" : "static";
          SLOT_CONFIG.push({
            slotKey: type === "learning" ? `slot${learningCount++}` : `static${idx}`,
            time: slot.time,
            label: slot.label,
            type: type
          });
        });
      }

      const container = document.querySelector(".shadow-goal-list");
      if (!container) return;

      const headerTitle = document.getElementById("daily-mission-header");
      if (headerTitle) {
        const isToday = cascade.date === this.app.getDateString(new Date());
        headerTitle.textContent = isToday ? "DAILY MISSION" : `DAILY MISSION (${cascade.date})`;
      }

      // Step 4: Build HTML — handles both learning and static slots
      let html = "";
      SLOT_CONFIG.forEach(slot => {
        const isLearning = slot.type === "learning";
        const status = cascade.slotStatus[slot.slotKey] || "pending";
        const isDone = status === "completed";
        const isExp = status === "expired";

        const opacity = isDone ? "0.4" : isExp ? "0.45" : "1";
        const filter = isExp ? "grayscale(1) contrast(0.7) brightness(0.8)" : "none";
        const color = isDone ? "var(--success)" : isExp ? "var(--text-tertiary)" : "var(--text-primary)";
        const circleIcon = isDone ? "●" : "○";

        if (isLearning) {
          const taskObj = cascade.activeSlots[slot.slotKey];
          if (taskObj) {
            const itemFilter = isExp ? "grayscale(1) brightness(0.7)" : filter;
            const itemOpacity = isExp ? 0.4 : opacity;
            html += `
              <div class="sd-mission-item shadow-goal-item" style="opacity:${itemOpacity}; filter:${itemFilter}; transition: all 0.3s ease;">
                <div style="display:flex; align-items:center;">
                  <button class="mission-circle-btn ${isDone ? "done" : ""} ${isExp ? "expired" : ""}" 
                    data-slot-key="${slot.slotKey}" 
                    ${isDone ? "disabled" : ""}>
                    <span style="pointer-events:none;">${circleIcon}</span>
                  </button>
                  <span class="mission-task-label" 
                        style="font-size:0.85rem; color:${isExp ? "var(--text-tertiary)" : color}; cursor:pointer; transition: all 0.2s; padding: 2px 6px; border-radius: 4px;"
                        onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'"
                        data-label="${this.escapeHtml(slot.label)}" 
                        data-subtext="${this.escapeHtml(taskObj.text)}">
                    ${formatTime(slot.time)} → <span style="font-weight:600;">${slot.label}</span>
                    <span style="font-weight:400; opacity:0.9;"> [${this.escapeHtml(taskObj.text)}]</span>
                    ${taskObj.cascaded ? `<span style="font-size:0.6rem; color:var(--warning); margin-left:4px; border:1px solid var(--warning); padding:1px 4px; border-radius:3px; opacity:0.8;">CASCADED</span>` : ""}
                    <em style="font-size:0.7rem; margin-left:6px; opacity:0.5;">${status}</em>
                  </span>
                </div>
              </div>`;
          } else {
            html += `
              <div class="sd-mission-item shadow-goal-item" style="opacity:0.35; filter:grayscale(1);">
                <div style="display:flex; align-items:center;">
                  <button class="mission-circle-btn" disabled><span style="pointer-events:none;">○</span></button>
                  <span style="font-size:0.85rem;color:var(--text-tertiary);">
                    ${formatTime(slot.time)} → ${slot.label} <span style="font-size:0.6rem; opacity:0.6; margin-left:4px;">[Missed - Shifted Down]</span>
                  </span>
                </div>
              </div>`;
          }
        } else {
          const itemFilter = isExp ? "grayscale(1) brightness(0.6)" : filter;
          const itemOpacity = isExp ? 0.35 : opacity;
          const labelColor = isExp ? "var(--text-tertiary)" : color;
          html += `
            <div class="sd-mission-item shadow-goal-item" style="opacity:${itemOpacity}; filter:${itemFilter}">
              <div style="display:flex; align-items:center;">
                <button class="mission-circle-btn ${isDone ? "done" : ""} ${isExp ? "expired" : ""}" 
                  data-slot-key="${slot.slotKey}" 
                  ${isDone ? "disabled" : ""}>
                  <span style="pointer-events:none;">${circleIcon}</span>
                </button>
                <span class="mission-task-label" 
                      style="font-size:0.85rem; color:${labelColor}; cursor:pointer; transition: all 0.2s; padding: 2px 6px; border-radius: 4px;"
                      onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'"
                      data-label="${this.escapeHtml(slot.label)}" 
                      data-subtext="">
                  ${formatTime(slot.time)} → ${slot.label} 
                  <em style="font-size:0.7rem; margin-left:6px; opacity:0.5;">${status}</em>
                </span>
              </div>
            </div>`;
        }

      });


      // Step 5: Single DOM write + persistent buttons
      const hasHistory = cascade.stateHistory?.length > 0;
      html += `
        <div style="display:flex; gap:8px; margin-top:16px;">
          <button id="btn-undo-cascade"
            style="padding:6px 12px; background:var(--bg-card); color:${hasHistory ? "var(--warning)" : "var(--text-tertiary)"};
                   border:1px solid var(--border); border-radius:4px; font-size:0.7rem;
                   cursor:${hasHistory ? "pointer" : "default"}; opacity:${hasHistory ? 1 : 0.4};"
            ${hasHistory ? "" : "disabled"}>↩ Undo</button>
          <button id="btn-finalize-day"
            style="flex:1; padding:6px; background:var(--bg-card); color:var(--success);
                   border:1px solid var(--success); border-radius:4px; font-size:0.75rem; cursor:pointer;">
            Finalize Day & Next Schedule
          </button>
        </div>`;

      container.innerHTML = html;

      // Step 5: Render (only if changed)
      if (container.getAttribute("data-last-html") === html) return;
      container.innerHTML = html;
      container.setAttribute("data-last-html", html);



    } catch (err) {
      console.error("[_doSyncMission] failed:", err);
    }
  }

  // ── Auto-expiry: fires re-render at each slot's scheduled time ───────────
  // Replaces the manual "Cascade Forward" button. Time-driven, not user-driven.
  _scheduleAutoExpiry(cascade) {
    (this._expiryTimers || []).forEach(id => clearTimeout(id));
    this._expiryTimers = [];
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    if (!this.state.timetable) return;

    const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

    this.state.timetable.forEach((slot, idx) => {
      // Determine key for this slot
      let key;
      if (slot.mapsTo === "learning") {
        const learningSlots = this.state.timetable.filter(s => s.mapsTo === "learning");
        const lIdx = learningSlots.indexOf(slot);
        key = `slot${lIdx + 1}`;
      } else {
        key = `static${idx}`;
      }

      const slotMin = toMin(slot.time);
      const msUntilSlot = (slotMin - nowMin) * 60000;

      // Schedule re-render 1 minute after slot window passes to show 'Expired'
      if (msUntilSlot > -60000 && msUntilSlot < 86400000) {
        let delay = msUntilSlot + 1000; // +1s buffer
        if (delay < 0) return; // already passed

        this._expiryTimers.push(setTimeout(() => {
          const c = this.ensureCascadeState();
          this._refreshSlotStatuses(c);
          this.app.saveToStorage("cascade_state", c);
          this.syncMissionFromRoadmap();
        }, delay));
      }
    });

    // Also schedule a re-render every minute for live time checks
    this._expiryTimers.push(setInterval(() => {
      const c = this.ensureCascadeState();
      this._refreshSlotStatuses(c);
      this.syncMissionFromRoadmap();
    }, 60000));
  }


  updatePenaltyTimer() {
    const el = this.app.elements["roadmap-penalty-timer"];
    if (!el) return;
    const footer = el.closest('.sd-mission-footer');
    if (!footer) return;

    const { activeModule } = this.getRoadmapProgress();
    if (!activeModule) {
      footer.innerHTML = `<span>No active penalty</span><span class="sd-mission-timer sd-num" id="roadmap-penalty-timer">00:00:00</span>`;
      return;
    }
    const pending = activeModule.days.filter((d) => d.status !== "completed" && !d.completed).length;
    if (!pending) {
      footer.innerHTML = `<span>Module complete • no penalty</span><span class="sd-mission-timer sd-num" id="roadmap-penalty-timer">00:00:00</span>`;
      return;
    }

    const due = new Date();
    due.setHours(23, 59, 59, 999);
    const ms = Math.max(0, due - new Date());
    const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
    footer.innerHTML = `<span>roadmap penalty • ${pending} tasks pending</span><span class="sd-mission-timer sd-num" id="roadmap-penalty-timer">${h}:${m}:${s}</span>`;
  }

  getFullRoadmapQueue() {
    const queue = [];
    if (!this.state.roadmap?.modules) return queue;

    this.state.roadmap.modules.forEach((mod, mIdx) => {
      mod.days.forEach((day, dIdx) => {
        if (day.status !== "completed" && !day.completed) {
          queue.push({
            moduleIndex: mIdx,
            dayIndex: dIdx,
            text: day.text
          });
        }
      });
    });
    return queue;
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
    const cascade = this.ensureCascadeState();
    const logicalCurrentDate = cascade.date || this.app.getDateString(new Date());
    
    // Preview date is ALWAYS LogicalCurrentDate + 1
    const d = new Date(logicalCurrentDate);
    d.setDate(d.getDate() + 1);
    const logicalNextDate = this.app.getDateString(d);
    
    const realDate = this.app.getDateString(new Date());
    const dateLabel = logicalNextDate;

    // Calculate completed modules
    const completedModules = this.state.roadmap.modules.filter((m) =>
      m.days.every((d) => d.status === "completed" || d.completed),
    ).length;

    // Find last sleep session
    const lastSleep = (this.app.state.tasks || [])
      .filter(t => t.category === "Sleep")
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))[0];
    const sleepDisplay = lastSleep
      ? `${new Date(lastSleep.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${lastSleep.duration}m)`
      : "No data";

    overview.innerHTML = `
          <div class="trainer-overview-card"><div class="trainer-overview-label">View Date</div><div class="trainer-overview-value" style="color:var(--text-accent);">${dateLabel}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Active Module</div><div class="trainer-overview-value">${this.escapeHtml(activeModule?.name || "Completed")}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Modules Complete</div><div class="trainer-overview-value">${completedModules}/${this.state.roadmap.modules.length}</div></div>
          <div class="trainer-overview-card"><div class="trainer-overview-label">Last Sleep</div><div class="trainer-overview-value" style="font-size:0.7rem;">${sleepDisplay}</div></div>
        `;

    // Add Schedule Preview (innovations: improve.md §8)
    const formatTime = (t) => {
      const [h, m] = t.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    let scheduleHtml = `<div class="roadmap-schedule-preview" style="margin-bottom:24px; padding:15px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border);">
      <h3 style="font-size:0.9rem; color:var(--text-accent); margin-bottom:12px; border-bottom:1px solid var(--border-subtle, rgba(255,255,255,0.1)); padding-bottom:6px; font-weight:700;">📋 ${dateLabel} SE2 TIMETABLE</h3>
      <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px;">`;

    const isToday = logicalNextDate === realDate;
    const analysis = this.analyzeBehavior();
    const { state: behavioralState } = analysis;

    // Use a copy for hypothetical tomorrow preview
    let previewTimetable = JSON.parse(JSON.stringify(this.state.timetable));
    if (isToday) {
      // Show what it WOULD be after correction
      this.shiftTimetableTimes(behavioralState, previewTimetable);
    }

    if (typeof previewTimetable !== "undefined") {
      previewTimetable.forEach(slot => {
        scheduleHtml += `<div style="font-size:0.85rem; color:var(--text-secondary); display:flex; flex-direction:column;">
          <strong style="color:var(--text-accent); font-family:'JetBrains Mono', monospace;">${formatTime(slot.time)}</strong>
          <span style="opacity:0.8;">${slot.label}</span>
        </div>`;
      });
    }
    scheduleHtml += `</div></div>`;

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
        const checked = status === "completed" || day.completed ? "checked" : "";
        const stateIcon = status === "completed" ? "✔" : status === "active" ? "●" : "🔒";
        const stateLabel = status === "completed" ? "Completed" : status === "active" ? "Active" : "Locked";

        const dayText = this.state.roadmap.editMode
          ? `<textarea class="roadmap-edit" data-module="${mi}" data-day="${di}">${this.escapeHtml(day.text)}</textarea>`
          : this.escapeHtml(day.text);

        html += `
          <div class="roadmap-day-item ${status}" style="opacity: ${status === 'locked' ? '0.5' : '1'}; display:flex; align-items:flex-start; margin-bottom:12px; padding:10px; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid var(--border-subtle, rgba(255,255,255,0.05));">
            <input type="checkbox" class="roadmap-check" data-module="${mi}" data-day="${di}" ${checked} ${disabled} style="margin-right:12px; margin-top:3px; cursor:${status === 'locked' ? 'default' : 'pointer'};">
            <div class="roadmap-day-info" style="flex:1;">
              <div class="roadmap-day-label" style="font-size:0.75rem; color:${status === 'active' ? 'var(--text-accent)' : 'var(--text-secondary)'}; font-weight:600; text-transform:uppercase; margin-bottom:4px;">${day.day || `Day ${di + 1}`} — ${stateLabel} ${stateIcon}</div>
              <div class="roadmap-day-text" style="font-size:0.9rem; line-height:1.4;">${dayText}</div>
            </div>
          </div>
        `;
      });
      html += `</section>`;
    });

    content.innerHTML = scheduleHtml + html;

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
    // ── SE2 Daily Cycle: Use 'Logical Date' from cascade_state if available ──
    const cascade = this.ensureCascadeState();
    const logicalDate = cascade.date || this.app.getDateString(new Date());
    const realDate = this.app.getDateString(new Date());
    const isFutureDay = logicalDate > realDate;

    this.todayTasksCache = (this.app.state.tasks || []).filter(t => t.date === logicalDate);

    // Step 2: analyzeBehavior — reads from BehaviorStore + shadowEngine
    const behaviorSnapshot = this.analyzeBehavior();
    const behavioralState = behaviorSnapshot.state;

    // ── Apply SE2 Timetable Shifting and Rerouting ──
    // Shifting always happens toward IDEAL based on the logical context
    this.shiftTimetableTimes(behavioralState);

    // Only reroute if we are actually ON the real date. 
    // If we advanced to tomorrow, don't reroute yet.
    if (!isFutureDay) {
      this.rerouteScheduleForToday();
    }

    // Step 4: applyCorrection
    const timetable = this.evaluateTimetable(this.todayTasksCache, logicalDate);
    const sleepCompromised = timetable.sleepStatus === "COMPROMISED_OK";

    // Step 5: generateMissions
    // SE2: Detect last night's sleep for fatigue reduction
    const lastSleepTask = (this.app.state.tasks || [])
      .filter(t => t.category === "Sleep" && t.date === realDate)
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))[0];
    const sleepMinutes = lastSleepTask ? lastSleepTask.duration : 720; // default to plenty if unknown
    const isFatigued = sleepMinutes < CONFIG.SE2.FATIGUE_THRESHOLD_MINUTES;

    const missionTargets = this.generateMissionTargets(behavioralState, sleepCompromised, isFatigued);


    // Step 6: applyRules
    this.computeFlexibilityBuffer();

    // Step 7: Persist behavioral signals (only if real-time today)
    if (this.app.shadowEngine?.behaviorStore && !isFutureDay) {
      const todayMinutes = this.todayTasksCache.reduce((sum, t) => sum + (this.app.isProductiveCategory(t.category) ? t.duration : 0), 0);
      this.app.shadowEngine.updateBehaviorSignals(
        logicalDate,
        todayMinutes,

        this.app.shadowEngine.shadowSevenDayAverage || 0,
      );
    }

    // Step 8: Render
    this.ensureRoadmap();
    this.renderRoadmap();
    this.syncMissionFromRoadmap();
    this.updatePenaltyTimer();
  }


  showWindow() {
    this.refresh();
    this.app.elements["trainer-modal"].style.display = "flex";
  }

  autoFinalizeAtSleep() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let sleepTime48 = nowMin;
    if (nowMin < 480) sleepTime48 += 1440;

    const firstSlot = this.state.timetable[0] || TIMETABLE_LOGIC[0];
    const [h, m] = (firstSlot.time || "04:00").split(":").map(Number);
    const idealWake48 = 1440 + (h * 60 + m);

    const minSleep = CONFIG.SE2.MIN_SLEEP_LIMIT || 300;
    const wakeDeadline48 = sleepTime48 + minSleep;
    const wakeOffset = Math.max(0, wakeDeadline48 - idealWake48);

    console.log("[SE2] Deterministic Sleep Flip triggered.");
    this._performDayFinalization(wakeOffset);
  }

  triggerFinalizeDay() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let sleepTime48 = nowMin;
    if (nowMin < 480) sleepTime48 += 1440;

    const firstSlot = this.state.timetable[0] || TIMETABLE_LOGIC[0];
    const [h, m] = (firstSlot.time || "04:00").split(":").map(Number);
    const idealWake48 = 1440 + (h * 60 + m);

    const minSleep = CONFIG.SE2.MIN_SLEEP_LIMIT || 300;
    const wakeDeadline48 = sleepTime48 + minSleep;
    const wakeOffset = Math.max(0, wakeDeadline48 - idealWake48);

    this._performDayFinalization(wakeOffset);
  }

  _performDayFinalization(wakeOffset = 0) {
    const analysis = this.analyzeBehavior();
    const { state: behavioralState } = analysis;

    // 1. Shift baseline timetable times for tomorrow
    this.shiftTimetableTimes(behavioralState);

    // ── Immediate Wake Rerouting (GPS Override) ──
    // If wakeOffset > 0, we must shift the entire tomorrow schedule
    if (wakeOffset > 0 && this.state.timetable) {
      const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      const toTime = (m) => {
        const wrapped = ((Math.round(m) % 1440) + 1440) % 1440;
        return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
      };

      this.state.timetable.forEach(slot => {
        const currentMin = toMin(slot.time);
        slot.time = toTime(currentMin + wakeOffset);
      });
    }

    // 2. Unfinished Roadmap Task Carry-over (improve.md §8)
    const cascade = this.ensureCascadeState();
    const unfinishedTasks = [];
    ["slot1", "slot2", "slot3"].forEach(key => {
      // Re-add to queue if not completed and an actual task was assigned
      if (!cascade.completion[key] && cascade.activeSlots[key]) {
        unfinishedTasks.push(cascade.activeSlots[key]);
      }
    });

    // Reset SE2 cascade for the new day
    // SE2: If we finalize before 4 AM, "Tomorrow" is technically the same physical day's morning.
    const finalToday = new Date();
    if (finalToday.getHours() < 4) finalToday.setDate(finalToday.getDate() - 1);

    const tomorrow = new Date(finalToday);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = this.app.getDateString(tomorrow);

    const freshQueue = this.getFullRoadmapQueue();
    // Unique carry-over (don't duplicate if already in queue)
    const carriedQueue = [...unfinishedTasks];
    freshQueue.forEach(t => {
      const exists = carriedQueue.some(u => u.moduleIndex === t.moduleIndex && u.dayIndex === t.dayIndex);
      if (!exists) carriedQueue.push(t);
    });

    const nextCascade = {
      date: tomorrowStr,
      roadmapQueue: carriedQueue,
      activeSlots: {
        slot1: carriedQueue[0] || null,
        slot2: carriedQueue[1] || null,
        slot3: carriedQueue[2] || null,
      },
      completion: { slot1: false, slot2: false, slot3: false },
      slotStatus: { slot1: "pending", slot2: "pending", slot3: "pending" },
      stateHistory: [],
    };

    this.app.saveToStorage("cascade_state", nextCascade);
    this.app.saveToStorage(CONFIG.STORAGE_KEYS.TRAINER_STATE, this.state);

    // 3. UI update
    this.refresh();
    this.app.shadowEngine?.refresh(false);
  }

  // SE2: ADVANCE TO NEXT DAY (manual trigger from Roadmap Console)
  handleNextDayClick() {
    this._performDayFinalization();
  }

  switchToYesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterdayStr = this.app.getDateString(d);
    
    const cascade = this.app.loadFromStorage("cascade_state");
    if (cascade) {
      cascade.date = yesterdayStr;
      this.app.saveToStorage("cascade_state", cascade);
      this.refresh();
    }
  }


  // SE2: Automatically called when the "Sleep" stopwatch is started
  autoFinalizeAtSleep() {
    // Only finalize if we are not already on a future date preview
    const realDate = this.app.getDateString(new Date());
    const cascade = this.ensureCascadeState();
    
    // We only want to finalize if the current mission view is actually "Today"
    if (cascade.date <= realDate) {
      console.log("[SE2] Auto-finalizing day via Sleep trigger...");
      this._performDayFinalization();
    }
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
