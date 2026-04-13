# Generator + Roadmap + Mission Handoff

This file is a handoff for another model or engineer to continue work on this repo without having to rediscover the current state.

The target reader is a low-level model. Keep implementation decisions aligned with this file unless the user explicitly asks to change them.

## Project Context

This app is a vanilla HTML/CSS/JS single-page app.

The active runtime is mainly in:

- `index.html`
- `assets/css/app.css`
- `assets/js/app.js`

The user is actively working on the trainer / roadmap / mission area inside the trainer modal.

## What The User Wants

The user wants:

1. A roadmap generator flow in the web UI
2. A task-format generator flow in the web UI
3. External AI to generate the final roadmap JSON and final `makeTask(...)` code
4. The user to paste the external AI result back into the web app
5. The app to apply that data per Google account
6. `Daily Mission` to actually follow the saved task plan

The user does **not** want:

1. A timetable generator
2. A Gemini API key input
3. Large explanatory helper text in the generator area
4. Shared personal mission defaults like the earlier IB/Analog-specific schedule

## Current UI State

Inside the trainer modal there is a compact collapsible section:

- `Structured Generators`

It is implemented as a native HTML disclosure:

- `<details class="generator-panel" id="generator-panel">`
- `<summary class="generator-panel-head" id="generator-panel-toggle">`

Clicking that header opens and closes the whole generator section.

Inside it there are two cards:

1. `Roadmap`
2. `Task Format`

### Roadmap card

Current elements:

- input: `#ai-roadmap-topic`
- prompt output: `#ai-roadmap-output`
- pasted response box: `#ai-roadmap-response`
- buttons:
  - `#generate-roadmap-btn`
  - `#copy-roadmap-prompt-btn`
  - `#apply-roadmap-response-btn`
- status: `#ai-roadmap-status`

### Task Format card

Current elements:

- input: `#ai-task-topic`
- prompt output: `#ai-task-output`
- pasted response box: `#ai-task-response`
- buttons:
  - `#generate-task-prompt-btn`
  - `#copy-task-prompt-btn`
  - `#save-task-response-btn`
- status: `#ai-task-status`

The task input is now only optional extra context. It is no longer the main source of truth.

## Current Data Flow

### Roadmap flow

1. User types a roadmap topic
2. User clicks `Prompt`
3. App generates a strict prompt text for another AI
4. User copies it
5. User pastes it into another AI
6. Other AI returns roadmap JSON
7. User pastes roadmap JSON into `#ai-roadmap-response`
8. User clicks `Apply`
9. App parses the JSON and writes it into `CONFIG.STORAGE_KEYS.ROADMAP_STATE`
10. Roadmap UI updates

### Task flow

1. User applies a roadmap first
2. User clicks task `Prompt`
3. App generates a strict prompt for another AI
4. That task prompt includes roadmap context
5. User copies it
6. User pastes it into another AI
7. Other AI returns final `return [ makeTask(...), ... ];` code
8. User pastes that code into `#ai-task-response`
9. User clicks `Save`
10. App validates and parses the code
11. App saves that task plan draft per user
12. `Daily Mission` updates immediately from the parsed task plan

## Per-User Behavior

Roadmap and task drafts are now intended to be user-specific per Google account.

This is handled through Firebase user doc fields and local storage sync.

### Important storage keys

Defined in `CONFIG.STORAGE_KEYS`:

- `ROADMAP_STATE`
- `ROADMAP_PROMPT_DRAFT`
- `ROADMAP_RESPONSE_DRAFT`
- `TASK_PROMPT_DRAFT`
- `TASK_RESPONSE_DRAFT`

### Firebase user document fields currently synced

In `bootstrapUserData()` / `syncByStorageKey()` the following drafts are tied to the signed-in user:

- `roadmapPromptDraft`
- `roadmapResponseDraft`
- `taskPromptDraft`
- `taskResponseDraft`

This means different Google accounts should have different roadmap/task draft text.

## Current Mission Logic

### Important rule

`Daily Mission` must follow the saved task plan first.

This is now done in `getDailyMissionTasks()`.

Current order is:

1. parse saved user task code from `TASK_RESPONSE_DRAFT`
2. if parsing succeeds and tasks exist, use those tasks
3. otherwise fall back to the common default mission schedule

### Parsing logic

The task code parser currently lives in:

- `splitTaskFunctionArgs()`
- `parseTaskValueToken()`
- `parseTaskWinToken()`
- `parseTaskPlanCode()`

It extracts:

- label
- focus/topic
- time window
- priority
- discipline type
- duration
- phase
- secondary flag
- score weight

The parser expects final usable code.

### Very important constraint

The parser works best when the external AI returns real quoted strings for topics.

Good:

```js
makeTask("ANALOG SET 1", "Important Concepts of MOS Physics", [6.25, 8.25], "HIGH", "STRICT", 120, "Core Study", false, 11)
```

Bad:

