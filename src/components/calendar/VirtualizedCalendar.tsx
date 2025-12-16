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
import { getCalendarYearBounds } from '@/lib/calendar-range';

// Breakpoints matching Tailwind: sm=640, md=768, lg=1024
const TABLET_BREAKPOINT = 640;
const DESKTOP_BREAKPOINT = 1024;

const ESTIMATED_ROW_HEIGHT_MOBILE = 420;
const ESTIMATED_ROW_HEIGHT_TABLET = 480;
const ESTIMATED_ROW_HEIGHT_DESKTOP = 520;
const OVERSCAN_ROWS = 4;

function useResponsiveColumns() {
  const [columns, setColumns] = useState(3); // Default to desktop

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < TABLET_BREAKPOINT) {
        setColumns(1);
      } else if (width < DESKTOP_BREAKPOINT) {
        setColumns(2);
      } else {
        setColumns(3);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  return columns;
}

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

  console.log('[getRowLabel] Generating label for months:', {
    first: first.toISOString(),
    last: last.toISOString(),
    firstYear: first.getFullYear(),
    lastYear: last.getFullYear()
  });

  if (format(first, 'yyyy') === format(last, 'yyyy')) {
    return `${format(first, 'MMM')} – ${format(last, 'MMM yyyy')}`;
  }

  return `${format(first, 'MMM yyyy')} – ${format(last, 'MMM yyyy')}`;
};

