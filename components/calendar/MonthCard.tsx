'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePlanner } from '@/contexts/PlannerContext';

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
  TODAY = 'today',
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
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

const getDayClasses = (type: DayType) => {
  const baseClasses =
    'w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full cursor-pointer text-xs';

  const typeClasses = {
    [DayType.NORMAL]: 'hover:bg-gray-200 dark:hover:bg-gray-700',
    [DayType.WEEKEND]: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    [DayType.PUBLIC_HOLIDAY]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    [DayType.SELECTED_PTO]: 'bg-green-500 text-white',
    [DayType.SUGGESTED_PTO]:
      'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200',
    [DayType.TODAY]: 'ring-2 ring-blue-500 font-bold',
  } satisfies Record<DayType, string>;

  return cn(baseClasses, typeClasses[type]);
};

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
  } = usePlanner();

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
    balanceAtStart < 0
      ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200'
      : balanceAtStart === 0
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200';

  const progressColor =
    progressPercent <= 20
      ? 'bg-red-500/80 dark:bg-red-400/80'
      : progressPercent <= 50
      ? 'bg-amber-500/80 dark:bg-amber-400/80'
      : 'bg-emerald-500/80 dark:bg-emerald-400/80';

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

      const dayType = isToday(date)
        ? DayType.TODAY
        : isDateSelected(date)
        ? DayType.SELECTED_PTO
        : isDateSuggested(date)
        ? DayType.SUGGESTED_PTO
        : isDateHoliday(date)
        ? DayType.PUBLIC_HOLIDAY
        : isDateWeekend(date)
        ? DayType.WEEKEND
        : DayType.NORMAL;

      result.push(
        <div
          key={`day-${day}`}
          className={getDayClasses(dayType)}
          onClick={() => onDayClick(date)}
          title={dayTooltipLines.join('\n')}
          aria-label={dayTooltipLines.join('. ')}
        >
          {day}
        </div>,
      );
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
  ]);

  return (
    <div className={cn('mb-6', className)}>
      <div className="mb-3" title={monthTooltip}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{MONTH_NAMES[monthIndex]}</h3>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              badgeClass,
            )}
          >
            {formatAmount(balanceAtStart)} {unitLabel}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/70">
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
            className="text-xs text-center font-medium text-gray-500"
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


