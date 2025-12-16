'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { PlannerData, PTODay, CustomHoliday, PTOSettings, WeekendConfig, ActionResult, PTOAccrualRule, SuggestionPreferences, OptimizationResult, RankingMode } from '@/types';
import { optimizePTO, type PTOOptimizerConfig } from '@/lib/pto-optimizer';
import { formatDateLocal, parseDateLocal, isSameDay, matchesHoliday } from '@/lib/date-utils';
import { addCustomHoliday, batchAddHolidays, clearHolidaysForYear, deleteCustomHoliday } from '@/app/actions/holiday-actions';
import { migrateLocalDataToDatabase, replaceWithLocalData, mergeLocalData } from '@/app/actions/user-actions';
import { getCalendarYearBounds } from '@/lib/calendar-range';
import type { ConflictResolution, ConflictData } from '@/components/DataConflictModal';

// ============================================================================
// LocalStorage Keys
// ============================================================================

const STORAGE_KEYS = {
  SELECTED_DAYS: 'pto_planner_selected_days',
  SETTINGS: 'pto_planner_settings',
  WEEKEND_CONFIG: 'pto_planner_weekend',
  HOLIDAYS: 'pto_planner_holidays',
  COUNTRY: 'pto_planner_country',
  SUGGESTION_PREFS: 'pto_planner_suggestion_prefs',
  ACCRUAL_RULES: 'pto_planner_accrual_rules',
};

/**
 * Synchronously persist selected PTO days to localStorage
 * Called immediately when days change to prevent data loss during navigation
 */
const persistSelectedDaysSync = (days: Date[]): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const dateStrings = days.map((date) => formatDateLocal(date));
  saveToLocalStorage(STORAGE_KEYS.SELECTED_DAYS, dateStrings);
};

// ============================================================================
// LocalStorage Helper Functions
// ============================================================================

const saveToLocalStorage = (key: string, data: unknown): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    // Check specifically for quota exceeded error
    const isQuotaError =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        error.code === 22);

    if (isQuotaError) {
      console.error(
        '[PlannerContext] localStorage quota exceeded. Data may not persist.',
        { key, dataSize: JSON.stringify(data).length }
      );
    } else {
      console.error('[PlannerContext] Error saving to localStorage:', error, { key });
    }
    return false;
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

/**
 * Clear all PTO planner data from localStorage
 * Called after successful migration to prevent conflicts with future sign-ins
 */
const clearLocalStorageData = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_DAYS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.WEEKEND_CONFIG);
    localStorage.removeItem(STORAGE_KEYS.HOLIDAYS);
    localStorage.removeItem(STORAGE_KEYS.ACCRUAL_RULES);
    // Note: Keep COUNTRY and SUGGESTION_PREFS as they're user preferences, not data
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

const hasHolidaysForYear = (holidays: CustomHoliday[], year: number): boolean => {
  const yearPrefix = `${year}-`;
  return holidays.some((holiday) => typeof holiday.date === 'string' && holiday.date.startsWith(yearPrefix));
};

const HOLIDAY_YEAR_REGEX = /^(\d{4})/;

const getHolidayYear = (holiday: Pick<CustomHoliday, 'date' | 'repeats_yearly'>): number | null => {
  if (holiday.repeats_yearly) {
    return null;
  }

  const match = HOLIDAY_YEAR_REGEX.exec(holiday.date);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
};

const createHolidayKey = (holiday: Pick<CustomHoliday, 'date' | 'name'>): string => {
  return `${holiday.date}__${holiday.name}`;
};

const normalizeAccrualRules = (rules: PTOAccrualRule[]): PTOAccrualRule[] => {
  return rules.filter((rule) => {
    return (
      rule &&
      typeof rule === 'object' &&
      typeof rule.accrual_amount === 'number' &&
      typeof rule.accrual_frequency === 'string' &&
      typeof rule.effective_date === 'string'
    );
  });
};

const mergeHolidayCollections = (
  existing: CustomHoliday[],
  incoming: CustomHoliday[],
  targetYear: number,
  replaceYearData: boolean,
): CustomHoliday[] => {
  const mergedMap = new Map<string, CustomHoliday>();

  existing.forEach((holiday) => {
    const holidayYear = getHolidayYear(holiday);
    if (replaceYearData && holidayYear === targetYear) {
      return;
    }
    mergedMap.set(createHolidayKey(holiday), holiday);
  });

  incoming.forEach((holiday) => {
    mergedMap.set(createHolidayKey(holiday), holiday);
  });

  return Array.from(mergedMap.values()).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return a.name.localeCompare(b.name);
  });
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

type StoredSuggestionPreferences = {
  earliestStart: string;
  latestEnd: string;
  minPTOToKeep?: number;
  maxConsecutiveDaysOff?: number;
  minConsecutiveDaysOff?: number;
  streakHighlightThreshold?: number;
  rankingMode?: RankingMode;
  minSpacingBetweenBreaks?: number;
  extendExistingPTO?: boolean;
  // legacy fields
  maxPTOPerBreak?: number;
  maxPTOToUse?: number;
  maxSuggestions?: number;
};

const SUPPORTED_RANKING_MODES: RankingMode[] = ['efficiency', 'longest', 'least-pto', 'earliest'];

const isRankingMode = (value: unknown): value is RankingMode => {
  return typeof value === 'string' && SUPPORTED_RANKING_MODES.includes(value as RankingMode);
};

function getDefaultSuggestionPreferences(): SuggestionPreferences {
  const today = startOfDay(new Date());
  const currentYear = today.getFullYear();
  const earliestStart = startOfDay(new Date(currentYear - 2, 0, 1));
  const latestEnd = startOfDay(new Date(currentYear + 2, 11, 31));

  return {
    earliestStart,
    latestEnd,
    minPTOToKeep: 2,
    maxConsecutiveDaysOff: 14,
    minConsecutiveDaysOff: 4,
    streakHighlightThreshold: 3,
    rankingMode: 'efficiency',
    minSpacingBetweenBreaks: 14,
    extendExistingPTO: true,
  };
}

