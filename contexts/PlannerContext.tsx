'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { PlannerData, PTODay, CustomHoliday, StrategyType, PTOSettings, WeekendConfig } from '@/types';
import { optimizePTO, type PTOOptimizerConfig, type OptimizationResult } from '@/lib/pto-optimizer';

// ============================================================================
// LocalStorage Keys
// ============================================================================

const STORAGE_KEYS = {
  SELECTED_DAYS: 'pto_planner_selected_days',
  SETTINGS: 'pto_planner_settings',
  WEEKEND_CONFIG: 'pto_planner_weekend',
  HOLIDAYS: 'pto_planner_holidays',
};

// ============================================================================
// LocalStorage Helper Functions
// ============================================================================

const saveToLocalStorage = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
};

const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  if (typeof window !== 'undefined') {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return defaultValue;
    }
  }
  return defaultValue;
};

// ============================================================================
// Context Types
// ============================================================================

interface PlannerContextType {
  // Data
  plannerData: PlannerData | null;
  selectedDays: Date[];
  suggestedDays: Date[];
  currentStrategy: StrategyType | null;
  isAuthenticated: boolean;

  // State setters
  setPlannerData: (data: PlannerData | null) => void;
  setSelectedDays: (days: Date[]) => void;
  setSuggestedDays: (days: Date[]) => void;
  setCurrentStrategy: (strategy: StrategyType | null) => void;

  // Helper methods
  isDateSelected: (date: Date) => boolean;
  isDateSuggested: (date: Date) => boolean;
  isDateHoliday: (date: Date) => boolean;
  isDateWeekend: (date: Date) => boolean;
  getWeekendDays: () => number[];
  getCurrentBalance: () => number;
  getSettings: () => Partial<PTOSettings>;
  getHolidays: () => CustomHoliday[];

