import {
  collection,
  doc,
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
  WithFieldValue,
} from 'firebase/firestore';
import type {
  User,
  PTOSettings,
  PTOAccrualRule,
  PTODay,
  CustomHoliday,
  WeekendConfig,
} from '@/types';
import { db } from './client';

// Helper to convert Firestore Timestamp to ISO string
const timestampToString = (timestamp: Timestamp | string | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return timestamp.toDate().toISOString();
};

// Helper to convert Firestore date to YYYY-MM-DD string
const dateToString = (date: Timestamp | string | undefined): string => {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return date.toDate().toISOString().split('T')[0];
};

// ============================================================================
// Firestore Converters
// ============================================================================

export const userConverter: FirestoreDataConverter<User> = {
  toFirestore(user: WithFieldValue<User>): DocumentData {
    return {
      email: user.email,
      full_name: user.full_name,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): User {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      email: data.email,
      full_name: data.full_name || null,
      created_at: timestampToString(data.created_at),
      updated_at: timestampToString(data.updated_at),
    };
  },
};

export const ptoSettingsConverter: FirestoreDataConverter<PTOSettings> = {
  toFirestore(settings: WithFieldValue<PTOSettings>): DocumentData {
    return {
      user_id: settings.user_id,
      pto_start_date: settings.pto_start_date,
      initial_balance: settings.initial_balance,
      carry_over_limit: settings.carry_over_limit,
      max_balance: settings.max_balance,
      renewal_date: settings.renewal_date,
      allow_negative_balance: settings.allow_negative_balance,
      pto_display_unit: settings.pto_display_unit,
      hours_per_day: settings.hours_per_day,
      hours_per_week: settings.hours_per_week,
      created_at: settings.created_at,
      updated_at: settings.updated_at,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PTOSettings {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
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
  },
};

export const ptoAccrualRuleConverter: FirestoreDataConverter<PTOAccrualRule> = {
  toFirestore(rule: WithFieldValue<PTOAccrualRule>): DocumentData {
    return {
      user_id: rule.user_id,
      name: rule.name,
      accrual_amount: rule.accrual_amount,
      accrual_frequency: rule.accrual_frequency,
      accrual_day: rule.accrual_day,
      effective_date: rule.effective_date,
      end_date: rule.end_date,
      is_active: rule.is_active,
      created_at: rule.created_at,
      updated_at: rule.updated_at,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PTOAccrualRule {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
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
  },
};

export const ptoDayConverter: FirestoreDataConverter<PTODay> = {
  toFirestore(ptoDay: WithFieldValue<PTODay>): DocumentData {
    return {
      user_id: ptoDay.user_id,
      date: ptoDay.date,
      amount: ptoDay.amount,
      status: ptoDay.status,
      description: ptoDay.description,
      created_at: ptoDay.created_at,
      updated_at: ptoDay.updated_at,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PTODay {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      user_id: data.user_id,
      date: dateToString(data.date),
      amount: data.amount,
      status: data.status ?? 'planned',
      description: data.description ?? null,
      created_at: timestampToString(data.created_at),
      updated_at: timestampToString(data.updated_at),
    };
  },
};

export const customHolidayConverter: FirestoreDataConverter<CustomHoliday> = {
  toFirestore(holiday: WithFieldValue<CustomHoliday>): DocumentData {
    return {
      user_id: holiday.user_id,
      name: holiday.name,
      date: holiday.date,
      repeats_yearly: holiday.repeats_yearly,
      is_paid_holiday: holiday.is_paid_holiday,
      created_at: holiday.created_at,
      updated_at: holiday.updated_at,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): CustomHoliday {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      user_id: data.user_id,
      name: data.name,
      date: dateToString(data.date),
      repeats_yearly: data.repeats_yearly ?? false,
      is_paid_holiday: data.is_paid_holiday ?? true,
      created_at: timestampToString(data.created_at),
      updated_at: timestampToString(data.updated_at),
    };
  },
};

export const weekendConfigConverter: FirestoreDataConverter<WeekendConfig> = {
  toFirestore(config: WithFieldValue<WeekendConfig>): DocumentData {
    return {
      user_id: config.user_id,
      day_of_week: config.day_of_week,
      is_weekend: config.is_weekend,
      created_at: config.created_at,
      updated_at: config.updated_at,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): WeekendConfig {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      user_id: data.user_id,
      day_of_week: data.day_of_week,
      is_weekend: data.is_weekend ?? false,
      created_at: timestampToString(data.created_at),
      updated_at: timestampToString(data.updated_at),
    };
  },
};

// ============================================================================
// Collection References
// ============================================================================

export const getCollections = () => {
  if (!db) {
    throw new Error('Firestore is not initialized. Make sure Firebase is configured.');
  }

  return {
    users: collection(db, 'users').withConverter(userConverter),
    ptoSettings: collection(db, 'ptoSettings').withConverter(ptoSettingsConverter),
    ptoAccrualRules: collection(db, 'ptoAccrualRules').withConverter(ptoAccrualRuleConverter),
    ptoDays: collection(db, 'ptoDays').withConverter(ptoDayConverter),
    customHolidays: collection(db, 'customHolidays').withConverter(customHolidayConverter),
    weekendConfig: collection(db, 'weekendConfig').withConverter(weekendConfigConverter),
  };
};

// Document reference helpers
export const getUserDoc = (userId: string) => doc(db, 'users', userId).withConverter(userConverter);
export const getPtoSettingsDoc = (settingsId: string) => doc(db, 'ptoSettings', settingsId).withConverter(ptoSettingsConverter);
export const getPtoAccrualRuleDoc = (ruleId: string) => doc(db, 'ptoAccrualRules', ruleId).withConverter(ptoAccrualRuleConverter);
export const getPtoDayDoc = (ptoDayId: string) => doc(db, 'ptoDays', ptoDayId).withConverter(ptoDayConverter);
export const getCustomHolidayDoc = (holidayId: string) => doc(db, 'customHolidays', holidayId).withConverter(customHolidayConverter);
export const getWeekendConfigDoc = (configId: string) => doc(db, 'weekendConfig', configId).withConverter(weekendConfigConverter);
