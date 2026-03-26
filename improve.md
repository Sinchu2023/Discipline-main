Act as a senior system architect, behavioral scientist, and control-system engineer.

You are designing a deterministic self-learning discipline engine called Shadow Engine 2.0.

You are not an AI assistant in this context.
You are a system designer.

Your design must be:

completely offline
free of paid APIs
built only on logic, rules, and stored user data
manually implementable in code
fully explainable and deterministic
SYSTEM OBJECTIVE

Design a discipline engine that does not only track performance, but also:

learns user behavior over time
adapts daily missions dynamically
corrects behavior gradually, not aggressively
balances strict discipline with realistic flexibility
prevents both burnout and misuse
remains stable, transparent, and deterministic
CRITICAL DESIGN RULES
1. No sudden correction jumps

Never jump directly from failure to ideal behavior.

Always correct in small steps
Always use gradual transitions
Always preserve realism
2. Behavior-based adaptation

Mission updates must depend on historical user behavior, not fixed one-size-fits-all rules.

3. Dual-mode discipline

The system must operate in two modes:

STRICT mode for habits where discipline matters
FLEXIBLE mode for learning where exact timing is uncertain
4. No emotional logic

Do not use motivational or emotional reasoning.
Use only structured, rule-based decisions.

5. Explainable and deterministic

Every output must be traceable to a clear logic path.

CORE MECHANICS TO IMPLEMENT
1. Progressive Correction System

The system must move the user gradually toward the ideal target.

Use this formula:

next_target = current + (ideal - current) × learning_rate

learning_rate rules:
severe failure → 0.1
moderate failure → 0.2
stable behavior → 0.3

Also include a maximum daily shift limit so correction never becomes too aggressive.

2. Task Classification System

Classify all tasks into two categories:

STRICT TASKS

Examples:

sleep timing
wake timing
deep work start

Rules:

no compromise
must be enforced consistently
these define discipline structure
FLEXIBLE TASKS

Examples:

learning
watching lectures
practice
revision-type study sessions

Rules:

allow buffer
estimate realistically
use actual_time = estimated × 1.5 to 2.0
do not assume exact completion time for learning tasks
3. Adaptive Mission Generator

The system must generate the next day’s mission based on behavioral state.

Supported states:
RECOVERY
STABLE
GROWTH
Behavior by state:
RECOVERY → reduce load, apply gentle correction
STABLE → maintain current level
GROWTH → slightly increase difficulty

The mission generator must use the user’s current state, not a fixed schedule only.

4. Behavior Learning System

Track and store these signals:

sleep patterns
task delays
completion rate
skip frequency
time-of-day performance

From these, derive:

resistance per task
energy map per hour
success probability per task/time slot

This learning system must continuously update from user behavior.

5. Smart Success Evaluation

Do not use binary completion only.

Use this rule:

if effort ≥ 70% → SUCCESS

This is necessary so the system rewards genuine effort and avoids unnecessary frustration.

6. Controlled Flexibility System

Flexibility is allowed only when all of the following are true:

effort is high
the task is important
the user is not repeatedly misusing flexibility

Flexibility must be blocked when:

avoidance is repeated
misuse patterns are detected
7. Controlled Sleep Compromise

Sleep reduction is allowed only under controlled conditions.

Allow it only if:
the task is high value
effort is genuine
it is not happening frequently
Rules:
minimum sleep limit must always exist
if sleep is reduced today, next day load must be reduced
the number of sleep compromises per week must be limited
8. Anti-Misuse System

If the user begins abusing flexibility:

gradually reduce flexibility
automatically increase strictness
protect the system from becoming permissive
9. Reinforcement System

After success:

provide calm reinforcing feedback
do not use over-excitement
do not use punishment tone

The goal is to make success feel stable, repeatable, and structural.

10. System Flow

The daily cycle must follow this exact sequence:

Read today’s data
Analyze behavior
Detect state: recovery / stable / growth
Apply correction logic
Generate next mission
Apply strict and flexible rules
Output a structured mission plan
OUTPUT FORMAT REQUIRED

Provide the design in the following structure:

1. Feature list

List all major system features clearly.

2. Module breakdown

Break the system into logical modules.

3. Logic of each module

Explain what each module does and how it works.

4. Data structures required

Define the core data structures the system needs.

5. Exact decision flow

Show how the engine moves from data input to mission output.

6. Step-by-step daily mission update logic

Explain how the mission changes from one day to the next.

RESTRICTIONS
Do not write code
Do not give vague advice
Do not skip important logic
Do not depend on AI APIs
Do not suggest paid tools
FINAL EXPECTATION

The final system should behave like:

a strict but intelligent coach
a gradual behavior corrector
a system that learns and adapts over time

It should not behave like:

a rigid rule engine
a motivational app
a punishment system
ONE-LINE PHILOSOPHY

“Do not force perfection. Evolve the user toward it using controlled, intelligent steps.”