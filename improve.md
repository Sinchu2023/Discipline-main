# Daily Mission State Sync and Architecture Fix Prompt

## ROLE

Act as a senior front-end engineer and state management designer.

You are debugging and restructuring the Daily Mission and Roadmap integration system.

Do not modify UI design, layout, or styling.
Only fix logic, state flow, and synchronization.

---

## OBJECTIVE

Fix all inconsistencies between Roadmap Console and Daily Mission by introducing a single, deterministic, synchronized state system.

---

## CORE PROBLEM

The system currently has multiple independent states that are not synchronized.

This causes:

* UI inconsistencies
* irreversible actions
* stale data rendering
* incorrect task states

---

## REQUIRED ARCHITECTURE

### 1. Single Source of Truth

All systems must use one unified state object:

cascadeState = {
roadmapQueue: [],
activeSlots: {
slot1: null,
slot2: null,
slot3: null
},
completion: {
slot1: false,
slot2: false,
slot3: false
}
}

Roadmap Console and Daily Mission must both read and write to this same state.

---

### 2. Two-Way Synchronization

System must support:

* Roadmap → Daily Mission
* Daily Mission → Roadmap

When roadmap changes:

* activeSlots must be rebuilt
* UI must re-render

When Daily Mission changes:

* roadmap progress must update

---

### 3. Derived UI Model

UI must NOT store its own state.

UI must always render from:

cascadeState → derived → UI

No independent UI state allowed.

---

### 4. Active Slot Rebuild Rule

Whenever roadmapQueue changes:

* Recalculate activeSlots from queue
* Replace slot1, slot2, slot3
* Trigger UI update

---

### 5. Completion State Binding

Each slot must map directly:

slot1 → completion.slot1
slot2 → completion.slot2
slot3 → completion.slot3

No shared or global checkbox state.

---

### 6. Cascade Safety (Non-Destructive)

Before any cascade operation:

* Save previous state snapshot

stateHistory.push(copy(cascadeState))

System must support restoring previous state.

---

### 7. Task Rehydration

If a task is unchecked in roadmap:

* It must re-enter roadmapQueue
* activeSlots must rebuild
* Task must reappear in UI

---

### 8. State Normalization

Ensure consistency between:

* roadmapQueue
* activeSlots
* completion

No duplicate or conflicting data.

---

### 9. Time State Layer

Each slot must include:

slotStatus = active | expired | completed

Rules:

* expired if time passed and not completed
* expired slots remain editable

---

### 10. UI Consistency Rule

UI must always reflect latest state.

After any change:

* update cascadeState
* re-render UI

No cached or stale rendering allowed.

---

### 11. Controlled Cascade Execution

Cascade must only run when:

* user triggers action (checkbox or continue button)

Do not run cascade on passive UI refresh.

---

### 12. Separation of Concerns

Strict separation:

* Source: cascadeState
* Logic: cascade engine
* View: UI rendering

No mixing of responsibilities.

---

## EXPECTED RESULT

* Roadmap and Daily Mission stay fully synchronized
* Tasks can be checked and unchecked reliably
* UI always reflects real state
* Cascade is predictable and reversible
* No data loss

---

## FINAL PRINCIPLE

System must operate with a single consistent state and deterministic updates.

