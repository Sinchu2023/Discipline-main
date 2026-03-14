# Discipline Tracker Pro — Architecture

## Overview

The application is a single-page webapp (`index.html`) with a **class-based vanilla JS architecture**. All business logic lives in inline `<script>` tags inside `index.html`, supported by three external ES modules: `firebase-service.js`, `google-auth.js`, and `app.js`.

---

## File Structure

```
Discipline-main/
├── index.html              # Main app shell — all HTML, CSS, inline JS
├── firebase-service.js     # Firebase SDK initializer + service exports
├── google-auth.js          # Google OAuth popup/redirect logic
├── app.js                  # Entry point — instantiates DisciplineTracker
├── update-check.js         # Version-check logic
├── ARCHITECTURE.md         # This file
├── README.md               # Feature and usage documentation
└── improve.md              # Active improvement backlog
```

---

## Class Architecture

```
DisciplineTracker (Main Controller)
├── StopwatchManager
├── TaskManager
├── UIManager
├── GraphManager
├── EventManager
├── ShadowEngine
├── FirebaseCloudManager
├── TrainerEngine
└── FlowProtocolEngine
```

---

## Class Reference

### `DisciplineTracker`
**Role**: Root application controller. Owns all state and managers.

- Instantiates all engines/managers with `this` as `app`
- Provides `saveToStorage(key, data)` — writes to localStorage AND calls `cloudManager.syncByStorageKey()`
- Provides `loadFromStorage(key)` — reads from localStorage
- Holds `this.state` (tasks, favorites, streak, etc.)
- Called `.initialize()` kicks off the full bootstrap sequence

---

### `StopwatchManager`
**Role**: Manages the running timer.

- `start()` — records task start time, writes timer state to Firebase
- `stop()` — stops timer locally first (instant UI), then writes to Firebase asynchronously
- Timer state stored at `users/{uid}/state/timer` in Firestore

---

### `TaskManager`
**Role**: Task CRUD and favorites management.

- `renderTasks()` — re-renders the task history list
- `renderFavorites()` — re-renders the quick-start favorites panel
- `addFavorite()` / `deleteFavorite()` — write to Firebase at `users/{uid}/state/favorites`

---

### `UIManager`
**Role**: UI state transitions — modals, reports, charts, motivation.

- `showReport()` / `hideReport()` — report modal lifecycle
- `exportData()` / `importDataFromFile()` — data portability
- `showStreak()` — streak popup rendering

---

### `GraphManager`
**Role**: Chart.js integration for productivity and sleep analytics.

- `initCharts()` — creates Chart.js canvas instances
- `updateCharts()` — refreshes data for selected time range
- `setupChartControls()` — wires range selector event listeners

---

### `EventManager`
**Role**: Central event bus. Binds all UI interactions to engine methods.

- Called once in `bindEvents()` during app initialization
- Handles: start/stop, favorites, modals, trainer, roadmap, flow, report, export/import

---

### `ShadowEngine`
**Role**: Competitive self-improvement tracker (SHADOW System).

- Calculates 7-day rolling average from historical task data
- Computes gap, momentum, pressure, penalty, rank tier
- `refresh()` — recomputes all metrics and re-renders SHADOW cards
- Mission goals drawn from active roadmap day via `syncMissionFromRoadmap()`

---

### `FirebaseCloudManager`
**Role**: All Firebase operations — authentication, sync, and listeners.

#### Auth
- `initialize()` — sets up Firebase auth listeners and observers
- `initializeAuthObservers()` — handles login/logout state changes
- `renderAuthState()` — shows/hides login gate, updates profile UI

#### Bootstrap (on login)
- `bootstrapUserData()` — hydrates local state from Firebase on sign-in
- `hydrateFavoritesFromCloudIfNeeded()` — reads `users/{uid}/state/favorites`
- `hydrateRoadmapFromCloudIfNeeded()` — reads `users/{uid}/roadmap/main`

#### Real-time Listeners (onSnapshot)
- `listenToTimerState()` — subscribes to `users/{uid}/state/timer` for cross-device timer sync
- `listenToRoadmap()` — subscribes to `users/{uid}/roadmap/main` for cross-device roadmap sync
- `listenToFavorites()` — subscribes to `users/{uid}/state/favorites` for instant favorites sync

