# Architecture

## Runtime Entrypoints
- `index.html`: app shell and external asset references.
- `assets/css/app.css`: runtime stylesheet.
- `assets/js/app.js`: single runtime entrypoint and single source of truth for app behavior.
- `firebase-service.js`: Firebase initialization and service exposure.
- `google-auth.js`: Google sign-in flow.
- `update-check.js`: deployment timestamp banner.

## Active Runtime Ownership
- `assets/js/app.js`: stopwatch, task lifecycle, import/export, analytics/reporting, SHADOW logic, trainer logic, roadmap logic, flow protocol logic, graph rendering, and event wiring.
- `firebase-service.js`: Firebase bootstrapping and helper methods.
- `google-auth.js`: auth initiation and fallback behavior.
- `assets/css/app.css`: all runtime styling.

## Design Decision
- The duplicate sidecar runtime modules under `core/`, `services/`, `ui/`, `analytics/`, `shadow-engine/`, `trainer/`, and `execution/` were removed because they duplicated behavior from `assets/js/app.js` and were not the real source of truth.
- The app now has one active runtime implementation instead of parallel partial implementations.

## Data Contracts Preserved
- Existing `localStorage` keys remain unchanged.
- Firebase document locations and task payload semantics remain unchanged.
- Roadmap, mission, flow, streak, and trainer state semantics remain unchanged.

## Security Notes
- User-controlled task and favorite text is escaped before HTML rendering.
- Malformed `localStorage` payloads are rejected and cleared defensively.
- File imports reject oversized files and ignore malformed JSON entries before normalization.
- Report labels and dynamic report values are escaped before interpolation.

## Extension Guidance
- Add runtime logic to `assets/js/app.js` until a real domain split is performed.
- Add styling to `assets/css/app.css`.
- If a future modularization pass is done, move complete domain slices out of `assets/js/app.js`; do not reintroduce partial duplicate runtime modules.