  // Actions
  toggleDaySelection: (date: Date) => void;
  clearSuggestions: () => void;
  applySuggestions: () => void;
  runOptimization: (strategy: StrategyType, year?: number) => OptimizationResult | null;
  saveLocalSettings: (settings: Partial<PTOSettings>) => void;
  saveLocalWeekendConfig: (weekendDays: number[]) => void;
  saveLocalHolidays: (holidays: CustomHoliday[]) => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

// ============================================================================
// Provider Props
// ============================================================================

interface PlannerProviderProps {
  children: React.ReactNode;
  initialData: PlannerData | null;
}

// ============================================================================
// Provider Component
// ============================================================================

export function PlannerProvider({ children, initialData }: PlannerProviderProps) {
  const [plannerData, setPlannerData] = useState<PlannerData | null>(initialData);
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const [suggestedDays, setSuggestedDays] = useState<Date[]>([]);
  const [currentStrategy, setCurrentStrategy] = useState<StrategyType | null>(null);

  const isAuthenticated = !!plannerData?.user;

  // Initialize from plannerData or localStorage
  useEffect(() => {
    if (plannerData?.ptoDays) {
      // Load from database (authenticated user)
      const dates = plannerData.ptoDays
        .filter((day) => day.status === 'planned')
        .map((day) => new Date(day.date));
      setSelectedDays(dates);
    } else {
      // Load from localStorage (unauthenticated user)
      const storedDays = loadFromLocalStorage<string[]>(STORAGE_KEYS.SELECTED_DAYS, []);
      const dates = storedDays.map((dateStr) => new Date(dateStr));
      setSelectedDays(dates);
    }
  }, [plannerData]);

  // Save selected days to localStorage when not authenticated
  useEffect(() => {
    if (!isAuthenticated && selectedDays.length >= 0) {
      const dateStrings = selectedDays.map((date) => date.toISOString().split('T')[0]);
      saveToLocalStorage(STORAGE_KEYS.SELECTED_DAYS, dateStrings);
    }
  }, [selectedDays, isAuthenticated]);

  // Helper: Check if date is selected
  const isDateSelected = useCallback(
    (date: Date): boolean => {
      return selectedDays.some(
        (d) => d.toISOString().split('T')[0] === date.toISOString().split('T')[0]
      );
    },
    [selectedDays]
  );

  // Helper: Check if date is suggested
  const isDateSuggested = useCallback(
    (date: Date): boolean => {
      return suggestedDays.some(
        (d) => d.toISOString().split('T')[0] === date.toISOString().split('T')[0]
      );
    },
    [suggestedDays]
  );

  // Helper: Check if date is a holiday
  const isDateHoliday = useCallback(
    (date: Date): boolean => {
      // Get holidays from DB or localStorage
      const holidays = plannerData?.holidays
        ? plannerData.holidays
        : loadFromLocalStorage<CustomHoliday[]>(STORAGE_KEYS.HOLIDAYS, []);

      if (!holidays.length) return false;

      const dateStr = date.toISOString().split('T')[0];
      return holidays.some((holiday) => {
        if (holiday.repeats_yearly) {
          // For repeating holidays, only check month and day
          const holidayDate = new Date(holiday.date);
          return (
            holidayDate.getMonth() === date.getMonth() &&
            holidayDate.getDate() === date.getDate()
          );
        }
        // For non-repeating holidays, exact match
        return holiday.date === dateStr;
      });
    },
    [plannerData]
  );

  // Helper: Check if date is a weekend
  const isDateWeekend = useCallback(
    (date: Date): boolean => {
      const dayOfWeek = date.getDay();

      if (plannerData?.weekendConfig) {
        // Use database config for authenticated users
        return plannerData.weekendConfig.some(
          (config) => config.day_of_week === dayOfWeek && config.is_weekend
        );
      }

      // Use localStorage for unauthenticated users
      const storedWeekend = loadFromLocalStorage<number[]>(STORAGE_KEYS.WEEKEND_CONFIG, [0, 6]);
      return storedWeekend.includes(dayOfWeek);
    },
    [plannerData]
  );

  // Helper: Get weekend days as array
  const getWeekendDays = useCallback((): number[] => {
    if (plannerData?.weekendConfig) {
      return plannerData.weekendConfig
        .filter((config) => config.is_weekend)
        .map((config) => config.day_of_week);
    }

    // Fallback to localStorage
    return loadFromLocalStorage<number[]>(STORAGE_KEYS.WEEKEND_CONFIG, [0, 6]);
  }, [plannerData]);

  // Helper: Get current PTO balance
  const getCurrentBalance = useCallback((): number => {
    if (plannerData?.currentBalance) {
      return plannerData.currentBalance.current_balance;
    }

    if (plannerData?.settings?.initial_balance) {
      return plannerData.settings.initial_balance;
    }

    // Fallback to localStorage
    const storedSettings = loadFromLocalStorage<Partial<PTOSettings>>(STORAGE_KEYS.SETTINGS, {});
    return storedSettings.initial_balance || 0;
  }, [plannerData]);

  // Helper: Get settings (from DB or localStorage)
  const getSettings = useCallback((): Partial<PTOSettings> => {
    if (plannerData?.settings) {
      return plannerData.settings;
    }

    // Fallback to localStorage
    return loadFromLocalStorage<Partial<PTOSettings>>(STORAGE_KEYS.SETTINGS, {
      initial_balance: 15,
      pto_display_unit: 'days',
      hours_per_day: 8,
      carry_over_limit: 5,
    });
  }, [plannerData]);

  // Action: Save settings to localStorage
  const saveLocalSettings = useCallback((settings: Partial<PTOSettings>) => {
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, settings);
  }, []);

  // Action: Save weekend config to localStorage
  const saveLocalWeekendConfig = useCallback((weekendDays: number[]) => {
    saveToLocalStorage(STORAGE_KEYS.WEEKEND_CONFIG, weekendDays);
  }, []);

  // Action: Save holidays to localStorage
  const saveLocalHolidays = useCallback((holidays: CustomHoliday[]) => {
    saveToLocalStorage(STORAGE_KEYS.HOLIDAYS, holidays);
  }, []);

