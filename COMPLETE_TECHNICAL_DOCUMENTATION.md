# Technical Documentation

## Runtime Overview
- `index.html`: static shell markup.
- `assets/css/app.css`: extracted styling.
- `assets/js/app.js`: single runtime entrypoint and single source of truth.
- `firebase-service.js`: Firebase bootstrap and helpers.
- `google-auth.js`: Google auth flow.
- `update-check.js`: optional deployment banner.

## Current Architecture
- The application currently runs from one main runtime file: `assets/js/app.js`.
- Earlier sidecar runtime modules were removed because they duplicated behavior and created split-brain maintenance risk.
- Empty domain folders may remain for future structured extraction, but they are not part of the current runtime.

## Major Runtime Areas Inside `assets/js/app.js`
- Configuration/constants
- Activity normalization and classification
- Local storage persistence
- Firebase cloud manager
- Stopwatch manager
- Task manager
- Analytics/reporting
- SHADOW engine
- Trainer/roadmap engine
- Flow protocol engine
- Graph manager
- Event wiring and app bootstrap

## Data Contracts
- Existing local storage keys are preserved.
- Existing Firebase document semantics are preserved.
- Task, roadmap, flow, trainer, and SHADOW state semantics are preserved.

## Security Notes
- Task and favorite labels are escaped before HTML rendering.
- Report labels and dynamic summary values are escaped before interpolation.
- Malformed local storage payloads are cleared defensively.
- Oversized import files are rejected.
- Non-object JSON import entries are ignored before normalization.

## Known Architectural Debt
- `assets/js/app.js` remains large and should be split only by moving complete domain slices, not by introducing duplicate partial runtime modules.
- Some UI rendering still uses `innerHTML`; user-controlled fields on the active paths were escaped, but a future DOM-construction refactor would be safer.

## Recommended Next Refactor
1. Extract one complete domain at a time from `assets/js/app.js`.
2. Keep one active source of truth during each extraction.
3. Verify browser behavior after each extraction step.
