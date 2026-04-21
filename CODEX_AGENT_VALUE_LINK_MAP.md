# Discipline Tracker - Value Dependency Map

## Agent Name
Codex Agent - Value Link Analyzer

## Source Of Truth Files

1. **assets/js/app.js** - Main runtime file (8663 lines)
   - Contains all application logic
   - All other files depend on data from here

2. **localStorage** - Local persistence
   - `discipline_tracker_tasks` - All task entries
   - `discipline_tracker_shadow_avg` - Shadow 7-day average
   - `discipline_tracker_shadow_engine_state` - Rank progress, training camp
   - `discipline_tracker_trainer_state` - Mission state
   - `discipline_tracker_roadmap_state` - Roadmap data

3. **Firebase Cloud** - Remote persistence (when signed in)
   - Syncs tasks, favorites, shadow average, trainer state, roadmap

---

## Global Rules

1. **Source of Truth for Displayed Values**: `app.state.tasks` array
   - All time calculations filter from this array
   - Task properties: `date`, `category`, `subcategory`, `duration`, `startTime`, `endTime`

2. **Shadow Average Source**: Two sources exist:
   - `shadowEngine.shadowSevenDayAverage` (memory)
   - `localStorage[CONFIG.STORAGE_KEYS.SHADOW_AVG]` (persisted)
   - Both must stay in sync via `saveToStorage()`

3. **Refresh Trigger Chain**:
   - Task added/deleted → `taskManager.refreshViews()` → `updateStats()` → `shadowEngine.refresh()` → `graphManager.updateCharts()`

4. **Category Definitions**:
   - Productive: "Productive Work", "Physical Training", "Study / Skill Development"
   - Sleep: "Sleep"
   - Distraction: "Time Waste / Distraction"
   - Neutral: "Miscellaneous"

---

## Value Dependency Map

### 1. STOPWATCH DISPLAY

| UI ID | Source Function | Where Updated | What Calls Update |
|-------|----------------|---------------|-------------------|
| `stopwatch` | `StopwatchManager.renderTime()` | Every 1 second | `StopwatchManager.startTicking()` on task start |

**Dependencies**:
- Uses `stopwatch.getElapsedNow()` = `elapsedBeforePause + (Date.now() - startTime)`
- No other values depend on stopwatch display directly

---

### 2. TODAY'S STATS (DAILY TOTALS)

| UI ID | Source Function | Where Updated | What Calls Update |
|-------|----------------|---------------|-------------------|
| `productive-time` | `getProductiveMinutesForDate(today)` | `TaskManager.updateStats()` | `taskManager.refreshViews()`, `taskManager.initialize()` |
| `sleep-time` | `getSleepMinutesForDate(today)` | Same | Same |
| `total-time` | `getTrackedMinutesForDate(today)` | Same | Same |

**Source Functions** (in `DisciplineTracker`):
```
getProductiveMinutesForDate(dateStr) = sum of tasks where:
  - task.date === dateStr
  - category in PRODUCTIVE_CATEGORIES

getSleepMinutesForDate(dateStr) = sum of tasks where:
  - task.date === dateStr
  - category === "Sleep"

getTrackedMinutesForDate(dateStr) = sum of all tasks where:
  - task.date === dateStr
  - duration > 0
```

**Dependencies**:
- These values are SOURCE for `ShadowEngine.refresh()` which calculates:
  - `shadow-current-minutes`
  - `shadow-weekly-average`
  - All shadow battle metrics

---

### 3. STREAK DISPLAY

| UI ID | Source Function | Where Updated | What Calls Update |
|-------|----------------|---------------|-------------------|
| `streak-display` | `DisciplineTracker.updateStreak()` | On task add, day boundary | `taskManager.refreshViews(true)`, `app.initialize()` |

**Calculation**:
```
1. Get all unique dates with productive tasks
2. Sort dates descending
3. Count consecutive days ending at today (or yesterday if no task today)
4. Update localStorage + UI
```

---

### 4. SHADOW ENGINE VALUES

#### 4.1 Core Shadow Values