function loadInitialSuggestionPreferences(): SuggestionPreferences {
  const fallback = getDefaultSuggestionPreferences();

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const stored = loadFromLocalStorage<StoredSuggestionPreferences | null>(
      STORAGE_KEYS.SUGGESTION_PREFS,
      null
    );

    if (!stored) {
      return fallback;
    }

    // Helper to safely parse dates from localStorage
    const safeParseDate = (dateStr: string | undefined, defaultDate: Date): Date => {
      if (!dateStr) return defaultDate;
      const parsed = new Date(dateStr);
      return !Number.isNaN(parsed.getTime()) ? startOfDay(parsed) : defaultDate;
    };

    const earliest = safeParseDate(stored.earliestStart, fallback.earliestStart);
    const latest = safeParseDate(stored.latestEnd, fallback.latestEnd);

    const coerceNumber = (value: unknown, defaultValue: number): number => {
      return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
    };

    const storedAny = stored as StoredSuggestionPreferences;

    return {
      earliestStart: earliest,
      latestEnd: latest,
      minPTOToKeep: coerceNumber(storedAny.minPTOToKeep, fallback.minPTOToKeep),
      maxConsecutiveDaysOff: coerceNumber(
        storedAny.maxConsecutiveDaysOff ?? storedAny.maxPTOPerBreak,
        fallback.maxConsecutiveDaysOff
      ),
      minConsecutiveDaysOff: coerceNumber(
        storedAny.minConsecutiveDaysOff,
        fallback.minConsecutiveDaysOff
      ),
      streakHighlightThreshold: coerceNumber(
        storedAny.streakHighlightThreshold,
        fallback.streakHighlightThreshold
      ),
      rankingMode: isRankingMode(storedAny.rankingMode) ? storedAny.rankingMode : fallback.rankingMode,
      minSpacingBetweenBreaks: coerceNumber(
        storedAny.minSpacingBetweenBreaks,
        fallback.minSpacingBetweenBreaks
      ),
      extendExistingPTO:
        typeof storedAny.extendExistingPTO === 'boolean'
          ? storedAny.extendExistingPTO
          : fallback.extendExistingPTO,
    };
  } catch (error) {
    console.warn('Failed to load suggestion preferences, falling back to defaults', error);
    return fallback;
  }
}

function persistSuggestionPreferences(preferences: SuggestionPreferences) {
  // Validate dates before persisting to avoid Invalid time value errors
  const earliestStart = preferences.earliestStart instanceof Date && !Number.isNaN(preferences.earliestStart.getTime())
    ? preferences.earliestStart.toISOString()
    : new Date().toISOString();
  const latestEnd = preferences.latestEnd instanceof Date && !Number.isNaN(preferences.latestEnd.getTime())
    ? preferences.latestEnd.toISOString()
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

  const payload: StoredSuggestionPreferences = {
    earliestStart,
    latestEnd,
    minPTOToKeep: preferences.minPTOToKeep,
    maxConsecutiveDaysOff: preferences.maxConsecutiveDaysOff,
    minConsecutiveDaysOff: preferences.minConsecutiveDaysOff,
    streakHighlightThreshold: preferences.streakHighlightThreshold,
    rankingMode: preferences.rankingMode,
    minSpacingBetweenBreaks: preferences.minSpacingBetweenBreaks,
    extendExistingPTO: preferences.extendExistingPTO,
  };
  saveToLocalStorage(STORAGE_KEYS.SUGGESTION_PREFS, payload);
}

const dedupeDateList = (dates: Date[]): Date[] => {
  const map = new Map<string, Date>();
  dates.forEach((date) => {
    const normalized = startOfDay(date);
    map.set(normalized.toISOString(), normalized);
  });
  return Array.from(map.values()).sort((a, b) => a.getTime() - b.getTime());
};

