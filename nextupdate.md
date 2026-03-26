## Shadow Engine 2.0 — Master Implementation Prompt (Point-Wise)

### 1. Role

* Act as a senior system architect, behavioral scientist, and control-system engineer.
* Design a deterministic self-learning discipline engine.
* Do not behave like an AI assistant.
* Work as a system designer.

### 2. Core Objective

* Track user behavior.
* Learn patterns from history.
* Adjust daily missions.
* Gradually shift the user toward ideal habits.
* Prevent burnout and misuse.
* Keep the system deterministic and explainable.

### 3. Core Behavior Model

* The system must gradually shift the timetable toward an ideal schedule.
* Never jump directly from current to ideal.
* Always improve in small steps.
* Use this model for sleep, wake, and deep work timing.
* If the user fails, do not punish with a large rollback.
* Apply a smaller adjustment instead.

### 4. Time Shifting Rule

* Use: `next_time = current_time + (ideal_time - current_time) * learning_rate`
* Maximum shift per day must not exceed 30 minutes.
* Use a smaller shift when the user is struggling.
* Use a slightly larger shift when the user is improving, but still keep the limit.

### 5. Critical Design Rules

* No sudden correction jumps.
* Behavior must depend on historical data.
* Use strict mode for habits that require exact timing.
* Use flexible mode for learning tasks that need buffers.
* Use only rules and measurable signals.
* Keep every output explainable.

### 6. Configuration Layer

* Each task must include: discipline_type, estimated_minutes, target_minutes, priority.
* Use these constants:

  * `LEARNING_RATE_FAILURE_SEVERE = 0.1`
  * `LEARNING_RATE_FAILURE_MODERATE = 0.2`
  * `LEARNING_RATE_STABLE = 0.3`
  * `EFFORT_SUCCESS_THRESHOLD = 0.7`
  * `FLEXIBLE_TASK_MULTIPLIER = 1.5`
  * `MAX_DAILY_SHIFT_LIMIT = 30`
  * `MIN_SLEEP_LIMIT` must exist
  * `MAX_SLEEP_COMPROMISES_PER_7_DAYS = 2`

### 7. Shadow Engine Logic

* Treat success as non-binary.
* A task succeeds when `actual / target >= 0.7`.
* Detect behavioral states:

  * RECOVERY
  * STABLE
  * GROWTH
* Track sleep, delays, completion, skips, and time-of-day performance.
* Derive energy map, resistance score, and success probability.

### 8. Trainer Engine Logic

* Apply progressive correction using: `next_target = current + (ideal - current) * learning_rate`.
* Follow this daily sequence:

  1. readTodayData()
  2. analyzeBehavior()
  3. detectBehavioralState()
  4. applyCorrection()
  5. generateMissions()
  6. applyRules()
  7. output plan
* In RECOVERY, reduce load and use smaller shifts.
* In STABLE, maintain level and use moderate shifts.
* In GROWTH, increase slightly and use slightly larger shifts.

### 9. Task Handling

* Strict tasks require fixed timing.
* A delay greater than 5 minutes counts as failure for strict tasks.
* Strict tasks include sleep timing, wake timing, and deep work start.
* Flexible tasks allow buffer time.
* Flexible tasks should use 1.5x to 2x estimated duration.
* Flexible tasks should not get strict penalties for normal overruns.

### 10. Sleep Control

* Sleep compromise is allowed only when the task is high-value.
* Sleep compromise is allowed only when effort is genuine.
* Sleep compromise must not become frequent.
* The system must never ignore `MIN_SLEEP_LIMIT`.
* Limit compromise to 2 times per 7 days.
* If sleep is compromised, mark it as `COMPROMISED_OK`.
* Reduce the next day load by 15%.

### 11. Anti-Misuse Logic

* If flexibility is abused, reduce flexibility.
* If misuse continues, increase strictness automatically.
* Protect the system from becoming too permissive.

### 12. Decision Flow

* Load stored data.
* Read today’s performance.
* Compute trends.
* Detect state.
* Apply correction for time and workload.
* Apply strict and flexible rules.
* Apply sleep constraints.
* Generate the next timetable and tasks.
* Save state.
* Output the mission plan.

### 13. Daily Update Logic

* If failed, reduce load slightly and reduce shift size.
* If stable, keep the level steady and make small improvements.
* If improving, increase slightly and shift the timetable faster within limits.
* If sleep is compromised, allow it only conditionally and reduce next day load.

### 14. Final System Behavior

* The system should behave like a coach adjusting the schedule daily.
* The system should behave like a GPS rerouting habits gradually.
* The system should behave like a control system moving toward the ideal state.
* The system should not force sudden discipline.
* The system should not punish harshly.
* The system should not jump schedules.

### 15. One-Line Philosophy

* Move the user toward the ideal schedule step by step, never by force.

### 16. Mission UI Refresh and Expiry Logic

* The Daily Mission UI must update immediately when the current time passes a task slot.
* If a mission is not completed and its scheduled time has passed, mark it as expired and show it in grey.
* The checkbox state must reflect the real completion state instantly.
* Do not wait until the end of the day to change the UI color or status.
* The mission list must re-render whenever time, completion state, or schedule state changes.
* If a task is completed, the tick must appear immediately.
* If a task is not completed by its time window, the task must grey out immediately.

### 17. End-of-Day Schedule Generation

* Do not regenerate the full timetable on every small time change.
* Regenerate the next timetable only at the correct day boundary or when the user continues to the next cycle.
* Mission UI state and timetable generation must be separated.
* UI status updates should happen live.
* Next-day roadmap generation should happen once after the day is finalized.

### 18. Required Fix Behavior

* The current issue is that the mission UI updates too slowly.
* Fix the mission state flow so the visible mission list reflects current time without delay.
* Ensure the grey state, checkbox state, and expired state are derived from live data and not from stale cached state.
* Ensure the UI does not jump directly to the next task without first updating the current task status correctly.
* Ensure the schedule remains visible and accurate throughout the day.
######  tell me what is done and what is not 
 tell me what is done and what is not 