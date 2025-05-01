import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

// Day type enum
export enum DayType {
  NORMAL = 'normal',
  WEEKEND = 'weekend',
  PUBLIC_HOLIDAY = 'public-holiday',
  SELECTED_PTO = 'selected-pto',
  SUGGESTED_PTO = 'suggested-pto',
  TODAY = 'today'
}

// Calendar props
interface CalendarProps {
  onDayClick?: (date: Date) => void;
  selectedDays?: Date[];
  suggestedDays?: Date[];
  publicHolidays?: Date[];
  weekendDays?: number[]; // 0 = Sunday, 1 = Monday, etc.
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Calendar: React.FC<CalendarProps> = ({
  onDayClick,
  selectedDays = [],
  suggestedDays = [],
  publicHolidays = [],
  weekendDays = [0, 6], // Sunday and Saturday by default
}) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isDesktop, setIsDesktop] = useState(true); // Assume desktop first, will be updated in useEffect

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

  // Check if a date is a weekend
  const isWeekend = (date: Date) => {
    return weekendDays.includes(date.getDay());
  };

  // Check if a date is a public holiday
  const isPublicHoliday = (date: Date) => {
    return publicHolidays.some(holiday => 
      holiday.getDate() === date.getDate() && 
      holiday.getMonth() === date.getMonth() && 
      holiday.getFullYear() === date.getFullYear()
    );
  };

  // Check if a date is selected as PTO
  const isSelectedPTO = (date: Date) => {
    return selectedDays.some(selectedDay => 
      selectedDay.getDate() === date.getDate() && 
      selectedDay.getMonth() === date.getMonth() && 
      selectedDay.getFullYear() === date.getFullYear()
    );
  };

  // Check if a date is suggested for PTO
  const isSuggestedPTO = (date: Date) => {
    return suggestedDays.some(suggestedDay => 
      suggestedDay.getDate() === date.getDate() && 
      suggestedDay.getMonth() === date.getMonth() && 
      suggestedDay.getFullYear() === date.getFullYear()
    );
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
    if (isSelectedPTO(date)) return DayType.SELECTED_PTO;
    if (isSuggestedPTO(date)) return DayType.SUGGESTED_PTO;
    if (isPublicHoliday(date)) return DayType.PUBLIC_HOLIDAY;
    if (isWeekend(date)) return DayType.WEEKEND;
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

  // Handle day click
  const handleDayClick = (date: Date) => {
    if (onDayClick) {
      onDayClick(date);
    }
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