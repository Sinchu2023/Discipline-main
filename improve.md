# Multi-Device Productivity and Discipline Tracking Application

## Overview

Create a multi-device productivity web application that allows users to track productive work, manage learning roadmaps, and synchronize all progress across multiple devices.

The system must support:

* real-time synchronization
* strict user data isolation
* **very low Firebase read and write usage**
* AI-generated learning roadmaps
* reliable cross-device synchronization

The application will run continuously (24×7), therefore **database operations must be minimized by design**.

---

# 1. Critical Requirement — Extremely Low Firebase Reads and Writes

The application must be designed to **minimize Firebase reads and writes at all times**.

Because the application runs 24×7, inefficient database operations can quickly exceed free tier limits.

### The system must follow these rules

#### Timer Updates

The system **must never write timer updates every second**.

Instead:

* Store the **timer start timestamp**
* Calculate elapsed time locally on the device

Example:

Timer Start
→ write once to database

Timer Stop
→ write once to database

Elapsed time
→ calculated locally

#### Allowed Database Write Events

Database writes should occur **only during important state changes**:

* start timer
* stop timer
* add task
* complete task
* roadmap update
* mission completion
* favorites update

#### Write Optimization

The system must also implement:

* write debouncing
* batched updates
* minimal document updates

The goal is to keep Firebase operations extremely low while maintaining real-time behavior.

---

# 2. User Isolation

Each user account must have completely independent data.

When two users log in (for example, two friends using the application), they must **never see each other's information**.

The following data must always remain private per user:

* learning roadmap
* tasks
* productivity time
* shadow statistics
* favorites
* reports
* timer state
* analytics and stored state

All stored data must be tied strictly to the **authenticated user ID**.

---

# 3. AI-Generated Roadmap System

Users should not manually create their roadmap.

Instead, the user provides a **topic prompt**, and the system generates a structured learning roadmap automatically using AI.

Example prompt:

Create a roadmap for Analog IC Design.

### Roadmap Requirements

The generated roadmap must contain:

* multiple modules
* multiple learning steps inside each module
* each step representing **one day of study**
* sequential day numbering across modules
* beginner → intermediate → advanced → project progression

Each roadmap step must be:

* editable
* trackable
* unlockable after previous steps

### Roadmap Persistence

The roadmap must:

* persist per user
* synchronize across devices
* track progress by day
* unlock future days when previous days are completed

---

# 4. Roadmap JSON Structure

The AI must return the roadmap in **structured JSON format**.

Example structure:

{
"modules":[
{
"module":"DIODES",
"days":[
{
"day":1,
"topic":"Basic Semiconductor Physics",
"status":"active"
},
{
"day":2,
"topic":"Different Models of Diodes",
"status":"locked"
}
]
}
]
}

### JSON Rules

* Day numbers must continue across modules
* The first day must be **active**
* Remaining days must be **locked**
* Each day contains one learning topic

This structured format allows the application to automatically render the roadmap UI.

---

# 5. Cross-Device Timer Synchronization

The stopwatch timer must behave as a **single global timer per user**.

If the timer starts on one device, it must immediately synchronize across all devices logged into the same account.

### Rules

Starting timer on laptop
→ phone must show timer running

Starting timer on phone
→ laptop must show timer running

Stopping timer anywhere
→ timer stops everywhere

Only **one active task timer** is allowed per user.

### Timer State Must Contain

* running / stopped status
* task name
* start timestamp
* elapsed time

Elapsed time must be calculated locally using the stored timestamp.

---

# 6. Real-Time State Synchronization

The following data must remain synchronized across all user devices:

* active timer
* task list
* productivity time
* sleep tracking
* shadow system metrics
* streak data
* favorites
* roadmap progress
* daily mission progress

Changes made on one device must automatically appear on all other devices.

---

# 7. Offline Friendly Behavior

The application must support temporary offline operation.

If internet connection is lost:

* timer must continue locally
* tasks can still be created
* roadmap progress can still be updated

When connection is restored:

* local changes must synchronize with cloud data
* conflicts must resolve safely without losing information

---

# 8. Secure Data Model

Each user must have an isolated data structure containing:

* tasks
* favorites
* roadmap
* timer state
* analytics
* productivity statistics

No user must ever access another user's data.

---

# 9. Scalability

The system architecture must support:

* multiple devices per user
* thousands of tasks
* long-term productivity history
* large learning roadmaps
* minimal performance degradation

---

# 10. Consistency Guarantee

When multiple devices update data simultaneously, the system must ensure:

* the latest authoritative state is preserved
* timer data remains correct
* roadmap progress remains consistent

Data conflicts must be resolved safely.

---

# 11. Performance Requirements

The application must feel instantaneous to the user.

### Performance Rules

* timer updates locally without network delay
* cloud synchronization occurs in the background
* network usage remains minimal
* Firebase reads and writes remain extremely low

User experience must prioritize:

* responsiveness
* synchronization reliability
* stability during long running sessions

### App Improvement Instructions

Read the project files and implement the following improvements carefully.

### 1. Private Discipline Journey

This application is strictly for personal use. The user's discipline journey must remain completely private.

Requirements:

