# Gap-Filling PTO Suggestions

The PTO planner now generates recommendations through a single gap-filling engine whose goal is simple: maximize consecutive days off by bridging the working-day gaps between weekends, public holidays, and (optionally) your existing PTO selections.

This document explains the moving pieces so future contributors can reason about the behaviour, adjust scoring, or extend the available tuning controls.

---

## 1. High-Level Flow

1. **PlannerContext** gathers the current configuration: weekend rules, active holidays, already-selected PTO, remaining balance, plus the persisted `SuggestionPreferences`.
2. The context calls `optimizePTO(config, preferences)` inside `src/lib/pto-optimizer.ts`.
3. The optimizer scans every day in the requested timeframe, marks non-working “anchor” windows, finds the working gaps between them, scores each gap, then greedily selects the best non-overlapping breaks within the remaining PTO budget.
4. The resulting `OptimizationResult` feeds back into context state (`suggestedDays`, `lastOptimizationResult`) and is rendered inside the new `SuggestedPTOTab`.
5. When the user tweaks preferences or regenerates manually, the same pipeline repeats and calendar highlights update immediately.

Auto-regeneration still fires when weekends, holidays, or PTO selections change, so the calendar never drifts away from the current data set.

---

## 2. Core Types

Defined in `src/types/index.ts`:

| Type | Purpose |
|------|---------|
| `SuggestionPreferences` | All user-tunable knobs (timeframe, PTO limits, ranking mode, spacing rules, anchor toggle). Persisted to `localStorage`. |
| `SuggestedBreak` | A single candidate break including the PTO days to request, total consecutive days off, efficiency ratio, and before/after anchor metadata. |
| `OptimizationResult` | The aggregate result returned by the optimizer. Includes the sorted break list, all suggested PTO days, total PTO consumed, total days off, average efficiency, and leftover PTO. |
| `RankingMode` | Ordering options exposed in the UI (`efficiency`, `longest`, `least-pto`, `earliest`). |

These types are shared between the optimizer, context, and UI so the data remains serialisable and easy to inspect during debugging.

---

## 3. Gap-Filling Algorithm (`src/lib/pto-optimizer.ts`)

The new optimizer has one entry point:

```ts
export function optimizePTO(
  config: PTOOptimizerConfig,
  preferences: SuggestionPreferences
): OptimizationResult
```

### 3.1 Timeline Preparation
1. Clamp the timeframe to [`earliestStart`, `latestEnd`] and strictly exclude any dates on or before the current day (suggestions always start from tomorrow).
2. Build a `DayInfo` record for every date in range marking weekends, holidays, and selected PTO.
3. Collapse consecutive non-working days into anchor segments. Each segment records its source (weekend, holiday, existing PTO, timeframe boundary) and whether it counts toward the eventual streak length (existing PTO only counts when `extendExistingPTO` is enabled).

### 3.2 Gap Detection
Every working-day segment that sits between two anchors becomes a candidate gap. For each gap:

* PTO required = number of workdays inside the gap.
* Total days off = PTO required + leading anchor length (if counted) + trailing anchor length (if counted).
* Efficiency = `totalDaysOff / ptoRequired`.

Candidates are discarded if they exceed `maxConsecutiveDaysOff`, fail the `minConsecutiveDaysOff` filter, or exceed the global PTO budget from preferences/remaining balance.

### 3.3 Ranking & Greedy Selection
* Candidates are sorted according to the chosen `RankingMode`.
* The optimizer iterates through the sorted list, picking breaks while:
  * They do not overlap previously selected breaks.
  * They obey `minSpacingBetweenBreaks`.
  * There is still PTO budget available.
* Once a break is accepted, its PTO days are added to the final suggestion set and the remaining PTO budget is reduced.

The output contains the original break ordering (already ranked), flattened PTO dates for the calendar, and derived metrics (total PTO used, total days off, average efficiency, remaining PTO).

### 3.4 Anchor Metadata
Each `SuggestedBreak` carries two `AnchorInfo` objects describing the before/after anchors. The UI uses these labels to show whether a streak starts from “Weekend”, “Holiday”, “Existing PTO”, or a timeframe boundary, and it visually mutes anchors that do not add extra days.

---

## 4. Planner Context Integration (`src/contexts/PlannerContext.tsx`)

Key responsibilities:

