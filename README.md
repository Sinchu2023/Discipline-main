# Discipline Tracker Pro

Discipline tracker web app built with vanilla HTML, CSS, and JavaScript, with sleep tracking, streaks, analytics, SHADOW logic, roadmap/trainer logic, flow protocol features, and Firebase-backed auth/sync.

## Runtime Structure
- `index.html`: app shell only.
- `assets/css/app.css`: extracted runtime stylesheet.
- `assets/js/app.js`: single runtime entrypoint and single source of truth.
- `firebase-service.js`: Firebase setup.
- `google-auth.js`: Google sign-in flow.
- `update-check.js`: deployment timestamp banner.

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

## Notes for Development
- Runtime behavior changes belong in [assets/js/app.js](/D:/Programme/Html/Discipline-main/assets/js/app.js).
- Styling changes belong in [assets/css/app.css](/D:/Programme/Html/Discipline-main/assets/css/app.css).
- The project intentionally uses one active runtime implementation right now; do not add parallel partial runtime modules.
- `modules/` is reserved for future extraction work. If you split `assets/js/app.js`, move complete domains only and keep one active source of truth.
