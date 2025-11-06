'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { usePlanner } from '@/contexts/PlannerContext';
import { addPTODay, deletePTODay } from '@/app/actions/pto-actions';
import { formatDateLocal } from '@/lib/date-utils';

// Day type enum
export enum DayType {
  NORMAL = 'normal',
  WEEKEND = 'weekend',
  PUBLIC_HOLIDAY = 'public-holiday',
  SELECTED_PTO = 'selected-pto',
  SUGGESTED_PTO = 'suggested-pto',
  TODAY = 'today'
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const Calendar: React.FC = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isDesktop, setIsDesktop] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [processingDates, setProcessingDates] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  // Get data from context
  const {
    selectedDays,
    suggestedDays,
    isDateSelected,
    isDateSuggested,
    isDateHoliday,
    isDateWeekend,
    toggleDaySelection,
    plannerData,
    isAuthenticated,
    getSettings,
    getBalanceAsOf,
    getUsedAmountBefore,
    getAccruedAmountUntil,
  } = usePlanner();

  const settings = getSettings();
  const unitLabel = settings.pto_display_unit === 'hours' ? 'hours' : 'days';

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

  // Prevent hydration mismatch by only rendering calendar after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get weekend days from context (works with localStorage or DB)
  const weekendDays = plannerData?.weekendConfig
    ?.filter((config) => config.is_weekend)
    .map((config) => config.day_of_week) || [0, 6];

  // Check if we're on desktop or mobile
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768); // 768px is a common breakpoint for tablet/desktop
    };

    // Set initial value
    handleResize();

    // Add event listener for window resize
    window.addEventListener('resize', handleResize);

    // Clean up event listener
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigate to previous year
  const prevYear = () => {
    setCurrentYear(currentYear - 1);
  };

  // Navigate to next year
  const nextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  // Navigate to current year
  const goToToday = () => {
    setCurrentYear(new Date().getFullYear());
  };


  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  // Get the day type for styling
  const getDayType = (date: Date): DayType => {
    if (isToday(date)) return DayType.TODAY;
    if (isDateSelected(date)) return DayType.SELECTED_PTO;
    if (isDateSuggested(date)) return DayType.SUGGESTED_PTO;
    if (isDateHoliday(date)) return DayType.PUBLIC_HOLIDAY;
    if (isDateWeekend(date)) return DayType.WEEKEND;
    return DayType.NORMAL;
  };

  // Get CSS classes for a day based on its type
  const getDayClasses = (date: Date) => {
    const type = getDayType(date);
    
    const baseClasses = "w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full cursor-pointer text-xs";
    
    const typeClasses = {
      [DayType.NORMAL]: "hover:bg-gray-200 dark:hover:bg-gray-700",
      [DayType.WEEKEND]: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
      [DayType.PUBLIC_HOLIDAY]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      [DayType.SELECTED_PTO]: "bg-green-500 text-white",
      [DayType.SUGGESTED_PTO]: "bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200",
      [DayType.TODAY]: "ring-2 ring-blue-500 font-bold"
    };
    
    return cn(baseClasses, typeClasses[type]);
  };

  // Handle day click with server action (if authenticated) or localStorage (if not)
  const handleDayClick = async (date: Date) => {
    const dateStr = formatDateLocal(date);

    // Don't process if already processing this date
    if (processingDates.has(dateStr)) {
      return;
    }

    // Optimistically update UI immediately
    toggleDaySelection(date);

    // If not authenticated, just use localStorage (handled by context)
    if (!isAuthenticated) {
      return;
    }

    // If authenticated, persist to database
    setProcessingDates((prev) => new Set([...prev, dateStr]));

    startTransition(async () => {
      try {
        const isSelected = isDateSelected(date);

        if (isSelected) {
          // Date was selected, now delete it
          const result = await deletePTODay(dateStr);
          if (!result.success) {
            console.error('Failed to delete PTO day:', result.error);
            // Revert optimistic update on error
            toggleDaySelection(date);
          }
        } else {
          // Date was not selected, add it
          const settings = getSettings();
          const ptoAmount = settings.pto_display_unit === 'hours'
            ? settings.hours_per_day || 8
            : 1;

          const result = await addPTODay(dateStr, ptoAmount);
          if (!result.success) {
            console.error('Failed to add PTO day:', result.error);
            // Revert optimistic update on error
            toggleDaySelection(date);
          }
        }
      } catch (error) {
        console.error('Error updating PTO day:', error);
        // Revert optimistic update on error
        toggleDaySelection(date);
      } finally {
        // Remove from processing set
        setProcessingDates((prev) => {
          const next = new Set(prev);
          next.delete(dateStr);
          return next;
        });
      }
    });
  };

  // Render a month
  const renderMonth = (month: number) => {
    const monthStart = new Date(currentYear, month, 1);
    const nextMonthStart = new Date(currentYear, month + 1, 1);
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
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
    const rawProgress = totalCapacity <= 0
      ? 0
      : (balanceAtStart / totalCapacity) * 100;
    const progressPercent = Math.min(100, Math.max(0, Number.isFinite(rawProgress) ? rawProgress : 0));

    const badgeClass = balanceAtStart < 0
      ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200'
      : balanceAtStart === 0
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200';

    const progressColor = progressPercent <= 20
      ? 'bg-red-500/80 dark:bg-red-400/80'
      : progressPercent <= 50
      ? 'bg-amber-500/80 dark:bg-amber-400/80'
      : 'bg-emerald-500/80 dark:bg-emerald-400/80';

    const monthTooltipLines = [
      `${MONTHS[month]} ${currentYear}`,
      `Start of month: ${formatAmount(balanceAtStart)} ${unitLabel}`,
      `Accrued to date: ${formatAmount(accruedToDate)} ${unitLabel}`,
      `Used before month: ${formatAmount(usedBeforeMonth)} ${unitLabel}`,
    ];

    if (accruedThisMonth > 0.0001) {
      monthTooltipLines.push(`Accruing this month: ${formatAmount(accruedThisMonth)} ${unitLabel}`);
    }

    if (usedThisMonth > 0.0001) {
      monthTooltipLines.push(`Allocated this month: ${formatAmount(usedThisMonth)} ${unitLabel}`);
    }

    monthTooltipLines.push(`Projected next month start: ${formatAmount(balanceNextMonth)} ${unitLabel}`);

    const monthTooltip = monthTooltipLines.join('\n');

    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8 md:w-10 md:h-10"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, month, day);
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
        dayTooltipLines.push(`Allocated on this day: ${formatAmount(usedOnDay)} ${unitLabel}`);
      }

      const dayTitle = dayTooltipLines.join('\n');

      days.push(
        <div
          key={`day-${day}`}
          className={getDayClasses(date)}
          onClick={() => handleDayClick(date)}
          title={dayTitle}
          aria-label={dayTooltipLines.join('. ')}
        >
          {day}
        </div>
      );
    }

    return (
      <div key={`month-${month}`} className="mb-6">
        <div className="mb-3" title={monthTooltip}>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{MONTHS[month]}</h3>
            <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', badgeClass)}>
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
            {`PTO remaining at the start of ${MONTHS[month]}: ${formatAmount(Math.max(balanceAtStart, 0))} ${unitLabel} of ${formatAmount(totalCapacity)} ${unitLabel}`}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map((dayLabel) => (
            <div key={dayLabel} className="text-xs text-center font-medium text-gray-500">
              {dayLabel}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  // Prevent hydration mismatch - only render after client-side mount
  if (!mounted) {
    return (
      <div className="mx-auto w-full max-w-6xl px-2 sm:px-0">
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-700/60 dark:bg-slate-950/70">
          <div className="flex h-80 items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-2 sm:px-0">
      <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-slate-700/60 dark:bg-slate-950/70 sm:p-6">
        {/* Year navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 md:flex-nowrap">
          <Button variant="outline" size="sm" onClick={prevYear}>
            <ChevronLeft className="h-4 w-4" />
            <span className="ml-1">Prev</span>
          </Button>

          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{currentYear}</h2>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={nextYear}>
            <span className="mr-1">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar grid */}
        <div className={cn('mt-6', isDesktop ? 'grid grid-cols-3 gap-4' : 'space-y-6')}>
          {isDesktop ? (
            // Desktop view: show all months in a 3-column grid
            Array.from({ length: 12 }, (_, i) => renderMonth(i))
          ) : (
            // Mobile view: show only current month (can be scrolled to others)
            renderMonth(new Date().getMonth())
          )}
        </div>

        {/* Mobile view navigation (shown only on mobile) */}
        {!isDesktop && (
          <div className="mt-4 flex justify-center">
            <div className="flex gap-2">
              {Array.from({ length: 12 }, (_, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    // Scroll to month (to be implemented)
                  }}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar; 