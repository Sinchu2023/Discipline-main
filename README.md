# Discipline Tracker Pro

Discipline Tracker Pro is a **single-page productivity system** built with plain HTML/CSS/JavaScript and Firebase.

It combines:
- session-based time tracking,
- daily and long-range analytics,
- a competitive SHADOW performance system,
- a Flow Protocol routine system,
- and an AI/imported learning roadmap.

The app is intentionally framework-free, so it can run on static hosting (GitHub Pages, Vercel static, Firebase Hosting) while still supporting real-time cross-device sync through Firestore.

---

## What this app is (and is not)

### ✅ What it is
- A personal discipline tracker centered on **minutes, consistency, and execution pressure**.
- A local-first app that stores state in `localStorage` and mirrors key state to Firebase when authenticated.
- A class-based JavaScript system split across focused manager/engine files under `js/`.

### ⚠️ What it is not
- Not a calendar replacement.
- Not a collaborative team tool.
- Not a backend-heavy app with custom server APIs (except optional SyncManager endpoint if you configure one).

---

## Core capabilities

## 1) Time tracking
- Start/stop stopwatch sessions.
- Special one-click Sleep session start.
- Category + subcategory classification for each logged session.
- Active-task indicator and persistent running state.
- Timer state is synced to Firestore (`users/{uid}/state/timer`) for cross-device continuity.

## 2) Task log + favorites
- Every completed session becomes a task entry with start/end/duration/date metadata.
- Quick-start favorites let you launch repeat activities quickly.
- Favorites sync in real-time across devices (`users/{uid}/state/favorites`).

## 3) Real-time analytics
- Daily KPI cards (productive, sleep, total).
- Chart.js graphs for productivity and sleep.
- Multiple time ranges (`7d`, `30d`, `3m`, `6m`, `1y`, plus weekly view in code path).
- Monthly report generation via `AnalyticsService`.
- Data export/import through UI manager flows.

## 4) SHADOW engine
The SHADOW system turns your historical performance into a daily competitive target.

It computes:
- rolling baselines,
- duel status vs. your previous standard,
- pressure and target metrics,
- momentum/trend signals,
- anti-sandbag style penalties/signals,
- mission alignment from roadmap state.

## 5) Flow Protocol engine
Daily behavioral protocol tracking, including:
- wake timestamp + first action timestamp,
- flow-before-phone toggle,
- war-mode checklist,
- attention stretch controls,
- kill-switch flow reset helpers,
- status summaries based on live app/task context.

## 6) AI Roadmap (Trainer engine)
Two creation paths:
- Generate with Gemini API key.
- Import structured JSON roadmap manually.

Roadmap state is saved per user at `users/{uid}/roadmap/main` and reflected in SHADOW mission goals.

## 7) Authentication and cloud sync
- Google sign-in (popup with redirect fallback; redirect-first behavior for mobile-like clients).
- Login gate UI management.
- Firebase readiness event wiring (`firebase-services-ready`).
- Auth-aware bootstrap that hydrates local state and attaches Firestore listeners.

---

## Current project structure

```text
Discipline-main/
├── index.html
├── styles/
│   └── main.css
├── js/
│   ├── config.js
│   ├── constants.js
│   ├── discipline-tracker.js
│   ├── stopwatch-manager.js
│   ├── task-manager.js
│   ├── ui-manager.js
│   ├── event-manager.js
│   ├── graph-manager.js
│   ├── analytics-service.js
│   ├── shadow-engine.js
│   ├── flow-protocol-engine.js
│   ├── trainer-engine.js
│   ├── firebase-cloud-manager.js
│   ├── sync-manager.js
│   ├── activity-classifier.js
│   └── boot.js
├── firebase-service.js
├── google-auth.js
├── app.js
├── update-check.js
├── ARCHITECTURE.md
└── README.md
```

> Note: The project still has substantial inline style/markup in `index.html`, but runtime logic is now primarily split into `js/*.js` manager/engine files and bootstrapped from `js/boot.js`.

---

## Runtime architecture at a glance

1. Static scripts in `index.html` load core config/constants/managers.
2. `js/boot.js` creates `window.app = new DisciplineTracker()`.
3. On `DOMContentLoaded`, `window.app.initialize()` runs.
4. `FirebaseCloudManager.initialize()` waits for Firebase services and auth state.
5. On login, cloud manager bootstraps user data and binds Firestore listeners.
6. Managers/engines render and update UI based on app state.

For the full architecture details, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Data model summary

### Local storage (selected keys)
- `discipline_tracker_tasks`
- `discipline_tracker_favorites`
- `discipline_tracker_streak`
- `discipline_tracker_active_task`
- `discipline_tracker_flow_protocol`
- `discipline_tracker_roadmap_state`
- `discipline_tracker_client_version`

### Firestore (authenticated path)
```text
users/{uid}
├── tasks/{taskId}
├── state/timer
├── state/favorites
└── roadmap/main
```

The app is local-first: local state updates are immediate; cloud writes/listeners reconcile state across devices.

---

## Setup (development)

## Requirements
- A static web host or local web server (do not use `file://` for Firebase auth).
- A Firebase project with:
  - Authentication (Google provider enabled)
  - Cloud Firestore
- (Optional) Gemini API key for AI roadmap generation.

## Run locally
```bash
git clone <your-fork-or-repo-url>
cd Discipline-main
# serve with any static server, e.g.:
python -m http.server 8080
# then open http://localhost:8080
```

## Firebase configuration
Firebase config is currently defined directly in `firebase-service.js`.
For production forks, use your own Firebase project and update this file.

---

## Operational safeguards built into code

- Firestore write throttling/debounce values are centralized under `CONFIG.FIREBASE_PROTECTION`.
- Timer cloud writes are event-driven (start/stop state transitions), not 1Hz ticking.
- Cloud listeners are attached on authenticated bootstrap and detached on auth changes.
- IndexedDB persistence is enabled with defensive error handling for multi-tab/device constraints.

---

## Known architecture realities

- The app is modular but still browser-global in parts (`window.app`, `window.FirebaseServices`, `window.GoogleAuthModule`).
- `app.js` is intentionally minimal and acts mostly as a bridge module.
- Some legacy fallback paths remain (e.g., optional SyncManager endpoint).

These are intentional transitional choices to keep deployment simple while supporting incremental refactoring.

---

## License

Free to use and modify.

---

**Version label in config:** `2026.03.12.3`  
**Documentation refresh:** March 22, 2026
