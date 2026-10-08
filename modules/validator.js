/**
 * modules/validator.js
 * Validates a ParseResult from parser.js before it reaches the planner.
 * Checks date validity, time validity, and whether the item exists in timetable.json.
 *
 * Exported: validate(parseResult) → Promise<ValidationResult>
 *
 * ValidationResult shape:
 * {
 *   ok:      boolean
 *   errors:  string[]          – human-readable list of problems
 *   label:   "✅"|"⚠️"|"❌"
 *   // resolved, safe copies (only present when ok:true)
 *   date?:   "YYYY-MM-DD"
 *   start?:  "HH:MM"
 *   end?:    "HH:MM"
 *   item?:   object             – full timetable block that was matched
 * }
 */

// ─── helpers ───────────────────────────────────────────────────────────────

function isValidISODate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y,mo,d] = s.split('-').map(Number);
  const dt = new Date(y, mo-1, d);
  return dt.getFullYear()===y && dt.getMonth()===mo-1 && dt.getDate()===d;
}

function isValidTime(s) {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [h,m] = s.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function toMins(s) {
  const [h,m] = s.split(':').map(Number);
  return h*60 + m;
}

/** Load timetable once and cache */
let _ttCache = null;
async function loadTimetable() {
  if (_ttCache) return _ttCache;
  const r = await fetch('data/timetable.json');
  if (!r.ok) throw new Error('validator: could not load timetable.json');
  _ttCache = await r.json();
  return _ttCache;
}

/**
 * Find a timetable item by fuzzy match on title, id, or type.
 * Returns the matching block or null.
 */
function findItem(timetable, text) {
  if (!text) return null;
  const q = text.toLowerCase().trim();
  // exact id
  let match = timetable.find(b => b.id === q);
  if (match) return match;
  // exact title (case-insensitive)
  match = timetable.find(b => b.title.toLowerCase() === q);
  if (match) return match;
  // title contains query
  match = timetable.find(b => b.title.toLowerCase().includes(q));
  if (match) return match;
  // query contains title keyword (e.g. "quant" inside "Quant")
  match = timetable.find(b => q.includes(b.id.replace(/_/g,' ')));
  if (match) return match;
  // type match
  match = timetable.find(b => b.type === q);
  if (match) return match;
  return null;
}

// ─── types that require specific fields ────────────────────────────────────

const NEEDS_DATE = new Set(['add_event','mark_done','skip_day']);
const NEEDS_TIME = new Set(['add_event']);
const NEEDS_ITEM = new Set(['mark_done']);

// ─── public API ────────────────────────────────────────────────────────────

/**
 * Validate a ParseResult.
 * @param {object} parsed – output from Parser.parseMessage()
 * @returns {Promise<ValidationResult>}
 */
async function validate(parsed) {
  const errors = [];
  const result = { ok: false, errors, label: '❌' };

  // 1. If confidence is "low" → refuse immediately
  if (parsed.confidence === 'low') {
    errors.push('Message could not be understood reliably. Please rephrase.');
    return result;
  }

  // 2. Unknown type
  if (parsed.type === 'unknown') {
    errors.push('I didn\'t recognise what you want to do. Try: "add event", "mark done", "skip day", "show today", or "show status".');
    return result;
  }

  const timetable = await loadTimetable();

  // 3. Date validation (for types that need a date)
  let resolvedDate = null;
  if (NEEDS_DATE.has(parsed.type)) {
    if (!parsed.date_text) {
      // Default to today for mark_done/skip_day
      if (parsed.type !== 'add_event') {
        resolvedDate = new Date().toISOString().slice(0, 10);
      } else {
        errors.push('No date found. Please specify a date (e.g. "tomorrow", "Friday", "10 Oct").');
      }
    } else if (!isValidISODate(parsed.date_text)) {
      errors.push(`"${parsed.date_text}" is not a valid date. Did you mean a real calendar date?`);
    } else {
      resolvedDate = parsed.date_text;
    }
  }

  // 4. Time validation (for add_event)
  let resolvedStart = null, resolvedEnd = null;
  if (NEEDS_TIME.has(parsed.type)) {
    if (!parsed.start_text || !isValidTime(parsed.start_text)) {
      errors.push(`Start time "${parsed.start_text || '(none)'}" is not valid. Use 24-h like "15:00" or "3pm".`);
    } else {
      resolvedStart = parsed.start_text;
    }
    if (!parsed.end_text || !isValidTime(parsed.end_text)) {
      errors.push(`End time "${parsed.end_text || '(none)'}" is not valid. Use 24-h like "17:00" or "5pm".`);
    } else {
      resolvedEnd = parsed.end_text;
    }
    if (resolvedStart && resolvedEnd) {
      if (toMins(resolvedEnd) <= toMins(resolvedStart)) {
        errors.push(`End time (${resolvedEnd}) must be after start time (${resolvedStart}).`);
        resolvedStart = resolvedEnd = null;
      }
    }
  }

  // 5. Item validation (for mark_done)
  let resolvedItem = null;
  if (NEEDS_ITEM.has(parsed.type)) {
    if (!parsed.item_text) {
      errors.push('Which task did you complete? Please name it (e.g. "Quant", "PYQ session").');
    } else {
      resolvedItem = findItem(timetable, parsed.item_text);
      if (!resolvedItem) {
        errors.push(`"${parsed.item_text}" doesn't match any item in your timetable. Check the name and try again.`);
      }
    }
  }

  if (errors.length > 0) {
    result.label = '❌';
    return result;
  }

  // ── All checks passed ──
  result.ok    = true;
  result.label = parsed.confidence === 'medium' ? '⚠️' : '✅';
  result.date  = resolvedDate;
  result.start = resolvedStart;
  result.end   = resolvedEnd;
  result.item  = resolvedItem;
  return result;
}

window.Validator = { validate };
