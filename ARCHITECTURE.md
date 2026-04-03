# Architecture

## Runtime Entrypoints
- `index.html`: app shell, DOM structure, and external asset/script references.
- `assets/css/app.css`: primary stylesheet extracted from the HTML shell.
- `firebase-service.js`: Firebase initialization and service exposure.
- `google-auth.js`: Google sign-in flow and redirect fallback.
- `assets/js/app.js`: single runtime entrypoint that loads the sidecar modules and the main app runtime.
- `update-check.js`: optional deployment banner.

## Active Module Ownership
- `assets/js/app.js`: primary runtime controller, task lifecycle, stopwatch, analytics/report UI, SHADOW engine, trainer engine, flow protocol logic, and bootstrap imports for the sidecar modules.
- `core/state-manager.js`: central runtime snapshot builder used by summary sync helpers.
- `execution/focus-builder.js`: quick preset input wiring.
- `analytics/insights.js`: analytics mirror fields derived from live UI state.
- `shadow-engine/shadow-panel.js`: SHADOW summary mirroring into shell panels.
- `trainer/recommendation-engine.js`: deterministic trainer advice text builder.
- `services/state-sync.js`: periodic mission/trainer/shell synchronization.
- `ui/shell-manager.js`: section navigation and mission CTA wiring.
- `config/app.config.js`: reserved location for extracted shared config/constants.

## Current Structure
- `core/`: shared runtime state helpers.
- `services/`: Firebase-adjacent and cross-panel sync services.
- `execution/`: execution-mode helpers.
- `analytics/`: analytics presentation helpers.
- `shadow-engine/`: SHADOW-specific view sync logic.
- `trainer/`: trainer-specific helper logic.
- `ui/`: shell navigation and UI wiring outside the main runtime.
- `assets/css/`: runtime styles.
- `assets/js/`: main runtime script.

## Data Contracts Preserved
- Existing `localStorage` keys remain unchanged.
- Firebase document locations and task payload semantics remain unchanged.
- Roadmap, mission, flow, streak, and trainer state semantics remain unchanged.

## Security Notes
- User-controlled task/favorite text is escaped before HTML rendering in the main runtime.
- Malformed `localStorage` payloads are rejected and cleared defensively.
- File imports reject oversized files and ignore non-object JSON entries before normalization.

## Extension Guidance
- Add new business rules to `assets/js/app.js` only if they are tightly coupled to existing managers.
- Add new shell/summary behavior to `ui/`, `analytics/`, `shadow-engine/`, or `services/` sidecar modules.
- Add new shared state readers to `core/`.
- Add new styling in `assets/css/app.css`, and split further only when a feature area becomes independently maintainable.
