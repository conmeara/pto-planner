# PTO Planner Strategy Algorithms - Comprehensive Analysis

## Overview
The PTO planner features a sophisticated optimization system with 5 different strategies that intelligently suggest PTO days to maximize time off. The system automatically calculates the most efficient combinations of PTO days around weekends and holidays.

## 1. STRATEGY ALGORITHMS

### 1.1 Strategy Types (5 Total)
Located in: `/home/user/pto-planner-v3/components/tabs/SuggestedPTOTab.tsx` (lines 10-16)

```typescript
enum StrategyType {
  BALANCED_MIX = 'balanced',        // Mix of short breaks and longer vacations
  LONG_WEEKENDS = 'long-weekends',  // 3-4 day breaks extending weekends
  MINI_BREAKS = 'mini-breaks',      // 5-6 day breaks spread across year
  WEEK_LONG = 'week-long',          // 7-9 day getaways
  EXTENDED = 'extended'              // 10-15 day breaks for deep relaxation
}
```

### 1.2 Strategy Details and Descriptions

| Strategy | Min Break | Max Break | Use Case | File Location |
|----------|-----------|-----------|----------|---------------|
| **Balanced Mix** | Mixed | Mixed | Combination of short breaks and longer vacations | `pto-optimizer.ts` lines 273-314 |
| **Long Weekends** | 3 days | 4 days | Multiple breaks extending regular weekends | `pto-optimizer.ts` lines 320-339 |
| **Mini Breaks** | 5 days | 6 days | Several breaks spread throughout year | `pto-optimizer.ts` lines 345-373 |
| **Week-Long** | 7 days | 9 days | Proper vacations for restoration | `pto-optimizer.ts` lines 379-407 |
| **Extended** | 10 days | 15 days | Deeper relaxation fewer times per year | `pto-optimizer.ts` lines 413-441 |

---

## 2. FILE STRUCTURE & LOCATIONS

### Core Strategy Files

#### A. Strategy UI Component
**File:** `/home/user/pto-planner-v3/components/tabs/SuggestedPTOTab.tsx`
- **Lines:** 1-244
- **Purpose:** User interface for strategy selection and application
- **Key Components:**
  - Strategy list rendering (lines 132-167)
  - Strategy selection handler (lines 73-92)
  - Apply button (lines 207-223)
  - Clear button (lines 225-232)
  - Optimization result display (lines 178-203)

#### B. Optimization Engine
**File:** `/home/user/pto-planner-v3/lib/pto-optimizer.ts`
- **Lines:** 1-529 (529 total lines)
- **Purpose:** Core algorithm implementations
- **Key Functions:**
  - `optimizePTO()` - Main entry point (lines 511-529)
  - `optimizeBalancedMix()` - Balanced strategy (lines 273-314)
  - `optimizeLongWeekends()` - Long weekends strategy (lines 320-339)
  - `optimizeMiniBreaks()` - Mini breaks strategy (lines 345-373)
  - `optimizeWeekLong()` - Week-long strategy (lines 379-407)
  - `optimizeExtended()` - Extended strategy (lines 413-441)
  - Helper functions for analysis (lines 42-263)

#### C. State Management
**File:** `/home/user/pto-planner-v3/contexts/PlannerContext.tsx`
- **Lines:** 1-1030 (1030 total lines)
- **Purpose:** Central state management for all planning data
- **Key State Variables:**
  - `suggestedDays` - Current suggestion array (line 306)
  - `currentStrategy` - Selected strategy (line 307)
  - `lastOptimizationResult` - Result object (line 308)
- **Key Methods:**
  - `runOptimization()` - Executes strategy (lines 907-968)
  - `applySuggestions()` - Merges suggestions into selections (lines 889-904)
  - `clearSuggestions()` - Clears all suggestions (lines 882-886)

#### D. UI Container
**File:** `/home/user/pto-planner-v3/components/IslandBar.tsx`
- **Lines:** 1-202
- **Purpose:** Tab navigation and panel management
- **Key Content:**
  - Tab configuration (lines 39-75)
  - "Suggested" tab config (lines 47-53)
  - Tab content rendering (lines 99-114)

#### E. Calendar Display
**Files:**
- `/home/user/pto-planner-v3/components/calendar/MonthCard.tsx` (lines 1-312)
  - Day type determination (lines 218-228)
  - Suggested day styling (lines 79-80, 222-223)
