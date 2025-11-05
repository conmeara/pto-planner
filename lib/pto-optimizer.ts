/**
 * PTO Optimization Engine
 *
 * This module provides intelligent PTO suggestion algorithms that help users
 * maximize their time off by strategically selecting days around weekends and holidays.
 */

import { StrategyType } from '@/components/tabs/SuggestedPTOTab';

// ============================================================================
// Types
// ============================================================================

export interface PTOOptimizerConfig {
  year: number;
  availableDays: number;
  weekendDays: number[]; // [0, 6] for Saturday/Sunday
  holidays: Date[]; // Array of holiday dates
  existingPTODays?: Date[]; // Already selected PTO days
}

export interface SuggestedPeriod {
  startDate: Date;
  endDate: Date;
  ptoDaysRequired: number;
  totalDaysOff: number;
  efficiency: number; // totalDaysOff / ptoDaysRequired
}

export interface OptimizationResult {
  suggestedDays: Date[];
  periods: SuggestedPeriod[];
  totalPTOUsed: number;
  totalDaysOff: number;
  averageEfficiency: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a date is a weekend
 */
function isWeekend(date: Date, weekendDays: number[]): boolean {
  return weekendDays.includes(date.getDay());
}

/**
 * Check if a date is a holiday
 */
function isHoliday(date: Date, holidays: Date[]): boolean {
  return holidays.some(
    (holiday) =>
      holiday.getFullYear() === date.getFullYear() &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getDate() === date.getDate()
  );
}

/**
 * Check if a date is a weekend or holiday
 */
function isNonWorkingDay(date: Date, weekendDays: number[], holidays: Date[]): boolean {
  return isWeekend(date, weekendDays) || isHoliday(date, holidays);
}

/**
 * Check if a date is in the past (before today)
 */
function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

/**
 * Check if a date is already selected as PTO
 */
function isAlreadySelected(date: Date, existingPTODays: Date[]): boolean {
  return existingPTODays.some(
    (pto) =>
      pto.getFullYear() === date.getFullYear() &&
      pto.getMonth() === date.getMonth() &&
      pto.getDate() === date.getDate()
  );
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get all dates in a range (inclusive)
 */
function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Count consecutive non-working days around a date range
 */
function countTotalDaysOff(
  startDate: Date,
  endDate: Date,
  weekendDays: number[],
  holidays: Date[]
): { totalDays: number; ptoDaysRequired: number } {
  let totalDays = 0;
  let ptoDaysRequired = 0;
  let current = new Date(startDate);

  // Expand backwards to include leading weekends/holidays
  while (isNonWorkingDay(addDays(current, -1), weekendDays, holidays)) {
    current = addDays(current, -1);
  }

  // Expand forwards to include trailing weekends/holidays
  let end = new Date(endDate);
  while (isNonWorkingDay(addDays(end, 1), weekendDays, holidays)) {
    end = addDays(end, 1);
  }

  // Count days
  const allDates = getDateRange(current, end);
  for (const date of allDates) {
    totalDays++;
    if (!isNonWorkingDay(date, weekendDays, holidays)) {
      ptoDaysRequired++;
    }
  }

  return { totalDays, ptoDaysRequired };
}

/**
 * Find "bridge days" - workdays between weekends/holidays
 * These are the most efficient days to take off
 */
function findBridgeDays(
  year: number,
  weekendDays: number[],
  holidays: Date[],
  existingPTODays: Date[] = []
): Array<{ date: Date; efficiency: number; totalDaysOff: number }> {
  const bridges: Array<{ date: Date; efficiency: number; totalDaysOff: number }> = [];

  // Check every day of the year
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);

      // Skip if in the past
      if (isPastDate(date)) continue;

      // Skip if already selected as PTO
      if (isAlreadySelected(date, existingPTODays)) continue;

      // Skip if it's already a non-working day
      if (isNonWorkingDay(date, weekendDays, holidays)) continue;

      // Check if this workday is adjacent to non-working days
      const prevDay = addDays(date, -1);
      const nextDay = addDays(date, 1);

      const prevIsNonWorking = isNonWorkingDay(prevDay, weekendDays, holidays);
      const nextIsNonWorking = isNonWorkingDay(nextDay, weekendDays, holidays);

      // If surrounded by non-working days on both sides, it's a bridge
      if (prevIsNonWorking && nextIsNonWorking) {
        const { totalDays, ptoDaysRequired } = countTotalDaysOff(date, date, weekendDays, holidays);
        const efficiency = totalDays / ptoDaysRequired;

        bridges.push({ date, efficiency, totalDaysOff: totalDays });
      }
    }
  }

  // Sort by efficiency (highest first)
  return bridges.sort((a, b) => b.efficiency - a.efficiency);
}

/**
 * Find consecutive workday sequences (for longer vacations)
 */
