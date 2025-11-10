'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  addYears,
  differenceInCalendarMonths,
  eachMonthOfInterval,
  format,
  startOfMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import MonthCard from './MonthCard';
import { cn } from '@/lib/utils';
import { usePlanner } from '@/contexts/PlannerContext';
import { addPTODay, deletePTODay } from '@/app/actions/pto-actions';
import { formatDateLocal, parseDateLocal } from '@/lib/date-utils';
import {
  useCalendarNavigationDispatch,
  type CalendarNavigationState,
} from '@/contexts/CalendarNavigationContext';
import { Button } from '@/components/ui/button';

const MONTHS_PER_ROW = 3;
const BACK_YEARS = 2;
const FORWARD_YEARS = 5;
const ESTIMATED_ROW_HEIGHT = 520;
const OVERSCAN_ROWS = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getRowLabel = (months: Date[]) => {
  if (months.length === 0) {
    return '';
  }

  if (months.length === 1) {
    return format(months[0], 'MMMM yyyy');
  }

  const first = months[0];
  const last = months[months.length - 1];

  if (format(first, 'yyyy') === format(last, 'yyyy')) {
    return `${format(first, 'MMM')} – ${format(last, 'MMM yyyy')}`;
  }

  return `${format(first, 'MMM yyyy')} – ${format(last, 'MMM yyyy')}`;
};