- `/home/user/pto-planner-v3/components/calendar/VirtualizedCalendar.tsx`
  - Virtualized rendering for performance

#### F. Type Definitions
**File:** `/home/user/pto-planner-v3/types/index.ts`
- **Lines:** 190-220
- **Key Types:**
  - `StrategyType` (line 194)
  - `OptimizationResult` (lines 212-219)

---

## 3. ALGORITHM HELPER FUNCTIONS

Located in `pto-optimizer.ts` (lines 40-263):

### Core Helper Functions

| Function | Lines | Purpose |
|----------|-------|---------|
| `isWeekend()` | 45-47 | Checks if date falls on weekend |
| `isHoliday()` | 52-59 | Checks if date is marked as holiday |
| `isNonWorkingDay()` | 64-66 | Checks if date is weekend or holiday |
| `isPastDate()` | 71-77 | Prevents suggesting past dates |
| `isAlreadySelected()` | 82-89 | Prevents duplicate suggestions |
| `addDays()` | 94-98 | Date arithmetic utility |
| `getDateRange()` | 103-113 | Gets all dates in range |
| `countTotalDaysOff()` | 118-149 | Calculates total consecutive days off including weekends/holidays |
| `findBridgeDays()` | 155-198 | Identifies "bridge days" - single workdays between weekends/holidays (most efficient) |
| `findWorkdaySequences()` | 203-263 | Finds consecutive workday sequences for longer breaks |

### Algorithm Configuration
**Location:** `pto-optimizer.ts` line 14-36
```typescript
interface PTOOptimizerConfig {
  year: number;                    // Target year
  availableDays: number;           // Remaining PTO days
  weekendDays: number[];           // [0,6] = Sun,Sat
  holidays: Date[];                // Holiday dates
  existingPTODays?: Date[];        // Already selected days
}
```

---

## 4. INTEGRATION WITH CALENDAR

### A. Visual Representation
**In MonthCard.tsx (lines 74-82):**
```typescript
getDayClasses: {
  SUGGESTED_PTO: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200'
}
```

**Day Type Enum (lines 24-31):**
- `SUGGESTED_PTO` displayed in yellow
- Rendered when `isDateSuggested()` returns true

### B. State Connection
**Flow:**
1. User selects strategy in `SuggestedPTOTab`
2. Calls `usePlanner().runOptimization(strategyType)`
3. `PlannerContext.runOptimization()` executes
4. Results stored in `suggestedDays` and `currentStrategy` state
5. `MonthCard.isDateSuggested()` checks if date is in `suggestedDays`
6. Matching dates displayed in yellow on calendar

**Implementation in MonthCard.tsx (lines 218-228):**
```typescript
const dayType = isToday(date)
  ? DayType.TODAY
  : isDateSelected(date)
  ? DayType.SELECTED_PTO
  : isDateSuggested(date)          // ← Checks suggested days
  ? DayType.SUGGESTED_PTO
  : isDateHoliday(date)
  ? DayType.PUBLIC_HOLIDAY
  : isDateWeekend(date)
  ? DayType.WEEKEND
  : DayType.NORMAL;
```

---

## 5. "APPLY PLAN" AND "CLEAR" BUTTONS

### Location
**File:** `/home/user/pto-planner-v3/components/tabs/SuggestedPTOTab.tsx`
**Lines:** 205-239

### Button Implementation

#### Apply Button (Lines 207-223)
```typescript
<Button
  onClick={handleApply}
  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
  disabled={isApplying}
>
  {isApplying ? (
    <>
      <BrainCircuit className="mr-2 h-4 w-4 animate-spin" />
      Applying strategy...
    </>
  ) : (
    <>
      <Check className="mr-2 h-4 w-4" />
      Apply {suggestedDays.length} suggested days
    </>
  )}
</Button>
```

- **Function:** Merges suggested days into selected days
- **Handler:** `handleApply()` at lines 95-105
- **State Update:** Calls `applySuggestions()` from context
- **Visual:** Shows count of days being applied, displays spinner during application

#### Clear Button (Lines 225-232)
```typescript
<Button
  onClick={handleClear}
  variant="outline"
  className="w-full border-gray-300 dark:border-gray-600"
  disabled={isApplying}
>
  Clear suggestions
</Button>
```

- **Function:** Removes all current suggestions
- **Handler:** `handleClear()` at lines 108-111
- **State Update:** Calls `clearSuggestions()` from context
- **Effect:** Clears `suggestedDays`, `currentStrategy`, and `lastOptimizationResult`

