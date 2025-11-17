'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePlanner } from '@/contexts/PlannerContext';
import type { SuggestedBreak } from '@/types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export enum DayType {
  NORMAL = 'normal',
  WEEKEND = 'weekend',
  PUBLIC_HOLIDAY = 'public-holiday',
  SELECTED_PTO = 'selected-pto',
  SUGGESTED_PTO = 'suggested-pto',
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatAmount = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const normalized = Math.abs(value) < 0.0001 ? 0 : value;
  const isWhole = Math.abs(normalized - Math.round(normalized)) < 0.0001;

  return normalized.toLocaleString(undefined, {
    minimumFractionDigits: isWhole ? 0 : 1,
    maximumFractionDigits: isWhole ? 0 : 2,
  });
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const isToday = (date: Date) => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const getDayClasses = (type: DayType, options: { isToday?: boolean } = {}) => {
  const { isToday = false } = options;

  const baseClasses =
    'w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-card text-xs font-semibold text-foreground transition-colors';

  const typeClasses = {
    [DayType.NORMAL]: 'hover:bg-muted/80',
    [DayType.WEEKEND]: 'bg-muted text-muted-foreground',
    [DayType.PUBLIC_HOLIDAY]: 'bg-holiday text-holiday-foreground',
    [DayType.SELECTED_PTO]: 'bg-primary text-primary-foreground',
    [DayType.SUGGESTED_PTO]: 'bg-suggested text-suggested-foreground',
  } satisfies Record<DayType, string>;

  return cn(baseClasses, typeClasses[type], isToday && '!ring-[3px] !ring-foreground');
};

const formatEfficiency = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return `${value.toFixed(2)}×`;
};

interface BreakDayMeta {
  breakItem: SuggestedBreak;
}

export interface MonthCardProps {
  month: Date;
  onDayClick: (date: Date) => void;
  className?: string;
}

