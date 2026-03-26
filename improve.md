# Shadow Engine 2.0 — Master Implementation Prompt

Act as a **senior system architect, behavioral scientist, and control-system engineer**.

You are designing a **deterministic self-learning discipline engine** called **Shadow Engine 2.0** for an offline Discipline Tracker project.

You are **not** an AI assistant in this context.
You are a **system designer**.

Your job is to produce a **high-precision implementation specification** that a developer or low-level model can follow with maximum accuracy.

The final design must be:

* completely offline however i am using git host and firebase for free tire.
* free of paid APIs 
  ###CAUTION THE PROJECT IS OPEN SOURCE avoid the issue of sensity information acces to the ousider or other )
* based only on logic, rules, and stored user data
* manually implementable in code
* deterministic and fully explainable
* gradual in correction, never abrupt
* strict where habits matter, flexible where learning is uncertain

---

### SYSTEM OBJECTIVE

Design a discipline engine that does **not only track performance**, but also:

* learns user behavior over time
* adapts daily missions dynamically
* corrects behavior gradually instead of aggressively
* balances strict discipline with realistic flexibility
* prevents burnout and misuse at the same time
* remains stable, transparent, and deterministic

The engine should behave like a **strict but intelligent coach**, not like a rigid rule engine, motivational app, or punishment system.

---

### CRITICAL DESIGN RULES

#### 1. No sudden correction jumps

* Never move directly from failure to ideal.
* Always apply gradual correction.
* Always preserve realism.

#### 2. Behavior-based adaptation

* Mission updates must depend on historical behavior.
* Do not use one-size-fits-all fixed rules.

#### 3. Dual-mode discipline

* STRICT mode for habits where discipline must be enforced.
* FLEXIBLE mode for learning where exact timing is uncertain.

#### 4. No emotional logic

* Do not use motivational, poetic, or emotional reasoning.
* Use structured, rule-based decisions only.

#### 5. Explainable and deterministic

* Every output must be traceable to a clear logic path.
* Every target, state, and adjustment must have a reason.

---

### CORE ARCHITECTURE REQUIREMENTS

The upgrade affects these core modules. Keep the existing CSS/UI styling intact if UI is involved.

#### A. Configuration Layer (`js/config.js`)

Add the following metadata and constants.

##### 1. Daily goal metadata

Each `DAILY_GOAL` must include:

* `discipline_type`: either `"strict"` or `"flexible"`
* `estimated_minutes`
* `target_minutes`
* `priority`
* optional `category` or `tags`

##### 2. Constants

Use these values as the system’s baseline:

* `LEARNING_RATE_FAILURE_SEVERE = 0.1`
* `LEARNING_RATE_FAILURE_MODERATE = 0.2`
* `LEARNING_RATE_STABLE = 0.3`
* `EFFORT_SUCCESS_THRESHOLD = 0.7`
* `FLEXIBLE_TASK_MULTIPLIER = 1.5`
* `MAX_DAILY_SHIFT_LIMIT = 30` minutes
* `MIN_SLEEP_LIMIT` must always exist
* `MAX_SLEEP_COMPROMISES_PER_7_DAYS = 2`

---

#### B. Shadow Engine Logic (`js/shadow-engine.js`)

This is the behavioral core.

##### 1. Mission scoring

Modify mission scoring so that success is **not binary**.
If `minutes / target >= 0.7`, the item counts as successful for evaluation.
This is the **Smart Success Evaluation** rule.

##### 2. Behavioral state detection

Add a `detectBehavioralState()` method.
Analyze at least the last 3 days.
Determine one of these states:

* `RECOVERY`
* `STABLE`
* `GROWTH`

Suggested thresholds:

* `RECOVERY`: negative trend and win rate < 40%
* `STABLE`: trend roughly within ±5% and win rate 40–70%
* `GROWTH`: positive trend and win rate > 70%

##### 3. Behavioral learning storage

Store behavioral signals locally and immediately.
Use `localStorage.setItem('discipline_behavior_signals', JSON.stringify(signals))` or equivalent local offline storage.

Track at minimum:

* sleep patterns
* task delays
* completion rate
* skip frequency
* time-of-day performance

Derive from these:

* resistance per task
* energy map per hour
* success probability per task and time slot

##### 4. Penalty and pressure logic

Penalties must remain deterministic.
Use them as structured risk signals, not emotional punishment.

##### 5. Reinforcement output

Success feedback must be calm and structural.
Example style:

* "Baseline stabilized. Target incremented by 12 minutes for tomorrow."
* "Recovery mode active. Mission load reduced by 15%."

No fluff. No emotional language.

---

#### C. Trainer Engine / Mission Generator (`js/trainer-engine.js`)

This module should control adaptation and next-day target generation.

##### 1. Progressive correction formula

Implement:
`next_target = current + (ideal - current) * learning_rate`

Choose the learning rate based on current state:

* severe failure → `0.1`
* moderate failure → `0.2`
* stable behavior → `0.3`

Add a **max daily shift limit** so a target cannot move by more than 30 minutes in one day.

##### 2. Daily cycle sequence

The daily cycle must follow this order exactly:

1. `readTodayData()`
2. `analyzeBehavior()`
3. `detectBehavioralState()`
4. `applyCorrection()`
5. `generateMissions()`
6. `applyRules()`
7. output structured mission plan

##### 3. Mission generation by state

* `RECOVERY` → reduce load and apply gentle correction
* `STABLE` → maintain current level
* `GROWTH` → increase difficulty slightly

