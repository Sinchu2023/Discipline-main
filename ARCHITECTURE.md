# Discipline Tracker Pro — Architecture (Current)

_Last reviewed: March 22, 2026_

This document describes the **current code reality** in this repository.

---

## 1) System overview

Discipline Tracker Pro is a client-side SPA running in the browser with:
- static HTML shell (`index.html`),
- browser-global class modules (`js/*.js`),
- Firebase service modules (`firebase-service.js`, `google-auth.js`),
- local-first persistence + Firestore synchronization.

No Node backend is required for core operation.

---

## 2) Code layout and responsibilities

```text
index.html
  ├─ App UI shell (large markup + inline style blocks)
  ├─ Script includes for js/*.js managers/engines
  └─ Module script includes for Firebase/auth bridge files

js/config.js
  └─ Runtime config, storage keys, thresholds, protection values

js/constants.js
  └─ Domain constants (categories, templates, mission thresholds)

js/discipline-tracker.js
  └─ Main controller class (state, wiring, normalization, utility methods)

js/*-manager.js, js/*-engine.js
  └─ Focused subsystems (timer, tasks, UI, charts, events, cloud, etc.)

js/boot.js
  └─ Global app bootstrap (instantiation + DOM lifecycle hooks)

firebase-service.js
  └─ Firebase SDK initialization and utility exposure to window

google-auth.js
  └─ Google login helper flows (popup/redirect logic)

app.js
  └─ Small bridge helper (`runAfterAuth`) for modular migration boundary

update-check.js
  └─ Optional deployment/commit timestamp banner
```

---

## 3) Boot and initialization sequence

## Script loading order (from `index.html`)
1. Config/constants and class files under `js/`.
2. `js/boot.js` creates global `window.app` and DOM hooks.
3. `update-check.js` runs independently.
4. ES modules:
   - `firebase-service.js`
   - `google-auth.js`
   - `app.js`

## Runtime start
1. `window.app = new DisciplineTracker()` (in `js/boot.js`).
2. On `DOMContentLoaded`, `window.app.initialize()` is called.
3. `DisciplineTracker` initializes managers/engines and core UI state.
4. `FirebaseCloudManager.initialize()` binds auth buttons, waits for Firebase services, and starts auth observers.
5. Auth observer triggers user bootstrap and real-time listeners when signed in.

---

## 4) Main application object

`DisciplineTracker` is the root orchestrator.

It owns:
- normalized in-memory state (`tasks`, `favorites`, `streak`, `activeTask`, chart refs),
- element registry (`initializeElements()`),
- all manager/engine instances,
- storage helpers (`saveToStorage`, `loadFromStorage`),
- shared utility functions (date formatting, category checks, inferred waste helpers, etc.).

It wires these subsystems:
- `SyncManager`
- `FirebaseCloudManager`
- `StopwatchManager`
- `TaskManager`
- `UIManager`
- `ShadowEngine`
- `TrainerEngine`
- `FlowProtocolEngine`
- `GraphManager`
- `EventManager`

---

## 5) Subsystem architecture

## StopwatchManager
Purpose: timer lifecycle + active-task session creation.

Key behavior:
- Owns start/pause elapsed internals and 1-second render tick.
- Captures metadata (category/subcategory/description) for sessions.
- Updates active task UI + local state.
- Sends fire-and-forget timer cloud state updates for cross-device sync.

## TaskManager
Purpose: task CRUD, stats updates, favorites rendering/management.

Key behavior:
- Adds/deletes/merges tasks with normalization.
- Applies remote task changes with conflict checks based on timestamps.
- Refreshes dependent views (stats, task list, charts, streak).
- Queues optional external sync changes through `SyncManager`.

## UIManager
Purpose: modal/report/export/import and broader interface behaviors.

Key behavior:
- Report modal lifecycle.
- Data export/import flows.
- Streak popup and UI-level helper rendering.

## GraphManager
Purpose: Chart.js integration and analytics KPIs.

Key behavior:
- Creates and updates productivity/sleep charts.
- Handles range controls.
- Computes summarized graph KPI totals (productive/distraction breakdown).

## EventManager
Purpose: centralized event binding.

Key behavior:
- Binds UI controls (timer buttons, favorites, trainer actions, modals, flow protocol actions, import/export).
- Delegates all logic to the appropriate manager/engine.

## ShadowEngine
Purpose: performance-duel system versus historical baseline.

