import { z } from 'zod';

// ============================================================================
// Database Table Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PTOSettings {
  id: string;
  user_id: string;
  pto_start_date: string; // ISO date string
  initial_balance: number;
  carry_over_limit: number | null;
  max_balance: number | null;
  renewal_date: string | null; // ISO date string
  allow_negative_balance: boolean;
  pto_display_unit: 'days' | 'hours';
  hours_per_day: number;
  hours_per_week: number;
  created_at: string;
  updated_at: string;
}

export interface PTOAccrualRule {
  id: string;
  user_id: string;
  name: string;
  accrual_amount: number;
  accrual_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  accrual_day: number | null; // day of month/week for accrual
  effective_date: string; // ISO date string
  end_date: string | null; // ISO date string
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PTOTransaction {
  id: string;
  user_id: string;
  transaction_date: string;
  amount: number; // positive for accrual, negative for usage
  transaction_type: 'accrual' | 'usage' | 'adjustment' | 'expiration' | 'carry-over';
  description: string | null;
  reference_id: string | null; // UUID reference to PTO day or other entity
  created_at: string;
}

export interface PTODay {
  id: string;
  user_id: string;
  date: string; // ISO date string
  amount: number; // amount of PTO used (in days or hours)
  status: 'planned' | 'approved' | 'taken' | 'cancelled';
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomHoliday {
  id: string;
  user_id: string;
  name: string;
  date: string; // ISO date string
  repeats_yearly: boolean;
  is_paid_holiday: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeekendConfig {
  id: string;
  user_id: string;
  day_of_week: number; // 0 (Sunday) to 6 (Saturday)
  is_weekend: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Database View Types
// ============================================================================

export interface CurrentPTOBalance {
  user_id: string;
  current_balance: number;
  total_accrued: number;
  total_used: number;
  total_adjustments: number;
}

export interface MonthlyPTOUsage {
  user_id: string;
  year: number;
  month: number;
  total_days: number;
  total_amount: number;
}

export interface UpcomingPTODay {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  status: string;
  description: string | null;
  days_until: number;
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================

export const PTODaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD format
  amount: z.number().positive().max(8),
  status: z.enum(['planned', 'approved', 'taken', 'cancelled']).default('planned'),
  description: z.string().optional(),
});

export const PTOSettingsSchema = z.object({
  pto_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  initial_balance: z.number().min(0),
  carry_over_limit: z.number().min(0).nullable().optional(),
  max_balance: z.number().min(0).optional(),
  renewal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  allow_negative_balance: z.boolean().default(false),
  pto_display_unit: z.enum(['days', 'hours']).default('days'),
  hours_per_day: z.number().positive().max(24).default(8),
  hours_per_week: z.number().positive().max(168).default(40),
});

export const PTOAccrualRuleSchema = z.object({
  name: z.string().min(1).max(100),
  accrual_amount: z.number().positive(),
  accrual_frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
  accrual_day: z.number().min(0).max(31).optional(),
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  is_active: z.boolean().default(true),
});

export const CustomHolidaySchema = z.object({
  name: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  repeats_yearly: z.boolean().default(false),
  is_paid_holiday: z.boolean().default(true),
});

export const WeekendConfigSchema = z.object({
  day_of_week: z.number().min(0).max(6),
  is_weekend: z.boolean(),
});

export const UserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1).max(200).optional(),
});

// ============================================================================
// Input Types (for forms/server actions)
// ============================================================================

export type PTODayInput = z.infer<typeof PTODaySchema>;
export type PTOSettingsInput = z.infer<typeof PTOSettingsSchema>;
export type PTOAccrualRuleInput = z.infer<typeof PTOAccrualRuleSchema>;
export type CustomHolidayInput = z.infer<typeof CustomHolidaySchema>;
export type WeekendConfigInput = z.infer<typeof WeekendConfigSchema>;
export type UserInput = z.infer<typeof UserSchema>;

// ============================================================================
// Component Props Types
// ============================================================================

export interface PlannerData {
  user: User;
  settings: PTOSettings | null;
  ptoDays: PTODay[];
  holidays: CustomHoliday[];
  weekendConfig: WeekendConfig[];
  accrualRules: PTOAccrualRule[];
  currentBalance: CurrentPTOBalance | null;
}

// ============================================================================
// PTO Suggestion Types
// ============================================================================

export type RankingMode = 'efficiency' | 'longest' | 'least-pto' | 'earliest';

export interface SuggestionPreferences {
  earliestStart: Date;
  latestEnd: Date;
  minPTOToKeep: number;
  maxConsecutiveDaysOff: number;
  minConsecutiveDaysOff: number;
  streakHighlightThreshold: number;
  rankingMode: RankingMode;
  minSpacingBetweenBreaks: number;
  extendExistingPTO: boolean;
}

export type AnchorType =
  | 'weekend'
  | 'holiday'
  | 'mixed'
  | 'existing'
  | 'boundary-start'
  | 'boundary-end';

export interface AnchorInfo {
  start: Date;
  end: Date;
  dayCount: number;
  type: AnchorType;
  label: string;
  countsTowardRun: boolean;
}

export interface SuggestedBreak {
  id: string;
  start: Date;
  end: Date;
  ptoDays: Date[];
  ptoRequired: number;
  totalDaysOff: number;
  efficiency: number;
  anchors: {
    before: AnchorInfo | null;
    after: AnchorInfo | null;
  };
}

export interface OptimizationResult {
  suggestedDays: Date[];
  breaks: SuggestedBreak[];
  totalPTOUsed: number;
  totalDaysOff: number;
  averageEfficiency: number;
  remainingPTO: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface HolidayAPIResponse {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

// ============================================================================
// Server Action Return Types
// ============================================================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
