/**
 * modules/parser.js
 * Calls Ollama qwen2.5:3b to parse a natural-language message into a
 * structured intent object. Runs the model 3× and uses majority-vote:
 *   all 3 agree  → confident   (confidence: "high")
 *   2 agree      → confirm     (confidence: "medium")
 *   all differ   → refuse      (confidence: "low")
 *
 * Exported: parseMessage(text, referenceDate?) → Promise<ParseResult>
 *
 * ParseResult shape:
 * {
 *   type:        "add_event"|"mark_done"|"skip_day"|"show_today"|"show_status"|"unknown"
 *   date_text:   string   – resolved ISO date "YYYY-MM-DD" or raw text
 *   start_text:  string   – resolved "HH:MM" or raw text
 *   end_text:    string   – resolved "HH:MM" or raw text
 *   item_text:   string   – timetable item title or subject
 *   confidence:  "high"|"medium"|"low"
 *   raw:         object[] – the three raw model responses
 *   label:       "✅"|"⚠️"|"❌"
 * }
 */

const OLLAMA_BASE  = 'http://localhost:11434';
const PARSE_MODEL  = 'qwen2.5:3b';
const PARSE_RUNS   = 3;       // majority vote
const TEMPERATURE  = 0;

// ─── date / time resolution ────────────────────────────────────────────────

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

/**
 * Resolve relative date words to "YYYY-MM-DD".
 * Falls back to the original text if unresolvable.
 */
function resolveDate(raw, refDate) {
  if (!raw) return '';
  const ref  = refDate instanceof Date ? refDate : new Date();
  const s    = raw.trim().toLowerCase();

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;  // already ISO

  if (s === 'today')    return toISO(ref);
  if (s === 'tomorrow') { const d = new Date(ref); d.setDate(d.getDate()+1); return toISO(d); }
  if (s === 'yesterday'){ const d = new Date(ref); d.setDate(d.getDate()-1); return toISO(d); }

  // "this friday", "next monday", or just "friday"
  const dayMatch = s.match(/(?:this |next )?(\w+day)/);
  if (dayMatch) {
    const idx = DAY_NAMES.indexOf(dayMatch[1]);
    if (idx !== -1) {
      const d = new Date(ref);
      const diff = (idx - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      return toISO(d);
    }
  }

  // "DD Mon" or "Mon DD" – e.g. "12 oct" or "oct 12"
  const shortDate = s.match(/(\d{1,2})\s+([a-z]{3})|([a-z]{3})\s+(\d{1,2})/);
  if (shortDate) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const day  = parseInt(shortDate[1] || shortDate[4]);
    const mon  = months.indexOf(shortDate[2] || shortDate[3]);
    if (mon !== -1 && day >= 1 && day <= 31) {
      const d = new Date(ref.getFullYear(), mon, day);
      if (isNaN(d.getTime())) return raw;
      return toISO(d);
    }
  }

  return raw;  // unresolvable — pass through for validator to reject
}

/**
 * Resolve natural time strings to "HH:MM" 24-h.
 * Handles "3pm", "3:00 pm", "15:00", "03:00" (model-formatted), "3 to 5 pm".
 *
 * Ambiguity rule: if no AM/PM is given and hour is 1–6, default to PM.
 * This also covers already-formatted HH:MM strings like "03:00" that the
 * model outputs — those are bumped to 15:00 by the same heuristic.
 * Hours 7–11 with no indicator are kept as-is (morning study blocks).
 */
function resolveTime(raw) {
  if (!raw) return '';
  const s = raw.trim().toLowerCase();

  // Already-formatted HH:MM — still apply the PM heuristic
  if (/^\d{2}:\d{2}$/.test(s)) {
    const h = parseInt(s.slice(0, 2));
    const min = s.slice(3);
    // 01:xx – 06:xx with no explicit AM context → assume PM
    if (h >= 1 && h <= 6) return String(h + 12).padStart(2,'0') + ':' + min;
    return s;
  }

  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return raw;
  let h = parseInt(m[1]);
  const min = parseInt(m[2] || '0');
  const period = m[3];

  if (period === 'pm' && h !== 12) h += 12;
  else if (period === 'am' && h === 12) h = 0;
  else if (!period && h >= 1 && h <= 6) h += 12; // no indicator + 1-6 → assume PM

  if (h > 23 || min > 59) return raw;
  return String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
}

function toISO(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
}

// ─── system prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a timetable-change parser for a personal study tracker.
The user will send you a short natural-language message.
Your job is to extract EXACTLY these fields and return ONLY valid JSON, no extra text:

{
  "type":       one of ["add_event","mark_done","skip_day","show_today","show_status","unknown"],
  "date_text":  the date mentioned (e.g. "today", "tomorrow", "friday", "2026-10-09") or "" if absent,
  "start_text": the start time mentioned (e.g. "3pm", "15:00", "3") or "" if absent,
  "end_text":   the end time mentioned (e.g. "5pm", "17:00", "5") or "" if absent,
  "item_text":  the timetable item or subject mentioned (e.g. "Quant", "PYQ session", "revision") or "" if absent
}

Type rules:
- add_event : user wants to block time for something external (guests, doctor, trip, etc.)
- mark_done : user says they finished / completed / did a task
- skip_day  : user wants to skip an entire day or is ill
- show_today: user asks what is on today / show my schedule
- show_status: user asks about progress / how far / days behind
- unknown   : anything that does not fit the above