* Do not expose any user's data publicly.
* Ensure that roadmap, tasks, productivity data, shadow stats, reports, and timer state are only visible to the logged-in user.
* All Firebase reads and writes must be strictly scoped to `users/{user.uid}`.
* Never load or display data belonging to any other user.

### 2. Credits Section

Add a **Credits section** inside the Login / Logout profile menu.

Requirements:

* Add a clickable link in the profile menu.
* Display the text:
  `Credits: Sinchan Chandrashekhar`
* Link it to:

https://www.linkedin.com/in/sinchan-chandrashekhar-180248263/

The link should open in a new tab.

### 3. Timer Stop Lag Fix

The timer currently takes too long to stop or update.

Fix this behavior.

Requirements:

* Timer must stop instantly in the UI.
* Local timer must stop immediately without waiting for Firebase.
* Firebase write should occur asynchronously after the UI stops.
* Avoid blocking the UI thread.
* Ensure the stopwatch logic is not dependent on network latency.

### 4. Reduce UI Lag

The application currently lags on both phone and laptop.

Improve performance.

Requirements:

* Avoid unnecessary DOM re-renders.
* Avoid heavy operations inside loops or timer ticks.
* Ensure the stopwatch updates only the display element.
* Ensure Firebase listeners do not trigger unnecessary UI refreshes.
* Debounce expensive UI updates if needed.

### 5. Fix Mobile Layout

The mobile UI currently appears misaligned and stacked incorrectly.

Improve the layout.

Requirements:

* Ensure responsive layout works correctly on phones.
* Fix elements appearing “up-down” incorrectly.
* Adjust flex/grid layouts to behave properly on small screens.
* Ensure the stopwatch, tasks, and roadmap sections scale properly on mobile devices.

### 6. Maintain Existing Architecture

Do not rewrite the entire project.

Modify only the necessary parts while preserving:

* authentication
* Firebase sync
* roadmap system
* stopwatch system
* shadow system
* task tracking

### Goal

The final application must:

* remain fast
* minimize Firebase reads/writes IMPORTANT ONE 

  keep the discipline journey private
* stop the timer instantly
* work smoothly on mobile and desktop
* include the Credits link in the profile menu

### App Improvement Instructions

Read the project files and implement the following improvements carefully.

---

### 0. Login Required Before Access (Very Important)

The application must **require login before any part of the app is accessible**.

Requirements:

* When the page loads, show the **Login screen first**.
* The main application UI (timer, roadmap, tasks, shadow system, reports) must **not load until the user is authenticated**.
* If no user is logged in:

  * hide the entire application interface
  * show only the **Google Login button or login screen**.
* After successful login:

  * load the user data from `users/{user.uid}`
  * render the full application UI.

Rules:

* Without login, **no Firebase data should be read or written**.
* When the user logs out, immediately:

  * clear local state
  * hide the app UI
  * return to the login screen.

---

### 1. Private Discipline Journey

This application is strictly for personal use. The user's discipline journey must remain completely private.

Requirements:

* Do not expose any user's data publicly.
* Ensure that roadmap, tasks, productivity data, shadow stats, reports, and timer state are only visible to the logged-in user.
* All Firebase reads and writes must be strictly scoped to `users/{user.uid}`.
* Never load or display data belonging to any other user.

---

### 2. Credits Section

Add a **Credits section** inside the Login / Logout profile menu.

Requirements:

* Add a clickable link in the profile menu.
* Display the text:
  `Credits: Sinchan Chandrashekhar`
* Link it to:

https://www.linkedin.com/in/sinchan-chandrashekhar-180248263/

The link should open in a new tab.

---

### 3. Timer Stop Lag Fix

The timer currently takes too long to stop or update.

Fix this behavior.

Requirements:

* Timer must stop instantly in the UI.
* Local timer must stop immediately without waiting for Firebase.
* Firebase write should occur asynchronously after the UI stops.
* Avoid blocking the UI thread.
* Ensure the stopwatch logic is not dependent on network latency.

---

### 4. Reduce UI Lag

The application currently lags on both phone and laptop.

Improve performance.

Requirements:

* Avoid unnecessary DOM re-renders.
* Avoid heavy operations inside loops or timer ticks.
* Ensure the stopwatch updates only the display element.
* Ensure Firebase listeners do not trigger unnecessary UI refreshes.
* Debounce expensive UI updates if needed.

---

### 5. Fix Mobile Layout

The mobile UI currently appears misaligned and stacked incorrectly.

Improve the layout.

Requirements:

* Ensure responsive layout works correctly on phones.
* Fix elements appearing “up-down” incorrectly.
* Adjust flex/grid layouts to behave properly on small screens.
* Ensure the stopwatch, tasks, and roadmap sections scale properly on mobile devices.

---

### 6. Maintain Existing Architecture

Do not rewrite the entire project.

Modify only the necessary parts while preserving:

* authentication
* Firebase sync
* roadmap system
* stopwatch system
* shadow system
* task tracking

---

### Goal

The final application must:

* remain fast
* **minimize Firebase reads and writes (very important)**
* keep the discipline journey private per user
* require login before accessing the app
* stop the timer instantly
* work smoothly on mobile and desktop
* include the Credits link in the profile menu
