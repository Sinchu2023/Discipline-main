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
