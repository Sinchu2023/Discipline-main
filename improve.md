# Prompt Generator Workflow

This file explains the intended workflow for the generator section inside the Roadmap Console.

## Goal

The generator section is not supposed to directly create final plans inside the app.

It is supposed to generate strict prompt text that the user can copy and paste into another AI system such as ChatGPT or Gemini.

That external AI should then return output in one of two exact formats:

1. Roadmap JSON
2. `makeTask(...)` scheduler code

## Current UI Contract

There are exactly two helper cards:

1. `Generate Roadmap`
2. `Generate Task Format`

There is no timetable generator anymore.

## Roadmap Helper

### Purpose

This helper creates a prompt that asks another AI to return roadmap JSON only.

### User flow

1. User types a topic such as `Analog IC Design`.
2. User clicks `Generate Roadmap Prompt`.
3. App fills the roadmap output textarea with a strict prompt.
4. User clicks `Copy`.
5. User pastes that prompt into another AI.
6. Other AI returns valid JSON only.
7. User can then manually use that JSON as needed.

### Output rules for the external AI

The external AI must follow these rules:

1. Return valid JSON only.
2. Do not use markdown fences.
3. Do not add explanation text.
4. Use this structure:

```json
{
  "modules": [
    {
      "module": "MODULE NAME",
      "days": [
        { "day": 1, "topic": "Topic name", "status": "active" },
        { "day": 2, "topic": "Topic name", "status": "locked" }
      ]
    }
  ]
}
```

5. Day numbers must continue sequentially across modules.
6. Only day 1 may be `active`.
7. All other days must be `locked`.

## Task Format Helper

### Purpose

This helper creates a prompt that asks another AI to return exact scheduler code using `makeTask(...)`.

### User flow

1. User types a combined topic or study set such as `IB + Analog IC + Project Work`.
2. User clicks `Generate Task Prompt`.
3. App fills the task output textarea with a strict prompt.
4. User clicks `Copy`.
5. User pastes that prompt into another AI.
6. Other AI returns only the final `return [ ... ];` code block.

### Required final shape

The external AI must return only code in this exact shape:

```js
return [
  makeTask("TITLE", "FOCUS", [startHour, endHour], "HIGH", "STRICT", 120, "Morning", false, 10),
  makeTask("TITLE", "FOCUS", [startHour, endHour], "MEDIUM", "FLEXIBLE", 60, "Evening", true, 3),
];
```

### Strict rules for the external AI

1. Return code only.
2. Do not use markdown.
3. Do not add comments.
4. Do not add explanations.
5. Use only `makeTask(...)` lines inside one `return [ ... ];`.
6. Keep tasks in chronological order.
7. Use decimal hours such as `6.25` for 6:15 and `8.5` for 8:30.
8. Duration must be in minutes.
9. Priority must be one of:
   `HIGH`, `MEDIUM`, `LOW`
10. Discipline type must be one of:
   `STRICT`, `FLEXIBLE`
11. Phase must be one of:
   `Morning`, `Core Study`, `Breaks`, `Evening`
12. Optional flag must be `true` or `false`.
13. Score must be an integer.

### Reference style

The app uses this reference style in the generated prompt:

```js
return [
  makeTask("IB CORE", "CA + Reasoning + Quant", [4, 6.25], "HIGH", "STRICT", 135, "Morning", false, 17),
  makeTask("ANALOG SET 1", analog1Topic, [6.25, 8.25], "HIGH", "STRICT", 120, "Core Study", false, 11),
  makeTask("BREAK", "Break + Hydration", [8.25, 8.5], "LOW", "FLEXIBLE", 15, "Breaks", true, 1),
  makeTask("ANALOG SET 2", analog2Topic, [8.5, 10.5], "HIGH", "STRICT", 120, "Core Study", false, 11),
  makeTask("IB PRACTICE", "IB Practice", [10.5, 12], "MEDIUM", "FLEXIBLE", 90, "Morning", false, 14),
  makeTask("LUNCH", "Lunch", [12, 12.5], "LOW", "FLEXIBLE", 30, "Breaks", true, 1),
  makeTask("BUILD", "Project / Circuits", [12.5, 14.5], "MEDIUM", "FLEXIBLE", 120, "Core Study", false, 10),
  makeTask("ANALOG SET 3", analog3Topic, [14.5, 16.5], "HIGH", "STRICT", 120, "Core Study", false, 11),
  makeTask("IB REVISION", "IB Revision", [16.5, 17.5], "MEDIUM", "FLEXIBLE", 60, "Evening", false, 5),
  makeTask("ANALOG REVISION", analogRevisionTopic, [17.5, 18.5], "MEDIUM", "FLEXIBLE", 60, "Evening", false, 5),
  makeTask("DINNER", "Dinner", [18.5, 19], "LOW", "FLEXIBLE", 30, "Breaks", true, 1),
  makeTask("WEAK AREA REVIEW", "Weak-area review", [19, 20], "LOW", "FLEXIBLE", 60, "Evening", true, 4),
  makeTask("TRAINING", "Training", [20, 21], "MEDIUM", "FLEXIBLE", 60, "Evening", true, 3),
  makeTask("FINAL REVISION", "Final revision / recap", [21, 22], "MEDIUM", "FLEXIBLE", 60, "Evening", false, 3),
  makeTask("WIND DOWN", "Wind down", [22, 23], "LOW", "FLEXIBLE", 60, "Evening", true, 1),
  makeTask("REST", "Sleep", [23, 28], "HIGH", "STRICT", 300, "Evening", true, 2),
];
```

## Implementation Notes

### What the app should do

1. Accept user input topic text.
2. Generate a strict prompt.
3. Place the prompt into a readonly textarea.
4. Allow copy-to-clipboard.
5. Show a success or error message.

### What the app should not do

1. It should not directly call Gemini.
2. It should not ask for an API key.
3. It should not generate a timetable section.
4. It should not insert task schedules into the Roadmap Console automatically.

## Low-Level Model Safe Instructions

If a weaker model needs to work on this feature later, follow this exact order:

1. Do not add new generator types.
2. Keep only two cards in the UI.
3. First card is for roadmap prompt generation.
4. Second card is for `makeTask(...)` prompt generation.
5. Keep both outputs inside readonly textareas.
6. Keep both copy buttons working.
7. Do not restore API-key input.
8. Do not restore timetable rendering.
9. Do not make the helper directly call any external AI API.
10. If changing the task-format prompt, preserve the exact `makeTask(...)` signature and reference example.