##### 4. Strict vs flexible handling

* Strict tasks keep exact timing and cannot be compromised.
* Flexible tasks receive realistic buffers.
* For flexible tasks, display or compute target time as `estimated_time * 1.5` to `2.0`.

##### 5. Feedback tone

The report generator must be command-based and deterministic.
Remove any fluff, hype, or emotional phrasing.

---

### CORE IMPLEMENTATION LOGIC

#### I. Progressive correction

For tomorrow’s mission target:

* In `RECOVERY`: `target = current_avg + (ideal - current_avg) * 0.1`
* In `GROWTH`: `target = current_avg + (ideal - current_avg) * 0.3`
* In other stable conditions: use the stable learning rate

Constraint:

* the target cannot shift more than 30 minutes in a single day

#### II. Task handling

##### Strict tasks

Examples:

* sleep timing
* wake timing
* deep work start

Rules:

* no compromise
* if actual start is later than timetable start by more than 5 minutes, flag failure
* these tasks define discipline structure

##### Flexible tasks

Examples:

* learning
* watching lectures
* practice
* revision-type study sessions

Rules:

* allow buffer
* do not assume exact duration
* use realistic time expansion
* allow overruns without penalty where appropriate

#### III. Controlled sleep compromise

Sleep reduction is allowed only under controlled conditions.

Allow it only if:

* the task is high value
* effort is genuine
* it is not happening frequently

Rules:

* minimum sleep limit must always exist
* if sleep is reduced today, next day load must be reduced
* limit compromise frequency to at most 2 per rolling 7-day period

If the compromise is approved:

* mark `sleepStatus = COMPROMISED_OK`
* reduce tomorrow’s total mission requirement by 15%

#### IV. Anti-misuse system

If flexibility is being abused:

* reduce allowed flexibility gradually
* increase strictness automatically
* protect the system from becoming permissive

#### V. Reinforcement system

After success:

* provide calm reinforcing feedback
* do not use over-excitement
* do not use punishment tone

The goal is stable repeatable behavior.

---

### DATA SCHEMA

Use a deterministic, local-first data model.

#### Behavioral profile example

```json
{
  "behavioral_profile": {
    "state": "STABLE",
    "last_update": 1711312345678,
    "signals": {
      "sleep_pattern": [],
      "delay_map": {
        "Deep Work": 12,
        "Build": 5
      },
      "success_probs": {
        "Analog": 0.85,
        "Project": 0.4
      },
      "energy_map": {
        "05:00": 0.9,
        "16:00": 0.6
      },
      "resistance_scores": {
        "Revision": 0.2,
        "Build": 0.7
      }
    }
  }
}
```

#### Required tracked data

* `sleep_history`
* `wake_history`
* `task_log_history`
* `daily_win_rate`
* `weekly_win_rate`
* `delay_map`
* `skip_frequency`
* `success_probability_map`
* `energy_map`
* `resistance_scores`
* `sleep_compromise_count_7d`

---

### DECISION FLOW

The system must always follow this deterministic flow:

1. Initialize from local storage or saved state
2. Load behavior signals
3. Read today’s task performance
4. Calculate rolling averages, win rate, and delay patterns
5. Detect behavioral state: `RECOVERY`, `STABLE`, or `GROWTH`
6. Apply progressive correction using the correct learning rate
7. Apply strict vs flexible rules
8. Apply controlled sleep compromise checks
9. Update mission targets for tomorrow
10. Persist all updated behavioral data immediately
11. Output the updated structured mission plan

---

### STEP-BY-STEP DAILY MISSION UPDATE LOGIC

#### When the user fails or underperforms

* determine whether the failure is severe, moderate, or minor
* reduce tomorrow’s mission only partially
* keep strict habits strict
* buffer learning tasks
* reduce overload in the next cycle

#### When the user is stable

* maintain targets near current level
* do not overcorrect
* preserve consistency

#### When the user is improving

* increase targets slightly
* push only a small amount above current comfort
* keep the correction within the daily shift limit

#### When sleep compromise is used

* allow it only within constraints
* reduce next day mission load
* track the compromise count
* block further compromise if abuse is detected

#### When flexible learning tasks are involved

* apply realistic buffers
* treat estimates as approximate
* do not punish reasonable overruns

---

### OUTPUT FORMAT REQUIRED

Provide the final design in this exact structure:

#### 1. Feature list

List all major system features clearly and completely.

#### 2. Module breakdown

Break the system into logical modules and explain their responsibilities.

#### 3. Logic of each module

Explain how each module works step by step.

#### 4. Data structures required

Define the core local data structures required for implementation.

#### 5. Exact decision flow

Show how data becomes a mission target through deterministic logic.

#### 6. Step-by-step daily mission update logic

Explain how the mission changes from one day to the next.

---

### RESTRICTIONS

* Do not write code
* Do not use vague language
* Do not skip important logic
* Do not depend on AI APIs
* Do not suggest paid tools
* Do not introduce emotional framing

---

### FINAL EXPECTATION

The system should behave like:

* a strict but intelligent coach
* a gradual behavior corrector
* a self-learning deterministic control system
* an offline discipline engine with structured adaptation

It should **not** behave like:

* a rigid rule engine
* a motivational app
* a punishment system
* an AI chatbot

---

### ONE-LINE PHILOSOPHY

“Do not force perfection. Evolve the user toward it using controlled, intelligent steps.”
