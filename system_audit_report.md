# Discipline Tracker: System Integrity & Bug Audit Report

This document lists identified logical bugs, edge cases, and potential points of failure within the current codebase.

---

### 1. [CRITICAL] Potential Data Loss in Cloud Sync
- **Location**: `js/sync-manager.js` (lines 37-45)
- **Problem**: In `flushQueue()`, the local sync queue is cleared immediately after the `fetch()` call finishes, regardless of whether the server actually accepted the data.
- **Why**: If the server returns an error (e.g., 500 Internal Server Error or 403 Forbidden), `fetch()` does not throw an exception; it simply returns a response where `res.ok` is false. Because the code doesn't check `res.ok` before calling `saveToStorage(..., [])`, the tasks are deleted from the local queue forever without being saved to the cloud.

### 2. [ACCURACY] Daylight Saving Time (DST) Inconsistency
- **Location**: `js/analytics-service.js` (line 56, 226)
- **Problem**: The "Inferred Waste" calculation logic hardcodes a day as having exactly **1440 minutes**.
- **Why**: On the two days of the year when clocks shift for DST (23 hours or 25 hours), the "Total Tracked" and "Waste" stats will be off by 60 minutes. This results in either "phantom waste" or "impossible productivity" ratios.

### 3. [STABILITY] Redundant/Conflict Snapshots
- **Location**: `js/firebase-cloud-manager.js` (lines 532, 636)
- **Problem**: The application uses `onSnapshot` for real-time sync. If two devices are open simultaneously, a change on Device A triggers a snapshot on Device B, which then updates local state and might trigger *another* write back to the cloud.
- **Why**: While there are some checks (like `JSON.stringify` comparisons), rapid changes to the `timers` or `activeTask` could cause "ping-pong" updates or race conditions where local state is overwritten by a slightly older cloud snapshot before a local edit can be saved.

### 4. [LOGIC] Floating Point Precision Drift
- **Location**: `js/shadow-engine.js` (lines 275, 321)
- **Problem**: Exponential Moving Average (EMA) calculations for "Energy Map" and "Success Probability" use `.toFixed(3)`.
- **Why**: Repeatedly rounding a value to 3 decimal places during every update can lead to "Drift Error," where the value never actually reaches 0 or 1 even if the inputs should drive it there, or it settles at a mathematically incorrect equilibrium.

### 5. [PERFORMANCE] Re-rendering Performance Bottleneck
- **Location**: `js/shadow-engine.js` (line 698), `js/task-manager.js` (line 142)
- **Problem**: The `render()` method in `ShadowEngine` and `renderTasks()` in `TaskManager` completely tear down and rebuild DOM elements on every update.
- **Why**: While functional for small lists, as a user accumulates hundreds of tasks, this causes "UI Jitter" and high CPU usage whenever a timer is running, as the entire activity list is re-injected into the DOM every second or every time a change occurs.

### 6. [SAFETY] localStorage Quota Risks
- **Location**: `js/discipline-tracker.js` (line 144)
- **Problem**: `app.saveToStorage` does not check for `QuotaExceededError`.
- **Why**: Browsers limit `localStorage` to ~5MB. If a user has a very large task history or many FAVORITES, the app will throw a silent error when trying to save new tasks, leading to the user believing their data is saved when it actually isn't.

### 7. [ROBUSTNESS] Shadow Engine Initialization Sequence
- **Location**: `js/shadow-engine.js` (line 110)
- **Problem**: `parseFloat(this.app.loadFromStorage(...))` is called directly.
- **Why**: If the storage is corrupted or returns an object instead of a string, `parseFloat` will return `NaN`. Although there is a `Number.isFinite` check afterward, better defensive coding would prevent `parseFloat(null)` or `parseFloat(undefined)` from ever occurring to avoid console noise.

---
*End of Audit Report*