```js
makeTask("ANALOG SET 1", analog1Topic, [6.25, 8.25], "HIGH", "STRICT", 120, "Core Study", false, 11)
```

The prompt generator was updated to explicitly tell the external AI:

- use real quoted strings
- do not use placeholders like `analog1Topic`

## Roadmap-To-Task Relationship

The task prompt must follow the roadmap.

This is handled by:

- `buildTaskPromptRoadmapContext()`
- `buildTaskPromptSpec()`

Current behavior:

1. `buildTaskPromptRoadmapContext()` reads the active roadmap
2. It extracts:
   - the current active roadmap day
   - pending roadmap topics from modules
3. `buildTaskPromptSpec()` injects that roadmap context into the generated prompt
4. The prompt tells the external AI:
   - roadmap alignment is mandatory
   - do not invent an unrelated schedule
   - use roadmap topics as the primary source of task focus

Also:

- task prompt generation should refuse to run if no roadmap exists
- current message is: `Apply a roadmap first.`

## Default Shared Content

The old personal defaults were removed.

The user did not want the previous common default mission to be:

- IB-specific
- Analog-specific
- personal schedule-like

### Default roadmap template

The common default roadmap is now simpler and generic:

- `MODULE 1 - FOUNDATIONS`
- `MODULE 2 - CORE LEARNING`
- `MODULE 3 - PRACTICE`
- `MODULE 4 - BUILD AND REVIEW`

### Default mission fallback

If no saved task plan exists, the common fallback mission uses easier generic blocks like:

- `START`
- `FOCUS BLOCK 1`
- `BREAK`
- `FOCUS BLOCK 2`
- `PRACTICE`
- `LUNCH`
- `BUILD`
- `REVIEW`
- `WALK`
- `WEAK AREA`
- `DINNER`
- `LIGHT RECAP`
- `WIND DOWN`
- `REST`

These are in `getDailyMissionTasks()`.

## Roadmap Apply Path

The roadmap apply path currently works like this:

1. `applyRoadmapResponse()` reads `#ai-roadmap-response`
2. Strips code fences
3. Parses JSON
4. Converts it to internal roadmap structure:
   - `modules`
   - `days`
   - `completed: false`
5. Saves to `ROADMAP_STATE`
6. Refreshes trainer/mission UI

This path should be preserved.

## Current Compact UI Requirement

The user wanted the generator area to consume less space.

So the section was compacted:

- smaller header
- smaller subtitle
- smaller cards
- reduced padding
- no big example `<pre>` blocks
- shorter prompt/response textareas

Do not reintroduce bulky helper text or large example blocks unless the user explicitly asks for it.

## Current Trainer Modal Requirement

The roadmap console was made taller.

Relevant CSS changes include:

- trainer modal larger height
- trainer content larger height
- trainer terminal larger height

Do not shrink it back unless the user asks.

## Mojibake / Broken Character Cleanup

Some earlier edits introduced broken encoded characters in user-visible strings.

Visible areas already cleaned:

- roadmap time ranges now use ` - `
- roadmap state labels now use ASCII-safe text:
  - `[DONE]`
  - `[OPEN]`
  - `[LOCKED]`
- several visible broken separators were replaced with `-` or `|`

There may still be non-user-critical mojibake left in comments or old strings.

If continuing cleanup:

1. prioritize user-visible strings
2. prefer ASCII-safe output
3. avoid introducing emoji or fancy punctuation

## What Still Matters Most

If another model continues from here, preserve these priorities:

1. Roadmap is applied from pasted JSON
2. Task plan is applied from pasted `makeTask(...)` code
3. `Daily Mission` follows saved task code first
4. Task prompt must follow roadmap context
5. All drafts are user-specific per Google account
6. Generator section remains compact
7. Generator section remains collapsible

## If You Need To Debug Why Mission Does Not Update

Check these in order:

1. Was roadmap JSON actually applied through `Apply`?
2. Did task code get pasted into `#ai-task-response`?
3. Did `saveTaskResponse()` reject parsing?
4. Does `parseTaskPlanCode()` successfully extract `makeTask(...)` entries?
5. Are task topics real quoted strings, not variable placeholders?
6. Is `getDailyMissionTasks()` returning parsed task plan before fallback default?
7. Is `syncMissionFromRoadmap()` being called after save/apply?

## Low-Level Model Rules

If a weak model modifies this area later, follow these exact rules:

1. Do not add API-key-based AI calls
2. Do not restore timetable generator
3. Do not make task prompt independent from roadmap
4. Do not let task prompt run without a roadmap
5. Do not treat saved task code as plain text only; it must affect mission behavior
6. Do not make roadmap/task drafts shared globally across accounts
7. Do not add large explanatory UI blocks unless the user asks
8. Keep the generator section compact and collapsible
9. Prefer ASCII-safe UI text
10. Preserve the current web-only flow:
    - generate prompt
    - copy
    - paste into external AI
    - paste result back into web app
    - apply/save