const MonthCard: React.FC<MonthCardProps> = ({ month, onDayClick, className }) => {
  const {
    isDateSelected,
    isDateSuggested,
    isDateHoliday,
    isDateWeekend,
    getSettings,
    getBalanceAsOf,
    getAccruedAmountUntil,
    getUsedAmountBefore,
    lastOptimizationResult,
  } = usePlanner();

  const suggestedBreaks = lastOptimizationResult?.breaks ?? [];

  const breakDayMap = useMemo(() => {
    const map = new Map<string, BreakDayMeta>();
    suggestedBreaks.forEach((breakItem) => {
      let cursor = startOfDay(breakItem.start);
      const end = startOfDay(breakItem.end);

      while (cursor <= end) {
        map.set(getDateKey(cursor), { breakItem });
        cursor = addDays(cursor, 1);
      }
    });
    return map;
  }, [suggestedBreaks]);

  const monthStart = useMemo(() => new Date(month.getFullYear(), month.getMonth(), 1), [month]);
  const monthYear = monthStart.getFullYear();
  const monthIndex = monthStart.getMonth();
  const nextMonthStart = useMemo(
    () => new Date(monthYear, monthIndex + 1, 1),
    [monthYear, monthIndex],
  );

  const settings = getSettings();
  const unitLabel = settings.pto_display_unit === 'hours' ? 'hours' : 'days';

  const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
  const firstDayOfMonth = monthStart.getDay();

  const balanceAtStart = getBalanceAsOf(monthStart);
  const balanceNextMonth = getBalanceAsOf(nextMonthStart);
  const accruedToDate = getAccruedAmountUntil(monthStart);
  const accruedByNextMonth = getAccruedAmountUntil(nextMonthStart);
  const accruedThisMonth = Math.max(0, accruedByNextMonth - accruedToDate);
  const usedBeforeMonth = getUsedAmountBefore(monthStart);
  const usedByEndOfMonth = getUsedAmountBefore(nextMonthStart);
  const usedThisMonth = Math.max(0, usedByEndOfMonth - usedBeforeMonth);

  const totalAvailableToDate = balanceAtStart + usedBeforeMonth;
  const totalCapacity = Math.max(totalAvailableToDate, 0);
  const rawProgress =
    totalCapacity <= 0 ? 0 : (balanceAtStart / totalCapacity) * 100;
  const progressPercent = Math.min(
    100,
    Math.max(0, Number.isFinite(rawProgress) ? rawProgress : 0),
  );

  const badgeClass =
    'rounded-full border border-border/70 bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground';

  const progressTrackClass = 'bg-muted/60';
  const progressColor =
    balanceAtStart < 0 ? 'bg-destructive' : 'bg-primary';

  const monthTooltip = useMemo(() => {
    const lines = [
      `${MONTH_NAMES[monthIndex]} ${monthYear}`,
      `Start of month: ${formatAmount(balanceAtStart)} ${unitLabel}`,
      `Accrued to date: ${formatAmount(accruedToDate)} ${unitLabel}`,
      `Used before month: ${formatAmount(usedBeforeMonth)} ${unitLabel}`,
    ];

    if (accruedThisMonth > 0.0001) {
      lines.push(
        `Accruing this month: ${formatAmount(accruedThisMonth)} ${unitLabel}`,
      );
    }

    if (usedThisMonth > 0.0001) {
      lines.push(
        `Allocated this month: ${formatAmount(usedThisMonth)} ${unitLabel}`,
      );
    }

    lines.push(
      `Projected next month start: ${formatAmount(balanceNextMonth)} ${unitLabel}`,
    );

    return lines.join('\n');
  }, [
    monthIndex,
    monthYear,
    balanceAtStart,
    unitLabel,
    accruedToDate,
    usedBeforeMonth,
    accruedThisMonth,
    usedThisMonth,
    balanceNextMonth,
  ]);

  const days = useMemo(() => {
    const result: React.ReactNode[] = [];

    for (let i = 0; i < firstDayOfMonth; i += 1) {
      result.push(
        <div key={`empty-${i}`} className="w-8 h-8 md:w-10 md:h-10" />,
      );
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(monthYear, monthIndex, day);
      const previousDay = addDays(date, -1);
      const nextDay = addDays(date, 1);
      const balanceAtDayStart = getBalanceAsOf(date);
      const balanceAfterDay = getBalanceAsOf(nextDay);
      const usedBeforeDay = getUsedAmountBefore(date);
      const usedBeforeNextDay = getUsedAmountBefore(nextDay);
      const usedOnDay = Math.max(0, usedBeforeNextDay - usedBeforeDay);

      const dayTooltipLines = [
        formatDateLabel(date),
        `Start balance: ${formatAmount(balanceAtDayStart)} ${unitLabel}`,
        `After this day: ${formatAmount(balanceAfterDay)} ${unitLabel}`,
      ];

      if (usedOnDay > 0.0001) {
        dayTooltipLines.push(
          `Allocated on this day: ${formatAmount(usedOnDay)} ${unitLabel}`,
        );
      }

      const breakMeta = breakDayMap.get(getDateKey(date));
      const previousMeta = breakMeta && breakDayMap.get(getDateKey(previousDay));
      const nextMeta = breakMeta && breakDayMap.get(getDateKey(addDays(date, 1)));
      const isSequenceStart =
        !!breakMeta &&
        (!previousMeta || previousMeta.breakItem.id !== breakMeta.breakItem.id);
      const isSequenceEnd =
        !!breakMeta &&
        (!nextMeta || nextMeta.breakItem.id !== breakMeta.breakItem.id);
      const isSoloBreakDay = isSequenceStart && isSequenceEnd;

      if (breakMeta) {
        dayTooltipLines.push(
          `Suggested streak: ${breakMeta.breakItem.totalDaysOff} days (${formatEfficiency(
            breakMeta.breakItem.efficiency,
          )})`,
        );
      }

      const isCurrentDay = isToday(date);

      const dayType = isDateSelected(date)
        ? DayType.SELECTED_PTO
        : isDateSuggested(date)
        ? DayType.SUGGESTED_PTO
        : isDateHoliday(date)
        ? DayType.PUBLIC_HOLIDAY
        : isDateWeekend(date)
        ? DayType.WEEKEND
        : DayType.NORMAL;

      const overlayPadding = 10;
      const extendPadding = 16;
      const crossMonthExtension = 2;
      const crossWeekExtension = 2;
      const dayOfWeek = date.getDay();
      const crossesFromPreviousMonth = !isSequenceStart && previousDay.getMonth() !== monthIndex;
      const crossesIntoNextMonth = !isSequenceEnd && nextDay.getMonth() !== monthIndex;
      const crossesFromPreviousWeek =
        !isSequenceStart && !!previousMeta && dayOfWeek === 0;
      const crossesIntoNextWeek =
        !isSequenceEnd && !!nextMeta && dayOfWeek === 6;
      const leftOffset = isSequenceStart || isSoloBreakDay
        ? overlayPadding
        : crossesFromPreviousMonth
        ? -crossMonthExtension
        : crossesFromPreviousWeek
        ? -crossWeekExtension
        : -extendPadding;
      const rightOffset = isSequenceEnd || isSoloBreakDay
        ? overlayPadding
        : crossesIntoNextMonth
        ? -crossMonthExtension
        : crossesIntoNextWeek
        ? -crossWeekExtension
        : -extendPadding;
      const overlayStyle: React.CSSProperties = {
        left: `${leftOffset}px`,
        right: `${rightOffset}px`,
        top: '50%',
        height: '1.75rem',
        transform: 'translateY(-50%)',
      };

      const backgroundRadius = cn(
        isSoloBreakDay
          ? 'rounded-full'
          : isSequenceStart
          ? 'rounded-l-full'
          : isSequenceEnd
          ? 'rounded-r-full'
          : 'rounded-none',
      );

      const dayNode = (
        <div
          key={`day-${day}`}
          className="relative flex h-full w-full items-center justify-center"
        >
          {breakMeta && (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute bg-muted',
                  backgroundRadius,
                )}
                style={{ ...overlayStyle, opacity: 0.3 }}
              />
            </>
          )}
          <div
            className={cn(
              getDayClasses(dayType, { isToday: isCurrentDay }),
              'relative z-[1]',
            )}
            onClick={() => onDayClick(date)}
            title={dayTooltipLines.join('\n')}
            aria-label={dayTooltipLines.join('. ')}
          >
            {day}
          </div>
          {breakMeta && isSequenceEnd && (
            <span
              className="pointer-events-none absolute right-0 top-1/2 z-[2] flex -translate-y-1/2 translate-x-1/2 items-center rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-sm"
              title={`Suggested streak: ${breakMeta.breakItem.totalDaysOff} days (${formatEfficiency(
                breakMeta.breakItem.efficiency,
              )})`}
            >
              {breakMeta.breakItem.totalDaysOff}d
            </span>
          )}
        </div>
      );

      result.push(dayNode);
    }

    const totalSlotsUsed = firstDayOfMonth + daysInMonth;
    const totalSlots = 7 * Math.max(6, Math.ceil(totalSlotsUsed / 7));
    const trailingSlots = totalSlots - totalSlotsUsed;

    for (let i = 0; i < trailingSlots; i += 1) {
      result.push(
        <div key={`empty-trailing-${i}`} className="w-8 h-8 md:w-10 md:h-10" />,
      );
    }

    return result;
  }, [
    firstDayOfMonth,
    daysInMonth,
    monthYear,
    monthIndex,
    getBalanceAsOf,
    getUsedAmountBefore,
    unitLabel,
    onDayClick,
    isDateSelected,
    isDateSuggested,
    isDateHoliday,
    isDateWeekend,
    breakDayMap,
  ]);

  return (
    <div className={cn('mb-6', className)}>
      <div className="mb-3" title={monthTooltip}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-lg text-foreground">{MONTH_NAMES[monthIndex]}</h3>
          <span className={badgeClass}>
            {formatAmount(balanceAtStart)} {unitLabel}
          </span>
        </div>
        <div className={cn('mt-2 h-1 overflow-hidden rounded-full', progressTrackClass)}>
          <div
            className={cn('h-full rounded-full transition-all', progressColor)}
            style={{ width: `${progressPercent}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="sr-only">
          {`PTO remaining at the start of ${MONTH_NAMES[monthIndex]}: ${formatAmount(
            Math.max(balanceAtStart, 0),
          )} ${unitLabel} of ${formatAmount(totalCapacity)} ${unitLabel}`}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((dayLabel) => (
          <div
            key={dayLabel}
            className="text-xs text-center font-medium text-muted-foreground"
          >
            {dayLabel}
          </div>
        ))}
        {days}
      </div>
    </div>
  );
};

export default MonthCard;
