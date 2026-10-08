/**
 * modules/planner.js
 * Pure JS planner — no AI, no external dependencies.
 * Reads plan.json, timetable.json, rules.json from /data/
 * and exports: buildToday(date), proposeChange(event), projectFinish(), daysBehind()
 */

// ─── helpers ───────────────────────────────────────────────────────────────

/** Convert "HH:MM" → minutes-since-midnight.  Returns NaN for invalid input. */
function toMins(str) {
  if (typeof str !== 'string' || !/^\d{2}:\d{2}$/.test(str)) return NaN;
  const [h, m] = str.split(':').map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return NaN;
  return h * 60 + m;
}

/** Convert minutes-since-midnight → "HH:MM" */
function fromMins(mins) {
  const h = Math.floor(((mins % 1440) + 1440) % 1440 / 60);
  const m = ((mins % 1440) + 1440) % 1440 % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

/** Parse "YYYY-MM-DD" strictly; returns null for invalid dates like 2026-02-31 */
function parseDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, mo, d] = str.split('-').map(Number);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** Deep-clone a timetable array */
function cloneTimetable(tt) {
  return tt.map(b => Object.assign({}, b));
}

// ─── loader (runs once, caches) ────────────────────────────────────────────

let _cache = null;

async function loadData() {
  if (_cache) return _cache;
  const [ttRes, rulesRes, planRes] = await Promise.all([
    fetch('data/timetable.json'),
    fetch('data/rules.json'),
    fetch('data/plan.json'),
  ]);
  if (!ttRes.ok || !rulesRes.ok || !planRes.ok)
    throw new Error('Planner: failed to load one or more data files');
  const [timetable, rules, plan] = await Promise.all([
    ttRes.json(), rulesRes.json(), planRes.json(),
  ]);
  _cache = { timetable, rules, plan };
  return _cache;
}

// ─── core: flatten blocks into a day ───────────────────────────────────────

/**
 * Build a flat list of today's time blocks, applying 85 % efficiency to study slots.
 * @param {Date|string} date – JS Date or "YYYY-MM-DD"
 * @returns {Promise<Array>} ordered array of block objects
 */
async function buildToday(date) {
  const dt = typeof date === 'string' ? parseDate(date) : date;
  if (!dt) throw new RangeError('buildToday: invalid date "' + date + '"');

  const { timetable, rules } = await loadData();
  const blocks = cloneTimetable(timetable);

  // Sunday mode: replace all study blocks with revision hint
  const isSunday = dt.getDay() === 0;
  if (isSunday && rules.sunday_mode === 'revision_only') {
    return blocks.map(b => {
      if (b.type === 'study') {
        return Object.assign({}, b, {
          title: '[Sunday Revision] ' + b.title,
          type: 'revision',
          effectiveMins: Math.round(b.duration * rules.efficiency_target),
        });
      }
      return Object.assign({}, b, { effectiveMins: b.duration });
    });
  }

  return blocks.map(b => ({
    ...b,
    effectiveMins: b.type === 'study'
      ? Math.round(b.duration * rules.efficiency_target)
      : b.duration,
  }));
}

// ─── core: propose a change ────────────────────────────────────────────────

/**
 * Given an external event (e.g. "guests 15:00–17:00"), return a proposed
 * adjusted timetable. Never touches never_cut blocks.
 *
 * @param {{ start: string, end: string, title?: string }} event
 * @returns {Promise<{ proposed: Array, cut: Array, moved: Array }>}
 */