const expandHolidayDates = (holidays: CustomHoliday[], rangeStart: Date, rangeEnd: Date): Date[] => {
  if (!holidays.length) {
    return [];
  }

  const startYear = rangeStart.getFullYear();
  const endYear = rangeEnd.getFullYear();
  const expanded: Date[] = [];

  holidays.forEach((holiday) => {
    if (!holiday.date) {
      return;
    }

    const baseDate = parseDateLocal(holiday.date);

    if (holiday.repeats_yearly) {
      for (let year = startYear; year <= endYear; year++) {
        const occurrence = startOfDay(new Date(year, baseDate.getMonth(), baseDate.getDate()));
        if (occurrence >= rangeStart && occurrence <= rangeEnd) {
          expanded.push(occurrence);
        }
      }
    } else {
      const normalized = startOfDay(baseDate);
      if (normalized >= rangeStart && normalized <= rangeEnd) {
        expanded.push(normalized);
      }
    }
  });

  return dedupeDateList(expanded);
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
  suggestionPreferences: SuggestionPreferences;
  lastOptimizationResult: OptimizationResult | null;
  isAuthenticated: boolean;
  countryCode: string;
  isLoadingHolidays: boolean;
  isGeneratingSuggestions: boolean;
  isInitializing: boolean;

  // State setters
  setPlannerData: (data: PlannerData | null) => void;
  setSelectedDays: React.Dispatch<React.SetStateAction<Date[]>>;
  setSuggestedDays: React.Dispatch<React.SetStateAction<Date[]>>;
  setCountryCode: (country: string) => void;
  updateSuggestionPreferences: (
    update:
      | Partial<SuggestionPreferences>
      | ((prev: SuggestionPreferences) => SuggestionPreferences)
  ) => void;

  // Helper methods
  isDateSelected: (date: Date) => boolean;
  isDateSuggested: (date: Date) => boolean;
  isDateHoliday: (date: Date) => boolean;
  isDateWeekend: (date: Date) => boolean;
  getWeekendDays: () => number[];
  getCurrentBalance: () => number;
  getSettings: () => Partial<PTOSettings>;
  getHolidays: () => CustomHoliday[];
  getAccrualRules: () => PTOAccrualRule[];
  getAccruedAmountUntil: (date: Date) => number;
  getUsedAmountBefore: (date: Date) => number;
  getBalanceAsOf: (date: Date) => number;

  // Actions
  toggleDaySelection: (date: Date) => void;
  clearSuggestions: () => void;
  applySuggestions: () => void;
  generateSuggestions: (options?: { silent?: boolean }) => OptimizationResult | null;
  saveLocalSettings: (settings: Partial<PTOSettings>) => void;
  saveLocalWeekendConfig: (weekendDays: number[]) => void;
  saveLocalHolidays: (holidays: CustomHoliday[]) => void;
  saveLocalAccrualRules: (rules: PTOAccrualRule[]) => void;
  refreshHolidays: (country?: string, options?: HolidaySyncOptions) => Promise<HolidaySyncResult>;
  removeHoliday: (holiday: HolidayRemovalTarget) => Promise<{ success: boolean; error?: string }>;
  addHoliday: (holiday: {
    name: string;
    date: string;
    endDate?: string;
    repeatsYearly?: boolean;
    isPaidHoliday?: boolean;
  }) => Promise<ActionResult<CustomHoliday[]>>;

  // Conflict resolution
  showConflictModal: boolean;
  conflictData: ConflictData | null;
  resolveConflict: (resolution: ConflictResolution) => Promise<void>;
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
  const [suggestionPreferences, setSuggestionPreferences] = useState<SuggestionPreferences>(() => loadInitialSuggestionPreferences());
  const [lastOptimizationResult, setLastOptimizationResult] = useState<OptimizationResult | null>(null);
  const suggestionPreferencesRef = useRef<SuggestionPreferences>(suggestionPreferences);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState<boolean>(false);
  const [localWeekendVersion, setLocalWeekendVersion] = useState(0);
  const [shouldUseLocalFallback, setShouldUseLocalFallback] = useState(false);
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
  const [localAccrualRules, setLocalAccrualRules] = useState<PTOAccrualRule[]>(() =>
    loadFromLocalStorage<PTOAccrualRule[]>(STORAGE_KEYS.ACCRUAL_RULES, [])
  );
  const [isLoadingHolidays, setIsLoadingHolidays] = useState<boolean>(false);
  // Start as initialized if user already has holidays (returning user)
  const [isInitializing, setIsInitializing] = useState<boolean>(() => {
    // If authenticated user already has holidays, they're a returning user - no init needed
    if (initialData?.holidays && initialData.holidays.length > 0) {
      return false;
    }
    // Check localStorage for unauthenticated returning users
    if (typeof window !== 'undefined') {
      const storedHolidays = loadFromLocalStorage<CustomHoliday[]>(STORAGE_KEYS.HOLIDAYS, []);
      if (storedHolidays.length > 0) {
        return false;
      }
    }
    return true;
  });

  // Conflict resolution state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const pendingLocalDataRef = useRef<{
    selectedDays: string[];
    settings: Partial<PTOSettings>;
    holidays: CustomHoliday[];
    weekendDays: number[];
    accrualRules: PTOAccrualRule[];
  } | null>(null);

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
    if (plannerData?.holidays && plannerData.holidays.length > 0) {
      return plannerData.holidays;
    }

    if (!isAuthenticated) {
      return localHolidays;
    }

    if (shouldUseLocalFallback && localHolidays.length > 0) {
      return localHolidays;
    }

    return plannerData?.holidays ?? [];
  }, [plannerData, localHolidays, isAuthenticated, shouldUseLocalFallback]);

  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined' || !plannerData?.user?.id) {
      setShouldUseLocalFallback(false);
      return;
    }

    const migrationKey = `pto_planner_migration_done_${plannerData.user.id}`;
    const migrationDone = localStorage.getItem(migrationKey);

    if (migrationDone) {
      setShouldUseLocalFallback(false);
      return;
    }

    // Check if user already has data in the database (returning user)
    // If so, don't use local fallback - their synced data is authoritative
    const userHasExistingData =
      (plannerData.ptoDays && plannerData.ptoDays.length > 0) ||
      (plannerData.holidays && plannerData.holidays.length > 0);

    if (userHasExistingData) {
      setShouldUseLocalFallback(false);
      return;
    }

    // Only use local fallback for new users who have localStorage data
    const storedDays = loadFromLocalStorage<string[]>(STORAGE_KEYS.SELECTED_DAYS, []);
    const storedSettings = loadFromLocalStorage<Partial<PTOSettings>>(STORAGE_KEYS.SETTINGS, {});
    const storedHolidays = loadFromLocalStorage<CustomHoliday[]>(STORAGE_KEYS.HOLIDAYS, []);
    const storedWeekend = loadFromLocalStorage<number[]>(STORAGE_KEYS.WEEKEND_CONFIG, []);

    const hasLocalData =
      storedDays.length > 0 ||
      Object.keys(storedSettings).length > 0 ||
      storedHolidays.length > 0 ||
      storedWeekend.length > 0;

    setShouldUseLocalFallback(hasLocalData);
  }, [isAuthenticated, plannerData?.user?.id, plannerData?.ptoDays, plannerData?.holidays]);

  // Initialize from plannerData or localStorage
  useEffect(() => {
    // For authenticated users with actual PTO days in the database
    if (plannerData?.ptoDays && plannerData.ptoDays.length > 0) {
      const dates = plannerData.ptoDays
        .filter((day) => day.status === 'planned')
        .map((day) => parseDateLocal(day.date));
      setSelectedDays(dates);
      return;
    }

    // For authenticated users during migration - use localStorage as fallback
    if (isAuthenticated && shouldUseLocalFallback) {
      const storedDays = loadFromLocalStorage<string[]>(STORAGE_KEYS.SELECTED_DAYS, []);
      if (storedDays.length > 0) {
        const dates = storedDays.map((dateStr) => parseDateLocal(dateStr));
        setSelectedDays(dates);
        return;
      }
    }

    // For unauthenticated users - load from localStorage
    if (!isAuthenticated) {
      const storedDays = loadFromLocalStorage<string[]>(STORAGE_KEYS.SELECTED_DAYS, []);
      const dates = storedDays.map((dateStr) => parseDateLocal(dateStr));
      setSelectedDays(dates);
      return;
    }

    // Authenticated user with no PTO days and no local fallback - start empty
    setSelectedDays([]);
  }, [plannerData, isAuthenticated, shouldUseLocalFallback]);

  // Persist suggestion preferences
  useEffect(() => {
    suggestionPreferencesRef.current = suggestionPreferences;
    persistSuggestionPreferences(suggestionPreferences);
  }, [suggestionPreferences]);

  // Migrate localStorage data to database when user first signs in
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined' || !plannerData?.user?.id) {
      return;
    }

    const migrationKey = `pto_planner_migration_done_${plannerData.user.id}`;

    // Check if there's any localStorage data to migrate FIRST
    // This is important because the user may have added new data since last migration
    const storedDays = loadFromLocalStorage<string[]>(STORAGE_KEYS.SELECTED_DAYS, []);
    const storedSettings = loadFromLocalStorage<Partial<PTOSettings>>(STORAGE_KEYS.SETTINGS, {});
    const storedHolidays = loadFromLocalStorage<CustomHoliday[]>(STORAGE_KEYS.HOLIDAYS, []);
    const storedWeekend = loadFromLocalStorage<number[]>(STORAGE_KEYS.WEEKEND_CONFIG, []);
    const storedAccrualRules = loadFromLocalStorage<PTOAccrualRule[]>(STORAGE_KEYS.ACCRUAL_RULES, []);

    const hasLocalData =
      storedDays.length > 0 ||
      Object.keys(storedSettings).length > 0 ||
      storedHolidays.length > 0 ||
      storedWeekend.length > 0 ||
      storedAccrualRules.length > 0;

    // If no local data to migrate, mark as done and return
    if (!hasLocalData) {
      localStorage.setItem(migrationKey, 'true');
      return;
    }

    // If there IS local data, we need to check if migration is needed
    // even if the migration flag is set (user may have added new data after migration)
    console.log('[Migration] Found local data:', {
      ptoDays: storedDays.length,
      holidays: storedHolidays.length,
      accrualRules: storedAccrualRules.length,
      hasSettings: Object.keys(storedSettings).length > 0,
    });

    // Check if user already has data in the database (returning user)
    const userHasExistingPtoDays = plannerData.ptoDays && plannerData.ptoDays.length > 0;
    const userHasExistingHolidays = plannerData.holidays && plannerData.holidays.length > 0;
    const userHasExistingData = userHasExistingPtoDays || userHasExistingHolidays;

    if (userHasExistingData) {
      // User has existing account data AND local data - show conflict resolution modal
      console.log('Conflict detected: user has both local and synced data', {
        localPtoDays: storedDays.length,
        localHolidays: storedHolidays.length,
        localAccrualRules: storedAccrualRules.length,
        syncedPtoDays: plannerData.ptoDays?.length || 0,
        syncedHolidays: plannerData.holidays?.length || 0,
      });

      // Store the local data for later use
      pendingLocalDataRef.current = {
        selectedDays: storedDays,
        settings: storedSettings,
        holidays: storedHolidays,
        weekendDays: storedWeekend,
        accrualRules: storedAccrualRules,
      };

      // Set conflict data for the modal
      setConflictData({
        localPtoDays: storedDays.length,
        syncedPtoDays: plannerData.ptoDays?.length || 0,
        localHolidays: storedHolidays.length,
        syncedHolidays: plannerData.holidays?.length || 0,
        hasLocalSettings: Object.keys(storedSettings).length > 0,
      });

      // Show the modal
      setShowConflictModal(true);
      return;
    }

    // Perform migration for new users only
    const performMigration = async () => {
      try {
        console.log('Migrating local data for new user:', {
          ptoDays: storedDays.length,
          holidays: storedHolidays.length,
          accrualRules: storedAccrualRules.length,
          hasSettings: Object.keys(storedSettings).length > 0,
        });

        const result = await migrateLocalDataToDatabase({
          selectedDays: storedDays,
          settings: {
            initial_balance: storedSettings.initial_balance,
            pto_start_date: storedSettings.pto_start_date,
            carry_over_limit: storedSettings.carry_over_limit ?? undefined,
            pto_display_unit: storedSettings.pto_display_unit,
            hours_per_day: storedSettings.hours_per_day,
            hours_per_week: storedSettings.hours_per_week,
          },
          holidays: storedHolidays.map(h => ({
            name: h.name,
            date: h.date,
            repeats_yearly: h.repeats_yearly,
            is_paid_holiday: h.is_paid_holiday,
          })),
          weekendDays: storedWeekend,
          accrualRules: storedAccrualRules.map(r => ({
            name: r.name,
            accrual_amount: r.accrual_amount,
            accrual_frequency: r.accrual_frequency,
            accrual_day: r.accrual_day,
            effective_date: r.effective_date,
            end_date: r.end_date,
            is_active: r.is_active,
          })),
        });

        if (result.success && result.data?.migrated) {
          console.log('Successfully migrated local data:', result.data.details);
          // Clear localStorage after successful migration to prevent future conflicts
          clearLocalStorageData();
          // Mark migration as complete
          localStorage.setItem(migrationKey, 'true');
          setShouldUseLocalFallback(false);
          if (result.data.plannerData) {
            setPlannerData(result.data.plannerData);
          }
        } else if (result.success && !result.data?.migrated) {
          // Migration ran but nothing was migrated (data already exists)
          clearLocalStorageData();
          localStorage.setItem(migrationKey, 'true');
          setShouldUseLocalFallback(false);
        } else if (!result.success) {
          console.error('Failed to migrate local data:', result.error);
          // Don't clear localStorage on failure - user can retry
        }
      } catch (error) {
        console.error('Error during data migration:', error);
      }
    };

    performMigration();
  }, [isAuthenticated, plannerData?.user?.id, plannerData?.ptoDays, plannerData?.holidays]);

  // Backup persistence: Reconcile selected days to localStorage when not authenticated
  // Primary persistence happens synchronously in toggleDaySelection/applySuggestions
  // This effect ensures consistency if state is modified through other means
  useEffect(() => {
    if (!isAuthenticated && selectedDays.length > 0) {
      persistSelectedDaysSync(selectedDays);
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

      // During migration, prefer localStorage weekend config
      if (shouldUseLocalFallback) {
        const storedWeekend = loadFromLocalStorage<number[]>(STORAGE_KEYS.WEEKEND_CONFIG, []);
        if (storedWeekend.length > 0) {
          return storedWeekend.includes(dayOfWeek);
        }
      }

      if (plannerData?.weekendConfig && plannerData.weekendConfig.length > 0) {
        // Use database config for authenticated users
        return plannerData.weekendConfig.some(
          (config) => config.day_of_week === dayOfWeek && config.is_weekend
        );
      }

      // Use localStorage for unauthenticated users
      const storedWeekend = loadFromLocalStorage<number[]>(STORAGE_KEYS.WEEKEND_CONFIG, [0, 6]);
      return storedWeekend.includes(dayOfWeek);
    },
    [plannerData, shouldUseLocalFallback]
  );

  // Helper: Get weekend days as array
  const getWeekendDays = useCallback((): number[] => {
    // During migration, prefer localStorage weekend config
    if (shouldUseLocalFallback) {
      const storedWeekend = loadFromLocalStorage<number[]>(STORAGE_KEYS.WEEKEND_CONFIG, []);
      if (storedWeekend.length > 0) {
        return storedWeekend;
      }
    }

    if (plannerData?.weekendConfig && plannerData.weekendConfig.length > 0) {
      return plannerData.weekendConfig
        .filter((config) => config.is_weekend)
        .map((config) => config.day_of_week);
    }

    // Fallback to localStorage for unauthenticated users
    return loadFromLocalStorage<number[]>(STORAGE_KEYS.WEEKEND_CONFIG, [0, 6]);
  }, [plannerData, shouldUseLocalFallback]);

  // Helper: Get current PTO balance
  const getCurrentBalance = useCallback((): number => {
    // During migration, prefer localStorage balance
    if (shouldUseLocalFallback) {
      const storedSettings = loadFromLocalStorage<Partial<PTOSettings>>(STORAGE_KEYS.SETTINGS, {});
      if (storedSettings.initial_balance !== undefined) {
        return storedSettings.initial_balance;
      }
    }

    if (plannerData?.currentBalance) {
      return plannerData.currentBalance.current_balance;
    }

    if (plannerData?.settings?.initial_balance) {
      return plannerData.settings.initial_balance;
    }

    // Fallback to localStorage for unauthenticated users
    const storedSettings = loadFromLocalStorage<Partial<PTOSettings>>(STORAGE_KEYS.SETTINGS, {});
    return storedSettings.initial_balance || 0;
  }, [plannerData, shouldUseLocalFallback]);

  // Helper: Get settings (from DB or localStorage)
  const getSettings = useCallback((): Partial<PTOSettings> => {
    const defaultSettings: Partial<PTOSettings> = {
      initial_balance: 15,
      pto_display_unit: 'days',
      hours_per_day: 8,
      hours_per_week: 40,
      carry_over_limit: null,
    };

    // For unauthenticated users, always use localStorage
    if (!isAuthenticated) {
      return loadFromLocalStorage<Partial<PTOSettings>>(STORAGE_KEYS.SETTINGS, defaultSettings);
    }

    // During migration, merge localStorage settings with database settings
    // This ensures user sees their local settings while migration completes
    if (shouldUseLocalFallback) {
      const localSettings = loadFromLocalStorage<Partial<PTOSettings>>(STORAGE_KEYS.SETTINGS, {});
      if (Object.keys(localSettings).length > 0) {
        // Merge: local settings take priority over database defaults
        return {
          ...defaultSettings,
          ...plannerData?.settings,
          ...localSettings,
        };
      }
    }

    // Authenticated user with database settings
    if (plannerData?.settings) {
      return plannerData.settings;
    }

    // Fallback to defaults
    return defaultSettings;
  }, [plannerData, isAuthenticated, shouldUseLocalFallback]);

  // Helper: Get accrual rules (from DB or localStorage)
  // For unauthenticated users, always read directly from localStorage to ensure we get the latest values
  const getAccrualRules = useCallback((): PTOAccrualRule[] => {
    const normalizedFromDb =
      plannerData?.accrualRules && plannerData.accrualRules.length > 0
        ? normalizeAccrualRules(plannerData.accrualRules)
        : [];

    if (isAuthenticated && normalizedFromDb.length > 0) {
      return normalizedFromDb;
    }

    // Fall back to localStorage rules (useful right after sign-in/migration while DB rules are pending)
    const storedRules = loadFromLocalStorage<PTOAccrualRule[]>(STORAGE_KEYS.ACCRUAL_RULES, []);
    if (storedRules.length > 0) {
      const normalizedLocal = normalizeAccrualRules(storedRules);
      if (normalizedLocal.length > 0) {
        return normalizedLocal;
      }
    }

    return normalizedFromDb;
  }, [plannerData?.accrualRules, isAuthenticated]);

  const getAccruedAmountUntil = useCallback(
    (date: Date): number => {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return 0;
      }

      const settings = getSettings();
      const accrualRules = getAccrualRules();

      if (!accrualRules.length) {
        console.log('[getAccruedAmountUntil] No accrual rules found');
        return 0;
      }

      const target = startOfDay(date);
      const startDate = settings.pto_start_date ? startOfDay(parseDateLocal(settings.pto_start_date)) : null;

      if (startDate && target < startDate) {
        return 0;
      }

      const accrued = accrualRules.reduce((sum, rule) => {
        const ruleAccrual = calculateAccrualsForRule(rule, target);
        return sum + ruleAccrual;
      }, 0);

      return accrued;
    },
    [getSettings, getAccrualRules]
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

    const carryOverLimit =
      typeof settings.carry_over_limit === 'number' && settings.carry_over_limit >= 0
        ? settings.carry_over_limit
        : null;

    const renewalDate = settings.renewal_date ? startOfDay(parseDateLocal(settings.renewal_date)) : null;

    let carryoverAdjustments = 0;

    if (carryOverLimit !== null && renewalDate) {
      const normalizedLimit = Math.max(carryOverLimit, 0);
      const resetDates: Date[] = [];
      let candidate = startOfDay(new Date(renewalDate));

      while (candidate <= target) {
        if (!startDate || candidate > startDate) {
          resetDates.push(candidate);
        }
        candidate = startOfDay(new Date(candidate.getFullYear() + 1, renewalDate.getMonth(), renewalDate.getDate()));
      }

      for (const resetDate of resetDates) {
        const accruedUntilReset = getAccruedAmountUntil(resetDate);
        const usedBeforeReset = getUsedAmountBefore(resetDate);

        const balanceBeforeReset = initialBalance + accruedUntilReset - usedBeforeReset - carryoverAdjustments;
        const allowedCarryover = Math.min(normalizedLimit, Math.max(balanceBeforeReset, 0));

        if (balanceBeforeReset > allowedCarryover) {
          carryoverAdjustments += balanceBeforeReset - allowedCarryover;
        }
      }
    }

    let balance = initialBalance + accrued - used - carryoverAdjustments;

    if (typeof settings.max_balance === 'number') {
      balance = Math.min(balance, settings.max_balance);
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
    setLocalWeekendVersion((version) => version + 1);
  }, []);

  // Action: Save holidays to localStorage
  const saveLocalHolidays = useCallback((holidays: CustomHoliday[]) => {
    setLocalHolidays(holidays);
    saveToLocalStorage(STORAGE_KEYS.HOLIDAYS, holidays);
  }, []);

  // Action: Save accrual rules to localStorage
  const saveLocalAccrualRules = useCallback((rules: PTOAccrualRule[]) => {
    setLocalAccrualRules(rules);
    saveToLocalStorage(STORAGE_KEYS.ACCRUAL_RULES, rules);
  }, []);

  const refreshHolidays = useCallback(async (
    country?: string,
    options?: HolidaySyncOptions
  ): Promise<HolidaySyncResult> => {
    const targetCountry = (country || countryCode || 'US').toUpperCase();
    const targetYear = options?.year ?? new Date().getFullYear();
    const shouldToggleLoading = !options?.silent;
    const replaceYearData = options?.replaceExisting !== false;
    const existingHolidays = getHolidays();

    if (shouldToggleLoading) {
      setIsLoadingHolidays(true);
    }

    const endLoading = () => {
      if (shouldToggleLoading) {
        setIsLoadingHolidays(false);
      }
    };

    let holidaysToReturn: CustomHoliday[] = [];

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
        repeats_yearly: holiday.repeats_yearly ?? false,
        is_paid_holiday: holiday.is_paid_holiday ?? true,
        created_at: holiday.created_at ?? nowIso,
        updated_at: holiday.updated_at ?? nowIso,
      }));

      if (isAuthenticated) {
        if (replaceYearData) {
          const clearResult = await clearHolidaysForYear(targetYear, true);
          if (!clearResult.success) {
            throw new Error(clearResult.error || 'Failed to clear existing holidays');
          }
        }

        let holidaysNeedingInsert = normalizedHolidays;

        if (!replaceYearData && existingHolidays.length > 0) {
          const existingKeys = new Set(existingHolidays.map((holiday) => createHolidayKey(holiday)));
          holidaysNeedingInsert = normalizedHolidays.filter(
            (holiday) => !existingKeys.has(createHolidayKey(holiday))
          );
        }

        let insertedHolidays: CustomHoliday[] = [];

        if (holidaysNeedingInsert.length > 0) {
          const addResult = await batchAddHolidays(
            holidaysNeedingInsert.map((holiday) => ({
              name: holiday.name,
              date: holiday.date,
              repeatsYearly: holiday.repeats_yearly,
              isPaidHoliday: holiday.is_paid_holiday,
            }))
          );

          if (!addResult.success) {
            throw new Error(addResult.error || 'Failed to save holidays');
          }

          insertedHolidays = addResult.data || [];
        }

        const mergedHolidays = mergeHolidayCollections(
          existingHolidays,
          insertedHolidays,
          targetYear,
          replaceYearData,
        );

        holidaysToReturn = mergedHolidays;

        setPlannerData((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            holidays: mergedHolidays,
          };
        });
      } else {
        const mergedHolidays = mergeHolidayCollections(
          existingHolidays,
          normalizedHolidays,
          targetYear,
          replaceYearData,
        );

        holidaysToReturn = mergedHolidays;
        saveLocalHolidays(mergedHolidays);
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
  }, [batchAddHolidays, clearHolidaysForYear, countryCode, generateHolidayId, getHolidays, isAuthenticated, plannerData, saveLocalHolidays, setCountryCode]);

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
      endDate,
      repeatsYearly = false,
      isPaidHoliday = true,
    }: {
      name: string;
      date: string;
      endDate?: string;
      repeatsYearly?: boolean;
      isPaidHoliday?: boolean;
    }): Promise<ActionResult<CustomHoliday[]>> => {
      try {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return { success: false, error: 'Holiday name is required' };
        }

        if (!date) {
          return { success: false, error: 'Start date is required' };
        }

        const start = parseDateLocal(date);
        if (Number.isNaN(start.getTime())) {
          return { success: false, error: 'Invalid start date' };
        }

        let rangeEnd = start;
        if (endDate) {
          const parsedEnd = parseDateLocal(endDate);
          if (Number.isNaN(parsedEnd.getTime())) {
            return { success: false, error: 'Invalid end date' };
          }
          if (parsedEnd < start) {
            return { success: false, error: 'End date cannot be before start date.' };
          }
          rangeEnd = parsedEnd;
        }

        const existingHolidaysSnapshot = [...getHolidays()];
        const datesToInsert: Array<{ dateObj: Date; dateStr: string }> = [];
        const seenDates = new Set<string>();

        const normalizedStart = startOfDay(start);
        const normalizedEnd = startOfDay(rangeEnd);

        for (
          let cursor = new Date(normalizedStart);
          cursor <= normalizedEnd;
          cursor = addDays(cursor, 1)
        ) {
          const currentDate = new Date(cursor);
          const dateStrCandidate = formatDateLocal(currentDate);

          if (seenDates.has(dateStrCandidate)) {
            continue;
          }

          const isWeekendDay = isDateWeekend(currentDate);
          const alreadyHoliday = existingHolidaysSnapshot.some((holiday) =>
            matchesHoliday(currentDate, holiday.date, holiday.repeats_yearly)
          );

          if (isWeekendDay || alreadyHoliday) {
            continue;
          }

          datesToInsert.push({
            dateObj: currentDate,
            dateStr: dateStrCandidate,
          });
          seenDates.add(dateStrCandidate);
        }

        if (datesToInsert.length === 0) {
          return {
            success: false,
            error: 'No eligible dates to add. All days fall on weekends or existing holidays.',
          };
        }

        const createdHolidays: CustomHoliday[] = [];
        const addedDates: Date[] = [];

        if (isAuthenticated) {
          for (const entry of datesToInsert) {
            const result = await addCustomHoliday(trimmedName, entry.dateStr, repeatsYearly, isPaidHoliday);

            if (!result.success) {
              if (addedDates.length > 0) {
                setSelectedDays((prev) =>
                  prev.filter(
                    (existingDate) => !addedDates.some((addedDate) => isSameDay(existingDate, addedDate))
                  )
                );
              }
              return { success: false, error: result.error };
            }

            if (!result.data) {
              if (addedDates.length > 0) {
                setSelectedDays((prev) =>
                  prev.filter(
                    (existingDate) => !addedDates.some((addedDate) => isSameDay(existingDate, addedDate))
                  )
                );
              }
              return { success: false, error: 'Failed to add holiday' };
            }

            const insertedHoliday = result.data;
            createdHolidays.push(insertedHoliday);
            addedDates.push(new Date(entry.dateObj));
            existingHolidaysSnapshot.push(insertedHoliday);

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
          }
        } else {
          const nowIso = new Date().toISOString();
          const localAdditions = datesToInsert.map((entry) => {
            const newHoliday: CustomHoliday = {
              id: generateHolidayId(),
              user_id: 'local',
              name: trimmedName,
              date: entry.dateStr,
              repeats_yearly: repeatsYearly,
              is_paid_holiday: isPaidHoliday,
              created_at: nowIso,
              updated_at: nowIso,
            };

            createdHolidays.push(newHoliday);
            addedDates.push(new Date(entry.dateObj));
            existingHolidaysSnapshot.push(newHoliday);

            return newHoliday;
          });

          const nextLocal = [...localHolidays, ...localAdditions].sort((a, b) => a.date.localeCompare(b.date));
          saveLocalHolidays(nextLocal);
        }

        if (addedDates.length > 0) {
          setSelectedDays((prev) =>
            prev.filter((existingDate) =>
              !addedDates.some((addedDate) => isSameDay(existingDate, addedDate))
            )
          );
        }

        return { success: true, data: createdHolidays };
      } catch (error) {
        console.error('Error adding holiday:', error);
        if (error instanceof Error) {
          return { success: false, error: error.message };
        }
        return { success: false, error: 'Failed to add holiday' };
      }
    },
    [
      addCustomHoliday,
      generateHolidayId,
      getHolidays,
      isAuthenticated,
      isDateWeekend,
      localHolidays,
      saveLocalHolidays,
      setPlannerData,
      setSelectedDays,
    ]
  );

  const detectCountryFromClient = useCallback(async (options?: { preferIp?: boolean }): Promise<string | null> => {
    if (typeof window === 'undefined') {
      return null;
    }

    const detectFromIP = async () => {
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
    };

    if (options?.preferIp) {
      const ipCountry = await detectFromIP();
      if (ipCountry) {
        return ipCountry;
      }
    }

    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const localeMatch = locale?.match(/[-_]([A-Z]{2})$/i);
    if (localeMatch?.[1]) {
      return localeMatch[1].toUpperCase();
    }

    const navLanguage = navigator.language;
    const languageMatch = navLanguage?.match(/[-_]([A-Z]{2})$/i);
    if (languageMatch?.[1]) {
      return languageMatch[1].toUpperCase();
    }

    return detectFromIP();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let cancelled = false;

    const initializeHolidays = async () => {
      const storedCountry = localStorage.getItem(STORAGE_KEYS.COUNTRY);
      const normalizedStored = storedCountry ? storedCountry.toUpperCase() : null;
      const preferIpLookup = !normalizedStored;

      let resolvedCountry = normalizedStored;

      if (!resolvedCountry) {
        resolvedCountry = await detectCountryFromClient({ preferIp: preferIpLookup });
      }

      if (!resolvedCountry) {
        resolvedCountry = 'US';
      }

      if (!cancelled) {
        setCountryCode(resolvedCountry);
      }

      const { startYear, endYear } = getCalendarYearBounds();
      const yearsToPrefetch: number[] = [];
      for (let year = startYear; year <= endYear; year += 1) {
        yearsToPrefetch.push(year);
      }

      // Check which years need to be fetched
      const yearsToFetch: number[] = [];
      const existingHolidays = getHolidays();

      for (const year of yearsToPrefetch) {
        const autoLoadKey = `${STORAGE_KEYS.HOLIDAYS}_autoload_${resolvedCountry}_${year}`;
        const alreadyLoaded = localStorage.getItem(autoLoadKey);
        const hasYearData = existingHolidays.length > 0 && hasHolidaysForYear(existingHolidays, year);

        if (!alreadyLoaded && !hasYearData) {
          yearsToFetch.push(year);
        }
      }

      // If no years need fetching, mark initialization as complete immediately
      if (yearsToFetch.length === 0) {
        if (!cancelled) {
          setIsInitializing(false);
        }
        return;
      }

      // Fetch all years in parallel and collect results
      const fetchPromises = yearsToFetch.map(async (year) => {
        try {
          const response = await fetch(`/api/holidays?country=${encodeURIComponent(resolvedCountry!)}&year=${year}`);
          if (!response.ok) {
            return { year, success: false, holidays: [] };
          }
          const payload = await response.json();
          if (!payload?.success || !Array.isArray(payload.data)) {
            return { year, success: false, holidays: [] };
          }
          return { year, success: true, holidays: payload.data };
        } catch (error) {
          console.warn(`[PlannerContext] Failed to fetch holidays for ${year}:`, error);
          return { year, success: false, holidays: [] };
        }
      });

      const results = await Promise.all(fetchPromises);

      if (cancelled) {
        return;
      }

      // Batch all holidays together
      const nowIso = new Date().toISOString();
      const allNewHolidays: CustomHoliday[] = [];
      const successfulYears: number[] = [];

      for (const result of results) {
        if (result.success && result.holidays.length > 0) {
          successfulYears.push(result.year);
          for (const holiday of result.holidays) {
            allNewHolidays.push({
              id: holiday.id ?? generateHolidayId(),
              user_id: plannerData?.user?.id ?? 'local',
              name: holiday.name,
              date: holiday.date,
              repeats_yearly: holiday.repeats_yearly ?? false,
              is_paid_holiday: holiday.is_paid_holiday ?? true,
              created_at: holiday.created_at ?? nowIso,
              updated_at: holiday.updated_at ?? nowIso,
            });
          }
        }
      }

      // Single state update with all holidays
      if (allNewHolidays.length > 0 && !cancelled) {
        if (isAuthenticated) {
          // For authenticated users, batch save to database
          const addResult = await batchAddHolidays(
            allNewHolidays.map((holiday) => ({
              name: holiday.name,
              date: holiday.date,
              repeatsYearly: holiday.repeats_yearly,
              isPaidHoliday: holiday.is_paid_holiday,
            }))
          );

          if (addResult.success && addResult.data) {
            const mergedHolidays = mergeHolidayCollections(
              existingHolidays,
              addResult.data,
              0, // Not replacing by year
              false,
            );
            setPlannerData((prev) => {
              if (!prev) return prev;
              return { ...prev, holidays: mergedHolidays };
            });
          }
        } else {
          // For unauthenticated users, save to localStorage
          const mergedHolidays = mergeHolidayCollections(
            existingHolidays,
            allNewHolidays,
            0,
            false,
          );
          saveLocalHolidays(mergedHolidays);
        }

        // Mark successful years in localStorage
        for (const year of successfulYears) {
          const autoLoadKey = `${STORAGE_KEYS.HOLIDAYS}_autoload_${resolvedCountry}_${year}`;
          localStorage.setItem(autoLoadKey, 'true');
        }
      }

      // Mark initialization as complete
      if (!cancelled) {
        setIsInitializing(false);
      }
    };

    initializeHolidays().catch((error) => {
      console.error('[PlannerContext] Failed to initialize holidays:', error);
      setIsInitializing(false);
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Action: Toggle day selection
  const toggleDaySelection = useCallback(
    (date: Date) => {
      const isSelected = isDateSelected(date);

      if (isSelected) {
        // Remove from selection
        setSelectedDays((prev) => {
          const newDays = prev.filter((d) => !isSameDay(d, date));
          // Persist synchronously for unauthenticated users to prevent data loss during navigation
          if (!isAuthenticated) {
            persistSelectedDaysSync(newDays);
          }
          return newDays;
        });
      } else {
        // Add to selection
        setSelectedDays((prev) => {
          const newDays = [...prev, date];
          // Persist synchronously for unauthenticated users to prevent data loss during navigation
          if (!isAuthenticated) {
            persistSelectedDaysSync(newDays);
          }
          return newDays;
        });
      }
    },
    [isDateSelected, isAuthenticated]
  );

  // Action: Resolve data conflict
  const resolveConflict = useCallback(async (resolution: ConflictResolution) => {
    if (!plannerData?.user?.id || !pendingLocalDataRef.current) {
      console.error('Cannot resolve conflict: missing user or local data');
      return;
    }

    const migrationKey = `pto_planner_migration_done_${plannerData.user.id}`;
    const localData = pendingLocalDataRef.current;

    try {
      if (resolution === 'keep-synced') {
        // User chose to keep synced data - just clear localStorage
        clearLocalStorageData();
        localStorage.setItem(migrationKey, 'true');
        setShouldUseLocalFallback(false);
        console.log('Conflict resolved: keeping synced data');
      } else if (resolution === 'use-local') {
        // User chose to replace with local data
        console.log('Replacing with local data:', {
          ptoDays: localData.selectedDays.length,
          holidays: localData.holidays.length,
          accrualRules: localData.accrualRules.length,
          hasSettings: Object.keys(localData.settings).length > 0,
          weekendDays: localData.weekendDays,
        });

        const result = await replaceWithLocalData({
          selectedDays: localData.selectedDays,
          settings: {
            initial_balance: localData.settings.initial_balance,
            pto_start_date: localData.settings.pto_start_date,
            carry_over_limit: localData.settings.carry_over_limit ?? undefined,
            pto_display_unit: localData.settings.pto_display_unit,
            hours_per_day: localData.settings.hours_per_day,
            hours_per_week: localData.settings.hours_per_week,
          },
          holidays: localData.holidays.map(h => ({
            name: h.name,
            date: h.date,
            repeats_yearly: h.repeats_yearly,
            is_paid_holiday: h.is_paid_holiday,
          })),
          weekendDays: localData.weekendDays,
          accrualRules: localData.accrualRules.map(r => ({
            name: r.name,
            accrual_amount: r.accrual_amount,
            accrual_frequency: r.accrual_frequency,
            accrual_day: r.accrual_day,
            effective_date: r.effective_date,
            end_date: r.end_date,
            is_active: r.is_active,
          })),
        });

        if (result.success && result.data?.plannerData) {
          setPlannerData(result.data.plannerData);
          clearLocalStorageData();
          localStorage.setItem(migrationKey, 'true');
          setShouldUseLocalFallback(false);
          console.log('Conflict resolved: replaced with local data', {
            migratedPtoDays: result.data.plannerData.ptoDays?.length || 0,
            migratedHolidays: result.data.plannerData.holidays?.length || 0,
            migratedAccrualRules: result.data.plannerData.accrualRules?.length || 0,
          });
        } else if (!result.success) {
          console.error('Failed to replace with local data:', result.error);
        }
      } else if (resolution === 'merge') {
        // User chose to merge both datasets
        console.log('Merging local data with synced data:', {
          ptoDays: localData.selectedDays.length,
          holidays: localData.holidays.length,
          accrualRules: localData.accrualRules.length,
        });

        const result = await mergeLocalData({
          selectedDays: localData.selectedDays,
          settings: {
            initial_balance: localData.settings.initial_balance,
            pto_start_date: localData.settings.pto_start_date,
            carry_over_limit: localData.settings.carry_over_limit ?? undefined,
            pto_display_unit: localData.settings.pto_display_unit,
            hours_per_day: localData.settings.hours_per_day,
            hours_per_week: localData.settings.hours_per_week,
          },
          holidays: localData.holidays.map(h => ({
            name: h.name,
            date: h.date,
            repeats_yearly: h.repeats_yearly,
            is_paid_holiday: h.is_paid_holiday,
          })),
          weekendDays: localData.weekendDays,
          accrualRules: localData.accrualRules.map(r => ({
            name: r.name,
            accrual_amount: r.accrual_amount,
            accrual_frequency: r.accrual_frequency,
            accrual_day: r.accrual_day,
            effective_date: r.effective_date,
            end_date: r.end_date,
            is_active: r.is_active,
          })),
        });

        if (result.success && result.data?.plannerData) {
          setPlannerData(result.data.plannerData);
          clearLocalStorageData();
          localStorage.setItem(migrationKey, 'true');
          setShouldUseLocalFallback(false);
          console.log('Conflict resolved: merged data', result.data.mergedCounts);
        } else if (!result.success) {
          console.error('Failed to merge data:', result.error);
        }
      }
    } finally {
      // Clean up
      pendingLocalDataRef.current = null;
      setConflictData(null);
      setShowConflictModal(false);
    }
  }, [plannerData?.user?.id]);

  // Action: Clear all suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestedDays([]);
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
      // Persist synchronously for unauthenticated users
      if (!isAuthenticated) {
        persistSelectedDaysSync(combined);
      }
      return combined;
    });

    // Clear suggestions after applying
    clearSuggestions();
  }, [suggestedDays, clearSuggestions, isAuthenticated]);

  const updateSuggestionPreferences = useCallback(
    (
      update:
        | Partial<SuggestionPreferences>
        | ((prev: SuggestionPreferences) => SuggestionPreferences)
    ) => {
      setSuggestionPreferences((prev) => {
        return typeof update === 'function' ? update(prev) : { ...prev, ...update };
      });
    },
    []
  );

  // Action: Run gap-filling optimizer
  const generateSuggestions = useCallback(
    (options?: { silent?: boolean }): OptimizationResult | null => {
      const activePreferences = suggestionPreferencesRef.current;
      if (!activePreferences) {
        return null;
      }

      const silent = options?.silent ?? false;

      if (!silent) {
        setIsGeneratingSuggestions(true);
      }

      try {
        const weekendDays = getWeekendDays();
        const holidays = expandHolidayDates(
          getHolidays(),
          activePreferences.earliestStart,
          activePreferences.latestEnd
        );
        const timelineEnd = activePreferences.latestEnd;
        const totalBalance = getBalanceAsOf(timelineEnd);
        const remainingBalance = Math.max(totalBalance - selectedDays.length, 0);
        const reserve = Math.max(0, Math.floor(activePreferences.minPTOToKeep));
        const availableBudget = Math.max(remainingBalance - reserve, 0);

        const config: PTOOptimizerConfig = {
          availablePTO: availableBudget,
          weekendDays,
          holidays,
          selectedPTODays: selectedDays,
        };

        const result = optimizePTO(config, activePreferences);
        setSuggestedDays(result.suggestedDays);
        setLastOptimizationResult(result);
        return result;
      } catch (error) {
        console.error('Optimization error:', error);
        setLastOptimizationResult(null);
        return null;
      } finally {
        if (!silent) {
          setIsGeneratingSuggestions(false);
        }
      }
    },
    [getWeekendDays, getHolidays, getBalanceAsOf, selectedDays]
  );

  useEffect(() => {
    // Skip suggestion generation during initialization to avoid flickering
    if (isInitializing) {
      return;
    }
    generateSuggestions({ silent: true });
  }, [
    selectedDays,
    plannerData?.holidays,
    localHolidays,
    plannerData?.weekendConfig,
    localWeekendVersion,
    suggestionPreferences,
    generateSuggestions,
    isInitializing,
  ]);

  // Context value
  const value: PlannerContextType = {
    plannerData,
    selectedDays,
    suggestedDays,
    suggestionPreferences,
    lastOptimizationResult,
    isAuthenticated,
    countryCode,
    isLoadingHolidays,
    isGeneratingSuggestions,
    isInitializing,
    setPlannerData,
    setSelectedDays,
    setSuggestedDays,
    setCountryCode,
    updateSuggestionPreferences,
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
    generateSuggestions,
    saveLocalSettings,
    saveLocalWeekendConfig,
    saveLocalHolidays,
    saveLocalAccrualRules,
    getAccrualRules,
    refreshHolidays,
    removeHoliday,
    addHoliday,
    showConflictModal,
    conflictData,
    resolveConflict,
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
