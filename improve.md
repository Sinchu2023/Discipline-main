You are working on my existing open-source Discipline Tracker project. Make **only the requested UI and logic changes** below. Preserve the current dark theme, card style, typography, spacing, and responsive layout. Use the existing codebase and do not add any new dependencies.

## Important context

My current Shadow Engine already handles performance evaluation through shadowAvg, penalties, pressure, momentum, and mission score. Build on that structure instead of replacing it. 

## Required changes

### 1) Remove the **Flow State** section completely

* Delete the entire Flow State card/section from the dashboard.
* Remove any related rendering, state, helper logic, or data used only for that section.
* The layout should collapse naturally after removal.

### 2) Keep **Penalty** unchanged

* Do not redesign it.
* Do not change its logic, labels, colors, metrics, or visual hierarchy.
* Keep its current placement and behavior.

### 3) Keep **Monthly Battle** unchanged

* Do not redesign it.
* Do not change its logic, labels, metrics, or layout.
* Keep it exactly as it currently works.

### 4) Update **Daily Mission**

Replace the current Daily Mission items with these 3 permanent items:

1. **Shunt Clipper Circuits Clamper Circuits**

   * This is the roadmap-based mission item.
2. **Project Work**
3. **Revision**

Notes:

* These are permanent items.
* Project Work and Revision should remain fixed daily mission entries.
* Keep the same card style and checkbox style currently used in the UI.
* Keep the dark theme and current typography.

### 5) Connect mission logic to my timetable concept

Use this timetable as the underlying behavioral logic:

* 5:00 AM — Deep Work (learning topics)
* 6:15 AM — Train
* 7:30 AM — Deep Work (learning topics)
* 11:00 AM — Build
* 4:00 PM — Learn (learning topics)
* 7:30 PM — Atomic Habits
* 9:45 PM — Revision
* 11:45 PM — Rest

Behavior mapping:

* Deep Work and Learn are learning-topic blocks.
* Build maps to Project Work.
* Revision maps to the Revision mission.
* Train, Atomic Habits, and Rest may remain part of the internal routine logic, but do not add extra visible mission items unless the existing design requires it.

### 6) Add adaptive mission behavior

Make the system behave like a gradual coach, not a rigid judge.

The mission engine should:

* learn from recent behavior
* correct slowly instead of forcing a huge jump
* reduce tomorrow’s load when today was unstable
* slightly increase strictness when the user is consistent
* allow limited flexibility for learning tasks, especially videos and study blocks
* treat time estimates as approximate for learning tasks, not exact

### 7) Strict vs flexible task handling

Implement the mission logic so that:

* sleep, wake timing, and deep-work starts are treated as strict
* learning videos, study sessions, and revision are flexible with buffer
* task estimates should allow realistic overruns for learning
* the system should not assume 1 hour of video always equals 1 hour of work

### 8) Controlled compromise logic

Allow limited compromise only when it is justified:

* if a task is important and effort was high, small sleep compromise can be allowed occasionally
* never allow repeated misuse
* enforce a minimum safety limit for sleep
* if compromise is used, reduce next day’s load to compensate

### 9) Feedback tone

The system should feel:

* supportive after success
* firm after repeated failure
* calm and directive, not harsh or emotional
* appreciative of progress rather than punishing it

## Design goals

* Remove Flow State cleanly.
* Preserve Penalty and Monthly Battle exactly.
* Update Daily Mission to the new permanent structure.
* Make the mission logic adaptive, gradual, and realistic.
* Keep the app stable, clean, and visually consistent.

## Output expectation

Implement the changes directly in the existing project files so the dashboard updates correctly without breaking the current layout or style.