| UI ID | Source Function | Where Updated | What Calls Update |
|-------|----------------|---------------|-------------------|
| `shadow-current-minutes` | `ShadowEngine.render()` | `ShadowEngine.refresh()` | `TaskManager.updateStats()`, `dayBoundaryWatcher` |
| `shadow-average` | `ShadowEngine.render()` | Same | Same |
| `shadow-weekly-average` | `ShadowEngine.render()` | Same | Same |
| `shadow-standard-metric` | `ShadowEngine.render()` | Same | Same |
| `shadow-momentum-score` | `ShadowEngine.render()` | Same | Same |
| `shadow-consistency-index` | `ShadowEngine.render()` | Same | Same |
| `shadow-growth-trend` | `ShadowEngine.render()` | Same | Same |
| `shadow-target` | `ShadowEngine.render()` | Same | Same |
| `shadow-needed-tie` | `ShadowEngine.render()` | Same | Same |
| `shadow-needed-lead` | `ShadowEngine.render()` | Same | Same |
| `shadow-defense-target` | `ShadowEngine.render()` | Same | Same |
| `shadow-penalty` | `ShadowEngine.render()` | Same | Same |
| `shadow-penalty-reason` | `ShadowEngine.render()` | Same | Same |
| `shadow-penalty-expiry` | `ShadowEngine.render()` (countdown) | Same + 1s interval | Same |
| `shadow-distraction-budget` | `ShadowEngine.render()` | Same | Same |
| `shadow-win-ladder` | `ShadowEngine.render()` | Same | Same |
| `shadow-mission-score` | `ShadowEngine.render()` + `calculateMissionScore()` | Same | Same |
| `shadow-weekly-gap` | `ShadowEngine.render()` | Same | Same |
| `shadow-gap` | `ShadowEngine.render()` | Same | Same |
| `shadow-status` | `ShadowEngine.render()` + `getCurrentStatus()` | Same | Same |
| `shadow-pressure` | `ShadowEngine.render()` + `getPressure()` | Same | Same |

#### 4.2 Rank Values

| UI ID | Source Function | Where Updated |
|-------|----------------|---------------|
| `shadow-rank` | `ShadowEngine.render()` | `ShadowEngine.refresh()` |
| `shadow-badge` | Same | Same |
| `shadow-score` | Same | Same |
| `shadow-battle-you` | Same | Same |
| `shadow-battle-shadow` | Same | Same |
| `shadow-duel` | Same | Same |
| `shadow-next-rank-label` | Same | Same |
| `shadow-next-rank` | Same | Same |
| `shadow-next-rank-sub` | Same | Same |
| `shadow-lead-margin` | Same | Same |
| `shadow-trend` | Same | Same |
| `shadow-verdict` | Same | Same |
| `shadow-rank-state` | Same | Same |
| `shadow-shield-status` | Same | Same |
| `shadow-promotion-trial` | Same | Same |
| `shadow-promotion-requirements` | Same | Same |
| `shadow-rank-note` | Same | Same |
| `shadow-rank-note-sub` | Same | Same |
| `shadow-rank-ladder` | Same | Same (innerHTML) |
| `shadow-duel-you-fill` | Same (style.width) | Same |
| `shadow-duel-shadow-fill` | Same (style.width) | Same |
| `shadow-progress-fill` | Same (style.width + color) | Same |

#### 4.3 Shadow Calculation Chain

```
ShadowEngine.refresh(allowAnimation)
  ↓
computeRollingMetrics(endDateStr)
  ├─ buildDailyProductiveSeries() → from app.state.tasks
  ├─ bestAvg: best 7-day average in history
  ├─ currentAvg: last 7 days average
  ├─ previousAvg: 7 days before that
  └─ todayMinutes: today's productive minutes
  ↓
resolveShadowBuddySnapshot()
  ├─ lockedDate: yesterday's date
  ├─ shadowAvg: from computeRollingMetrics.currentAvg (or stored)
  ├─ currentAvg: same
  ├─ shadowStandard: 70th percentile of last 7 days
  └─ targetToday: shadowAvg + 1
  ↓
getTodayGoalProgress() → from TrainerEngine
  ↓
calculateMissionScore(goalProgress)
  └─ weighted completion of daily missions
  ↓
getTodayDistractionMinutes()
  ↓
getPenalty(todayMinutes, shadowAvg, weeklyGap, ...)
  ↓
countShadowWinsThisMonth(dailyMap, shadowAvg)
  ├─ myWins: days where minutes >= target
  └─ shadowWins: days where minutes < target
  ↓
getWinLadder(dailyMap, shadowAvg)
  ├─ winsIn5: wins in last 5 days
  └─ winsIn7: wins in last 7 days
  ↓
render({ todayMinutes, shadowAvg, currentAvg, ... })
  └─ Updates ALL UI elements listed above
```

