# Technical Documentation

## Runtime Overview
- `index.html`: static shell markup.
- `assets/css/app.css`: extracted styling.
- `assets/js/app.js`: single runtime entrypoint and single source of truth.
- `firebase-service.js`: Firebase bootstrap and helpers.
- `google-auth.js`: Google auth flow.
- `update-check.js`: optional deployment banner.
- `fullscreen-timer/index.html`: standalone fullscreen timer (vanilla JS, Firebase-synced, monochrome UI).

## Current Architecture
- The application currently runs from one main runtime file: `assets/js/app.js`.
- Earlier sidecar runtime modules were removed because they duplicated behavior and created split-brain maintenance risk.
- Empty domain folders may remain for future structured extraction, but they are not part of the current runtime.

## Major Runtime Areas Inside `assets/js/app.js`
- Configuration/constants
- Activity normalization and classification
- Local storage persistence
- Firebase cloud manager
- Stopwatch manager
- Task manager
- Analytics/reporting
- SHADOW engine
- Trainer/roadmap engine
- Flow protocol engine
- Graph manager
- Event wiring and app bootstrap
- **Insights Manager** (rule-based analytics)
- **Ollama Insights Engine** (local LLM + cloud fallback)
- **Local Ollama Connection** (Chrome Private Network Access)

## Fullscreen Timer (`fullscreen-timer/index.html`)
- Independent vanilla JS module (no build step, no React)
- Real-time Firebase Firestore sync via `onSnapshot` on `users/{uid}/state/timer`
- Reads/writes timer state: `running`/`paused`/`stopped`, `startTime`, `elapsedBeforePause`, `activeTask`
- Restores active timer from cloud on load (handles cross-device continuity)
- Saves completed tasks to `users/{uid}/tasks/` on stop
- Monochrome UI (black/white only, supports `prefers-color-scheme`)
- Keyboard shortcuts: Space (start/pause), R (reset), F (fullscreen toggle)
- Anonymous auth fallback for unauthenticated users
- Offline-capable via Firestore IndexedDB persistence

## AI Insights System

### Unified Insights View
Single render pass combining:
- **Rule-based metrics** (deterministic): weekly patterns, focus patterns, habits, streak, timetable adherence, week-over-week
- **AI enhancements** (context-aware): summary, strengths, issues, schedule adjustments, tomorrow action
- **Merged recommendations** (deduplicated, priority-sorted, max 8)

### OllamaInsightsEngine (`L5409`)
- **Local-first**: tries `localhost:11434` via `LocalOllamaConnection`
- **Cloud fallback**: configured `BASE_URL` (Groq, Together, etc.)
- **24-hour cache**: per-day cache in `localStorage`
- **Source tracking**: `ollama-local` | `ollama-cloud` | `rule-based`
- **Prompt context**: streaks, patterns, timetable adherence, distraction, week-over-week, recurring blocks
- **Output**: structured JSON (summary, strengths[3], issues[3], adjustments[3], tomorrowAction)

### LocalOllamaConnection (`L5258`)
- Chrome 142+ **Private Network Access** to `http://localhost:11434`
- **User gesture required**: "Connect Local AI" button triggers permission prompt
- **Persisted state**: `localStorage` caches connection + models
- **CORS**: requires `OLLAMA_ORIGINS` env var (`setx OLLAMA_ORIGINS "https://yourname.github.io,http://localhost:8000"`)
- **Graceful fallback**: if local unavailable, uses cloud/rule-based

### Configuration (`CONFIG.OLLAMA`)
```javascript
OLLAMA: {
  ENABLED: true,
  BASE_URL: "https://api.groq.com/openai/v1",  // cloud fallback
  MODEL: "qwen2.5:3b",
  TIMEOUT_MS: 120000,
  TEMPERATURE: 0.3,
  CACHE_KEY: "discipline_tracker_ollama_insights",
  CACHE_DURATION_MS: 24 * 60 * 60 * 1000,
}
```

### Insights Data Flow
```
Open Insights → Loading → Rule-based (instant) + Local Ollama check (parallel)
                                    │
                    If connected → POST /api/generate with full context prompt
                                    │
                    LLM returns JSON → Merge with rule-based → Render unified
                                    │
                    Cache 24h → Refresh button bypasses cache
```

## Data Contracts
- Existing local storage keys are preserved.
- Existing Firebase document semantics are preserved.
- Task, roadmap, flow, trainer, and SHADOW state semantics are preserved.
- New: `ollama_local_connected`, `ollama_local_models` (localStorage)

## Security Notes
- Task and favorite labels are escaped before HTML rendering.
- Report labels and dynamic summary values are escaped before interpolation.
- Malformed local storage payloads are cleared defensively.
- Oversized import files are rejected.
- Non-object JSON import entries are ignored before normalization.
- **Ollama CORS**: `OLLAMA_ORIGINS` restricts access to your origins only
- **Private Network Access**: Chrome prompts per-origin, user must click Allow
- **No API keys in repo**: Local Ollama uses no keys; cloud fallback requires user BYOK (not implemented in repo)

## Known Architectural Debt
- `assets/js/app.js` remains large and should be split only by moving complete domain slices, not by introducing duplicate partial runtime modules.
- Some UI rendering still uses `innerHTML`; user-controlled fields on the active paths were escaped, but a future DOM-construction refactor would be safer.

## Recommended Next Refactor
1. Extract one complete domain at a time from `assets/js/app.js`.
2. Keep one active source of truth during each extraction.
3. Verify browser behavior after each extraction step.