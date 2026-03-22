You are an expert senior software architect and performance engineer.

Your task is to perform a deep static audit of a modular JavaScript codebase and identify hidden architectural issues, performance bottlenecks, and long-term scalability risks.

### CONTEXT:
- The codebase is already modularized (js/ directory structure).
- It is a frontend-heavy app using:
  - localStorage for persistence
  - Firebase for sync
  - Multiple services (GraphManager, ShadowEngine, AnalyticsService, etc.)
- The app tracks tasks and performs analytics (daily/weekly stats, streaks, graphs).

---

### OBJECTIVE:
Identify **non-obvious, high-impact issues** that may not break immediately but will degrade performance, maintainability, or correctness over time.

---

### ANALYSIS REQUIREMENTS:

1. **Performance Analysis**
   - Detect nested loops, repeated iterations, redundant computations
   - Identify O(n²), O(n log n), or unnecessary full-array scans
   - Flag synchronous blocking operations (e.g., JSON.stringify, DOM updates)

2. **State Management Issues**
   - Look for:
     - Unbounded growth
     - Mutation risks
     - Lack of normalization
   - Identify "multiple sources of truth"

3. **Data Integrity Risks**
   - Missing validation
   - Corruptible data structures
   - NaN propagation risks
   - Schema inconsistency

4. **Concurrency & Sync Problems**
   - Race conditions (local vs Firebase)
   - Overwrites
   - Lack of conflict resolution (CRDT patterns, timestamps, etc.)

5. **DOM & UI Fragility**
   - Hardcoded selectors
   - Missing element handling
   - Tight coupling between logic and UI

6. **Architecture & Design Flaws**
   - Violations of separation of concerns
   - Tight coupling between modules
   - Redundant logic across services
   - Lack of central computation layer

7. **Scalability Risks**
   - What breaks at:
     - 1,000 tasks
     - 10,000 tasks
     - Multi-device usage
   - Memory + CPU impact

---

### OUTPUT FORMAT (STRICT):

For each issue:

1. **Issue Title**
2. **Root Cause**
3. **Where it occurs (module / pattern)**
4. **Why it is dangerous (technical explanation)**
5. **Real-world failure scenario**
6. **Recommended Fix (practical + scalable)**
7. **Severity Level (Low / Medium / High / Critical)**

---

### EXTRA REQUIREMENTS:

- Focus on **deep issues**, not superficial linting
- Avoid generic advice
- Prioritize **real-world failure conditions**
- Suggest **production-grade fixes**, not hacks

---

### BONUS (Optional but Valuable):

- Suggest architectural improvements (e.g., caching layer, memoization, state indexing)
- Identify opportunities for:
  - IndexedDB migration
  - Web Workers
  - Data normalization
  - Event-driven design

---

Act like you are reviewing a production app expected to scale to thousands of users and large datasets.
Be precise, critical, and practical.