#### Write Operations
- `syncByStorageKey(key, data)` — routes storage key to the correct Firestore path
  - `TASKS` → patched into user doc
  - `FAVORITES` → `users/{uid}/state/favorites` (dedicated doc for cross-device)
  - `ROADMAP_STATE` → `users/{uid}/roadmap/main` (user-isolated)

#### Quota Protection
- All writes are debounced and gated (see `CONFIG.FIREBASE_PROTECTION`)
- Timer writes only on start/stop events — never every second
- Roadmap writes only on generation or manual save
- Designed to run 24/7 within Firestore free tier limits

---

### `TrainerEngine`
**Role**: AI Roadmap Generator and learning progress tracker.

#### Generation
- `generateAIRoadmap()` — calls Gemini 2.0 Flash API with structured prompt, parses JSON, saves roadmap
- `importJsonRoadmap()` — validates user-pasted JSON against schema, saves roadmap
- `_checkDuplicateTopic(topic)` — reads Firebase to prevent duplicate roadmaps
- `_normalizeRoadmapJson(raw, topic, type)` — converts API/import JSON to internal schema
- `_saveRoadmap(roadmap)` — writes to state + Firebase + re-renders

#### Internal Roadmap Schema
```json
{
  "topic": "string",
  "type": "ai | imported",
  "createdAt": 1710000000000,
  "modules": [
    {
      "name": "MODULE NAME",
      "days": [
        { "day": "Day 1", "text": "Topic title", "completed": false }
      ]
    }
  ],
  "editMode": false
}
```

#### Rendering
- `renderRoadmap()` — renders overview cards + day rows; shows empty state if no roadmap
- `deleteRoadmap()` — clears state + Firebase with user confirmation
- `normalizeRoadmapDays()` — ensures sequential day numbering
- `syncMissionFromRoadmap()` — pushes active day into ShadowEngine's daily mission goals

#### Error Handling
| HTTP Status | Message Shown |
|-------------|--------------|
| 400/403 | Invalid API key |
| 404 | Model not found |
| 429 | Rate limit — wait 60s |
| 503 | API temporarily unavailable |

---

### `FlowProtocolEngine`
**Role**: Advanced focus state tracking and protocol enforcement.

- Flow state entry/exit detection
- War Mode high-intensity triggers
- Attention Stretch timer (configurable intervals)
- Kill Switch — emergency session reset

---

## Firebase Data Structure

```
Firestore:
users/
└── {uid}/
    ├── (user doc)          # streak, lastActivity, schemaVersion, ...
    │   └── tasks: []       # all logged task sessions
    ├── state/
    │   ├── timer           # { isRunning, startTime, topic, ... }
    │   └── favorites       # { list: [ { label, category }, ... ] }
    └── roadmap/
        └── main            # { topic, type, createdAt, modules: [...] }
```

---

## Cross-Device Sync — How It Works

```
Device A: User stops timer
  → UI stops immediately (local)
  → setDoc(users/{uid}/state/timer, { isRunning: false })

Device B: onSnapshot fires
  → Detects isRunning = false
  → restoreFromCloud(data) stops timer on Device B
```

Same pattern applies to favorites and roadmap changes.

---

## Script Loading

At the bottom of `index.html`:
```html
<script src="update-check.js"></script>
<script type="module" src="firebase-service.js?v=..."></script>
<script type="module" src="google-auth.js?v=..."></script>
<script type="module" src="app.js?v=..."></script>
```

The `?v=` query parameter is bumped on every deployment to bust browser cache.

`firebase-service.js` exports all SDK functions onto `window.FirebaseServices` so the inline `<script>` tag (which cannot use ES module imports) can access them.

---

## Performance Constraints

| Rule | Detail |
|------|--------|
| Timer writes | Only on start/stop events |
| Favorites writes | Only when list changes |
| Roadmap writes | Only on generate/import/save |
| onSnapshot listeners | Timer, Roadmap, Favorites only |
| Debounce | 1200ms on rapid writes |
| Max tasks synced | 2000 |
| Max favorites synced | 200 |

---

## Future Improvements

- [ ] Extract class files into individual ES modules (`/modules/*.js`)
- [ ] Add an event bus (pub/sub) for decoupled inter-module communication
- [ ] Unit tests for ShadowEngine analytics, penalty logic, and anti-sandbag rules
- [ ] Support multiple roadmaps per user (`users/{uid}/roadmaps/{id}`)
- [ ] Add linting (ESLint) and formatting (Prettier) with CI checks
