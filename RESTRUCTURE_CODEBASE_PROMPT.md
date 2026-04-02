# Codebase Restructure Prompt

Use this prompt exactly as the implementation brief for restructuring this repository.

## Prompt

You are working inside the repository `Discipline-main`, a vanilla HTML/CSS/JavaScript web app for discipline tracking, sleep tracking, streaks, analytics, SHADOW engine logic, Firebase auth/sync, trainer logic, and flow protocol features.

Your job is to fully restructure the codebase for maintainability, separation of concerns, security hardening, and removal of dead or unwanted code, while preserving behavior.

This is not a superficial cleanup. You must do a disciplined end-to-end refactor.

## Non-Negotiable Goal

Produce a cleaner, safer, modular codebase with:

- separated CSS files by domain or component where appropriate
- separated JavaScript files by responsibility
- reduced inline logic in `index.html`
- removed dead code, duplicate code, temporary files, extraction leftovers, and unused helper scripts if they are not part of the runtime product
- improved security posture for DOM updates, storage use, Firebase integration, and data parsing
- preserved user-visible behavior unless a change is required for safety or correctness

## Repository Context

Current repository contains at least these important paths:

- `index.html`
- `app.js`
- `firebase-service.js`
- `google-auth.js`
- `update-check.js`
- `assets/css/app.css`
- `assets/js/app.js`
- `analytics/`
- `config/`
- `core/`
- `execution/`
- `modules/`
- `services/`
- `shadow-engine/`
- `trainer/`
- `ui/`
- `ARCHITECTURE.md`
- `README.md`
- `COMPLETE_TECHNICAL_DOCUMENTATION.md`
- temporary or analysis-oriented files like `tmp-inline.js`, `extracted.js`, `extract.py`, `extract_js.py`, `find_mission_funcs.py`, `found_functions.txt`, `functions_list.txt`, `unused_funcs.py`, `check_usage.py`, `check_all_usage.py`, `fix-heatmap.js`

Assume the app currently has mixed concerns, legacy leftovers, inline logic, and possibly dead code.

## Hard Constraints

1. Do not change behavior intentionally unless:
   - fixing a bug
   - removing dead code
   - improving security
   - replacing unsafe DOM logic with safe equivalents

2. Do not delete any file until you have verified:
   - it is not imported or referenced
   - it is not part of runtime behavior
   - it is not needed for deployment

3. Before deleting anything, search all references using fast repository search.

4. Keep all storage keys, Firebase data contracts, and user data semantics stable unless there is a clear security issue.

5. If a large monolithic file exists, split it incrementally into modules with explicit imports and exports.

6. If `index.html` contains inline CSS or inline JS, migrate them into external files where feasible.

7. Preserve existing visual design unless the code needs restructuring for proper separation.

8. Avoid adding libraries unless absolutely necessary.

9. Prefer vanilla JavaScript modules.

10. The final result must still run as a static web app with the current project style.

## Primary Objectives

### 1. Structural Refactor

Restructure the app into clear areas such as:

- `core/` for bootstrap, app state, config loading, storage keys, shared utilities
- `services/` for Firebase, auth, sync, import/export, persistence, remote APIs
- `ui/` for DOM rendering, event wiring, modals, view updates
- `analytics/` for reporting, charts, trend calculations
- `shadow-engine/` for SHADOW calculations and rules
- `trainer/` for roadmap and training logic
- `execution/` or `modules/` for stopwatch, task lifecycle, flow protocol, business workflows
- `assets/css/` split by feature if justified

If existing directories are underused or inconsistent, normalize them instead of adding random new folders.

### 2. Security Hardening

Audit and improve:

- unsafe `innerHTML` usage
- HTML injection risks from task descriptions, imported content, or cloud-synced values
- unsafe prompt-derived strings rendered to DOM
- data import parsing and validation
- Firebase auth and sync flows
- localStorage parsing robustness
- null and malformed payload handling
- event listener duplication
- hidden trust in imported JSON/CSV fields

Replace unsafe patterns with safer alternatives such as:

- `textContent`
- explicit element creation
- escaping helpers only when necessary
- schema validation before persistence or rendering

### 3. Dead Code and Unwanted Code Removal

Identify and remove:

- orphan utility scripts
- extraction leftovers
- duplicated functions
- stale debug code
- temporary analysis files not needed by the product
- commented-out obsolete blocks
- unused managers, helpers, constants, and variables

Be careful not to remove future-use files if they are actually wired in.

### 4. CSS Separation

Split CSS only when it improves clarity. Example areas:

- base
- layout
- components
- dashboard
- task-tracker
- modals
- auth
- charts
- shadow-engine
- trainer
- responsive

Do not split into too many tiny files with meaningless boundaries.

### 5. JavaScript Separation

Split logic into focused files, for example:

- app bootstrap
- config/constants
- storage helpers
- task model normalization
- stopwatch manager
- task manager
- graph manager
- UI manager
- event manager
- auth service
- Firebase sync service
- analytics/report builders
- shadow engine
- trainer engine
- flow engine

Keep file names descriptive and responsibilities narrow.

## Required Workflow

Follow these steps in order.

### Step 1. Inventory

- inspect the full repo tree
- identify runtime files versus tooling leftovers
- identify all script/style references from `index.html`
- identify inline CSS and inline JS
- identify all global classes and managers
- map current dependencies between files

### Step 2. Safety Map

Create a dependency map of:

- entrypoints
- imported modules
- global browser dependencies
- Firebase dependencies
- Chart.js usage
- DOM ids and UI sections
- storage keys

Do not begin deleting before this map is clear.

### Step 3. Dead Code Detection

Search for:

- unreferenced functions
- unreferenced files
- duplicate logic blocks
- temporary extraction artifacts
- debug print statements
- commented code blocks that no longer matter

Only remove after confirming they are unused.

### Step 4. Security Review

Inspect every place where data enters the app:

- user task input
- import file parsing
- Firebase payloads
- localStorage recovery
- URL or query params if any

For each input path:

- validate shape
- normalize fields
- reject malformed data safely
- render safely

### Step 5. Modularization Plan

Before editing, define the target module layout.

The layout must specify:

- each file to create
- what responsibility it owns
- what it exports
- what imports it depends on
- which legacy code moves there

### Step 6. Refactor Implementation

Implement in small safe stages:

1. extract constants and helpers
2. extract services
3. extract engines
4. extract UI/render modules
5. extract event wiring
6. shrink `index.html`
7. split CSS if justified
8. remove dead files last

After each stage, verify references and runtime consistency.

### Step 7. Verification

Verify all of the following:

- page loads
- stopwatch works
- task creation works
- task deletion works
- sleep tracking works
- streak updates correctly
- charts still render
- auth does not break
- sync still works
- import/export still works
- SHADOW section still works
- trainer section still works
- flow logic still initializes
- no missing selectors
- no missing script imports
- no duplicate listeners

### Step 8. Documentation

Update documentation so the new architecture is obvious.

At minimum update:

- `ARCHITECTURE.md`
- `README.md`

Include:

- final folder structure
- runtime entrypoints
- module ownership
- where to add new UI, CSS, services, and engines

## Code Quality Rules

- Prefer small pure functions for computation.
- Keep DOM reads and writes localized to UI modules.
- Keep business rules out of rendering code.
- Avoid giant god-classes.
- Prefer named exports if they improve clarity.
- Normalize imported and persisted data in one place.
- Avoid repeated queries for the same DOM nodes where practical.
- Guard all async calls with proper error handling.
- Do not silently swallow critical errors.

## Security Rules

- Never render user-controlled text via raw `innerHTML`.
- Sanitize or avoid HTML generation from task descriptions and imported content.
- Validate imported JSON and CSV before merging into app state.
- Validate Firebase documents before trusting fields.
- Avoid exposing sensitive config handling beyond what the current static app requires.
- Use defensive parsing for localStorage and remote payloads.
- Avoid accidental global state mutation from unrelated modules.

## Required Deliverables

When finished, produce:

1. the refactored code
2. a concise summary of architectural changes
3. a list of deleted files with reason for each deletion
4. a list of security fixes made
5. a list of behavior checks performed
6. any residual risks or follow-up items

## Required Output Format

At the end, output exactly these sections in this order:

1. `Findings`
2. `Refactor Plan Applied`
3. `Files Added`
4. `Files Changed`
5. `Files Removed`
6. `Security Improvements`
7. `Verification`
8. `Residual Risks`

## Important Execution Notes

- Do not rush into code edits before understanding dependencies.
- Do not keep obsolete extraction artifacts if they are provably unused.
- Do not leave the codebase half modular and half duplicated.
- Do not preserve unsafe code just because it currently works.
- Do not invent architecture that ignores the current folder layout.
- Favor a practical final structure over theoretical perfection.

Your standard is: a lower-capability model following this prompt should still be able to perform a disciplined, repo-specific, security-conscious restructuring with minimal ambiguity.