function findWorkdaySequences(
  year: number,
  minDays: number,
  maxDays: number,
  weekendDays: number[],
  holidays: Date[],
  existingPTODays: Date[] = []
): SuggestedPeriod[] {
  const sequences: SuggestedPeriod[] = [];

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let startDay = 1; startDay <= daysInMonth; startDay++) {
      const startDate = new Date(year, month, startDay);

      // Skip if starting in the past
      if (isPastDate(startDate)) continue;

      // Skip if starting on a non-working day
      if (isNonWorkingDay(startDate, weekendDays, holidays)) continue;

      // Try different sequence lengths
      for (let length = minDays; length <= maxDays; length++) {
        const endDate = addDays(startDate, length - 1);

        // Make sure we're still in the same year
        if (endDate.getFullYear() !== year) break;

        // Count how many are actual workdays
        const dates = getDateRange(startDate, endDate);
        const workdays = dates.filter((d) => !isNonWorkingDay(d, weekendDays, holidays));

        // Skip if any workday in this sequence is already selected
        const hasConflict = workdays.some((d) => isAlreadySelected(d, existingPTODays));
        if (hasConflict) continue;

        // If too many non-working days in the middle, skip
        if (workdays.length < length * 0.6) continue;

        const { totalDays, ptoDaysRequired } = countTotalDaysOff(
          startDate,
          endDate,
          weekendDays,
          holidays
        );

        sequences.push({
          startDate,
          endDate,
          ptoDaysRequired: workdays.length,
          totalDaysOff: totalDays,
          efficiency: totalDays / workdays.length,
        });
      }
    }
  }

  // Sort by efficiency
  return sequences.sort((a, b) => b.efficiency - a.efficiency);
}

// ============================================================================
// Strategy Implementations
// ============================================================================

/**
 * Balanced Mix Strategy
 * Combination of short breaks and longer vacations
 */
function optimizeBalancedMix(config: PTOOptimizerConfig): OptimizationResult {
  const { year, availableDays, weekendDays, holidays, existingPTODays = [] } = config;
  const suggestedDays: Date[] = [];
  const periods: SuggestedPeriod[] = [];

  // Get bridge days and sequences
  const bridges = findBridgeDays(year, weekendDays, holidays, existingPTODays);
  const longSequences = findWorkdaySequences(year, 5, 7, weekendDays, holidays, existingPTODays);

  let remainingDays = availableDays;

  // First, add 1-2 longer breaks (5-7 days)
  const targetLongBreaks = Math.min(2, Math.floor(availableDays / 7));
  let addedLongBreaks = 0;

  for (const sequence of longSequences) {
    if (addedLongBreaks >= targetLongBreaks) break;
    if (sequence.ptoDaysRequired > remainingDays) continue;

    // Add all workdays in this period
    const dates = getDateRange(sequence.startDate, sequence.endDate);
    const workdays = dates.filter((d) => !isNonWorkingDay(d, weekendDays, holidays));

    suggestedDays.push(...workdays);
    periods.push(sequence);
    remainingDays -= workdays.length;
    addedLongBreaks++;
  }

  // Then fill with bridge days (long weekends)
  for (const bridge of bridges) {
    if (remainingDays <= 0) break;

    // Avoid overlaps
    if (suggestedDays.some((d) => d.getTime() === bridge.date.getTime())) continue;

    suggestedDays.push(bridge.date);
    remainingDays--;
  }

  return calculateResult(suggestedDays, periods, availableDays, weekendDays, holidays);
}

/**
 * Long Weekends Strategy
 * Focus on 3-4 day breaks by bridging weekends
 */
function optimizeLongWeekends(config: PTOOptimizerConfig): OptimizationResult {
  const { year, availableDays, weekendDays, holidays, existingPTODays = [] } = config;
  const suggestedDays: Date[] = [];
  const periods: SuggestedPeriod[] = [];

  // Get all bridge opportunities
  const bridges = findBridgeDays(year, weekendDays, holidays, existingPTODays);

  let remainingDays = availableDays;

  // Take the best bridge days
  for (const bridge of bridges) {
    if (remainingDays <= 0) break;

    suggestedDays.push(bridge.date);
    remainingDays--;
  }

  return calculateResult(suggestedDays, periods, availableDays, weekendDays, holidays);
}

/**
 * Mini Breaks Strategy
 * Several 5-6 day breaks spread across the year
 */
function optimizeMiniBreaks(config: PTOOptimizerConfig): OptimizationResult {
  const { year, availableDays, weekendDays, holidays, existingPTODays = [] } = config;
  const suggestedDays: Date[] = [];
  const periods: SuggestedPeriod[] = [];

  // Find 5-6 day sequences
  const sequences = findWorkdaySequences(year, 3, 5, weekendDays, holidays, existingPTODays);

  let remainingDays = availableDays;

  for (const sequence of sequences) {
    if (sequence.ptoDaysRequired > remainingDays) continue;

    const dates = getDateRange(sequence.startDate, sequence.endDate);
    const workdays = dates.filter((d) => !isNonWorkingDay(d, weekendDays, holidays));

    // Avoid overlaps
    const hasOverlap = workdays.some((wd) =>
      suggestedDays.some((sd) => sd.getTime() === wd.getTime())
    );
    if (hasOverlap) continue;

    suggestedDays.push(...workdays);
    periods.push(sequence);
    remainingDays -= workdays.length;
  }

  return calculateResult(suggestedDays, periods, availableDays, weekendDays, holidays);
}

