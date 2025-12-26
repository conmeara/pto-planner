import { getAdminDb } from './admin';
import type {
  User,
  PTOSettings,
  PTOAccrualRule,
  PTODay,
  CustomHoliday,
  WeekendConfig,
} from '@/types';

// Helper to convert Firestore Timestamp to ISO string
const timestampToString = (timestamp: FirebaseFirestore.Timestamp | string | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return timestamp.toDate().toISOString();
};

// Helper to convert Firestore date to YYYY-MM-DD string
const dateToString = (date: FirebaseFirestore.Timestamp | string | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toDate().toISOString().split('T')[0];
};

// ============================================================================
// Collection Names
// ============================================================================

export const COLLECTIONS = {
  users: 'users',
  ptoSettings: 'ptoSettings',
  ptoAccrualRules: 'ptoAccrualRules',
  ptoDays: 'ptoDays',
  customHolidays: 'customHolidays',
  weekendConfig: 'weekendConfig',
} as const;

// ============================================================================
// Data Converters (for server-side use)
// ============================================================================

export function convertUser(doc: FirebaseFirestore.DocumentSnapshot): User | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    email: data.email,
    full_name: data.full_name || null,
    created_at: timestampToString(data.created_at),
    updated_at: timestampToString(data.updated_at),
  };
}

export function convertPtoSettings(doc: FirebaseFirestore.DocumentSnapshot): PTOSettings | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    user_id: data.user_id,
    pto_start_date: dateToString(data.pto_start_date),
    initial_balance: data.initial_balance ?? 0,
    carry_over_limit: data.carry_over_limit ?? null,
    max_balance: data.max_balance ?? null,
    renewal_date: data.renewal_date ? dateToString(data.renewal_date) : null,
    allow_negative_balance: data.allow_negative_balance ?? false,
    pto_display_unit: data.pto_display_unit ?? 'days',
    hours_per_day: data.hours_per_day ?? 8,
    hours_per_week: data.hours_per_week ?? 40,
    created_at: timestampToString(data.created_at),
    updated_at: timestampToString(data.updated_at),
  };
}

export function convertPtoAccrualRule(doc: FirebaseFirestore.DocumentSnapshot): PTOAccrualRule | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    user_id: data.user_id,
    name: data.name,
    accrual_amount: data.accrual_amount,
    accrual_frequency: data.accrual_frequency,
    accrual_day: data.accrual_day ?? null,
    effective_date: dateToString(data.effective_date),
    end_date: data.end_date ? dateToString(data.end_date) : null,
    is_active: data.is_active ?? true,
    created_at: timestampToString(data.created_at),
    updated_at: timestampToString(data.updated_at),
  };
}

export function convertPtoDay(doc: FirebaseFirestore.DocumentSnapshot): PTODay | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    user_id: data.user_id,
    date: dateToString(data.date),
    amount: data.amount,
    status: data.status ?? 'planned',
    description: data.description ?? null,
    created_at: timestampToString(data.created_at),
    updated_at: timestampToString(data.updated_at),
  };
}

export function convertCustomHoliday(doc: FirebaseFirestore.DocumentSnapshot): CustomHoliday | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    user_id: data.user_id,
    name: data.name,
    date: dateToString(data.date),
    repeats_yearly: data.repeats_yearly ?? false,
    is_paid_holiday: data.is_paid_holiday ?? true,
    created_at: timestampToString(data.created_at),
    updated_at: timestampToString(data.updated_at),
  };
}

export function convertWeekendConfig(doc: FirebaseFirestore.DocumentSnapshot): WeekendConfig | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    user_id: data.user_id,
    day_of_week: data.day_of_week,
    is_weekend: data.is_weekend ?? false,
    created_at: timestampToString(data.created_at),
    updated_at: timestampToString(data.updated_at),
  };
}

// ============================================================================
// Collection Query Helpers (for server-side use)
// ============================================================================

export function getCollection(name: keyof typeof COLLECTIONS) {
  const db = getAdminDb();
  return db.collection(COLLECTIONS[name]);
}

export function getUsersCollection() {
  return getCollection('users');
}

export function getPtoSettingsCollection() {
  return getCollection('ptoSettings');
}

export function getPtoAccrualRulesCollection() {
  return getCollection('ptoAccrualRules');
}

export function getPtoDaysCollection() {
  return getCollection('ptoDays');
}

export function getCustomHolidaysCollection() {
  return getCollection('customHolidays');
}

export function getWeekendConfigCollection() {
  return getCollection('weekendConfig');
}
