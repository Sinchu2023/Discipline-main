# Change Rules

This file is for future code changes in this repo.

Main rule:

- The active runtime source of truth is `assets/js/app.js`
- Do not change one display section alone if its data is shared with other sections
- If one helper function changes, all connected UI sections must be checked

## 1. Main Source Of Truth

- Runtime logic: `assets/js/app.js`
- App shell: `index.html`
- Styling: `assets/css/app.css`

If you change runtime behavior, change `assets/js/app.js` first.

## 2. Date Rules

There is one important date rule:

- Task day must come from `startTime`
- Canonical task day is built in `normalizeTask()`
- Day cutoff uses `CONFIG.SHADOW_DAY_CUTOFF_HOUR`

If you change any of these:

- `normalizeTask()`
- `getDateString()`
- `getActiveDayEnd()`
- `getShadowDayDate()`

You must also check:

- top day stats
- SHADOW Buddy values
- graph values
- 365 heatmap values
- task list day grouping
- streak logic

## 3. Task Data Rules

Most values depend on `this.app.state.tasks`.

If you change:

- task creation
- task edit
- task import
- task sync
- task normalization

You must also check:

- `TaskManager.updateStats()`
- `TaskManager.refreshViews()`
- `GraphManager.updateCharts()`
- `ShadowEngine.refresh()`

## 4. SHADOW Rules

Important SHADOW helpers:

- `getDailyProductiveMap()`
- `computeRollingMetrics()`
- `getHistoricalLockedShadowMap()`
- `getHistoricalBattleTargetMap()`
- `countShadowWinsThisMonth()`
- `resolveLockedShadowAverage()`
- `commitLockedShadowAverage()`

If you change `getDailyProductiveMap()`:

- also check:
  - graph shadow line
  - SHADOW Buddy
  - heatmap
  - monthly battle
  - win ladder

If you change `computeRollingMetrics()`:

- also check:
  - `shadow-current-minutes`
  - `shadow-average`
  - momentum block
  - rank logic
  - pressure logic

If you change `getHistoricalLockedShadowMap()`:

- also check:
  - `shadow-average`
  - graph shadow line
  - any locked daily SHADOW value

If you change `getHistoricalBattleTargetMap()`:

- also check:
  - 365 heatmap cell target
  - 365 heatmap win/loss
  - monthly battle
  - win ladder

## 5. Graph Rules

Important graph helpers:

- `getFilteredMinutesForDate()`
- `buildProductivitySummary()`
- `getProductivityData()`
- `buildRollingShadowAverageMap()`
- `buildShadowSeries()`
- `updateGraphKpis()`
- `updateCharts()`

If you change `getFilteredMinutesForDate()`:

- also check:
  - productivity graph
  - productivity KPI cards
  - total counter

If you change `buildRollingShadowAverageMap()` or `buildShadowSeries()`:

- also check:
  - graph shadow line
  - SHADOW Buddy expected relationship

If you change `updateCharts()`:

- also check:
  - heatmap refresh
  - KPI updates
  - chart range changes

## 6. 365 Heatmap Rules

Important heatmap helper:

- `renderGithubHeatmap()`

Current rule:

- heatmap does not read Shadow Buddy DOM text
- heatmap uses task history plus SHADOW target helpers

If you change `renderGithubHeatmap()`:

- also check:
  - SHADOW day grouping
  - future cells should not become active streak cells
  - current streak highlight
  - best streak highlight
  - tooltip values
  - monthly battle alignment

## 7. Momentum Rules

Important helpers:

- `getMomentum()`
- momentum render block in `ShadowEngine.render()`

If you change momentum text:

- do not add delta in both places
- delta must be formatted once only

## 8. Mission Rules

Important helpers:

- `getTodayGoalProgress()`
- `calculateMissionScore()`
- checklist score update logic

If you change mission score logic:

- also check:
  - `shadow-mission-score`
  - pressure logic
  - rank logic
  - trainer mission display

## 9. Safe Change Process

Before changing logic:

1. Identify the source helper
2. Find all call sites with `rg`
3. Find all DOM ids updated by that helper
4. Change the helper
5. Check all connected sections
6. Run syntax check

Recommended command:

```powershell
node --check assets/js/app.js
```

## 10. Required Manual Checks After Logic Changes

After any non-trivial change, manually verify:

- top day stats
- SHADOW Buddy
- momentum block
- productivity graph
- graph shadow line
- 365 heatmap
- monthly battle
- win ladder
- mission score

## 11. Sync Error Checks

These are known high-risk mismatch errors.

After changing any date, SHADOW, graph, or heatmap logic, always check:

- `Shadow Buddy` baseline value
- graph today shadow value
- 365 heatmap tooltip `Shadow` value
- 365 heatmap tooltip `Win Target` value
- top day productivity value

Expected relationship:

- `Shadow Buddy` must match graph today shadow baseline
- `Shadow Buddy` must match 365 tooltip `Shadow`
- 365 tooltip `Win Target` must be `Shadow + 1 minute`
- top day productivity is allowed to be different from Shadow Buddy
  - because top day productivity is today's completed productive minutes
  - Shadow Buddy is a derived baseline value

If these fail:

- do not patch text only
- check date grouping first
- check whether one path uses `task.date` and another uses `startTime`
- check whether one path uses current day and another uses previous locked day
- check whether one path uses baseline and another uses win target

Known bad mismatch examples:

- Buddy `1h 10m`, graph `1h 03m`, heatmap `1h 04m`
- future heatmap cells turning white
- same task counted into different days across sections
- momentum delta shown twice

Required debug order:

1. `normalizeTask()`
2. `getDateString()`
3. `getShadowDayDate()`
4. `getDailyProductiveMap()`
5. `getHistoricalLockedShadowMap()` or equivalent baseline helper
6. `getHistoricalBattleTargetMap()`
7. `buildRollingShadowAverageMap()`
8. `renderGithubHeatmap()`
9. `ShadowEngine.refresh()`

## 12. Strong Rule

Do not patch only the displayed text if the bug is data-related.

Always fix the helper or shared calculation first.
