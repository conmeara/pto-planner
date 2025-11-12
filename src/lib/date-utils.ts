/**
 * Date utility functions for timezone-safe date operations
 *
 * These functions handle date conversions without timezone side effects.
 * Always use these instead of toISOString() for date comparisons and storage.
 */

/**
 * Formats a Date object as YYYY-MM-DD in local timezone
 * Use this instead of date.toISOString().split('T')[0]
 *
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format (local timezone)
 *
 * @example
 * const date = new Date(2024, 10, 28); // Nov 28, 2024 local time
 * formatDateLocal(date); // "2024-11-28" (regardless of timezone)
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date string (YYYY-MM-DD) as local timezone
 * Use this instead of new Date(dateStr) to avoid timezone shifts
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object at midnight local time
 *
 * @example
 * parseDateLocal("2024-11-28"); // Nov 28, 2024 00:00:00 local time
 */
export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Compares two dates for equality (ignoring time)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Checks if a date matches a holiday date string
 * Handles both repeating (year-agnostic) and non-repeating holidays
 *
 * @param date - Date to check
 * @param holidayDateStr - Holiday date string (YYYY-MM-DD)
 * @param repeatsYearly - Whether the holiday repeats every year
 * @returns true if the date matches the holiday
 */
export function matchesHoliday(
  date: Date,
  holidayDateStr: string,
  repeatsYearly: boolean
): boolean {
  const holidayDate = parseDateLocal(holidayDateStr);

  if (repeatsYearly) {
    // For repeating holidays, only check month and day
    return (
      holidayDate.getMonth() === date.getMonth() &&
      holidayDate.getDate() === date.getDate()
    );
  }

  // For non-repeating holidays, exact match
  return isSameDay(date, holidayDate);
}
