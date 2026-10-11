/**
 * modules/insights.js  —  Phase 5b
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure-JS routine review. Reads existing localStorage data — never writes.
 * Exports window.Insights = { analyze() }.
 *
 * Data read (read-only):
 *   localStorage["discipline_tracker_tasks"]         — stopwatch sessions + sleep
 *   localStorage["discipline_tracker_trainer_state"] — mission ticks
 *   fetch("data/timetable.json")                     — via window.Planner._loadData()
 *
 * Does NOT modify any existing features.
 */

(function () {
  'use strict';

  // ─── config ────────────────────────────────────────────────────────────────

  const INSIGHTS_CONFIG = {
    lookbackDays:     14,
    minDaysRequired:  7,
    maxFindings:      3,
    morningEnd:       '12:00',   // blocks starting before this = morning
    afternoonEnd:     '17:00',   // blocks starting before this = afternoon, else evening
    ollamaModel:      'qwen2.5:3b',
    ollamaTemp:       0,
    ollamaBase:       'http://localhost:11434',
  };

  // ─── helpers ───────────────────────────────────────────────────────────────

  function toMins(hhmm) {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return NaN;
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function isoDate(ms) {
    const d = new Date(ms);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /** Returns array of ISO date strings for last N calendar days ending yesterday */
  function buildDateWindow(lookback) {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = lookback; i >= 1; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(isoDate(d.getTime()));
    }
    return days;
  }

  function isSunday(dateStr) {
    return new Date(dateStr + 'T00:00:00').getDay() === 0;
  }

  /** Fuzzy match: does a session description / subcategory match a timetable block? */
  function sessionMatchesBlock(session, block) {
    const haystack = [
      session.name || '',
      session.description || '',
      session.subcategory || '',
    ].join(' ').toLowerCase();
    const needle = block.title.toLowerCase();
    return haystack.includes(needle.slice(0, 6)) || needle.includes(haystack.slice(0, 6));
  }

  // ─── data loading ──────────────────────────────────────────────────────────

  function loadTasks() {
    try {
      return JSON.parse(localStorage.getItem('discipline_tracker_tasks') || '[]');
    } catch { return []; }
  }

  function loadTrainerState() {
    try {
      return JSON.parse(localStorage.getItem('discipline_tracker_trainer_state') || '{}');
    } catch { return {}; }
  }

  async function loadTimetable() {
    if (window.Planner?._loadData) {
      const data = await window.Planner._loadData();
      return data.timetable;
    }
    const r = await fetch('data/timetable.json');
    return r.json();
  }

  // ─── metric 1: wake time ───────────────────────────────────────────────────

  /**
   * For each date, compute "actual wake time" in minutes since midnight.
   * Priority: end-time of the night-sleep session whose startTime falls on the
   * PREVIOUS day (sleep started previous night, ended this morning).
   * Fallback: earliest stopwatch session that started on this day.
   */
  function computeWakeTimes(days, tasks) {
    const byDate = {};
    tasks.forEach(t => {
      const d = t.date || isoDate(t.startTime);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(t);
    });

    const result = {};
    days.forEach(date => {
      // Try: find a Sleep session that ENDED on this date
      // Its startTime would be on the previous day
      const prevDate = isoDate(new Date(date + 'T00:00:00').getTime() - 86400000);
      const prevSessions = byDate[prevDate] || [];
      const sleepSession = prevSessions.find(t =>
        t.category === 'Sleep' && t.endTime && isoDate(t.endTime) === date
      );

      if (sleepSession && sleepSession.endTime) {
        const wakeDate = new Date(sleepSession.endTime);
        result[date] = wakeDate.getHours() * 60 + wakeDate.getMinutes();
        return;
      }

      // Fallback: earliest stopwatch session starting on this date
      const dayTasks = byDate[date] || [];
      const studyTasks = dayTasks.filter(t => t.category !== 'Sleep' && t.startTime);
      if (studyTasks.length) {
        studyTasks.sort((a, b) => a.startTime - b.startTime);
        const first = new Date(studyTasks[0].startTime);
        result[date] = first.getHours() * 60 + first.getMinutes();
      }
    });
    return result;
  }

  // ─── metric 2: per-block completion rate ───────────────────────────────────

  /**
   * Denominator = all calendar days in the window.
   * For study/test/revision blocks: exclude Sundays from the denominator.
   * A block is "completed" on a day if:
   *   - a stopwatch session fuzzy-matches the block title, OR
   *   - the trainer manualChecks has a true entry for that block id that day.
   */
  function computeCompletionRates(days, tasks, timetable, trainerState) {
    const byDate = {};
    tasks.forEach(t => {
      const d = t.date || isoDate(t.startTime);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(t);
    });

    const manualChecks = trainerState?.state?.manualChecks || trainerState?.manualChecks || {};

    const studyTypes = new Set(['study', 'test', 'revision']);
    const rates = {};

    timetable.forEach(block => {
      if (!studyTypes.has(block.type)) return;

      let denominator = 0;
      let completed   = 0;

      days.forEach(date => {
        // Exclude Sundays for study/test/revision blocks
        if (isSunday(date)) return;
        denominator++;

        const daySessions = byDate[date] || [];
        const missionTick = (manualChecks[date] || {})[block.id] === true;
        const hasSession  = daySessions.some(t => sessionMatchesBlock(t, block));

        if (missionTick || hasSession) completed++;
      });

      rates[block.id] = denominator > 0 ? completed / denominator : 0;
    });

    return rates;   // { blockId: 0–1 }
  }

  // ─── metric 3: planned vs tracked study hours ──────────────────────────────

  function computeStudyGap(days, tasks, timetable) {
    const studyTypes = new Set(['study', 'test', 'revision']);
    const plannedMins = timetable
      .filter(b => studyTypes.has(b.type))
      .reduce((s, b) => s + b.duration, 0);

    // Denominator: non-Sunday days in window
    const nonSunDays = days.filter(d => !isSunday(d));
    if (!nonSunDays.length) return { plannedMins, avgTrackedMins: 0, gap: 0 };

    const byDate = {};
    tasks.forEach(t => {
      const d = t.date || isoDate(t.startTime);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(t);
    });

    const studyCategories = new Set(['Productive Work', 'Study']);
    let totalTracked = 0;
    nonSunDays.forEach(date => {
      const daySessions = byDate[date] || [];
      totalTracked += daySessions
        .filter(t => studyCategories.has(t.category))
        .reduce((s, t) => s + (t.duration || 0), 0);
    });

    const avgTrackedMins = totalTracked / nonSunDays.length;
    const gap = plannedMins - avgTrackedMins;
    return { plannedMins, avgTrackedMins: Math.round(avgTrackedMins), gap: Math.round(gap) };
  }

  // ─── metric 4: sleep ───────────────────────────────────────────────────────

  function computeSleepMetrics(days, tasks, timetable) {
    const plannedBlock = timetable.find(b => b.id === 'sleep' || b.type === 'sleep');
    const plannedMins  = plannedBlock ? plannedBlock.duration : 390;

    const sleepSessions = tasks.filter(t =>
      t.category === 'Sleep' &&
      days.some(d => d === (t.date || isoDate(t.startTime)))
    );

    const avgLogged = sleepSessions.length
      ? sleepSessions.reduce((s, t) => s + (t.duration || 0), 0) / sleepSessions.length
      : 0;

    return {
      plannedMins,
      avgLoggedMins: Math.round(avgLogged),
      deficit: Math.round(plannedMins - avgLogged),
    };
  }

  // ─── group blocks by time-of-day ───────────────────────────────────────────

  function groupRates(completionRates, timetable) {
    const morningMins   = toMins(INSIGHTS_CONFIG.morningEnd);
    const afternoonMins = toMins(INSIGHTS_CONFIG.afternoonEnd);
    const groups = { morning: [], afternoon: [], evening: [] };

    timetable.forEach(b => {
      if (!completionRates.hasOwnProperty(b.id)) return;
      const start = toMins(b.start);
      if (start < morningMins)   groups.morning.push(completionRates[b.id]);
      else if (start < afternoonMins) groups.afternoon.push(completionRates[b.id]);
      else groups.evening.push(completionRates[b.id]);
    });

    const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    return {
      morning:   mean(groups.morning),
      afternoon: mean(groups.afternoon),
      evening:   mean(groups.evening),
    };
  }

  // ─── rules engine ──────────────────────────────────────────────────────────

  /**
   * Fixed FixKey list.
   * shift_wake_earlier      → Planner.proposeChange({ type:'shift_wake', by: N })
   * add_morning_buffer      → Planner.proposeChange({ type:'add_buffer', session:'morning', mins:15 })
   * move_block_to_morning   → Planner.proposeChange({ type:'move_to_morning', id: <lowestBlock> })
   * shorten_lunch_rest      → Planner.proposeChange({ type:'shorten', id:'lunch_rest', by:15 })
   * shorten_workout         → Planner.proposeChange({ type:'shorten', id:'workout_free_time', by:15 })
   * null                    → informational only
   */

  function runRules(metrics) {
    const { drift, groupRate, gap, sleep, completionRates, timetable } = metrics;
    const findings = [];

    // 1. Late wake
    if (drift !== null && drift >= 15) {
      findings.push({
        severity: 3,
        text: `You start work an average of ${drift} min after your target wake time.`,
        numbers: [drift],
        fix: 'shift_wake_earlier',
        fixPayload: { type: 'shift_wake', by: Math.min(drift, 30) },
      });
    }

    // 2. Low morning completion
    if (groupRate.morning !== null && groupRate.morning < 0.6) {
      const pct = Math.round(groupRate.morning * 100);
      findings.push({
        severity: 3,
        text: `Morning blocks completed only ${pct}% of days (target ≥ 60%).`,
        numbers: [pct, 60],
        fix: 'add_morning_buffer',
        fixPayload: { type: 'add_buffer', session: 'morning', mins: 15 },
      });
    }

    // 3. Low afternoon completion (amended fix keys)
    if (groupRate.afternoon !== null && groupRate.afternoon < 0.6) {
      const pct = Math.round(groupRate.afternoon * 100);
      // Find lowest-rated afternoon block to potentially move
      const afternoonMins = toMins(INSIGHTS_CONFIG.afternoonEnd);
      const morningMins   = toMins(INSIGHTS_CONFIG.morningEnd);
      const afternoonBlocks = timetable.filter(b => {
        const s = toMins(b.start);
        return s >= morningMins && s < afternoonMins && completionRates.hasOwnProperty(b.id);
      });
      afternoonBlocks.sort((a, b) => (completionRates[a.id] || 0) - (completionRates[b.id] || 0));
      const lowestBlock = afternoonBlocks[0];

      // Choose fix: if the block could fit in morning, move it; otherwise shorten lunch
      const fix = lowestBlock ? 'move_block_to_morning' : 'shorten_lunch_rest';
      const fixPayload = lowestBlock
        ? { type: 'move_to_morning', id: lowestBlock.id }
        : { type: 'shorten', id: 'lunch_rest', by: 15 };

      findings.push({
        severity: 2,
        text: `Afternoon blocks completed only ${pct}% of days (target ≥ 60%).`,
        numbers: [pct, 60],
        fix,
        fixPayload,
      });
    }

    // 4. Large study gap
    if (gap.gap >= 60) {
      findings.push({
        severity: 2,
        text: `You track ${gap.avgTrackedMins} min of study per day vs ${gap.plannedMins} min planned (${gap.gap} min gap).`,
        numbers: [gap.avgTrackedMins, gap.plannedMins, gap.gap],
        fix: 'shorten_workout',
        fixPayload: { type: 'shorten', id: 'workout_free_time', by: 15 },
      });
    }

    // 5. Sleep deficit (informational)
    if (sleep.deficit >= 45) {
      findings.push({
        severity: 2,
        text: `Average logged sleep is ${sleep.avgLoggedMins} min vs ${sleep.plannedMins} min planned (${sleep.deficit} min deficit).`,
        numbers: [sleep.avgLoggedMins, sleep.plannedMins, sleep.deficit],
        fix: null,
        fixPayload: null,
      });
    }

    // 6. Low evening completion
    if (groupRate.evening !== null && groupRate.evening < 0.5) {
      const pct = Math.round(groupRate.evening * 100);
      findings.push({
        severity: 1,
        text: `Evening blocks completed only ${pct}% of days (target ≥ 50%).`,
        numbers: [pct, 50],
        fix: 'shorten_workout',
        fixPayload: { type: 'shorten', id: 'workout_free_time', by: 15 },
      });
    }

    // Sort by severity descending, return top N
    findings.sort((a, b) => b.severity - a.severity);
    return findings.slice(0, INSIGHTS_CONFIG.maxFindings);
  }

  // ─── optional model rewrite ────────────────────────────────────────────────

  async function tryModelRewrite(findings) {
    const allNumbers = [...new Set(findings.flatMap(f => f.numbers))];
    const plainTexts = findings.map(f => f.text);

    let modelText = null;
    try {
      const r = await fetch(INSIGHTS_CONFIG.ollamaBase + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          model: INSIGHTS_CONFIG.ollamaModel,
          stream: false,
          options: { temperature: INSIGHTS_CONFIG.ollamaTemp },
          messages: [
            {
              role: 'system',
              content: 'You are a friendly study coach. Rewrite the findings below in ' +
                '3-4 encouraging sentences. You may ONLY use numbers that appear in the ' +
                '"Allowed numbers" list. Do not invent new numbers.',
            },
            {
              role: 'user',
              content: 'Findings:\n' + plainTexts.map((t, i) => `${i + 1}. ${t}`).join('\n') +
                '\n\nAllowed numbers: ' + allNumbers.join(', '),
            },
          ],
        }),
      });

      if (r.ok) {
        const data = await r.json();
        modelText = data?.message?.content?.trim() || null;
      }
    } catch {
      // Ollama offline or timed out — fall through to plain text
    }

    if (!modelText) return null;

    // Validate: every number in model output must be in allNumbers
    const modelNumbers = [...modelText.matchAll(/\b\d+(\.\d+)?\b/g)]
      .map(m => Number(m[0]));
    const allowed = new Set(allNumbers.map(Number));
    const hasForeignNumber = modelNumbers.some(n => !allowed.has(n));
    if (hasForeignNumber) return null;   // discard hallucinated numbers

    return modelText;
  }

  // ─── public API ────────────────────────────────────────────────────────────

  /**
   * Analyze the last 14 days and return findings.
   * @returns {Promise<{
   *   insufficient?: bool, daysFound?: number,
   *   findings?: Array, modelText?: string|null,
   *   metrics?: object
   * }>}
   */
  async function analyze() {
    const tasks        = loadTasks();
    const trainerState = loadTrainerState();
    const timetable    = await loadTimetable();

    const allDays = buildDateWindow(INSIGHTS_CONFIG.lookbackDays);

    // Find first day with any logged task
    const taskDates = new Set(tasks.map(t => t.date || isoDate(t.startTime)));
    const activeDays = allDays.filter(d => taskDates.has(d));

    if (activeDays.length < INSIGHTS_CONFIG.minDaysRequired) {
      return { insufficient: true, daysFound: activeDays.length };
    }

    // Use all calendar days from the first active day to now
    const firstActive = activeDays[0];
    const windowDays  = allDays.filter(d => d >= firstActive);

    // Metric 1: wake drift
    const wakeTimes   = computeWakeTimes(windowDays, tasks);
    const targetWake  = timetable[0]?.start ? toMins(timetable[0].start) : 300; // 05:00
    const wakeValues  = Object.values(wakeTimes).filter(v => v !== undefined);
    const avgWake     = wakeValues.length
      ? wakeValues.reduce((a, b) => a + b, 0) / wakeValues.length
      : null;
    const drift = avgWake !== null ? Math.round(avgWake - targetWake) : null;

    // Metric 2: completion rates
    const completionRates = computeCompletionRates(windowDays, tasks, timetable, trainerState);
    const groupRate       = groupRates(completionRates, timetable);

    // Metric 3: study gap
    const gap = computeStudyGap(windowDays, tasks, timetable);

    // Metric 4: sleep
    const sleep = computeSleepMetrics(windowDays, tasks, timetable);

    const metrics = { drift, groupRate, gap, sleep, completionRates, timetable };

    // Rules → findings
    const findings = runRules(metrics);

    // Optional model rewrite
    const modelText = findings.length ? await tryModelRewrite(findings) : null;

    return { findings, modelText, metrics };
  }

  // ─── export ────────────────────────────────────────────────────────────────

  window.Insights = { analyze };
  console.log('[insights.js] Phase 5b ready.');

})();