const VirtualizedCalendar: React.FC = () => {
  const [isMounted, setIsMounted] = useState(false);
  const [processingDates, setProcessingDates] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [today] = useState(() => {
    const currentDate = new Date();
    console.log('[VirtualizedCalendar] Initializing with date:', currentDate.toISOString(), 'Year:', currentDate.getFullYear());
    return currentDate;
  });

  const monthsPerRow = useResponsiveColumns();
  const estimatedRowHeight = monthsPerRow === 1
    ? ESTIMATED_ROW_HEIGHT_MOBILE
    : monthsPerRow === 2
    ? ESTIMATED_ROW_HEIGHT_TABLET
    : ESTIMATED_ROW_HEIGHT_DESKTOP;

  const calendarBounds = useMemo(() => getCalendarYearBounds(today), [today]);
  const { startYear, endYear } = calendarBounds;

  const {
    isDateSelected,
    toggleDaySelection,
    isAuthenticated,
    getSettings,
    refreshHolidays,
    getHolidays,
    countryCode,
    isInitializing,
  } = usePlanner();
  const setNavigationState = useCalendarNavigationDispatch();

  useEffect(() => {
    setIsMounted(true);
    console.log('[VirtualizedCalendar] Component mounted. Today:', today.toISOString(), 'Year:', today.getFullYear());
  }, [today]);

  const anchorMonth = useMemo(() => {
    const month = startOfMonth(today);
    console.log('[anchorMonth]', month.toISOString(), 'Year:', month.getFullYear());
    return month;
  }, [today]);

  const minMonth = useMemo(() => {
    const month = startOfMonth(new Date(startYear, 0, 1));
    console.log('[minMonth]', month.toISOString(), 'Year:', month.getFullYear());
    return month;
  }, [startYear]);

  const maxMonth = useMemo(() => {
    const month = startOfMonth(new Date(endYear, 11, 1));
    console.log('[maxMonth]', month.toISOString(), 'Year:', month.getFullYear());
    return month;
  }, [endYear]);

  const monthKeys = useMemo(
    () => {
      const months = eachMonthOfInterval({ start: minMonth, end: maxMonth });
      console.log('[monthKeys] Total months:', months.length, 'First:', months[0]?.toISOString(), 'Last:', months[months.length - 1]?.toISOString());
      return months;
    },
    [minMonth, maxMonth],
  );

  const rowCount = useMemo(
    () => Math.max(1, Math.ceil(monthKeys.length / monthsPerRow)),
    [monthKeys.length, monthsPerRow],
  );

  const anchorIndex = useMemo(
    () => {
      const index = differenceInCalendarMonths(anchorMonth, minMonth);
      console.log('[anchorIndex]', index, 'anchorMonth:', anchorMonth.toISOString(), 'minMonth:', minMonth.toISOString());
      return index;
    },
    [anchorMonth, minMonth],
  );

  const todayRow = useMemo(
    () => {
      const row = clamp(Math.floor(anchorIndex / monthsPerRow), 0, rowCount - 1);
      console.log('[todayRow]', row, 'anchorIndex:', anchorIndex, 'rowCount:', rowCount, 'monthsPerRow:', monthsPerRow);
      return row;
    },
    [anchorIndex, rowCount, monthsPerRow],
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  const prefetchedYearsRef = useRef<Set<number>>(
    new Set([anchorMonth.getFullYear()]),
  );
  const inFlightYearsRef = useRef<Set<number>>(new Set());
  // Track the first visible month to preserve scroll position during resize
  const firstVisibleMonthRef = useRef<Date | null>(null);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: OVERSCAN_ROWS,
  });

  const monthsForRow = useCallback(
    (rowIndex: number) => {
      const startIndex = rowIndex * monthsPerRow;
      const slice = monthKeys.slice(startIndex, startIndex + monthsPerRow);
      console.log('[monthsForRow] Row', rowIndex, 'startIndex:', startIndex, 'months:', slice.map(m => `${m.getFullYear()}-${m.getMonth()+1}`));
      return slice.filter(Boolean) as Date[];
    },
    [monthKeys, monthsPerRow],
  );

  // Find the row index that contains a specific month
  const getRowForMonth = useCallback(
    (targetMonth: Date) => {
      const monthIndex = differenceInCalendarMonths(targetMonth, minMonth);
      const row = Math.floor(monthIndex / monthsPerRow);
      return clamp(row, 0, rowCount - 1);
    },
    [minMonth, monthsPerRow, rowCount],
  );

  // Track previous monthsPerRow to detect layout changes
  const prevMonthsPerRowRef = useRef(monthsPerRow);
  const hasInitializedScrollRef = useRef(false);

  useEffect(() => {
    // Wait until both mounted AND initialization is complete
    if (!isMounted || isInitializing) {
      return;
    }

    const layoutChanged = prevMonthsPerRowRef.current !== monthsPerRow;
    prevMonthsPerRowRef.current = monthsPerRow;

    // On initial mount (after initialization), scroll to today
    if (!hasInitializedScrollRef.current) {
      hasInitializedScrollRef.current = true;
      const id = requestAnimationFrame(() => {
        virtualizer.scrollToIndex(todayRow, {
          align: 'start',
          behavior: 'auto',
        });
      });
      return () => cancelAnimationFrame(id);
    }

    // On layout change (resize), preserve the first visible month's position
    if (layoutChanged && firstVisibleMonthRef.current) {
      const targetRow = getRowForMonth(firstVisibleMonthRef.current);
      console.log('[Resize] Preserving scroll to month:', format(firstVisibleMonthRef.current, 'yyyy-MM'), 'row:', targetRow);
      const id = requestAnimationFrame(() => {
        virtualizer.scrollToIndex(targetRow, {
          align: 'start',
          behavior: 'auto', // Use instant scroll to avoid jarring animation during resize
        });
      });
      return () => cancelAnimationFrame(id);
    }
  }, [isMounted, isInitializing, todayRow, virtualizer, monthsPerRow, getRowForMonth]);

  const virtualItems = virtualizer.getVirtualItems();
  const viewportStart = virtualizer.scrollOffset ?? 0;
  const viewportHeight = virtualizer.scrollRect?.height ?? 0;

  const visibleRowIndexes = useMemo(() => {
    if (!virtualItems.length) {
      return [todayRow];
    }

    if (viewportHeight === 0) {
      return [virtualItems[0]?.index ?? todayRow];
    }

    const viewportEnd = viewportStart + viewportHeight;
    const rowsInViewport = virtualItems
      .filter((item) => {
        const itemEnd = item.end ?? item.start + item.size;
        return itemEnd > viewportStart && item.start < viewportEnd;
      })
      .map((item) => item.index);

    if (rowsInViewport.length) {
      return rowsInViewport;
    }

    const fallbackIndex =
      virtualItems.find((item) => item.end > viewportStart)?.index ??
      virtualItems[0]?.index ??
      todayRow;

    return [fallbackIndex];
  }, [virtualItems, viewportStart, viewportHeight, todayRow]);

  const firstVisibleRow = visibleRowIndexes[0] ?? todayRow;
  const lastVisibleRow = visibleRowIndexes[visibleRowIndexes.length - 1] ?? firstVisibleRow;
  const visibleRowCount = Math.max(visibleRowIndexes.length, 1);
  const fallbackPageSize = Math.max(
    1,
    Math.round((viewportHeight || estimatedRowHeight) / estimatedRowHeight),
  );
  const pageSize = visibleRowIndexes.length ? visibleRowCount : fallbackPageSize;

  const visibleMonths = useMemo(() => {
    const seen = new Set<string>();
    const months: Date[] = [];

    visibleRowIndexes.forEach((rowIndex) => {
      monthsForRow(rowIndex).forEach((month) => {
        const key = format(month, 'yyyy-MM');
        if (!seen.has(key)) {
          seen.add(key);
          months.push(month);
        }
      });
    });

    if (months.length) {
      return months;
    }

    return monthsForRow(firstVisibleRow);
  }, [visibleRowIndexes, monthsForRow, firstVisibleRow]);

  // Track the first visible month for scroll preservation during resize
  useEffect(() => {
    if (visibleMonths.length > 0) {
      firstVisibleMonthRef.current = visibleMonths[0];
    }
  }, [visibleMonths]);

  const canGoPrev = firstVisibleRow > 0;
  const canGoNext = lastVisibleRow < rowCount - 1;

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
    const targetRow = firstVisibleRow - pageSize;
    scrollToRow(targetRow);
  }, [firstVisibleRow, pageSize, scrollToRow]);

  const goNext = useCallback(() => {
    const targetRow = firstVisibleRow + pageSize;
    scrollToRow(targetRow);
  }, [firstVisibleRow, pageSize, scrollToRow]);

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
    const bufferRows = new Set<number>();

    bufferRows.add(firstVisibleRow - 1);
    visibleRowIndexes.forEach((row) => bufferRows.add(row));
    bufferRows.add(lastVisibleRow + 1);

    const rowsToCheck = Array.from(bufferRows).filter(
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
  }, [
    firstVisibleRow,
    lastVisibleRow,
    visibleRowIndexes,
    rowCount,
    monthsForRow,
    refreshHolidays,
    countryCode,
  ]);

  // Show simple loading state while mounting or initializing data
  if (!isMounted || isInitializing) {
    return (
      <div className="mx-auto w-full max-w-7xl px-0">
        <div className="overflow-hidden rounded-[32px] border-2 border-border bg-card shadow-sm p-6">
          <div className="flex h-80 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              <span>Loading calendar...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-0">
      <div className="overflow-hidden rounded-[32px] border-2 border-border bg-card shadow-sm">
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
            'relative h-[78vh] overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6',
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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
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
