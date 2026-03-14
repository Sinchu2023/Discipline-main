# Modules

The app is now organized by workflow and bounded contexts:

- `/core`: central state manager and shared app state access.
- `/execution`: Execution Mode helpers (focus builder, quick presets).
- `/shadow-engine`: shadow summary and advanced analysis adapters.
- `/trainer`: recommendation generation logic.
- `/analytics`: long-term insights and KPI synchronization.
- `/ui`: Mission Control-first shell navigation and progressive disclosure.
- `/services`: orchestration and state synchronization between modules.

Legacy engine logic remains in `assets/js/app.js` to preserve current timer behavior and all existing mechanics.
