# Daily Mission — Final Implementation Prompt (Cascade Within Day)

## ROLE

Act as a senior front-end engineer and behavior-system designer.

Work inside an existing Discipline Tracker dashboard.

Constraints:

* Do NOT change UI layout, design, spacing, or components
* ONLY update logic and behavior

---

## CORE UI (FIXED TIMETABLE)

The schedule must always display exactly:

4:00 AM  → Deep Work (Learning) [Day 1 Roadmap]
6:15 AM  → Training
7:30 AM  → Deep Work (Learning) [Day 2 Roadmap]
11:00 AM → Build (Project)
4:00 PM  → Learn (Learning) [Day 3 Roadmap]
7:30 PM  → Atomic Habits
9:45 PM  → Revision
11:30 PM → Sleep

---

## ROADMAP LABEL INJECTION

* Replace Day1/Day2/Day3 with actual roadmap task names
* Always prefix with [ROADMAP]

Example:
4:00 AM → Deep Work (Learning) [ROADMAP: Arrays]

---

## COMPLETION SYSTEM

Each roadmap slot must have a checkbox:

[ ] Slot1 (4:00)
[ ] Slot2 (7:30)
[ ] Slot3 (4:00PM)

States:

* unchecked = incomplete
* checked = completed

---

## CORE BEHAVIOR — SAME DAY CASCADE (CRITICAL)

This system MUST cascade tasks forward within the SAME DAY.

---

## INITIAL STATE

Slot1 → Day1
Slot2 → Day2
Slot3 → Day3

---

## RULE 1 — MISSED TASK SHIFTS FORWARD

If a task is NOT completed in its slot:

* It moves to the NEXT slot in the same day

Example:

Before:
Slot1 → Day1
Slot2 → Day2
Slot3 → Day3

If Day1 is missed:

After:
Slot1 → (empty or next-day fill later)
Slot2 → Day1
Slot3 → Day2
Next queue → Day3 pushed forward

---

## RULE 2 — CASCADE EFFECT

When a task shifts forward:

* All tasks below shift down
* Last task gets pushed out to next cycle

---

## RULE 3 — COMPLETION REMOVES TASK

If a task is completed at any slot:

* It is removed immediately
* Remaining tasks shift up
* New task fills last slot

---

## RULE 4 — MULTIPLE FAILURES

If a task is repeatedly missed:

Slot1 miss → Slot2
Slot2 miss → Slot3
Slot3 miss → Next Day Slot1

The task continues until completed

---

## RULE 5 — UPDATE TRIGGER

Cascade logic runs when:

* slot time passes (optional auto-trigger)

---

## DATA MODEL

{
roadmapQueue: [Day1, Day2, Day3, Day4],
activeSlots: [Day1, Day2, Day3],
completion: {
slot1: false,
slot2: false,
slot3: false
}
}

---

## UPDATE FLOW

1. Read slot completion
2. For each slot in order:

   * if completed → remove
   * if not completed → shift forward
3. Re-pack slots
4. Fill empty slots from roadmapQueue
5. Update UI

---

## VISUAL STATE

[ ] Pending
[✓] Completed

---

## RESET

* Reset completion
* Reset slots to initial mapping

---

## FINAL BEHAVIOR

* Timetable is fixed
* Tasks move forward within the same day
* Missed tasks never stay stuck
* Completed tasks disappear

---

## ONE LINE PRINCIPLE

"Miss it → it moves to the next session immediately."
