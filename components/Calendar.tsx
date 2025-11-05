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
  } = usePlanner();

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
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, month, 1).getDay();
    
    // Create array for the days of the month
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8 md:w-10 md:h-10"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, month, day);
      days.push(
        <div
          key={`day-${day}`}
          className={getDayClasses(date)}
          onClick={() => handleDayClick(date)}
        >
          {day}
        </div>
      );
    }
    
    return (
      <div key={`month-${month}`} className="mb-6">
        <h3 className="font-semibold mb-2">{MONTHS[month]}</h3>
        <div className="grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="text-xs text-center font-medium text-gray-500">
              {day}
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
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex justify-center items-center h-96">
          <p className="text-gray-500">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Year navigation */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" size="sm" onClick={prevYear}>
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-1">Prev</span>
        </Button>
        
        <div className="flex gap-2 items-center">
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
      <div className={isDesktop ? "grid grid-cols-3 gap-4" : "space-y-6"}>
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
                className="w-8 h-8 p-0"
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
      
      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded-full mr-2"></div>
          <span className="text-sm">Weekend</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900 rounded-full mr-2"></div>
          <span className="text-sm">Holiday</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm">Selected PTO</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-yellow-200 dark:bg-yellow-800 rounded-full mr-2"></div>
          <span className="text-sm">Suggested PTO</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 border-2 border-blue-500 rounded-full mr-2"></div>
          <span className="text-sm">Today</span>
        </div>
      </div>
    </div>
  );
};

export default Calendar; 