  // Helper: Get holidays (from DB or localStorage)
  const getHolidays = useCallback((): CustomHoliday[] => {
    if (plannerData?.holidays) {
      return plannerData.holidays;
    }

    // Fallback to localStorage
    return loadFromLocalStorage<CustomHoliday[]>(STORAGE_KEYS.HOLIDAYS, []);
  }, [plannerData]);

  // Action: Toggle day selection
  const toggleDaySelection = useCallback(
    (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const isSelected = isDateSelected(date);

      if (isSelected) {
        // Remove from selection
        setSelectedDays((prev) =>
          prev.filter((d) => d.toISOString().split('T')[0] !== dateStr)
        );
      } else {
        // Add to selection
        setSelectedDays((prev) => [...prev, date]);
      }
    },
    [isDateSelected]
  );

  // Action: Clear all suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestedDays([]);
    setCurrentStrategy(null);
  }, []);

  // Action: Apply suggestions to selected days
  const applySuggestions = useCallback(() => {
    // Merge suggestions into selected days (avoiding duplicates)
    setSelectedDays((prev) => {
      const combined = [...prev];
      suggestedDays.forEach((suggestedDate) => {
        const dateStr = suggestedDate.toISOString().split('T')[0];
        const alreadyExists = combined.some(
          (d) => d.toISOString().split('T')[0] === dateStr
        );
        if (!alreadyExists) {
          combined.push(suggestedDate);
        }
      });
      return combined;
    });

    // Clear suggestions after applying
    clearSuggestions();
  }, [suggestedDays, clearSuggestions]);

  // Action: Run optimization algorithm
  const runOptimization = useCallback(
    (strategy: StrategyType, year?: number): OptimizationResult | null => {
      const targetYear = year || new Date().getFullYear();

      // Get configuration
      const settings = getSettings();
      const weekendDays = getWeekendDays();
      const holidays = getHolidays();

      // Convert holidays to Date objects for the target year
      const holidayDates = holidays.map((holiday) => {
        const holidayDate = new Date(holiday.date);
        if (holiday.repeats_yearly) {
          // For repeating holidays, use the target year
          return new Date(targetYear, holidayDate.getMonth(), holidayDate.getDate());
        }
        // For non-repeating holidays, only include if they're in the target year
        if (holidayDate.getFullYear() === targetYear) {
          return holidayDate;
        }
        return null;
      }).filter((d): d is Date => d !== null);

      // Get available PTO
      const availableDays = getCurrentBalance();

      if (availableDays <= 0) {
        console.warn('No PTO days available');
        return null;
      }

      // Build optimizer config
      const config: PTOOptimizerConfig = {
        year: targetYear,
        availableDays,
        weekendDays,
        holidays: holidayDates,
        existingPTODays: selectedDays,
      };

      try {
        // Run optimization
        const result = optimizePTO(strategy, config);

        // Update suggested days in context
        setSuggestedDays(result.suggestedDays);
        setCurrentStrategy(strategy);

        return result;
      } catch (error) {
        console.error('Optimization error:', error);
        return null;
      }
    },
    [getSettings, getWeekendDays, getHolidays, getCurrentBalance, selectedDays]
  );

  // Context value
  const value: PlannerContextType = {
    plannerData,
    selectedDays,
    suggestedDays,
    currentStrategy,
    isAuthenticated,
    setPlannerData,
    setSelectedDays,
    setSuggestedDays,
    setCurrentStrategy,
    isDateSelected,
    isDateSuggested,
    isDateHoliday,
    isDateWeekend,
    getWeekendDays,
    getCurrentBalance,
    getSettings,
    getHolidays,
    toggleDaySelection,
    clearSuggestions,
    applySuggestions,
    runOptimization,
    saveLocalSettings,
    saveLocalWeekendConfig,
    saveLocalHolidays,
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

// ============================================================================
// Custom Hook
// ============================================================================

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (context === undefined) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
}
