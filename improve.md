## Role

Act as a senior front-end engineer working inside an existing codebase.

## Task

Update my existing Discipline Tracker dashboard with only the changes listed below. Keep the current dark theme, styling, spacing, card shape, typography, and responsive behavior intact. Do not add any new dependencies. Do not redesign the UI.

## Main requirement

There must be no separate timetable section.

The **Daily Mission section is the timetable**.

## Required changes

### 1) Remove the Flow State section completely

* Delete the entire Flow State card/section from the UI.
* Remove any related state, helpers, logic, imports, or rendering paths.
* The layout must collapse naturally with no empty placeholder space.

### 2) Keep Penalty and Monthly Battle unchanged

* Do not redesign them.
* Do not change their logic.
* Do not change labels, metrics, styling, or internal structure.
* Do not change their visual design.
* Only allow layout shift caused by removing Flow State.

### 3) Daily Mission must become the timetable

Replace the Daily Mission content with a time-based mission system.

Daily Mission should show these permanent items:

1. Shunt Clipper Circuits Clamper Circuits
2. Project Work
3. Revision

These are permanent mission headings.

The timetable logic behind them is:

* 5:00 AM — Deep Work (learning topics)
* 6:15 AM — Train
* 7:30 AM — Deep Work (learning topics)
* 11:00 AM — Build
* 4:00 PM — Learn (learning topics)
* 7:30 PM — Atomic Habits
* 9:45 PM — Revision
* 11:45 PM — Rest

Use this timetable only as the logic basis for mission planning, grouping, and status updates.

### 4) Mission mapping rules

* Deep Work and Learn are learning-topic blocks.
* Build maps to Project Work.
* Revision maps to Revision.
* Train, Atomic Habits, and Rest may remain part of internal routine logic if needed.
* Do not add extra visible mission items unless the existing structure already requires them.

### 5) Layout order must stay correct

* Remove Flow State.
* Keep Daily Mission in its original place.
* Keep Penalty and Monthly Battle visible on the right side. which is beside the daily mission.
* Maintain the existing responsive grid layout.
* Do not let the dashboard collapse into a stacked layout on desktop.
* Daily Mission should stay on the left.
* Penalty and Monthly Battle should stay on the right.

## Implementation rules

* Use the current codebase structure.
* Reuse existing components and helpers where possible.
* Remove only what is necessary.
* Keep the code clean and minimal.
* Do not break the current data flow.
* Do not add new libraries.
* Make sure the app still works correctly on mobile.

## Expected result

After the update:

* Flow State is gone.
* Daily Mission acts as the timetable.
* Penalty remains unchanged.
* Monthly Battle remains unchanged.
* The current dark design is preserved.
* The dashboard layout remains balanced with Daily Mission on the left and Penalty + Monthly Battle on the right.
* and daily mission consists ofnot just 3 items but it should be like a timetable. but not refering it has a time table. it should be like a mission list but with time table. and it should be like a mission list but with time table i have given above.
## Important note

Do not create a separate timetable component.
Do not render timetable as a separate visible block.
Treat the timetable as the internal logic that powers Daily Mission only.

## Output expectation

Apply the changes directly in the existing files so the dashboard updates correctly without altering the cu