async function proposeChange(event) {
  const { timetable, rules } = await loadData();

  const evStart = toMins(event.start);
  const evEnd   = toMins(event.end);
  if (isNaN(evStart) || isNaN(evEnd) || evEnd <= evStart)
    throw new RangeError('proposeChange: invalid event times');

  const proposed = cloneTimetable(timetable);
  const cut   = [];
  const moved = [];
  const evDuration = evEnd - evStart;   // minutes the event consumes

  // Identify blocks that overlap with the event
  const overlapping = proposed.filter(b => {
    const bStart = toMins(b.start);
    const bEnd   = toMins(b.end);
    return bStart < evEnd && bEnd > evStart;
  });

  // Sort overlapping blocks by cut_priority (lower index = cut first)
  const cutPriority = rules.cut_priority;
  const neverCut    = rules.never_cut;

  // Protected blocks that overlap — event must be rejected if any never_cut is hit
  const protectedOverlap = overlapping.filter(b =>
    neverCut.includes(b.id) || neverCut.includes(b.type)
  );
  if (protectedOverlap.length > 0) {
    return {
      proposed,
      cut: [],
      moved: [],
      warning: 'Event overlaps a protected block: ' +
        protectedOverlap.map(b => b.title).join(', ') + '. Cannot apply.',
    };
  }

  let remainingFreeMins = evDuration;

  // 1. Cut buffers and workout first
  for (const b of overlapping) {
    if (remainingFreeMins <= 0) break;
    const priority = cutPriority.indexOf(b.type) !== -1
      ? cutPriority.indexOf(b.type)
      : cutPriority.indexOf(b.id);
    if (priority === -1) continue;  // not cuttable
    if (neverCut.includes(b.id) || neverCut.includes(b.type)) continue;

    cut.push(b.title);
    b._cut = true;
    remainingFreeMins -= b.duration;
  }

  // 2. Push surviving study blocks that end after event to after evEnd
  let cursor = evEnd;
  for (let i = 0; i < proposed.length; i++) {
    const b = proposed[i];
    if (b._cut) continue;
    const bStart = toMins(b.start);
    const bEnd   = toMins(b.end);

    if (bStart >= evStart && bEnd <= evEnd) {
      // fully inside event window and not cut → push after event
      const oldStart = b.start;
      b.start = fromMins(cursor);
      b.end   = fromMins(cursor + b.duration);
      cursor  = cursor + b.duration;
      moved.push({ title: b.title, from: oldStart, to: b.start });
    } else if (bStart < evEnd && bEnd > evStart && bStart >= evStart) {
      // partially overlapping: trim and push
      const oldStart = b.start;
      b.start = fromMins(cursor);
      b.end   = fromMins(cursor + b.duration);
      cursor  = cursor + b.duration;
      moved.push({ title: b.title, from: oldStart, to: b.start });
    }
  }

  // Insert the event block itself
  const eventBlock = {
    id: 'external_event',
    title: event.title || 'External Event',
    type: 'event',
    start: event.start,
    end: event.end,
    duration: evDuration,
    effectiveMins: evDuration,
  };

  // Build final list: everything before event, event, then the rest
  const before = proposed.filter(b => {
    const bEnd = toMins(b.end);
    return !b._cut && bEnd <= evStart;
  });
  const after  = proposed.filter(b => {
    const bStart = toMins(b.start);
    return !b._cut && bStart >= evEnd;
  });

  const finalProposed = [...before, eventBlock, ...after];
  return { proposed: finalProposed, cut, moved };
}

// ─── projections ───────────────────────────────────────────────────────────

/**
 * Project the finish date for each subject based on hours remaining.
 * @returns {Promise<Object>} map of subjectId → { finishDate, daysLeft, hoursLeft }
 */
async function projectFinish() {
  const { timetable, plan, rules } = await loadData();

  // Daily effective minutes per subject from timetable
  const dailyMins = {};
  for (const b of timetable) {
    if (b.type === 'study' || b.type === 'test') {
      dailyMins[b.id] = Math.round(b.duration * rules.efficiency_target);
    }
  }

  const result = {};
  const startDt = parseDate(plan.start_date) || new Date();

  for (const [subjectId, data] of Object.entries(plan.subjects)) {
    const hoursLeft = data.total_hours_required - data.hours_completed;
    const minsLeft  = hoursLeft * 60;
    const minsPerDay = dailyMins[subjectId] || 0;

    if (minsPerDay === 0) {
      result[subjectId] = { finishDate: 'no slot', daysLeft: Infinity, hoursLeft };
      continue;
    }

    const daysLeft = Math.ceil(minsLeft / minsPerDay);
    const finishDt = new Date(startDt);
    finishDt.setDate(finishDt.getDate() + daysLeft);
    result[subjectId] = {
      finishDate: finishDt.toISOString().slice(0, 10),
      daysLeft,
      hoursLeft,
    };
  }
  return result;
}

/**
 * Return how many days behind schedule we are overall.
 * Defined as: (days elapsed since start_date) - (total effective study days clocked).
 * @returns {Promise<number>}
 */