Return ONLY the JSON object, no markdown fences, no explanation.`;

// ─── Ollama call ────────────────────────────────────────────────────────────

async function callOllama(userText) {
  const schema = {
    type: 'object',
    properties: {
      type:       { type: 'string', enum: ['add_event','mark_done','skip_day','show_today','show_status','unknown'] },
      date_text:  { type: 'string' },
      start_text: { type: 'string' },
      end_text:   { type: 'string' },
      item_text:  { type: 'string' },
    },
    required: ['type','date_text','start_text','end_text','item_text'],
  };

  const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: PARSE_MODEL,
      messages: [
        { role: 'system',  content: SYSTEM_PROMPT },
        { role: 'user',    content: userText },
      ],
      format: schema,
      options: { temperature: TEMPERATURE },
      stream: false,
    }),
  });

  if (!resp.ok) throw new Error('Ollama error: ' + resp.status);
  const data = await resp.json();
  const content = data.message?.content || data.response || '';
  try {
    return JSON.parse(content);
  } catch {
    // model returned invalid JSON despite schema constraint — treat as unknown
    return { type: 'unknown', date_text: '', start_text: '', end_text: '', item_text: '' };
  }
}

// ─── majority vote ─────────────────────────────────────────────────────────

function pickMajority(results) {
  // All three agree on all fields → confident
  const allSame = results.every(r =>
    r.type       === results[0].type &&
    r.date_text  === results[0].date_text &&
    r.start_text === results[0].start_text &&
    r.end_text   === results[0].end_text &&
    r.item_text  === results[0].item_text
  );
  if (allSame) return { result: results[0], confidence: 'high', label: '✅' };

  // Pick the field-by-field majority for a best-effort merged result
  function majority(field) {
    const counts = {};
    for (const r of results) counts[r[field]] = (counts[r[field]] || 0) + 1;
    return Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0];
  }
  const merged = {
    type:       majority('type'),
    date_text:  majority('date_text'),
    start_text: majority('start_text'),
    end_text:   majority('end_text'),
    item_text:  majority('item_text'),
  };

  // At least two agree on the type
  const typeCount = results.filter(r => r.type === merged.type).length;
  if (typeCount >= 2) return { result: merged, confidence: 'medium', label: '⚠️' };

  return { result: merged, confidence: 'low', label: '❌' };
}

// ─── keyword pre-screen ────────────────────────────────────────────────────

/**
 * Fast local check before spending 3× model calls.
 * Returns true if the message has ZERO scheduling keywords.
 * Greetings, single words, random sentences → true → short-circuit to unknown.
 */
const SCHEDULING_KEYWORDS = [
  // time
  'am','pm','morning','afternoon','evening','night',
  '1','2','3','4','5','6','7','8','9','10','11','12',
  'today','tomorrow','yesterday','monday','tuesday','wednesday',
  'thursday','friday','saturday','sunday','this','next','week',
  'jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec',
  // intent
  'guest','guests','appointment','doctor','trip','event','visit','party',
  'meeting','call','class','exam','test','busy','free','block','add','cancel',
  'skip','done','finished','completed','did','show','status','progress','behind',
  'schedule','timetable','plan','quant','english','reasoning','gs','gk','pyq',
  'revision','workout','dinner','lunch','breakfast','sleep',
];

function hasSchedulingIntent(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/);
  return words.some(w => SCHEDULING_KEYWORDS.includes(w));
}

// ─── public API ────────────────────────────────────────────────────────────

const UNKNOWN_RESULT = (raw = []) => ({
  type: 'unknown', date_text: '', start_text: '', end_text: '', item_text: '',
  confidence: 'low', label: '❌', raw,
});

/**
 * Parse a natural-language message.
 * @param {string}  text         – the user's message
 * @param {Date}   [refDate]     – reference date for resolving "tomorrow" etc. (default: now)
 * @returns {Promise<ParseResult>}
 */
async function parseMessage(text, refDate) {
  if (!text || !text.trim()) return UNKNOWN_RESULT();

  // ── Pre-screen: skip the model entirely for obvious non-commands ───────────
  // Short messages (≤ 2 words) with no scheduling keyword are greetings/gibberish.
  const words = text.trim().split(/\s+/);
  if (words.length <= 2 && !hasSchedulingIntent(text)) return UNKNOWN_RESULT();
  // Longer messages still need at least one scheduling keyword
  if (!hasSchedulingIntent(text)) return UNKNOWN_RESULT();

  // Run the model PARSE_RUNS times in parallel
  const runs = await Promise.all(
    Array.from({ length: PARSE_RUNS }, () => callOllama(text.trim()))
  );

  const { result, confidence, label } = pickMajority(runs);

  // Resolve relative dates and time strings
  const ref = refDate || new Date();
  result.date_text  = resolveDate(result.date_text,  ref);
  result.start_text = resolveTime(result.start_text);
  result.end_text   = resolveTime(result.end_text);

  // If all runs agreed on 'unknown', the model is confidently refusing —
  // that IS the right answer, but the label must be ❌ not ✅.
  const finalLabel = result.type === 'unknown' ? '❌' : label;

  return { ...result, confidence, label: finalLabel, raw: runs };
}

window.Parser = { parseMessage };