---

### 5. GRAPH VALUES (Chart.js)

#### 5.1 Graph KPI Displays

| UI ID | Source Function | Where Updated |
|-------|----------------|---------------|
| `graph-productivity-label` | `GraphManager.updateGraphKpis()` | `GraphManager.updateCharts()` |
| `graph-productivity-total` | Same | Same |
| `graph-total-distraction-label` | Same | Same |
| `graph-total-distraction` | Same | Same |
| `graph-logged-distraction-label` | Same | Same |
| `graph-logged-distraction` | Same | Same |
| `prod-filter-total` | `GraphManager.animateFilteredTotal()` | On range/filter change |

#### 5.2 Graph Data Source

| Chart | Data Source Function | Dependencies |
|-------|---------------------|--------------|
| Productivity Chart | `GraphManager.getProductivityData(range, filter)` | `getFilteredMinutesForDate()` from tasks |
| Sleep Chart | `GraphManager.getSleepData(range)` | `getSleepMinutesForDate()` from tasks |
| Shadow Line | `GraphManager.buildShadowSeries(rangeDates)` | `ShadowEngine.buildRollingShadowAverageMap()` |

**Key**: The shadow line on the graph uses `shadowEngine.shadowSevenDayAverage` indirectly via `buildRollingShadowAverageMap()` which creates a rolling 7-day average from the daily productive map.

---

### 6. HEATMAP (365-day GitHub-style)

| UI ID | Source Function | Where Updated |
|-------|----------------|---------------|
| `github-heatmap-container` | `GraphManager.renderGithubHeatmap()` | `GraphManager.updateCharts()` |

**Data Flow**:
```
renderGithubHeatmap(year)
  ↓
For each task in app.state.tasks:
  ├─ heatmapDateKey = ShadowEngine.getShadowDayDate(task.startTime)
  ├─ Add to productiveMap if category is productive
  └─ Add to trackedMap for all tasks
  ↓
targetMap = ShadowEngine.getHistoricalBattleTargetMap(yearStart, yearEnd)
  └─ Uses rolling 7-day average from dailyMap
  ↓
For each day:
  ├─ productive = productiveMap.get(date) || 0
  ├─ target = targetMap.get(date) || fallbackTarget
  └─ isWin = productive >= target
  ↓
Render grid cells with state: "win", "loss", "neutral"
```

**Special Check - Heatmap Source**:
- Does NOT get values from Shadow Buddy directly
- Gets values from `app.state.tasks` (task history)
- Uses `ShadowEngine.getHistoricalBattleTargetMap()` for targets
- Targets are computed from daily productive map, NOT from stored shadow average

---

### 7. MISSION SCORE

| UI ID | Source Function | Where Updated |
|-------|----------------|---------------|
| `shadow-mission-score` | `ShadowEngine.calculateMissionScore()` | `ShadowEngine.refresh()` |

**Calculation**:
```
calculateMissionScore(progress)
  ├─ Get daily mission tasks from TrainerEngine.getDailyMissionTasks()
  ├─ For each task: weight = score_weight
  ├─ completedWeight = sum of weights where done === true
  └─ return (completedWeight / totalWeight) * 100
```

**Source of Missions**:
1. First: `TASK_RESPONSE_DRAFT` (AI-generated task plan)
2. Fallback: `TrainerEngine.getDailyMissionTasks()` (default 14-task schedule)
3. Topics come from roadmap via `getDailyRoadmapTopicSlots()`

---

### 8. BATTLE SCORE

| UI ID | Source Function |
|-------|-----------------|
| `shadow-score` | "Monthly Score (days): You X - Shadow Y" |
| `shadow-battle-you` | `competition.myWins` |
| `shadow-battle-shadow` | `competition.shadowWins` |
| `shadow-duel` | Score comparison text |
| `shadow-lead-margin` | "Lead Margin: X" |
| `shadow-trend` | "Monthly trend: X% win rate" |
| `shadow-verdict` | Full verdict text |

**Source**: `ShadowEngine.countShadowWinsThisMonth(dailyMap, shadowAvg)`
- Counts days in current month where productive >= target
- Target comes from `getHistoricalBattleTargetMap()`

---

### 9. SHADOW-AVERAGE Link to Graph

**Question**: Is `shadow-average` directly linked to graph shadow line?