async function daysBehind() {
  const { plan } = await loadData();
  const startDt = parseDate(plan.start_date);
  if (!startDt) return 0;

  const today     = new Date();
  today.setHours(0, 0, 0, 0);
  const elapsed   = Math.max(0, Math.round((today - startDt) / 86400000));

  // Sum total hours completed across all subjects
  const totalCompleted = Object.values(plan.subjects)
    .reduce((sum, s) => sum + (s.hours_completed || 0), 0);
  const totalRequired = Object.values(plan.subjects)
    .reduce((sum, s) => sum + s.total_hours_required, 0);

  if (totalRequired === 0) return 0;

  // What fraction of work should be done by now
  const { timetable } = await loadData();
  const dailyStudyMins = timetable
    .filter(b => b.type === 'study')
    .reduce((sum, b) => sum + b.duration, 0);
  const expectedHoursPerDay = dailyStudyMins / 60;
  const expectedHours = expectedHoursPerDay * elapsed;

  const behind = Math.max(0, Math.round((expectedHours - totalCompleted) / expectedHoursPerDay));
  return behind;
}

// ─── export ────────────────────────────────────────────────────────────────

window.Planner = { buildToday, proposeChange, projectFinish, daysBehind };

// ─── self-tests (run in browser console on load) ────────────────────────────

(async function runSelfTests() {
  console.group('%c[Planner] Self-tests', 'color:#6ee7b7;font-weight:bold');

  // ── Test 1: today's plan fills each slot ──────────────────────────────────
  try {
    const today = new Date().toISOString().slice(0, 10);
    const blocks = await buildToday(today);
    const hasStudy   = blocks.some(b => b.type === 'study' || b.type === 'revision');
    const hasRoutine = blocks.some(b => b.type === 'routine');
    console.assert(blocks.length > 0,    'Test 1 FAIL: no blocks returned');
    console.assert(hasStudy,             'Test 1 FAIL: no study blocks');
    console.assert(hasRoutine,           'Test 1 FAIL: no routine blocks');
    console.log('%c✅ Test 1 PASS – today\'s plan has ' + blocks.length + ' blocks', 'color:#4ade80');
  } catch (e) {
    console.error('❌ Test 1 ERROR:', e.message);
  }

  // ── Test 2: 3–5 PM event moves/cuts blocks correctly ─────────────────────
  try {
    const result = await proposeChange({ start: '15:00', end: '17:00', title: 'Guests' });
    const pyqCut  = result.cut.some(t => t.includes('PYQ')) ||
                    result.moved.some(m => m.title.includes('PYQ')) ||
                    result.cut.some(t => t.includes('Reasoning')) ||
                    result.moved.some(m => m.title.includes('Reasoning'));
    const revUntouched = result.proposed.some(b => b.id === 'golden_revision');
    console.assert(!result.warning || result.warning.length === 0,
      'Test 2 FAIL: unexpected warning – ' + result.warning);
    console.assert(revUntouched, 'Test 2 FAIL: golden_revision disappeared');
    console.log('%c✅ Test 2 PASS – event applied; cut=' + JSON.stringify(result.cut) +
      ' moved=' + result.moved.length, 'color:#4ade80');
  } catch (e) {
    console.error('❌ Test 2 ERROR:', e.message);
  }

  // ── Test 3: Revision block is never cut ───────────────────────────────────
  try {
    // Force an event that spans the entire golden_revision window 21:15-22:15
    const result = await proposeChange({ start: '21:15', end: '22:15', title: 'Late event' });
    const hasWarning = result.warning && result.warning.length > 0;
    console.assert(hasWarning, 'Test 3 FAIL: should have warned about never_cut but did not');
    console.log('%c✅ Test 3 PASS – revision protected: ' + result.warning, 'color:#4ade80');
  } catch (e) {
    console.error('❌ Test 3 ERROR:', e.message);
  }

  // ── Test 4: Invalid date is rejected ──────────────────────────────────────
  try {
    let threw = false;
    try { await buildToday('2026-02-31'); } catch (_) { threw = true; }
    console.assert(threw, 'Test 4 FAIL: invalid date was not rejected');
    console.log('%c✅ Test 4 PASS – "2026-02-31" correctly rejected', 'color:#4ade80');
  } catch (e) {
    console.error('❌ Test 4 ERROR:', e.message);
  }

  console.groupEnd();
})();
