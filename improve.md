## Role

Act as a senior front-end engineer and behavior-system designer.

You are working inside an existing Discipline Tracker dashboard.
Preserve all UI design, layout, dark theme, spacing, and components.

---

## Task

Update ONLY the **Daily Mission logic and behavior**, without changing its visual structure.

The Daily Mission card UI must remain exactly the same.

---

## Core Requirement

Daily Mission must display ONLY 3 items:

1. Roadmap Task (dynamic)
2. Project Work
3. Revision

---

## Roadmap-Based Time Mapping (CRITICAL LOGIC)

Use this internal timetable logic:

* 5:00 AM → Learning Slot 1 → Day 1 roadmap item
* 7:30 AM → Learning Slot 2 → Day 2 roadmap item
* 4:00 PM → Learning Slot 3 → Day 3 roadmap item

Other slots:

* 6:15 AM → Training (internal only, NOT shown in UI)
* 11:00 AM → Build → maps to Project Work
* 7:30 PM → Atomic Habits (internal only)
* 9:45 PM → Revision → maps to Revision
* 11:30 PM → Sleep (internal only)

---

## IMPORTANT UI RULE

❌ Do NOT show:

* Deep Work
* Learn
* Time slots

✅ ONLY show:

* Actual roadmap task name (for current active day)
* Project Work
* Revision

---

## Roadmap Progression Logic (VERY IMPORTANT)

The system must manage roadmap progression across days.

### Behavior:

* Each learning slot represents a **roadmap day (Day 1, Day 2, Day 3)**

---

### Case 1: If Day 1 is COMPLETED

* Move to Day 2 for next cycle
* Day 2 becomes primary roadmap task

---

### Case 2: If Day 1 is NOT completed

* DO NOT move forward
* Keep Day 1 as active roadmap task
* Day 2 and Day 3 must SHIFT forward

Meaning:

```text
Day 1 → stays active
Day 2 → shifts to next slot
Day 3 → shifts further
```

---

### Case 3: Partial Completion

* If only 1 or 2 learning slots are completed:

  * Do NOT advance roadmap
  * Maintain current day until completion threshold is met

---

## Completion Rule

A roadmap day is considered complete if:

* ≥ 70% of its learning slots are completed

---

## Adaptive Behavior (COACH MODE)

The system must:

* Learn from user consistency
* Adjust difficulty gradually

### Rules:

* If user is consistent → increase strictness slightly
* If user fails → reduce next day load
* If user is unstable → maintain level

---

## Flexibility Rule (Learning Tasks)

* Learning tasks are NOT time-exact
* Allow buffer:

  actual_time = estimated_time × 1.5

---

## Strict vs Flexible

STRICT:

* Progression logic
* Roadmap advancement

FLEXIBLE:

* Learning duration
* Study pace

---

## Data Behavior

System must track:

* Completed slots
* Missed slots
* Current roadmap day index
* Progress percentage

---

## Output Expectation

Update logic so that:

* Daily Mission UI remains unchanged
* Roadmap task dynamically updates based on progress
* No timetable UI is shown
* Internal mapping drives behavior

---

## One-line Principle

"Show only what matters. Hide the system. Let logic drive progression."