Key behavior:
- Computes rolling performance metrics and duel outputs.
- Updates SHADOW cards, status/verdict, pressure, target indicators.
- Integrates roadmap mission context.
- Includes anti-sandbag style signals derived from recent day series.

## FlowProtocolEngine
Purpose: behavior protocol tracking for daily execution quality.

Key behavior:
- Maintains per-day protocol records (`byDate`).
- Tracks wake/first-action timestamps.
- Tracks flow-before-phone and war-mode checklist.
- Computes flow cycle/blocker/proneness statuses.
- Supports kill-switch and attention stretch adjustment UI.

## TrainerEngine
Purpose: roadmap creation, import, persistence, and progression.

Key behavior:
- Generates roadmap via Gemini API (when key provided).
- Imports and validates manual roadmap JSON.
- Maintains roadmap schema, render state, edit state, progression.
- Syncs roadmap mission data with SHADOW system.

## FirebaseCloudManager
Purpose: auth, bootstrap hydration, Firestore listeners/writes.

Key behavior:
- Attaches Firebase services once available (`firebase-services-ready`).
- Sets auth state observers.
- Handles login/logout UI and state transitions.
- Bootstraps user data on login.
- Attaches listeners for timer, tasks, favorites, roadmap.
- Applies guarded write behavior and helper sync methods.

## SyncManager (optional endpoint sync path)
Purpose: non-Firebase queue-based sync integration.

Key behavior:
- Stores queued task changes in local storage.
- Flushes to configurable endpoint if online and configured.
- Pulls latest entries and merges into task state.

---

## 6) Data architecture

## Local storage
The app persists key data via `CONFIG.STORAGE_KEYS`, including:
- tasks, favorites, streak, last activity,
- active task,
- shadow metrics,
- trainer/roadmap state,
- flow protocol state,
- sync queue/device metadata,
- client version markers.

This enables offline continuity and fast startup.

## Firestore model (effective)

```text
users/{uid}
├── (user doc)                # profile/meta fields (schemaVersion, streak-related fields, etc.)
├── tasks/{taskId}            # task records as documents
├── state/timer               # active timer state
├── state/favorites           # quick favorites list
└── roadmap/main              # roadmap state
```

Realtime listeners mirror cloud updates back into UI/state.

---

## 7) Authentication model

Auth uses Firebase Auth + Google provider.

- Desktop-like clients attempt popup sign-in first.
- Mobile-like clients go direct to redirect sign-in.
- Certain popup failures auto-fallback to redirect.
- Non-recoverable auth-domain/config errors are surfaced.
- `file://` origin is blocked for login.

---

## 8) Offline, resilience, and write protections

- Firestore IndexedDB persistence is enabled where supported.
- Multi-tab persistence conflicts are handled with warnings.
- Write safety values are centralized in `CONFIG.FIREBASE_PROTECTION`:
  - max writes/min,
  - debounce windows,
  - item caps,
  - mission update intervals.
- Timer updates are event-driven (not per-second cloud writes).

---

## 9) Global boundaries and interop

The app currently uses intentional globals for compatibility:
- `window.app`
- `window.FirebaseServices`
- `window.GoogleAuthModule`
- `window.AppModule`

This makes the app easy to host without bundling, while still allowing gradual modular refactors.

---

## 10) Known technical debt / migration path

1. `index.html` remains large and includes substantial style/structure inline content.
2. Module boundaries are class-based but rely on global script order.
3. `app.js` is currently a bridge, not the primary app entry.
4. A future build step (optional) could enforce stricter module imports, type checks, and dead-code elimination.

Despite this, the current architecture is stable for static-host deployment and supports real-time, authenticated, multi-device usage.

---

## 11) Quick reference: major runtime flows

## A) Start timer
UI click → `EventManager` → `StopwatchManager.start()` → local active task state/UI update → cloud timer state write.

## B) Stop timer
UI click → `StopwatchManager.stop()` → finalized task entry → `TaskManager.addTask()` → stats/charts/streak refresh → task cloud sync.

## C) Login bootstrap
Auth state change (user present) → `FirebaseCloudManager.bootstrapUserData()` → attach listeners (`timer/tasks/favorites/roadmap`) → real-time reconciliation.

## D) Roadmap generation/import
Trainer UI action → `TrainerEngine` generate/import path → normalize + save roadmap → cloud sync at `roadmap/main` → SHADOW mission refresh.