const VirtualizedCalendar: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [processingDates, setProcessingDates] = useState<Set<string>>(new Set());
  const [hasInitialScroll, setHasInitialScroll] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    isDateSelected,
    toggleDaySelection,
    isAuthenticated,
    getSettings,
    refreshHolidays,
    getHolidays,
    countryCode,
  } = usePlanner();
  const setNavigationState = useCalendarNavigationDispatch();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const today = useMemo(() => new Date(), []);
  const anchorMonth = useMemo(() => startOfMonth(today), [today]);
  const minMonth = useMemo(
    () => startOfMonth(addYears(anchorMonth, -BACK_YEARS)),
    [anchorMonth],
  );
  const maxMonth = useMemo(
    () => startOfMonth(addYears(anchorMonth, FORWARD_YEARS)),
    [anchorMonth],
  );

  const monthKeys = useMemo(
    () => eachMonthOfInterval({ start: minMonth, end: maxMonth }),
    [minMonth, maxMonth],
  );

  const rowCount = useMemo(
    () => Math.max(1, Math.ceil(monthKeys.length / MONTHS_PER_ROW)),
    [monthKeys.length],
  );

  const anchorIndex = useMemo(
    () => differenceInCalendarMonths(anchorMonth, minMonth),
    [anchorMonth, minMonth],
  );

  const todayRow = useMemo(
    () => clamp(Math.floor(anchorIndex / MONTHS_PER_ROW), 0, rowCount - 1),
    [anchorIndex, rowCount],
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  const prefetchedYearsRef = useRef<Set<number>>(
    new Set([anchorMonth.getFullYear()]),
  );
  const inFlightYearsRef = useRef<Set<number>>(new Set());

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: OVERSCAN_ROWS,
    initialOffset: todayRow * ESTIMATED_ROW_HEIGHT,
  });

  const monthsForRow = useCallback(
    (rowIndex: number) => {
      const startIndex = rowIndex * MONTHS_PER_ROW;
      const slice = monthKeys.slice(startIndex, startIndex + MONTHS_PER_ROW);
      return slice.filter(Boolean) as Date[];
    },
    [monthKeys],
  );

  useEffect(() => {
    if (hasInitialScroll) {
      return;
    }

    if (!scrollerRef.current) {
      return;
    }

    const id = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(todayRow, {
        align: 'start',
        behavior: 'auto',
      });
      setHasInitialScroll(true);
    });

    return () => cancelAnimationFrame(id);
  }, [hasInitialScroll, todayRow, virtualizer]);

  const virtualItems = virtualizer.getVirtualItems();
  const currentRow = virtualItems[0]?.index ?? todayRow;
  const visibleMonths = monthsForRow(currentRow);

  const canGoPrev = currentRow > 0;
  const canGoNext = currentRow < rowCount - 1;

  const scrollToRow = useCallback(
    (targetRow: number, behavior: 'auto' | 'smooth' = 'smooth') => {
      const clamped = clamp(targetRow, 0, rowCount - 1);
      virtualizer.scrollToIndex(clamped, {
        align: 'start',
        behavior,
      });
    },
    [rowCount, virtualizer],
  );

  const goPrev = useCallback(() => {
    if (!canGoPrev) {
      return;
    }
    scrollToRow(currentRow - 1);
  }, [canGoPrev, currentRow, scrollToRow]);

  const goNext = useCallback(() => {
    if (!canGoNext) {
      return;
    }
    scrollToRow(currentRow + 1);
  }, [canGoNext, currentRow, scrollToRow]);

  const goToday = useCallback(() => {
    scrollToRow(todayRow, 'smooth');
  }, [scrollToRow, todayRow]);

  const handleDayClick = useCallback(
    (date: Date) => {
      const dateStr = formatDateLocal(date);

      if (processingDates.has(dateStr)) {
        return;
      }

      const wasSelected = isDateSelected(date);

      toggleDaySelection(date);

      if (!isAuthenticated) {
        return;
      }

      setProcessingDates((prev) => {
        const next = new Set(prev);
        next.add(dateStr);
        return next;
      });

      startTransition(async () => {
        try {
          if (wasSelected) {
            const result = await deletePTODay(dateStr);
            if (!result.success) {
              console.error('Failed to delete PTO day:', result.error);
              toggleDaySelection(date);
            }
          } else {
            const settings = getSettings();
            const ptoAmount =
              settings.pto_display_unit === 'hours'
                ? settings.hours_per_day || 8
                : 1;
            const result = await addPTODay(dateStr, ptoAmount);
            if (!result.success) {
              console.error('Failed to add PTO day:', result.error);
              toggleDaySelection(date);
            }
          }
        } catch (error) {
          console.error('Error updating PTO day:', error);
          toggleDaySelection(date);
        } finally {
          setProcessingDates((prev) => {
            const next = new Set(prev);
            next.delete(dateStr);
            return next;
          });
        }
      });
    },
    [
      processingDates,
      isDateSelected,
      toggleDaySelection,
      isAuthenticated,
      startTransition,
      getSettings,
    ],
  );

  const navState = useMemo<CalendarNavigationState>(
    () => ({
      goPrev,
      goNext,
      goToday,
      canGoPrev,
      canGoNext,
      label: getRowLabel(visibleMonths),
      isBusy: isPending,
    }),
    [
      goPrev,
      goNext,
      goToday,
      canGoPrev,
      canGoNext,
      visibleMonths,
      isPending,
    ],
  );

  useEffect(() => {
    setNavigationState(navState);
  }, [navState, setNavigationState]);

  useEffect(() => {
    const holidays = getHolidays();
    const years = prefetchedYearsRef.current;

    holidays.forEach((holiday) => {
      if (holiday.repeats_yearly) {
        // Treat as covering entire range; no action needed for specific years
        return;
      }

      try {
        const date = parseDateLocal(holiday.date);
        if (!Number.isNaN(date.getTime())) {
          years.add(date.getFullYear());
        }
      } catch (error) {
        console.warn('Unable to parse holiday date for caching', holiday.date, error);
      }
    });
  }, [getHolidays]);

  useEffect(() => {
    const yearsToConsider = new Set<number>();
    const rowsToCheck = [currentRow - 1, currentRow, currentRow + 1].filter(
      (index): index is number => index >= 0 && index < rowCount,
    );

    rowsToCheck.forEach((row) => {
      monthsForRow(row).forEach((month) => {
        yearsToConsider.add(month.getFullYear());
      });
    });

    const yearsToFetch = Array.from(yearsToConsider).filter((year) => {
      const alreadyPrefetched = prefetchedYearsRef.current.has(year);
      const inFlight = inFlightYearsRef.current.has(year);
      return !alreadyPrefetched && !inFlight;
    });

    if (!yearsToFetch.length) {
      return;
    }

    let cancelled = false;

    yearsToFetch.forEach((year) => inFlightYearsRef.current.add(year));

    (async () => {
      for (const year of yearsToFetch) {
        try {
          const result = await refreshHolidays(countryCode, {
            year,
            replaceExisting: false,
            persistCountry: false,
            silent: true,
          });
          if (!cancelled) {
            if (result.success) {
              prefetchedYearsRef.current.add(year);
            } else {
              console.warn('Holiday prefetch failed', year, result.error);
            }
          }
        } catch (error) {
          if (!cancelled) {
            console.error('Holiday prefetch error', year, error);
          }
        } finally {
          inFlightYearsRef.current.delete(year);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentRow, rowCount, monthsForRow, refreshHolidays, countryCode]);

  if (!isMounted) {
    return (
      <div className="mx-auto w-full max-w-7xl px-0">
        <div className="overflow-hidden rounded-[32px] border-2 border-border bg-card p-6">
          <div className="flex h-80 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading calendar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-0">
      <div className="overflow-hidden rounded-[32px] border-2 border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium text-muted-foreground">
              {navState.label || 'Current months'}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={!canGoPrev || isPending}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
              </Button>
              <Button variant="outline" size="sm" onClick={goToday} disabled={isPending}>
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goNext}
                disabled={!canGoNext || isPending}
              >
                <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className={cn(
            'relative h-[78vh] overflow-y-auto px-6 py-6',
            isPending ? 'opacity-95' : 'opacity-100',
          )}
          style={{ scrollbarGutter: 'stable' }}
        >
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}
          >
            {virtualItems.map((item) => {
              const months = monthsForRow(item.index);
              return (
                <div
                  key={item.key}
                  ref={virtualizer.measureElement}
                  data-index={item.index}
                  className="absolute left-0 w-full px-1"
                  style={{
                    transform: `translateY(${item.start}px)`,
                    top: 0,
                  }}
                >
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {months.map((month) => (
                      <MonthCard key={format(month, 'yyyy-MM')} month={month} onDayClick={handleDayClick} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualizedCalendar;
