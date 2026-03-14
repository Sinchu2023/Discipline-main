# Shadow System Architecture Refactor Plan

## 1) Current Architectural Problems
- HTML previously mixed structure, CSS, and JS in one file.
- Large script contained UI, business logic, storage, analytics, and orchestration in one place.
- Module boundaries existed by class naming, but not by file boundaries.
- Tight coupling to DOM ids made testing and debugging difficult.

## 2) Improved Architecture
- `Discipline.html`: primary app shell and mounting points.
- `assets/css/app.css`: all styles.
- `assets/js/app.js`: all runtime logic (behavior preserved).
- Future phased migration:
  - Move bootstrap/state/event bus to `modules/core/`.
  - Move render managers to `modules/ui/`.
  - Move engines/rules to `modules/logic/`.
  - Move storage/sync/import-export to `modules/services/`.

## 3) Integration Strategy
- Single app controller remains the integration point.
- All feature modules communicate through app state and explicit manager methods.
- Keep storage keys and existing feature contracts unchanged during migration.

## 4) Performance/Maintainability Improvements
- Reduced HTML parse/maintenance complexity by externalizing style/script.
- Enables browser caching for CSS/JS assets.
- Prepares codebase for incremental modular extraction without feature breakage.

## 5) Next Upgrades Suggested
- Introduce event bus (pub/sub) for inter-module coordination.
- Add unit tests for analytics, penalty, and anti-sandbag logic.
- Add linting/formatting and CI checks.
- Split `app.js` by domain classes into module files with ES module imports.