### Visibility Logic (Lines 205-206)
```typescript
{currentStrategy && suggestedDays.length > 0 && (
  // Show Apply/Clear buttons
)}
```
- Buttons only display when:
  - A strategy has been selected (`currentStrategy` is not null)
  - Suggestions have been generated (`suggestedDays` is not empty)

---

## 6. CURRENT FLOW FOR APPLYING STRATEGIES

### Flow Diagram
```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER SELECTS STRATEGY                                   │
│    (SuggestedPTOTab: handleSelectStrategy)                 │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. OPTIMIZATION RUNS                                        │
│    (PlannerContext: runOptimization)                       │
│    - Builds config from settings                           │
│    - Calls optimizePTO() from pto-optimizer.ts            │
│    - Stores result in lastOptimizationResult              │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. RESULTS DISPLAYED                                        │
│    - Yellow days shown on calendar                         │
│    - Optimization stats displayed                          │
│    - Apply/Clear buttons become visible                    │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
         ┌─────────────┴──────────────┐
         ↓                            ↓
    USER CLICKS              USER CLICKS
    "APPLY"                 "CLEAR"
         ↓                            ↓
    applySuggestions()       clearSuggestions()
    (merges into selected)   (removes all suggestions)
         ↓                            ↓
    Green days appear       Yellow days disappear
    on calendar              on calendar
```

### Step-by-Step Implementation

**Step 1: Strategy Selection** (SuggestedPTOTab.tsx, lines 73-92)
```typescript
const handleSelectStrategy = async (strategyType: StrategyType) => {
  setIsOptimizing(true);
  try {
    const result = runOptimization(strategyType);  // Context call
    if (result) {
      setOptimizationResult({...});
    }
  } finally {
    setIsOptimizing(false);
  }
};
```

**Step 2: Optimization** (PlannerContext.tsx, lines 907-968)
```typescript
const runOptimization = useCallback(
  (strategy: StrategyType, year?: number): OptimizationResult | null => {
    // Build config with current settings
    const config: PTOOptimizerConfig = {
      year: targetYear,
      availableDays,      // Current balance - used days
      weekendDays,        // Weekend configuration
      holidays: holidayDates,
      existingPTODays: selectedDays,
    };

    // Execute strategy
    const result = optimizePTO(strategy, config);

    // Update state
    setSuggestedDays(result.suggestedDays);
    setCurrentStrategy(strategy);
    setLastOptimizationResult(result);

    return result;
  },
  [...]
);
```

**Step 3: Apply Suggestions** (PlannerContext.tsx, lines 889-904)
```typescript
const applySuggestions = useCallback(() => {
  // Merge suggestions into selected days (avoiding duplicates)
  setSelectedDays((prev) => {
    const combined = [...prev];
    suggestedDays.forEach((suggestedDate) => {
      const alreadyExists = combined.some((d) => isSameDay(d, suggestedDate));
      if (!alreadyExists) {
        combined.push(suggestedDate);
      }
    });
    return combined;
  });

  // Clear suggestions after applying
  clearSuggestions();
}, [suggestedDays, clearSuggestions]);
```

**Step 4: Clear Suggestions** (PlannerContext.tsx, lines 882-886)
```typescript
const clearSuggestions = useCallback(() => {
  setSuggestedDays([]);
  setCurrentStrategy(null);
  setLastOptimizationResult(null);
}, []);
```

---

## 7. SETTINGS INTEGRATIONS

### Configuration Sources (PlannerContext.tsx, lines 907-950)

#### A. PTO Settings
- **Source:** Database (authenticated) or localStorage (unauthenticated)
- **Data:**
  - `initial_balance` - Starting PTO days
  - `pto_display_unit` - Days or hours
  - `hours_per_day` - For hour conversions
  - `pto_start_date` - Year start reference
  - `carry_over_limit` - Cap on carryover
  - `max_balance` - Maximum balance cap

#### B. Weekend Configuration
- **Source:** Database (authenticated) or localStorage (unauthenticated)
- **Data:** `weekendDays` array (e.g., [0, 6] for Sun/Sat)
- **Method:** `getWeekendDays()` from context