**Answer**: YES - INDIRECTLY LINKED

- `shadow-average` UI element gets value from `shadowEngine.shadowSevenDayAverage` (line 4876-4877)
- Graph shadow line gets data from `buildRollingShadowSeries()` which calls `buildRollingShadowAverageMap()`
- `buildRollingShadowAverageMap()` computes rolling 7-day average from `shadowEngine.getDailyProductiveMap()`
- The daily map is built from `app.state.tasks`, same source as shadow average calculation

**Both derive from same source** (`app.state.tasks`), but:
- `shadow-average` shows the LOCKED/AUTO-COMMITTED shadow value (updated at day boundary)
- Graph shadow line shows LIVE rolling 7-day average (updates continuously)

---

### 10. TRAINER ENGINE Values

| UI ID | Source Function |
|-------|-----------------|
| `trainer-overview` | `TrainerEngine.renderStructuredReport()` |
| `trainer-content` | Same |
| `trainer-overview-card` (multiple) | Mode, Minutes to Win, Required Pace, Effective Shadow |
| Mission checklist items | `TrainerEngine.syncMissionFromRoadmap()` |

**Trainer relies on ShadowEngine for**:
- `shadowEngine.computeRollingMetrics()`
- `shadowEngine.shadowSevenDayAverage`
- `shadowEngine.getDailyProductiveMap()`
- `shadowEngine.countShadowWinsThisMonth()`
- `shadowEngine.getTodayGoalProgress()`
- `shadowEngine.calculateMissionScore()`

---

## Safe Change Rules

### Values That Can Be Changed Independently

1. **Stopwatch display** - Only affects itself
2. **Today's stats** (productive-time, sleep-time, total-time) - Only triggers shadow refresh
3. **Streak** - Only updates storage and display

### Values That Change Together

1. **ALL Shadow Engine values** - Changed by single `ShadowEngine.refresh()` call
   - If you change `shadowEngine.shadowSevenDayAverage`, ALL 30+ shadow UI elements update
   - If you change `shadowEngine.computeRollingMetrics()`, same effect

2. **Graph KPIs** - Changed by single `GraphManager.updateCharts()` call
   - Updates all 6 KPI elements + both charts + heatmap

3. **Mission Score** - Depends on TrainerEngine output
   - If `getDailyMissionTasks()` changes, mission score updates
   - Also affects shadow-mission-score

### Cascade Chains

**Chain 1: Task → Stats → Shadow → Graph**
```
Add Task → taskManager.addTask()
  → taskManager.refreshViews(true)
    → taskManager.updateStats()
      → shadowEngine.refresh()
        → graphManager.updateCharts()
```

**Chain 2: Day Boundary**
```
Day changes → startDayBoundaryWatcher (60s interval)
  → shadowEngine.refresh(false)
    → graphManager.updateCharts()
      → trainerEngine.refresh()
        → flowEngine.refresh()
```

**Chain 3: Cloud Sync**
```
Remote task change → Firebase onSnapshot
  → taskManager.applyRemoteTaskChanges()
    → refreshViews()
      → updateStats() → shadow refresh → graph update
```

---

## Short Final Summary

1. **Main Runtime**: `assets/js/app.js` contains all logic

2. **Source of Truth**: `app.state.tasks` array (also persisted to localStorage and Firebase)

3. **Shadow-Average Graph Link**: 
   - INDIRECTLY LINKED
   - Both use same source (tasks), but different calculations
   - Shadow-average = committed value at day boundary
   - Graph shadow = live rolling 7-day average

4. **365 Heatmap Source**:
   - Gets values from `app.state.tasks` (task history)
   - NOT from Shadow Buddy directly
   - Uses `getHistoricalBattleTargetMap()` for targets

5. **One Source of Truth**: 
   - `app.state.tasks` array for all time-based calculations
   - All other values derive from filtering this array

6. **Most Reused Logic**:
   - `getProductiveMinutesForDate()` - used by stats, shadow, graphs, heatmap
   - `ShadowEngine.getDailyProductiveMap()` - used by shadow, trainer, graphs
   - `ShadowEngine.computeRollingMetrics()` - core calculation for all shadow values

7. **Changing one function affects**:
   - `computeRollingMetrics()` → ALL 30+ shadow UI elements
   - `updateCharts()` → graph KPIs + both charts + heatmap
   - `getDailyMissionTasks()` → mission score + trainer display