* Store `suggestionPreferences` in state, persist them via `localStorage`, and expose `updateSuggestionPreferences`.
* Maintain `suggestionPreferencesRef` so manual regeneration always reads the latest settings.
* Provide `generateSuggestions()` which prepares `PTOOptimizerConfig` (weekends, expanded holiday dates, selected PTO days, remaining balance) and calls `optimizePTO`.
* Auto-run `generateSuggestions()` whenever suggestion preferences, selected PTO, holiday data, or weekend rules change. Local weekend updates flip a simple `localWeekendVersion` counter so the effect re-fires, and the UI shows a spinner while recalculating.
* Keep the old actions (`applySuggestions`, `clearSuggestions`) so calendar interactions remain the same.

State exposed through `usePlanner()` now includes:

```
suggestionPreferences,
updateSuggestionPreferences,
generateSuggestions,
isGeneratingSuggestions,
lastOptimizationResult,
suggestedDays,
...
```

`clearSuggestions()` only resets the highlighted days/result. Because auto-generation ignores preference changes, users can clear the view and keep it blank until they explicitly regenerate.

---

## 5. Suggested PTO Tab UI (`src/components/tabs/SuggestedPTOTab.tsx`)

The tab has five main sections:

1. **Advanced Settings Toggle** – a lightweight switch that hides or reveals the configuration cards. It defaults to hidden so casual users only see results.
2. **Timeframe & Ranking Card** – date range pickers plus a ranking mode select. The helper text updates to match the chosen mode (only visible when advanced settings are enabled).
3. **Usage Constraints Card** – numeric inputs for the PTO safety reserve (`minPTOToKeep`), `maxConsecutiveDaysOff`, and `minConsecutiveDaysOff` (advanced only).
4. **Spacing & Anchors** – input for `minSpacingBetweenBreaks` and a switch that toggles “extend existing PTO as anchors”, with live feedback on how many PTO days are already selected (advanced only).
5. **Metrics + Action Bar** – shows break count, total days off, PTO used, average efficiency, remaining PTO, and the configured safety reserve. Because the optimizer re-runs automatically on every relevant change, the only buttons are:
   * `Apply` (merges `suggestedDays` into the user’s selection)
   * `Clear`

Below the controls, the **Break list** renders the ranked recommendations. Each card surfaces:

* Break window (`start → end`) and total streak length.
* PTO days required and efficiency.
* Anchor labels (muted when they do not extend the streak).
* The PTO dates to request (first few dates shown as badges, followed by a “+N” badge when long).

An empty state nudges users to adjust filters and hit regenerate if no candidates survive the constraints.

---

## 6. Preference Reference

| Preference | Description | UI Location |
|------------|-------------|-------------|
| `earliestStart`, `latestEnd` | Bounds the scanning window (defaults to Jan 1 of current year − 2 through Dec 31 of current year + 2). | Timeframe card |
| `minPTOToKeep` | Reserve that should remain unused. The engine only spends PTO above this cushion. | Usage constraints |
| `maxConsecutiveDaysOff` | Upper bound on any single streak (weekends and holidays included). | Usage constraints |
| `minConsecutiveDaysOff` | Filters out short streaks even if they are efficient. | Usage constraints |
| `rankingMode` | Sorting strategy (efficiency, longest stretch, least PTO, earliest). | Timeframe card |
| `minSpacingBetweenBreaks` | Enforces a cooldown between streaks once they are selected. | Spacing section |
| `extendExistingPTO` | Treats already-planned PTO days as anchors to stretch. When disabled, they simply block suggestions. | Spacing section |

All preferences persist locally so the planner mirrors the same behaviour on refresh.

---

## 7. Calendar Integration

`suggestedDays` still flows into the calendar via `isDateSuggested(date)` and is highlighted with the existing “suggested PTO” styling. Because `applySuggestions()` copies those days into the selected set, users retain the same calendar interaction model even though the strategy picker went away.

---

## 8. Next Steps & Extension Points

* **Scoring tweaks** – adjust `sortCandidates` or add additional tie-breakers (e.g., favouring breaks that touch specific holidays).
* **Additional controls** – new filters only require updating `SuggestionPreferences`, persisting them in context, and wiring a new UI field to the same update helper.
* **Analytics** – every `SuggestedBreak` carries anchor metadata, so later we could show “anchored by Labor Day” badges or aggregate stats per holiday cluster.

The important takeaway: the system is now single-minded (maximize consecutive days off) and explainable. Preferences translate directly into optimizer constraints and the UI keeps those relationships visible.