#### C. Holiday Data
- **Source:** Database (authenticated) or localStorage (unauthenticated)
- **Data:** Array of `CustomHoliday` objects
- **Properties:**
  - `date` - ISO format date
  - `repeats_yearly` - For recurring holidays
  - `is_paid_holiday` - Whether it counts as day off
- **Method:** `getHolidays()` from context

#### D. Existing PTO Days
- **Source:** Database `ptoDays` table or localStorage
- **Status Filter:** Only "planned" status days included
- **Purpose:** Prevents double-suggesting already selected days

### Configuration Building (PlannerContext.tsx, lines 943-949)
```typescript
const config: PTOOptimizerConfig = {
  year: targetYear,
  availableDays,              // getCurrentBalance() - usedDays
  weekendDays,                // getWeekendDays()
  holidays: holidayDates,     // getHolidays() converted to Date objects
  existingPTODays: selectedDays,  // Current selections
};
```

### Storage Persistence

**LocalStorage Keys** (PlannerContext.tsx, lines 13-19):
```typescript
const STORAGE_KEYS = {
  SELECTED_DAYS: 'pto_planner_selected_days',
  SETTINGS: 'pto_planner_settings',
  WEEKEND_CONFIG: 'pto_planner_weekend',
  HOLIDAYS: 'pto_planner_holidays',
  COUNTRY: 'pto_planner_country',
};
```

---

## 8. OPTIMIZATION RESULT METRICS

### OptimizationResult Interface (pto-optimizer.ts, lines 30-36)
```typescript
interface OptimizationResult {
  suggestedDays: Date[];           // Array of suggested PTO dates
  periods: SuggestedPeriod[];      // Grouped periods
  totalPTOUsed: number;            // PTO days required
  totalDaysOff: number;            // Total consecutive days off
  averageEfficiency: number;       // totalDaysOff / totalPTOUsed
}
```

### Displayed Metrics (SuggestedPTOTab.tsx, lines 186-201)
- **PTO Days Used:** Actual vacation days needed
- **Total Days Off:** Including weekends & holidays
- **Efficiency Ratio:** How many days off per 1 PTO day
  - Example: 2.5x means 2.5 days off per 1 PTO day used

---

## 9. KEY ALGORITHM CONCEPTS

### Bridge Days (Most Efficient)
- Definition: Single workdays surrounded by weekends/holidays on both sides
- Example: Monday between Friday (holiday) and weekend
- Implementation: `findBridgeDays()` (lines 155-198)
- Efficiency: Can give 3+ days off for 1 PTO day

### Workday Sequences
- Definition: Consecutive workday periods
- Implementation: `findWorkdaySequences()` (lines 203-263)
- Used by: Mini-breaks, week-long, and extended strategies

### Efficiency Calculation
```
Efficiency = Total Days Off / PTO Days Required

Example:
- Take Monday (PTO day)
- Weekend comes Friday-Saturday
- Holiday on Friday
- Total: Friday (holiday) + Saturday (weekend) + Sunday (weekend) + Monday (PTO)
         = 4 days off from 1 PTO day = 4.0x efficiency
```

### Overlap Prevention
- Strategies track `suggestedDays` to avoid duplicates
- Database `existingPTODays` prevents re-suggesting already selected days
- Past dates filtered out with `isPastDate()` check

---

## 10. AUTO-REOPTIMIZATION

**Feature:** When selected days change, suggestions automatically update (PlannerContext.tsx, lines 970-976)

```typescript
useEffect(() => {
  if (!currentStrategy) {
    return;
  }

  runOptimization(currentStrategy);  // Re-run when selections change
}, [selectedDays, currentStrategy, runOptimization]);
```

This ensures suggestions always account for previously selected days.

---

## SUMMARY TABLE

| Component | Location | Lines | Purpose |
|-----------|----------|-------|---------|
| **Strategy Enum** | SuggestedPTOTab | 10-16 | Define 5 strategy types |
| **UI Tab** | SuggestedPTOTab | 1-244 | User interface & buttons |
| **Algorithms** | pto-optimizer | 273-441 | Strategy implementations |
| **Helpers** | pto-optimizer | 40-263 | Analysis functions |
| **State** | PlannerContext | 304-308 | Redux-like state holder |
| **Hooks** | PlannerContext | 1023-1029 | usePlanner() export |
| **Calendar Display** | MonthCard | 218-228 | Yellow day rendering |
| **Container** | IslandBar | 1-202 | Tab navigation |
| **Types** | types/index | 190-244 | TypeScript definitions |

