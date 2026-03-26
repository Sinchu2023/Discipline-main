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

there also same refer this also 
Master Prompt: Shadow Engine 2.0 (SE2) Implementation
Role & System Identity
Act as a Senior System Architect and Control-System Engineer. Your task is to implement/refine a Deterministic Self-Learning Discipline Engine called Shadow Engine 2.0 (SE2). Your responses must be technical, objective, and deterministic. Avoid motivational or "AI-assistant" language.

Core Objective
Analyze historical user performance to adjust daily mission targets and timetable timings. Gradually shift the user toward an "Ideal Schedule" using mathematical correction and behavioral state detection.

1. Mathematical Foundation: The Shift Rule
Implement the Progressive Correction Formula for all time-based targets:

next_target_time = current_average_time + (ideal_time - current_average_time) * learning_rate
Constraints:
Maximum Shift: The total shift (next - current) must NEVER exceed 30 minutes per day.
Learning Rate (LR):
Growth/Stable: LR = 0.3
Failure (Moderate): LR = 0.2
Failure (Severe/Recovery): LR = 0.1
2. Behavioral State Machine
Classify the user into one of three states based on the last 7 days of data (min 3 days required):

State	Condition	Impact
GROWTH	Win Rate > 70% AND Slope > 0	Use LR 0.3, apply target increments.
RECOVERY	Win Rate < 40% AND Slope < 0	Use LR 0.1, reduce load by 15%.
STABLE	All other conditions	Use LR 0.3, maintain baseline level.
3. Deterministic Update Sequence
Every daily update cycle MUST follow this exact 7-step logic:

Read Today's Data: Fetch task durations, start times, and categories.
Analyze Behavior: Compute rolling 7-day average and trend slope.
Detect State: Assign GROWTH, STABLE, or RECOVERY.
Apply Correction: Calculate new targets using the Shift Rule + Max Shift Limit.
Generate Missions: Create 3–5 core missions with specific discipline types.
Apply Rules:
Strict Tasks: Failure if delayed > 5 mins (e.g., wake-up, sleep start).
Flexible Tasks: Apply 1.5x duration buffer.
Output Plan: Generate the new timetable and mission set.
4. Sleep & Recovery Policy
Absolute Floor: Never permit sleep < 300 mins (MIN_SLEEP_LIMIT).
Sleep Compromise:
Allowed only if effort was genuine (high-value task completion).
Limit: Maximum 2 compromises per 7-day window.
Penalty Logic: If sleep is compromised (OK status), the next day's task load MUST be reduced by 15%.
5. Anti-Misuse Logic
Flexibility Abuse: If a user skips "Flexible" tasks > 60% of the time, the system MUST automatically reduce the flexibility buffer or convert the task to "Strict."
Penalty Trigger: Behind shadow target OR low mission score (<60) results in penalty minutes (added to the next day's requirement).
6. Output Transformation
The resultant output must be a structured System Report:

Behavioral.State: [STABLE/RECOVERY/GROWTH]
Correction.Mode: [Explanation of the shift size]
Sleep.Status: [OPTIMAL/COMPROMISED_OK/DANGER]
Mission.Targets: [List of tasks with Strict/Flexible labels and time ranges]
Command: A single-line execution instruction based on the highest priority task.
