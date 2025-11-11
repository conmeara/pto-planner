'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

export interface CalendarNavigationState {
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  label: string;
  isBusy: boolean;
}

const noop = () => {};

const DEFAULT_STATE: CalendarNavigationState = {
  goPrev: noop,
  goNext: noop,
  goToday: noop,
  canGoPrev: false,
  canGoNext: false,
  label: '',
  isBusy: false,
};

const CalendarNavigationContext = createContext<CalendarNavigationState>(DEFAULT_STATE);
const CalendarNavigationDispatchContext = createContext<
  (state: CalendarNavigationState) => void
>(() => {});

interface ProviderProps {
  children: React.ReactNode;
}

export function CalendarNavigationProvider({ children }: ProviderProps) {
  const [state, setState] = useState<CalendarNavigationState>(DEFAULT_STATE);

  const setNavigationState = useCallback((value: CalendarNavigationState) => {
    setState(value);
  }, []);

  return (
    <CalendarNavigationDispatchContext.Provider value={setNavigationState}>
      <CalendarNavigationContext.Provider value={state}>
        {children}
      </CalendarNavigationContext.Provider>
    </CalendarNavigationDispatchContext.Provider>
  );
}

export function useCalendarNavigation() {
  return useContext(CalendarNavigationContext);
}

export function useCalendarNavigationDispatch() {
  return useContext(CalendarNavigationDispatchContext);
}








