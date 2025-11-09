'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { PlannerData, PTODay, CustomHoliday, StrategyType, PTOSettings, WeekendConfig, ActionResult, PTOAccrualRule } from '@/types';
import { optimizePTO, type PTOOptimizerConfig, type OptimizationResult } from '@/lib/pto-optimizer';
import { formatDateLocal, parseDateLocal, isSameDay, matchesHoliday } from '@/lib/date-utils';
import { addCustomHoliday, batchAddHolidays, clearHolidaysForYear, deleteCustomHoliday } from '@/app/actions/holiday-actions';
import { migrateLocalDataToDatabase } from '@/app/actions/user-actions';

// ============================================================================
// LocalStorage Keys
// ============================================================================

const STORAGE_KEYS = {
  SELECTED_DAYS: 'pto_planner_selected_days',
  SETTINGS: 'pto_planner_settings',
  WEEKEND_CONFIG: 'pto_planner_weekend',
  HOLIDAYS: 'pto_planner_holidays',
  COUNTRY: 'pto_planner_country',
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

// =========================================================================
// Date Helpers
// =========================================================================

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const daysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const clampDayOfMonth = (year: number, month: number, day: number): number => {
  const maxDay = daysInMonth(year, month);
  return Math.min(Math.max(day, 1), maxDay);
};

const alignToDayOfWeek = (date: Date, targetDayOfWeek: number): Date => {
  const current = startOfDay(date);
  const diff = (targetDayOfWeek - current.getDay() + 7) % 7;
  return addDays(current, diff);
};

const getFirstMonthlyOccurrence = (baseDate: Date, dayOfMonth: number): Date => {
  const base = startOfDay(baseDate);
  let year = base.getFullYear();
  let month = base.getMonth();
  let day = clampDayOfMonth(year, month, dayOfMonth);
  let occurrence = new Date(year, month, day);

  if (occurrence < base) {
    month += 1;
    occurrence = new Date(year, month, clampDayOfMonth(year, month, dayOfMonth));
  }

  return occurrence;
};

const getNextMonthlyOccurrence = (current: Date, dayOfMonth: number): Date => {
  const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  const year = nextMonth.getFullYear();
  const month = nextMonth.getMonth();
  const day = clampDayOfMonth(year, month, dayOfMonth);
  return new Date(year, month, day);
};

const getFirstYearlyOccurrence = (baseDate: Date, accrualDay?: number | null): Date => {
  const base = startOfDay(baseDate);
  let occurrence: Date;

  if (typeof accrualDay === 'number') {
    const normalizedDay = Math.max(1, Math.floor(accrualDay));
    occurrence = new Date(base.getFullYear(), 0, normalizedDay);
  } else {
    occurrence = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  }

  if (occurrence < base) {
    occurrence = new Date(occurrence.getFullYear() + 1, occurrence.getMonth(), occurrence.getDate());
  }

  return occurrence;
};

const getNextYearlyOccurrence = (current: Date, accrualDay?: number | null): Date => {
  if (typeof accrualDay === 'number') {
    const normalizedDay = Math.max(1, Math.floor(accrualDay));
    return new Date(current.getFullYear() + 1, 0, normalizedDay);
  }

  return new Date(current.getFullYear() + 1, current.getMonth(), current.getDate());
};

const calculateAccrualsForRule = (
  rule: PTOAccrualRule,
  targetDate: Date,
): number => {
  if (!rule.is_active) {
    return 0;
  }

  const target = startOfDay(targetDate);
  const effective = startOfDay(parseDateLocal(rule.effective_date));

  if (target < effective) {
    return 0;
  }

  const endDate = rule.end_date ? startOfDay(parseDateLocal(rule.end_date)) : null;

  let occurrence: Date;

  switch (rule.accrual_frequency) {
    case 'daily':
      occurrence = effective;
      break;
    case 'weekly': {
      const dayOfWeek = rule.accrual_day ?? effective.getDay();
      occurrence = alignToDayOfWeek(effective, dayOfWeek);
      break;
    }
    case 'biweekly': {
      const dayOfWeek = rule.accrual_day ?? effective.getDay();
      occurrence = alignToDayOfWeek(effective, dayOfWeek);
      break;
    }
    case 'monthly': {
      const dayOfMonth = rule.accrual_day ?? effective.getDate();
      occurrence = getFirstMonthlyOccurrence(effective, dayOfMonth);
      break;
    }
    case 'yearly':
      occurrence = getFirstYearlyOccurrence(effective, rule.accrual_day);
      break;
    default:
      occurrence = effective;
      break;
  }

  let accrued = 0;
  let safety = 0;

  while (occurrence <= target && (!endDate || occurrence <= endDate)) {
    accrued += rule.accrual_amount;
    safety++;

    if (safety > 10000) {
      console.warn('Accrual loop safety break triggered for rule', rule.id);
      break;
    }

    switch (rule.accrual_frequency) {
      case 'daily':
        occurrence = addDays(occurrence, 1);
        break;
      case 'weekly':
        occurrence = addDays(occurrence, 7);
        break;
      case 'biweekly':
        occurrence = addDays(occurrence, 14);
        break;
      case 'monthly': {
        const dayOfMonth = rule.accrual_day ?? occurrence.getDate();
        occurrence = getNextMonthlyOccurrence(occurrence, dayOfMonth);
        break;
      }
      case 'yearly':
        occurrence = getNextYearlyOccurrence(occurrence, rule.accrual_day);
        break;
      default:
        occurrence = addDays(occurrence, 1);
        break;
    }
  }

  return accrued;
};

interface HolidaySyncOptions {
  year?: number;
  replaceExisting?: boolean;
  persistCountry?: boolean;
  silent?: boolean;
}

interface HolidaySyncResult {
  success: boolean;
  holidays?: CustomHoliday[];
  error?: string;
  countryCode: string;
  year: number;
}

type HolidayRemovalTarget = Pick<CustomHoliday, 'id' | 'date' | 'name'>;

// ============================================================================
// Context Types
// ============================================================================

interface PlannerContextType {
  // Data
  plannerData: PlannerData | null;
  selectedDays: Date[];
  suggestedDays: Date[];
  currentStrategy: StrategyType | null;
  lastOptimizationResult: OptimizationResult | null;
  isAuthenticated: boolean;
  countryCode: string;
  isLoadingHolidays: boolean;

  // State setters
  setPlannerData: (data: PlannerData | null) => void;
  setSelectedDays: React.Dispatch<React.SetStateAction<Date[]>>;
  setSuggestedDays: React.Dispatch<React.SetStateAction<Date[]>>;
  setCurrentStrategy: React.Dispatch<React.SetStateAction<StrategyType | null>>;
  setCountryCode: (country: string) => void;

  // Helper methods
  isDateSelected: (date: Date) => boolean;
  isDateSuggested: (date: Date) => boolean;
  isDateHoliday: (date: Date) => boolean;
  isDateWeekend: (date: Date) => boolean;
  getWeekendDays: () => number[];
  getCurrentBalance: () => number;
  getSettings: () => Partial<PTOSettings>;
  getHolidays: () => CustomHoliday[];
  getAccruedAmountUntil: (date: Date) => number;
  getUsedAmountBefore: (date: Date) => number;
  getBalanceAsOf: (date: Date) => number;

  // Actions
  toggleDaySelection: (date: Date) => void;
  clearSuggestions: () => void;
  applySuggestions: () => void;
  runOptimization: (strategy: StrategyType, year?: number) => OptimizationResult | null;
  saveLocalSettings: (settings: Partial<PTOSettings>) => void;
  saveLocalWeekendConfig: (weekendDays: number[]) => void;
  saveLocalHolidays: (holidays: CustomHoliday[]) => void;
  refreshHolidays: (country?: string, options?: HolidaySyncOptions) => Promise<HolidaySyncResult>;
  removeHoliday: (holiday: HolidayRemovalTarget) => Promise<{ success: boolean; error?: string }>;
  addHoliday: (holiday: {
    name: string;
    date: string;
    repeatsYearly?: boolean;
    isPaidHoliday?: boolean;
  }) => Promise<ActionResult<CustomHoliday>>;
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
  const [lastOptimizationResult, setLastOptimizationResult] = useState<OptimizationResult | null>(null);
  const [countryCodeState, setCountryCodeState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.COUNTRY);
      if (stored) {
        return stored.toUpperCase();
      }
    }
    return 'US';
  });
  const [localHolidays, setLocalHolidays] = useState<CustomHoliday[]>(() =>
    loadFromLocalStorage<CustomHoliday[]>(STORAGE_KEYS.HOLIDAYS, [])
  );
  const [isLoadingHolidays, setIsLoadingHolidays] = useState<boolean>(false);

  const isAuthenticated = !!plannerData?.user;
  const countryCode = countryCodeState;

  const setCountryCode = useCallback((code: string) => {
    const normalized = code ? code.toUpperCase() : 'US';
    setCountryCodeState(normalized);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEYS.COUNTRY, normalized);
      } catch (error) {
        console.error('Error persisting country preference:', error);
      }
    }
  }, []);

  const generateHolidayId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `holiday-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
  }, []);

  const getHolidays = useCallback((): CustomHoliday[] => {
    if (plannerData?.holidays) {
      return plannerData.holidays;
    }
    return localHolidays;
  }, [plannerData, localHolidays]);

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

  // Migrate localStorage data to database when user first signs in
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') {
      return;
    }

    // Check if migration has already been done for this user
    const migrationKey = `pto_planner_migration_done_${plannerData?.user?.id}`;
    const migrationDone = localStorage.getItem(migrationKey);

    if (migrationDone) {
      return; // Already migrated
    }

    // Check if there's any localStorage data to migrate
    const storedDays = loadFromLocalStorage<string[]>(STORAGE_KEYS.SELECTED_DAYS, []);
    const storedSettings = loadFromLocalStorage<Partial<PTOSettings>>(STORAGE_KEYS.SETTINGS, {});
    const storedHolidays = loadFromLocalStorage<CustomHoliday[]>(STORAGE_KEYS.HOLIDAYS, []);
    const storedWeekend = loadFromLocalStorage<number[]>(STORAGE_KEYS.WEEKEND_CONFIG, []);

    const hasLocalData =
      storedDays.length > 0 ||
      Object.keys(storedSettings).length > 0 ||
      storedHolidays.length > 0 ||
      storedWeekend.length > 0;

    if (!hasLocalData) {
      // No data to migrate, mark as done
      localStorage.setItem(migrationKey, 'true');
      return;
    }

    // Perform migration
    const performMigration = async () => {
      try {
        const result = await migrateLocalDataToDatabase({
          selectedDays: storedDays,
          settings: {
            initial_balance: storedSettings.initial_balance,
            pto_start_date: storedSettings.pto_start_date,
            carry_over_limit: storedSettings.carry_over_limit,
            pto_display_unit: storedSettings.pto_display_unit,
            hours_per_day: storedSettings.hours_per_day,
          },
          holidays: storedHolidays.map(h => ({
            name: h.name,
            date: h.date,
            repeats_yearly: h.repeats_yearly,
            is_paid_holiday: h.is_paid_holiday,
          })),
          weekendDays: storedWeekend,
        });

        if (result.success && result.data?.migrated) {
          console.log('Successfully migrated local data:', result.data.details);
          // Mark migration as complete
          localStorage.setItem(migrationKey, 'true');
          // Optionally clear localStorage data after successful migration
          // (keeping it for now in case user wants to go back to local mode)
        } else if (!result.success) {
          console.error('Failed to migrate local data:', result.error);
        }
      } catch (error) {
        console.error('Error during data migration:', error);
      }
    };

    performMigration();
  }, [isAuthenticated, plannerData?.user?.id]);

  // Save selected days to localStorage when not authenticated
  useEffect(() => {
    if (!isAuthenticated && selectedDays.length >= 0) {
      const dateStrings = selectedDays.map((date) => formatDateLocal(date));
      saveToLocalStorage(STORAGE_KEYS.SELECTED_DAYS, dateStrings);
    }
  }, [selectedDays, isAuthenticated]);

  // Helper: Check if date is selected
  const isDateSelected = useCallback(
    (date: Date): boolean => {
      return selectedDays.some((d) => isSameDay(d, date));
    },
    [selectedDays]
  );

  // Helper: Check if date is suggested
  const isDateSuggested = useCallback(
    (date: Date): boolean => {
      return suggestedDays.some((d) => isSameDay(d, date));
    },
    [suggestedDays]
  );

  // Helper: Check if date is a holiday
  const isDateHoliday = useCallback(
    (date: Date): boolean => {
      const holidays = getHolidays();

      if (!holidays.length) return false;

      return holidays.some((holiday) =>
        matchesHoliday(date, holiday.date, holiday.repeats_yearly)
      );
    },
    [getHolidays]
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

  const getAccruedAmountUntil = useCallback(
    (date: Date): number => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return 0;
      }

      const settings = getSettings();
      const accrualRules = plannerData?.accrualRules ?? [];

      if (!accrualRules.length) {
        return 0;
      }

      const target = startOfDay(date);
      const startDate = settings.pto_start_date ? startOfDay(parseDateLocal(settings.pto_start_date)) : null;

      if (startDate && target < startDate) {
        return 0;
      }

      return accrualRules.reduce((sum, rule) => sum + calculateAccrualsForRule(rule, target), 0);
    },
    [getSettings, plannerData?.accrualRules]
  );

  const getUsedAmountBefore = useCallback(
    (date: Date): number => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return 0;
      }

      const settings = getSettings();
      const target = startOfDay(date);
      const hoursPerDay = settings.hours_per_day ?? 8;
      const displayUnit = settings.pto_display_unit === 'hours' ? 'hours' : 'days';

      const usedDayCount = selectedDays.reduce((count, day) => {
        return startOfDay(day) < target ? count + 1 : count;
      }, 0);

      if (displayUnit === 'hours') {
        return usedDayCount * hoursPerDay;
      }

      return usedDayCount;
    },
    [selectedDays, getSettings]
  );

  const getBalanceAsOf = useCallback(
    (date: Date): number => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return 0;
      }

      const settings = getSettings();
      const target = startOfDay(date);
      const startDate = settings.pto_start_date ? startOfDay(parseDateLocal(settings.pto_start_date)) : null;

      if (startDate && target < startDate) {
        return 0;
      }

      const initialBalance = typeof settings.initial_balance === 'number' ? settings.initial_balance : 0;
      const accrued = getAccruedAmountUntil(target);
      const used = getUsedAmountBefore(target);

      let balance = initialBalance + accrued - used;

      const caps: number[] = [];

      if (typeof settings.max_balance === 'number') {
        caps.push(settings.max_balance);
      }

      if (typeof settings.carry_over_limit === 'number') {
        caps.push(initialBalance + settings.carry_over_limit);
      }

      if (caps.length) {
        balance = Math.min(balance, Math.min(...caps));
      }

      return balance;
    },
    [getSettings, getAccruedAmountUntil, getUsedAmountBefore]
  );

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
    setLocalHolidays(holidays);
    saveToLocalStorage(STORAGE_KEYS.HOLIDAYS, holidays);
  }, []);

  const refreshHolidays = useCallback(async (
    country?: string,
    options?: HolidaySyncOptions
  ): Promise<HolidaySyncResult> => {
    const targetCountry = (country || countryCode || 'US').toUpperCase();
    const targetYear = options?.year ?? new Date().getFullYear();
    const shouldToggleLoading = !options?.silent;

    if (shouldToggleLoading) {
      setIsLoadingHolidays(true);
    }

    const endLoading = () => {
      if (shouldToggleLoading) {
        setIsLoadingHolidays(false);
      }
    };

    try {
      const response = await fetch(`/api/holidays?country=${encodeURIComponent(targetCountry)}&year=${targetYear}`);
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload.error || 'Failed to fetch holidays');
      }

      const payload = await response.json();

      if (!payload?.success || !Array.isArray(payload.data)) {
        throw new Error('Invalid response from holidays API');
      }

      const nowIso = new Date().toISOString();
      const normalizedHolidays: CustomHoliday[] = payload.data.map((holiday: any) => ({
        id: holiday.id ?? generateHolidayId(),
        user_id: plannerData?.user?.id ?? 'local',
        name: holiday.name,
        date: holiday.date,
        repeats_yearly: holiday.repeats_yearly ?? true,
        is_paid_holiday: holiday.is_paid_holiday ?? true,
        created_at: holiday.created_at ?? nowIso,
        updated_at: holiday.updated_at ?? nowIso,
      }));

      let holidaysToReturn = normalizedHolidays;

      if (isAuthenticated) {
        if (options?.replaceExisting !== false) {
          const clearResult = await clearHolidaysForYear(targetYear, true);
          if (!clearResult.success) {
            throw new Error(clearResult.error || 'Failed to clear existing holidays');
          }
        }

        const addResult = await batchAddHolidays(
          normalizedHolidays.map((holiday) => ({
            name: holiday.name,
            date: holiday.date,
            repeatsYearly: holiday.repeats_yearly,
            isPaidHoliday: holiday.is_paid_holiday,
          }))
        );

        if (!addResult.success) {
          throw new Error(addResult.error || 'Failed to save holidays');
        }

        holidaysToReturn = addResult.data || [];
        setPlannerData((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            holidays: holidaysToReturn,
          };
        });
      } else {
        saveLocalHolidays(holidaysToReturn);
      }

      if (options?.persistCountry !== false) {
        setCountryCode(targetCountry);
      }

      endLoading();

      return {
        success: true,
        holidays: holidaysToReturn,
        countryCode: targetCountry,
        year: targetYear,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load holidays';
      if (!options?.silent) {
        console.error('Error refreshing holidays:', error);
      }
      endLoading();
      return {
        success: false,
        error: message,
        countryCode: targetCountry,
        year: targetYear,
      };
    }
  }, [batchAddHolidays, clearHolidaysForYear, countryCode, generateHolidayId, isAuthenticated, plannerData, saveLocalHolidays, setCountryCode]);

  const removeHoliday = useCallback(async (holiday: HolidayRemovalTarget) => {
    try {
      if (isAuthenticated) {
        if (!holiday.id) {
          return { success: false, error: 'Holiday ID is required' };
        }

        const result = await deleteCustomHoliday(holiday.id);
        if (!result.success) {
          return { success: false, error: result.error };
        }

        setPlannerData((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            holidays: prev.holidays.filter((item) => item.id !== holiday.id),
          };
        });

        return { success: true };
      }

      const updated = localHolidays.filter(
        (item) => !(item.date === holiday.date && item.name === holiday.name)
      );
      saveLocalHolidays(updated);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove holiday';
      console.error('Error removing holiday:', error);
      return { success: false, error: message };
    }
  }, [deleteCustomHoliday, isAuthenticated, localHolidays, saveLocalHolidays, setPlannerData]);

  const addHoliday = useCallback(
    async ({
      name,
      date,
      repeatsYearly = false,
      isPaidHoliday = true,
    }: {
      name: string;
      date: string;
      repeatsYearly?: boolean;
      isPaidHoliday?: boolean;
    }): Promise<ActionResult<CustomHoliday>> => {
      try {
        if (isAuthenticated) {
          const result = await addCustomHoliday(name, date, repeatsYearly, isPaidHoliday);

          if (!result.success || !result.data) {
            return result;
          }

          const insertedHoliday = result.data;

          setPlannerData((prev) => {
            if (!prev) {
              return prev;
            }

            const nextHolidays = [...(prev.holidays || []), insertedHoliday].sort((a, b) =>
              a.date.localeCompare(b.date)
            );

            return {
              ...prev,
              holidays: nextHolidays,
            };
          });

          return result;
        }

        const nowIso = new Date().toISOString();
        const newHoliday: CustomHoliday = {
          id: generateHolidayId(),
          user_id: 'local',
          name,
          date,
          repeats_yearly: repeatsYearly,
          is_paid_holiday: isPaidHoliday,
          created_at: nowIso,
          updated_at: nowIso,
        };

        const nextLocal = [...localHolidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date));
        saveLocalHolidays(nextLocal);

        return { success: true, data: newHoliday };
      } catch (error) {
        console.error('Error adding holiday:', error);
        if (error instanceof Error) {
          return { success: false, error: error.message };
        }
        return { success: false, error: 'Failed to add holiday' };
      }
    },
    [addCustomHoliday, generateHolidayId, isAuthenticated, localHolidays, saveLocalHolidays, setPlannerData]
  );

  const detectCountryFromClient = useCallback(async (): Promise<string | null> => {
    if (typeof window === 'undefined') {
      return null;
    }

    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const localeMatch = locale?.match(/[-_](?<country>[A-Z]{2})$/i);
    if (localeMatch?.groups?.country) {
      return localeMatch.groups.country.toUpperCase();
    }

    const navLanguage = navigator.language;
    const languageMatch = navLanguage?.match(/[-_](?<country>[A-Z]{2})$/i);
    if (languageMatch?.groups?.country) {
      return languageMatch.groups.country.toUpperCase();
    }

    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        if (data?.country_code) {
          return String(data.country_code).toUpperCase();
        }
      }
    } catch (error) {
      console.warn('Geo lookup failed; falling back to default country.', error);
    }

    return null;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;

    const initializeHolidays = async () => {
      const storedCountry = localStorage.getItem(STORAGE_KEYS.COUNTRY);
      let resolvedCountry = storedCountry ? storedCountry.toUpperCase() : null;

      if (!resolvedCountry) {
        resolvedCountry = await detectCountryFromClient();
      }

      if (!resolvedCountry) {
        resolvedCountry = 'US';
      }

      if (!cancelled) {
        setCountryCode(resolvedCountry);
      }

      const currentYear = new Date().getFullYear();
      const autoLoadKey = `${STORAGE_KEYS.HOLIDAYS}_autoload_${resolvedCountry}_${currentYear}`;
      const alreadyLoaded = localStorage.getItem(autoLoadKey);
      const existingHolidays = getHolidays();

      if (!alreadyLoaded && existingHolidays.length === 0) {
        const result = await refreshHolidays(resolvedCountry, {
          year: currentYear,
          replaceExisting: true,
          persistCountry: true,
          silent: true,
        });

        if (result.success && !cancelled) {
          localStorage.setItem(autoLoadKey, 'true');
        }
      }
    };

    initializeHolidays();

    return () => {
      cancelled = true;
    };
  }, [detectCountryFromClient, getHolidays, refreshHolidays, setCountryCode]);

  // Action: Toggle day selection
  const toggleDaySelection = useCallback(
    (date: Date) => {
      const isSelected = isDateSelected(date);

      if (isSelected) {
        // Remove from selection
        setSelectedDays((prev) =>
          prev.filter((d) => !isSameDay(d, date))
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
    setLastOptimizationResult(null);
  }, []);

  // Action: Apply suggestions to selected days
  const applySuggestions = useCallback(() => {
    // Merge suggestions into selected days (avoiding duplicates)
    setSelectedDays((prev) => {
      const combined = [...prev];
      suggestedDays.forEach((suggestedDate) => {
        const alreadyExists = combined.some((d) => isSameDay(d, suggestedDate));
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
        const holidayDate = parseDateLocal(holiday.date);
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

      // Calculate total PTO available for the entire year
      // Use end-of-year balance to account for accrual throughout the year
      const endOfYear = new Date(targetYear, 11, 31); // December 31 of target year
      const totalYearBalance = getBalanceAsOf(endOfYear);

      // For optimization across the full year, use the total allocation
      // The optimizer will filter out already selected days via existingPTODays
      const availableDays = Math.max(totalYearBalance, 0);

      if (availableDays <= 0) {
        console.warn('No PTO days available for optimization');
        setSuggestedDays([]);
        setLastOptimizationResult(null);
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
        setLastOptimizationResult(result);

        return result;
      } catch (error) {
        console.error('Optimization error:', error);
        setLastOptimizationResult(null);
        return null;
      }
    },
    [getSettings, getWeekendDays, getHolidays, getBalanceAsOf, selectedDays]
  );

  // Context value
  const value: PlannerContextType = {
    plannerData,
    selectedDays,
    suggestedDays,
    currentStrategy,
    lastOptimizationResult,
    isAuthenticated,
    countryCode,
    isLoadingHolidays,
    setPlannerData,
    setSelectedDays,
    setSuggestedDays,
    setCurrentStrategy,
    setCountryCode,
    isDateSelected,
    isDateSuggested,
    isDateHoliday,
    isDateWeekend,
    getWeekendDays,
    getCurrentBalance,
    getSettings,
    getHolidays,
    getAccruedAmountUntil,
    getUsedAmountBefore,
    getBalanceAsOf,
    toggleDaySelection,
    clearSuggestions,
    applySuggestions,
    runOptimization,
    saveLocalSettings,
    saveLocalWeekendConfig,
    saveLocalHolidays,
    refreshHolidays,
    removeHoliday,
    addHoliday,
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
