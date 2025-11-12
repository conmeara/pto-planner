const CALENDAR_PAST_YEARS = 2;
const CALENDAR_FUTURE_YEARS = 2;

export const CALENDAR_TOTAL_YEARS =
  CALENDAR_PAST_YEARS + CALENDAR_FUTURE_YEARS + 1;

export const getCalendarYearBounds = (referenceDate: Date = new Date()) => {
  const baseYear = referenceDate.getFullYear();
  return {
    startYear: baseYear - CALENDAR_PAST_YEARS,
    endYear: baseYear + CALENDAR_FUTURE_YEARS,
  };
};

export { CALENDAR_PAST_YEARS, CALENDAR_FUTURE_YEARS };
