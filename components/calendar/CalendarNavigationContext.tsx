'use client';

import React, { createContext, useContext } from 'react';

export interface CalendarNavigationValue {
  scrollByRows: (delta: number, options?: ScrollBehavior) => void;
  scrollToToday: (behavior?: ScrollBehavior) => void;
  scrollToMonth: (month: Date, behavior?: ScrollBehavior) => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  visibleMonths: Date[];
  bounds: { minMonth: Date; maxMonth: Date } | null;
}

const CalendarNavigationContext = createContext<CalendarNavigationValue | null>(null);

interface ProviderProps {
  value: CalendarNavigationValue;
  children: React.ReactNode;
}

export const CalendarNavigationProvider: React.FC<ProviderProps> = ({
  value,
  children,
}) => {
  return (
    <CalendarNavigationContext.Provider value={value}>
      {children}
    </CalendarNavigationContext.Provider>
  );
};

export const useCalendarNavigation = () => {
  const ctx = useContext(CalendarNavigationContext);
  if (!ctx) {
    throw new Error(
      'useCalendarNavigation must be used within a CalendarNavigationProvider',
    );
  }
  return ctx;
};