/**
 * Week-Long Breaks Strategy
 * 7-9 day getaways
 */
function optimizeWeekLong(config: PTOOptimizerConfig): OptimizationResult {
  const { year, availableDays, weekendDays, holidays, existingPTODays = [] } = config;
  const suggestedDays: Date[] = [];
  const periods: SuggestedPeriod[] = [];

  // Find 7-9 day sequences
  const sequences = findWorkdaySequences(year, 5, 9, weekendDays, holidays, existingPTODays);

  let remainingDays = availableDays;

  for (const sequence of sequences) {
    if (sequence.ptoDaysRequired > remainingDays) continue;

    const dates = getDateRange(sequence.startDate, sequence.endDate);
    const workdays = dates.filter((d) => !isNonWorkingDay(d, weekendDays, holidays));

    // Avoid overlaps
    const hasOverlap = workdays.some((wd) =>
      suggestedDays.some((sd) => sd.getTime() === wd.getTime())
    );
    if (hasOverlap) continue;

    suggestedDays.push(...workdays);
    periods.push(sequence);
    remainingDays -= workdays.length;
  }

  return calculateResult(suggestedDays, periods, availableDays, weekendDays, holidays);
}

/**
 * Extended Vacations Strategy
 * 10-15 day breaks for deeper relaxation
 */
function optimizeExtended(config: PTOOptimizerConfig): OptimizationResult {
  const { year, availableDays, weekendDays, holidays, existingPTODays = [] } = config;
  const suggestedDays: Date[] = [];
  const periods: SuggestedPeriod[] = [];

  // Find 10-15 day sequences
  const sequences = findWorkdaySequences(year, 8, 15, weekendDays, holidays, existingPTODays);

  let remainingDays = availableDays;

  for (const sequence of sequences) {
    if (sequence.ptoDaysRequired > remainingDays) continue;

    const dates = getDateRange(sequence.startDate, sequence.endDate);
    const workdays = dates.filter((d) => !isNonWorkingDay(d, weekendDays, holidays));

    // Avoid overlaps
    const hasOverlap = workdays.some((wd) =>
      suggestedDays.some((sd) => sd.getTime() === wd.getTime())
    );
    if (hasOverlap) continue;

    suggestedDays.push(...workdays);
    periods.push(sequence);
    remainingDays -= workdays.length;
  }

  return calculateResult(suggestedDays, periods, availableDays, weekendDays, holidays);
}

/**
 * Calculate optimization result
 */
function calculateResult(
  suggestedDays: Date[],
  periods: SuggestedPeriod[],
  availableDays: number,
  weekendDays: number[],
  holidays: Date[]
): OptimizationResult {
  const totalPTOUsed = suggestedDays.length;

  // Calculate total days off (including adjacent weekends/holidays)
  let totalDaysOff = 0;
  const processedDates = new Set<string>();

  for (const day of suggestedDays) {
    if (processedDates.has(day.toISOString())) continue;

    // Find the full consecutive period including this day
    let start = new Date(day);
    let end = new Date(day);

    // Expand backwards
    while (
      isNonWorkingDay(addDays(start, -1), weekendDays, holidays) ||
      suggestedDays.some((d) => d.getTime() === addDays(start, -1).getTime())
    ) {
      start = addDays(start, -1);
    }

    // Expand forwards
    while (
      isNonWorkingDay(addDays(end, 1), weekendDays, holidays) ||
      suggestedDays.some((d) => d.getTime() === addDays(end, 1).getTime())
    ) {
      end = addDays(end, 1);
    }

    // Count all days in this period
    const periodDates = getDateRange(start, end);
    for (const date of periodDates) {
      const dateStr = date.toISOString();
      if (!processedDates.has(dateStr)) {
        totalDaysOff++;
        processedDates.add(dateStr);
      }
    }
  }

  const averageEfficiency = totalPTOUsed > 0 ? totalDaysOff / totalPTOUsed : 0;

  return {
    suggestedDays,
    periods,
    totalPTOUsed,
    totalDaysOff,
    averageEfficiency,
  };
}

// ============================================================================
// Main Optimizer Function
// ============================================================================

/**
 * Optimize PTO based on selected strategy
 */
export function optimizePTO(
  strategy: StrategyType,
  config: PTOOptimizerConfig
): OptimizationResult {
  switch (strategy) {
    case StrategyType.BALANCED_MIX:
      return optimizeBalancedMix(config);
    case StrategyType.LONG_WEEKENDS:
      return optimizeLongWeekends(config);
    case StrategyType.MINI_BREAKS:
      return optimizeMiniBreaks(config);
    case StrategyType.WEEK_LONG:
      return optimizeWeekLong(config);
    case StrategyType.EXTENDED:
      return optimizeExtended(config);
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}
