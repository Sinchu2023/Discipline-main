# Discipline Tracker Pro

Vanilla HTML/CSS/JavaScript discipline tracker with task logging, sleep tracking, streaks, analytics, SHADOW competition logic, trainer roadmap logic, flow protocol features, and Firebase-backed auth/sync.

## Runtime Structure
- `index.html`: app shell only.
- `assets/css/app.css`: extracted runtime stylesheet.
- `assets/js/app.js`: single runtime entrypoint with the main managers, engines, and sidecar bootstrap imports.
- `firebase-service.js`: Firebase setup.
- `google-auth.js`: Google sign-in flow.
- `update-check.js`: deployment timestamp banner.

## Supporting Modules
- `core/state-manager.js`: central snapshot builder.
- `services/state-sync.js`: shell/mission/trainer synchronization.
- `ui/shell-manager.js`: section navigation and mission CTA wiring.
- `analytics/insights.js`: summary KPI mirroring.
- `shadow-engine/shadow-panel.js`: SHADOW panel mirroring.
- `trainer/recommendation-engine.js`: deterministic trainer advice.
- `execution/focus-builder.js`: quick preset helpers.

## Features
- Real-time stopwatch and task logging
- Sleep tracking
- Favorites and task history
- Daily streak tracking
- Monthly reporting and charts
- SHADOW performance engine
- Trainer roadmap and mission system
- Flow protocol and war-mode tracking
- Firebase auth and cloud sync
- Import/export support

## Quick Start
1. Serve the repo over HTTP(S). Do not use `file://` if you need Firebase auth.
2. Open [index.html](/D:/Programme/Html/Discipline-main/index.html).
3. Sign in with Google if you want cloud sync.

## Storage and Sync
The app keeps the existing browser storage keys and Firebase document structure stable so old user data continues to load.

## Notes for Development
- Main runtime changes usually belong in [assets/js/app.js](/D:/Programme/Html/Discipline-main/assets/js/app.js).
- Shell/summary glue belongs in the sidecar modules under `core/`, `services/`, `ui/`, `analytics/`, `shadow-engine/`, `trainer/`, and `execution/`.
- Styling changes belong in [assets/css/app.css](/D:/Programme/Html/Discipline-main/assets/css/app.css).
