### UI Data Binding & Display Fixes — Shadow Analysis Dashboard

#### Context

The UI layout is correct. Issues are caused by incorrect data binding, inconsistent formatting, and verbose display logic. Fixes must preserve all calculations while improving clarity and consistency.

---

## 🔧 FIXES

### Fix 1 — Hero Card Consistency

* Ensure all hero card values (**YOU, SHADOW, GAP**) use identical font size.
* Target size: ~30px.
* GAP value is currently smaller → increase to match others.

---

### Fix 2 — VS Duel (YOU Panel Incorrect Data)

**Problem:** All values show `0h 00m`.

**Root Cause:** Using `currentSessionTime` (live timer).

**Fix:**

* Replace data source with:

  * `todayProductiveTime` (same as YOU hero card)

**Correct Values:**

* main time → `3h 25m`
* gap vs shadow → `+3h 17m`
* need to tie → `0h 00m`
* need to lead → `0h 00m`
* def. target → `0h 53m`
* monthly score → `2 days`
* win rate → `29%`

**Rule:**
All VS duel rows must read from `shadowAnalysis` / `shadowData`, NOT live session timer.

---

### Fix 3 — Monthly Battle Scores

**Problem:** Both values showing `0`.

**Fix Data Binding:**

* YOU → `shadowData.monthlyScore.you` → `2`
* SHADOW → `shadowData.monthlyScore.shadow` → `15`

---

### Fix 4 — Lead Margin Incorrect

* Current: `+0 days`
* Correct: `+13 days`
* Style: red (loss/negative indicator)

---

### Fix 5 — Penalty Text (Over-Verbose)

**Replace with:**

```
win-rate <50% · untracked >5h
resets in 00:55:17 · carries if loss
```

**Remove completely:**

* "Active today only..."
* Any long descriptive text

---

### Fix 6 — Roadmap Penalty UI

**Remove large amber block.**

**Replace with inline layout:**

* Left (muted):
  `roadmap penalty · 3 tasks pending`
* Right (amber only):
  `00:55:44`

---

### Fix 7 — Flow State Normalization

Convert all values to **lowercase + concise format**:

| Field     | Before                       | After                   |
| --------- | ---------------------------- | ----------------------- |
| blockers  | High blockers                | high                    |
| triggers  | Moderate (add challenge +4%) | moderate +4%            |
| cycle     | Recovery / Reset             | recovery / reset        |
| proneness | Set wake + first action      | set wake + first action |

---

## ⚠️ ROOT CAUSE

* `shadowAnalysis` / `shadowData` object is NOT properly passed into components.
* Components fallback to default values (`0`, `0h 00m`).
* VS Duel and Monthly Battle are incorrectly referencing live session state.

---

## ✅ REQUIRED ACTION

* Ensure `shadowAnalysis` is passed as a prop into all dependent components (e.g., `ShadowPanel`, `VSDuel`, `MonthlyBattle`).
* Remove dependency on live timer for analytical values.
* Standardize formatting (font, casing, spacing, color logic).

---

## 🎯 EXPECTED RESULT

* All values reflect correct computed data.
* No `0h 00m` placeholders unless truly zero.
* Clean, minimal, glance-readable UI.
* Consistent typography and color semantics.

---
