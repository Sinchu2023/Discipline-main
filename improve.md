### Instruction:
You are tasked with refactoring a monolithic web application (single index.html containing HTML, CSS, and JavaScript) into a clean, modular architecture. The refactor must preserve 100% functional and visual equivalence. No change in output, behavior, or user experience is allowed.

### Objective:
Improve internal structure, maintainability, and debuggability while ensuring that small errors are isolated and cannot propagate into larger failures.

---

### Phase 1: Planning (MANDATORY — DO NOT SKIP)
1. Read and analyze:
   - ARCHITECTURE.md
   - firebase-service.js
   - app.js
   - core/ and services/ directories

2. Identify and map:
   - All classes inside index.html (with approximate line references)
   - CONFIG block
   - Script execution order and dependencies

3. Produce:
   - A clear implementation plan
   - A dependency/load-order map

4. STOP and wait for approval before proceeding.

---

### Phase 2: Task Tracking
Create a task.md file containing a complete checklist of all refactoring steps. Update it as tasks are completed.

---

### Phase 3: CSS Extraction
1. Extract all <style> content into:
   → styles/main.css

2. Update index.html:
   - Remove inline styles
   - Add:
     <link rel="stylesheet" href="styles/main.css">

Constraint:
- No visual changes allowed.

---

### Phase 4: Configuration & Constants Extraction
1. Extract CONFIG object into:
   → js/config.js

2. Extract the following into:
   → js/constants.js
   - ANALOG_IC_ROADMAP_TEMPLATE
   - MISSION_THRESHOLDS
   - CATEGORY_DEFINITIONS
   - CATEGORY_ALIASES
   - PRODUCTIVE_CATEGORIES
   - MOTIVATION_LINES
   - STREAK_MESSAGES

Constraint:
- Preserve exact values and structure.

---

### Phase 5: Class Modularization (One File Per Class)

Extract each class into its own file:

- ActivityClassifier → js/activity-classifier.js
- SyncManager → js/sync-manager.js
- FirebaseCloudManager → js/firebase-cloud-manager.js
- DisciplineTracker → js/discipline-tracker.js
- StopwatchManager → js/stopwatch-manager.js
- TaskManager → js/task-manager.js
- AnalyticsService → js/analytics-service.js
- UIManager → js/ui-manager.js
- ShadowEngine → js/shadow-engine.js
- TrainerEngine → js/trainer-engine.js
- FlowProtocolEngine → js/flow-protocol-engine.js
- GraphManager → js/graph-manager.js
- EventManager → js/event-manager.js

Additional:
- TrainerRecommendationEngine → js/trainer-recommendation-engine.js

Constraints:
- Do NOT modify internal logic
- Preserve method signatures and behavior
- Keep classes globally accessible (no module system)

---

### Phase 6: Script Wiring

Replace inline <script> with ordered script includes in index.html:

Order (STRICT):
1. js/config.js
2. js/constants.js
3. helper files (if any)
4. manager/class files
5. js/boot.js

Constraints:
- DO NOT use type="module"
- Maintain correct dependency order

---

### Phase 7: Bootstrapping

Create:
→ js/boot.js

Move application initialization logic:
- Example:
  window.app = new DisciplineTracker();

Keep boot logic minimal and isolated.

---

### Phase 8: Error Containment & Stability

Enhance robustness WITHOUT altering outputs:

1. Wrap each class initialize() in try/catch
2. Add null guards for:
   - this.app
   - this.app.elements

3. Add structured console logging:
   - Use console.group per class initialization

4. Prevent silent failures and cascading errors

Constraint:
- No behavioral change visible to user

---

### Phase 9: Verification (STRICT)

Validate all of the following:

1. Application loads with zero console errors
2. UI and behavior are identical

Test flows:
- Stopwatch start/stop
- Task creation
- Favorites handling
- Shadow engine refresh
- Roadmap generation

If ANY deviation is detected:
→ Identify cause
→ Fix without altering intended functionality

---

### Rules (CRITICAL)

- ZERO change in output (strict equivalence required)
- NO feature additions or removals
- NO logic rewrites unless required for structural isolation
- DO NOT introduce frameworks or external dependencies
- Maintain global scope compatibility

---

### Expected Result:

A modular, well-structured codebase that:
- Produces identical results
- Is easier to debug and maintain
- Prevents accumulation of small errors
- Has clear separation of concerns