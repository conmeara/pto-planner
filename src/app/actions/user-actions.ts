'use server';

import { revalidatePath } from 'next/cache';
import { type ActionResult, type User, type PlannerData } from '@/types';
import { formatDateLocal } from '@/lib/date-utils';
import { getCurrentUser } from '@/utils/firebase/auth';
import { getAdminDb } from '@/utils/firebase/admin';
import {
  getUsersCollection,
  getPtoSettingsCollection,
  getPtoAccrualRulesCollection,
  getPtoDaysCollection,
  getCustomHolidaysCollection,
  getWeekendConfigCollection,
  convertUser,
  convertPtoSettings,
  convertPtoAccrualRule,
  convertPtoDay,
  convertCustomHoliday,
  convertWeekendConfig,
} from '@/utils/firebase/firestore-admin';

/**
 * Initialize a new user account
 * Creates user record and default settings
 * Called after signup
 */
export async function initializeUserAccount(
  userId: string,
  email: string,
  fullName?: string
): Promise<ActionResult<User>> {
  try {
    const db = getAdminDb();
    const now = new Date().toISOString();

    // Create user record
    const usersCollection = getUsersCollection();
    const userRef = usersCollection.doc(userId);

    const userData = {
      email,
      full_name: fullName || null,
      created_at: now,
      updated_at: now,
    };

    await userRef.set(userData);

    // Create default PTO settings
    // Set PTO start date to the Friday of the week that contains the date 2 weeks ago
    const today = new Date();
    const twoWeeksAgo = new Date(today);
    twoWeeksAgo.setDate(today.getDate() - 14);

    // Find the Friday of that week (Friday is day 5, where 0 = Sunday)
    const dayOfWeek = twoWeeksAgo.getDay();
    const daysToFriday = (dayOfWeek + 2) % 7; // Calculate days to subtract to get to Friday
    const fridayOfTwoWeeksAgo = new Date(twoWeeksAgo);
    fridayOfTwoWeeksAgo.setDate(twoWeeksAgo.getDate() - daysToFriday);

    const ptoStartDate = formatDateLocal(fridayOfTwoWeeksAgo);

    // Create default PTO settings
    const ptoSettingsCollection = getPtoSettingsCollection();
    const settingsRef = ptoSettingsCollection.doc();
    await settingsRef.set({
      user_id: userId,
      pto_start_date: ptoStartDate,
      initial_balance: 15,
      carry_over_limit: null,
      max_balance: null,
      renewal_date: null,
      allow_negative_balance: false,
      pto_display_unit: 'days',
      hours_per_day: 8,
      hours_per_week: 40,
      created_at: now,
      updated_at: now,
    });

    // Create default accrual rule (monthly, 1.25 days)
    const accrualRulesCollection = getPtoAccrualRulesCollection();
    const accrualRef = accrualRulesCollection.doc();
    await accrualRef.set({
      user_id: userId,
      name: 'Monthly accrual',
      accrual_amount: 1.25,
      accrual_frequency: 'monthly',
      accrual_day: null,
      effective_date: ptoStartDate,
      end_date: null,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    // Create default weekend config (Saturday and Sunday)
    const weekendConfigCollection = getWeekendConfigCollection();
    for (let day = 0; day <= 6; day++) {
      const configRef = weekendConfigCollection.doc();
      await configRef.set({
        user_id: userId,
        day_of_week: day,
        is_weekend: day === 0 || day === 6, // Sunday (0) and Saturday (6)
        created_at: now,
        updated_at: now,
      });
    }

    revalidatePath('/dashboard');

    const user: User = {
      id: userId,
      email,
      full_name: fullName || null,
      created_at: now,
      updated_at: now,
    };

    return { success: true, data: user };
  } catch (error) {
    console.error('Error in initializeUserAccount:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to initialize user account' };
  }
}

/**
 * Get complete user data for dashboard
 * Fetches all necessary data in parallel
 */
export async function getUserDashboardData(): Promise<ActionResult<PlannerData>> {
  try {
    // Get current user
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = authUser.uid;

    // Fetch all data in parallel
    const [
      userSnapshot,
      settingsSnapshot,
      ptoDaysSnapshot,
      holidaysSnapshot,
      weekendConfigSnapshot,
      accrualRulesSnapshot,
    ] = await Promise.all([
      getUsersCollection().doc(userId).get(),
      getPtoSettingsCollection().where('user_id', '==', userId).limit(1).get(),
      getPtoDaysCollection().where('user_id', '==', userId).orderBy('date').get(),
      getCustomHolidaysCollection().where('user_id', '==', userId).orderBy('date').get(),
      getWeekendConfigCollection().where('user_id', '==', userId).orderBy('day_of_week').get(),
      getPtoAccrualRulesCollection().where('user_id', '==', userId).where('is_active', '==', true).get(),
    ]);

    // User record is required - fail if not found
    const user = convertUser(userSnapshot);
    if (!user) {
      console.error('User not found:', userId);
      return { success: false, error: 'User not found' };
    }

    // Convert settings
    const settings = settingsSnapshot.empty
      ? null
      : convertPtoSettings(settingsSnapshot.docs[0]);

    // Convert PTO days
    const ptoDays = ptoDaysSnapshot.docs
      .map(doc => convertPtoDay(doc))
      .filter((day): day is NonNullable<typeof day> => day !== null);

    // Convert holidays and ensure dates are properly formatted
    const holidays = holidaysSnapshot.docs
      .map(doc => convertCustomHoliday(doc))
      .filter((h): h is NonNullable<typeof h> => h !== null)
      .map(holiday => ({
        ...holiday,
        date: typeof holiday.date === 'string' ? holiday.date : formatDateLocal(new Date(holiday.date)),
      }));

    // Convert weekend config
    const weekendConfig = weekendConfigSnapshot.docs
      .map(doc => convertWeekendConfig(doc))
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // Convert accrual rules
    const accrualRules = accrualRulesSnapshot.docs
      .map(doc => convertPtoAccrualRule(doc))
      .filter((r): r is NonNullable<typeof r> => r !== null);

    // Calculate current balance
    // In Firestore, we don't have database views, so we calculate on the fly
    const totalAccrued = settings?.initial_balance ?? 0;
    const totalUsed = ptoDays
      .filter(d => d.status !== 'cancelled')
      .reduce((sum, d) => sum + d.amount, 0);

    const currentBalance = {
      user_id: userId,
      current_balance: totalAccrued - totalUsed,
      total_accrued: totalAccrued,
      total_used: totalUsed,
      total_adjustments: 0,
    };

    const data: PlannerData = {
      user,
      settings,
      ptoDays,
      holidays,
      weekendConfig,
      accrualRules,
      currentBalance,
    };

    return { success: true, data };
  } catch (error) {
    console.error('Error in getUserDashboardData:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch user dashboard data' };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  fullName: string
): Promise<ActionResult<User>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const usersCollection = getUsersCollection();
    const userRef = usersCollection.doc(authUser.uid);

    const now = new Date().toISOString();
    await userRef.update({
      full_name: fullName,
      updated_at: now,
    });

    const userSnapshot = await userRef.get();
    const user = convertUser(userSnapshot);

    if (!user) {
      return { success: false, error: 'Failed to fetch updated user' };
    }

    revalidatePath('/dashboard');

    return { success: true, data: user };
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update user profile' };
  }
}

/**
 * Migrate localStorage data to database for newly authenticated user
 */
export async function migrateLocalDataToDatabase(localData: {
  selectedDays?: string[];
  settings?: {
    initial_balance?: number;
    pto_start_date?: string;
    carry_over_limit?: number;
    pto_display_unit?: 'days' | 'hours';
    hours_per_day?: number;
    hours_per_week?: number;
  };
  holidays?: Array<{
    name: string;
    date: string;
    repeats_yearly?: boolean;
    is_paid_holiday?: boolean;
  }>;
  weekendDays?: number[];
  countryCode?: string;
  accrualRules?: Array<{
    name: string;
    accrual_amount: number;
    accrual_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
    accrual_day?: number | null;
    effective_date: string;
    end_date?: string | null;
    is_active: boolean;
  }>;
}): Promise<ActionResult<{ migrated: boolean; details: string[]; plannerData?: PlannerData }>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = authUser.uid;
    const details: string[] = [];
    let migratedSomething = false;
    const now = new Date().toISOString();
    const db = getAdminDb();

    // 1. Migrate PTO Settings
    const hasLocalSettings = localData.settings && (
      localData.settings.initial_balance !== undefined ||
      localData.settings.pto_start_date !== undefined ||
      localData.settings.carry_over_limit !== undefined ||
      localData.settings.pto_display_unit !== undefined ||
      localData.settings.hours_per_day !== undefined ||
      localData.settings.hours_per_week !== undefined
    );

    if (hasLocalSettings) {
      const settingsCollection = getPtoSettingsCollection();
      const existingSettings = await settingsCollection
        .where('user_id', '==', userId)
        .limit(1)
        .get();

      if (!existingSettings.empty) {
        const settingsRef = existingSettings.docs[0].ref;
        const settingsUpdate: Record<string, unknown> = { updated_at: now };

        if (localData.settings!.initial_balance !== undefined) {
          settingsUpdate.initial_balance = localData.settings!.initial_balance;
        }
        if (localData.settings!.pto_start_date !== undefined) {
          settingsUpdate.pto_start_date = localData.settings!.pto_start_date;
        }
        if (localData.settings!.carry_over_limit !== undefined) {
          settingsUpdate.carry_over_limit = localData.settings!.carry_over_limit;
        }
        if (localData.settings!.pto_display_unit !== undefined) {
          settingsUpdate.pto_display_unit = localData.settings!.pto_display_unit;
        }
        if (localData.settings!.hours_per_day !== undefined) {
          settingsUpdate.hours_per_day = localData.settings!.hours_per_day;
        }
        if (localData.settings!.hours_per_week !== undefined) {
          settingsUpdate.hours_per_week = localData.settings!.hours_per_week;
        }

        await settingsRef.update(settingsUpdate);
        details.push('Migrated PTO settings');
        migratedSomething = true;
      }
    }

    // 2. Migrate PTO Days
    if (localData.selectedDays && localData.selectedDays.length > 0) {
      const ptoDaysCollection = getPtoDaysCollection();
      const existingPtoDays = await ptoDaysCollection
        .where('user_id', '==', userId)
        .limit(1)
        .get();

      if (existingPtoDays.empty) {
        const ptoAmount = localData.settings?.pto_display_unit === 'hours'
          ? (localData.settings.hours_per_day || 8)
          : 1;

        const batch = db.batch();
        for (const dateStr of localData.selectedDays) {
          const docRef = ptoDaysCollection.doc();
          batch.set(docRef, {
            user_id: userId,
            date: dateStr,
            amount: ptoAmount,
            status: 'planned',
            description: 'Migrated from local storage',
            created_at: now,
            updated_at: now,
          });
        }

        await batch.commit();
        details.push(`Migrated ${localData.selectedDays.length} PTO day${localData.selectedDays.length === 1 ? '' : 's'}`);
        migratedSomething = true;
      } else {
        details.push(`Skipped ${localData.selectedDays.length} PTO day${localData.selectedDays.length === 1 ? '' : 's'} (PTO days already exist)`);
      }
    }

    // 3. Migrate Holidays
    if (localData.holidays && localData.holidays.length > 0) {
      const holidaysCollection = getCustomHolidaysCollection();
      const existingHolidays = await holidaysCollection
        .where('user_id', '==', userId)
        .limit(1)
        .get();

      if (existingHolidays.empty) {
        let migratedHolidays = 0;
        const batch = db.batch();

        for (const holiday of localData.holidays) {
          const docRef = holidaysCollection.doc();
          batch.set(docRef, {
            user_id: userId,
            name: holiday.name,
            date: holiday.date,
            repeats_yearly: holiday.repeats_yearly ?? true,
            is_paid_holiday: holiday.is_paid_holiday ?? true,
            created_at: now,
            updated_at: now,
          });
          migratedHolidays++;
        }

        await batch.commit();

        if (migratedHolidays > 0) {
          details.push(`Migrated ${migratedHolidays} holiday${migratedHolidays === 1 ? '' : 's'}`);
          migratedSomething = true;
        }
      } else {
        details.push(`Skipped ${localData.holidays.length} holiday${localData.holidays.length === 1 ? '' : 's'} (holidays already exist)`);
      }
    }

    // 4. Migrate Weekend Configuration
    if (localData.weekendDays && localData.weekendDays.length > 0) {
      const weekendCollection = getWeekendConfigCollection();
      const existingConfig = await weekendCollection
        .where('user_id', '==', userId)
        .get();

      for (const doc of existingConfig.docs) {
        const data = doc.data();
        const isWeekend = localData.weekendDays.includes(data.day_of_week);
        if (data.is_weekend !== isWeekend) {
          await doc.ref.update({ is_weekend: isWeekend, updated_at: now });
        }
      }

      details.push('Migrated weekend configuration');
      migratedSomething = true;
    }

    // 5. Migrate Accrual Rules
    if (localData.accrualRules && localData.accrualRules.length > 0) {
      const rulesCollection = getPtoAccrualRulesCollection();
      const existingRules = await rulesCollection
        .where('user_id', '==', userId)
        .limit(1)
        .get();

      if (existingRules.empty) {
        let migratedRules = 0;
        const batch = db.batch();

        for (const rule of localData.accrualRules) {
          const docRef = rulesCollection.doc();
          batch.set(docRef, {
            user_id: userId,
            name: rule.name,
            accrual_amount: rule.accrual_amount,
            accrual_frequency: rule.accrual_frequency,
            accrual_day: rule.accrual_day ?? null,
            effective_date: rule.effective_date,
            end_date: rule.end_date ?? null,
            is_active: rule.is_active,
            created_at: now,
            updated_at: now,
          });
          migratedRules++;
        }

        await batch.commit();

        if (migratedRules > 0) {
          details.push(`Migrated ${migratedRules} accrual rule${migratedRules === 1 ? '' : 's'}`);
          migratedSomething = true;
        }
      } else {
        details.push(`Skipped ${localData.accrualRules.length} accrual rule${localData.accrualRules.length === 1 ? '' : 's'} (rules already exist)`);
      }
    }

    let refreshedPlannerData: PlannerData | undefined;

    if (migratedSomething) {
      const refreshed = await getUserDashboardData();
      if (refreshed.success && refreshed.data) {
        refreshedPlannerData = refreshed.data;
      }
    }

    revalidatePath('/');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        migrated: migratedSomething,
        details,
        plannerData: refreshedPlannerData,
      },
    };
  } catch (error) {
    console.error('Error in migrateLocalDataToDatabase:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to migrate local data' };
  }
}

/**
 * Replace all user data with local data
 */
export async function replaceWithLocalData(localData: {
  selectedDays: string[];
  settings?: {
    initial_balance?: number;
    pto_start_date?: string;
    carry_over_limit?: number;
    pto_display_unit?: 'days' | 'hours';
    hours_per_day?: number;
    hours_per_week?: number;
  };
  holidays?: Array<{
    name: string;
    date: string;
    repeats_yearly?: boolean;
    is_paid_holiday?: boolean;
  }>;
  weekendDays?: number[];
  accrualRules?: Array<{
    name: string;
    accrual_amount: number;
    accrual_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
    accrual_day?: number | null;
    effective_date: string;
    end_date?: string | null;
    is_active: boolean;
  }>;
}): Promise<ActionResult<{ plannerData: PlannerData }>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = authUser.uid;
    const now = new Date().toISOString();
    const db = getAdminDb();

    // 1. Delete all existing PTO days
    const ptoDaysCollection = getPtoDaysCollection();
    const existingPtoDays = await ptoDaysCollection.where('user_id', '==', userId).get();
    for (const doc of existingPtoDays.docs) {
      await doc.ref.delete();
    }

    // 2. Delete all existing holidays
    const holidaysCollection = getCustomHolidaysCollection();
    const existingHolidays = await holidaysCollection.where('user_id', '==', userId).get();
    for (const doc of existingHolidays.docs) {
      await doc.ref.delete();
    }

    // 3. Delete all existing accrual rules
    const rulesCollection = getPtoAccrualRulesCollection();
    const existingRules = await rulesCollection.where('user_id', '==', userId).get();
    for (const doc of existingRules.docs) {
      await doc.ref.delete();
    }

    // 4. Insert local PTO days
    if (localData.selectedDays && localData.selectedDays.length > 0) {
      const ptoAmount = localData.settings?.pto_display_unit === 'hours'
        ? (localData.settings.hours_per_day || 8)
        : 1;

      const batch = db.batch();
      for (const dateStr of localData.selectedDays) {
        const docRef = ptoDaysCollection.doc();
        batch.set(docRef, {
          user_id: userId,
          date: dateStr,
          amount: ptoAmount,
          status: 'planned',
          description: 'Imported from local storage',
          created_at: now,
          updated_at: now,
        });
      }
      await batch.commit();
    }

    // 5. Insert local holidays
    if (localData.holidays && localData.holidays.length > 0) {
      const batch = db.batch();
      for (const holiday of localData.holidays) {
        const docRef = holidaysCollection.doc();
        batch.set(docRef, {
          user_id: userId,
          name: holiday.name,
          date: holiday.date,
          repeats_yearly: holiday.repeats_yearly ?? true,
          is_paid_holiday: holiday.is_paid_holiday ?? true,
          created_at: now,
          updated_at: now,
        });
      }
      await batch.commit();
    }

    // 6. Insert local accrual rules
    if (localData.accrualRules && localData.accrualRules.length > 0) {
      const batch = db.batch();
      for (const rule of localData.accrualRules) {
        const docRef = rulesCollection.doc();
        batch.set(docRef, {
          user_id: userId,
          name: rule.name,
          accrual_amount: rule.accrual_amount,
          accrual_frequency: rule.accrual_frequency,
          accrual_day: rule.accrual_day ?? null,
          effective_date: rule.effective_date,
          end_date: rule.end_date ?? null,
          is_active: rule.is_active,
          created_at: now,
          updated_at: now,
        });
      }
      await batch.commit();
    }

    // 7. Update settings if provided
    if (localData.settings && Object.keys(localData.settings).length > 0) {
      const settingsCollection = getPtoSettingsCollection();
      const existingSettings = await settingsCollection.where('user_id', '==', userId).limit(1).get();

      if (!existingSettings.empty) {
        const settingsRef = existingSettings.docs[0].ref;
        const settingsUpdate: Record<string, unknown> = { updated_at: now };

        if (localData.settings.initial_balance !== undefined) {
          settingsUpdate.initial_balance = localData.settings.initial_balance;
        }
        if (localData.settings.pto_start_date !== undefined) {
          settingsUpdate.pto_start_date = localData.settings.pto_start_date;
        }
        if (localData.settings.carry_over_limit !== undefined) {
          settingsUpdate.carry_over_limit = localData.settings.carry_over_limit;
        }
        if (localData.settings.pto_display_unit !== undefined) {
          settingsUpdate.pto_display_unit = localData.settings.pto_display_unit;
        }
        if (localData.settings.hours_per_day !== undefined) {
          settingsUpdate.hours_per_day = localData.settings.hours_per_day;
        }
        if (localData.settings.hours_per_week !== undefined) {
          settingsUpdate.hours_per_week = localData.settings.hours_per_week;
        }

        await settingsRef.update(settingsUpdate);
      }
    }

    // 8. Update weekend config if provided
    if (localData.weekendDays && localData.weekendDays.length > 0) {
      const weekendCollection = getWeekendConfigCollection();
      const existingConfig = await weekendCollection.where('user_id', '==', userId).get();

      for (const doc of existingConfig.docs) {
        const data = doc.data();
        const isWeekend = localData.weekendDays.includes(data.day_of_week);
        await doc.ref.update({ is_weekend: isWeekend, updated_at: now });
      }
    }

    revalidatePath('/');
    revalidatePath('/dashboard');

    const refreshed = await getUserDashboardData();
    if (!refreshed.success || !refreshed.data) {
      return { success: false, error: 'Failed to refresh data after replacement' };
    }

    return { success: true, data: { plannerData: refreshed.data } };
  } catch (error) {
    console.error('[replaceWithLocalData] Error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to replace data' };
  }
}

/**
 * Merge local data with existing database data
 */
export async function mergeLocalData(localData: {
  selectedDays: string[];
  settings?: {
    initial_balance?: number;
    pto_start_date?: string;
    carry_over_limit?: number;
    pto_display_unit?: 'days' | 'hours';
    hours_per_day?: number;
    hours_per_week?: number;
  };
  holidays?: Array<{
    name: string;
    date: string;
    repeats_yearly?: boolean;
    is_paid_holiday?: boolean;
  }>;
  weekendDays?: number[];
  accrualRules?: Array<{
    name: string;
    accrual_amount: number;
    accrual_frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
    accrual_day?: number | null;
    effective_date: string;
    end_date?: string | null;
    is_active: boolean;
  }>;
}): Promise<ActionResult<{ plannerData: PlannerData; mergedCounts: { ptoDays: number; holidays: number; accrualRules: number } }>> {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    const userId = authUser.uid;
    const now = new Date().toISOString();
    const db = getAdminDb();

    let mergedPtoDays = 0;
    let mergedHolidays = 0;
    let mergedAccrualRules = 0;

    // 1. Merge PTO days
    if (localData.selectedDays && localData.selectedDays.length > 0) {
      const ptoDaysCollection = getPtoDaysCollection();
      const existingPtoDays = await ptoDaysCollection.where('user_id', '==', userId).get();
      const existingDates = new Set(existingPtoDays.docs.map(doc => doc.data().date));

      const ptoAmount = localData.settings?.pto_display_unit === 'hours'
        ? (localData.settings.hours_per_day || 8)
        : 1;

      const newDays = localData.selectedDays.filter(dateStr => !existingDates.has(dateStr));

      if (newDays.length > 0) {
        const batch = db.batch();
        for (const dateStr of newDays) {
          const docRef = ptoDaysCollection.doc();
          batch.set(docRef, {
            user_id: userId,
            date: dateStr,
            amount: ptoAmount,
            status: 'planned',
            description: 'Merged from local storage',
            created_at: now,
            updated_at: now,
          });
        }
        await batch.commit();
        mergedPtoDays = newDays.length;
      }
    }

    // 2. Merge holidays
    if (localData.holidays && localData.holidays.length > 0) {
      const holidaysCollection = getCustomHolidaysCollection();
      const existingHolidays = await holidaysCollection.where('user_id', '==', userId).get();
      const existingKeys = new Set(
        existingHolidays.docs.map(doc => {
          const data = doc.data();
          return `${data.date}__${data.name}`;
        })
      );

      const batch = db.batch();
      for (const holiday of localData.holidays) {
        const key = `${holiday.date}__${holiday.name}`;
        if (!existingKeys.has(key)) {
          const docRef = holidaysCollection.doc();
          batch.set(docRef, {
            user_id: userId,
            name: holiday.name,
            date: holiday.date,
            repeats_yearly: holiday.repeats_yearly ?? true,
            is_paid_holiday: holiday.is_paid_holiday ?? true,
            created_at: now,
            updated_at: now,
          });
          mergedHolidays++;
        }
      }
      if (mergedHolidays > 0) {
        await batch.commit();
      }
    }

    // 3. Update settings
    if (localData.settings && Object.keys(localData.settings).length > 0) {
      const settingsCollection = getPtoSettingsCollection();
      const existingSettings = await settingsCollection.where('user_id', '==', userId).limit(1).get();

      if (!existingSettings.empty) {
        const settingsRef = existingSettings.docs[0].ref;
        const settingsUpdate: Record<string, unknown> = { updated_at: now };

        if (localData.settings.initial_balance !== undefined) {
          settingsUpdate.initial_balance = localData.settings.initial_balance;
        }
        if (localData.settings.pto_start_date !== undefined) {
          settingsUpdate.pto_start_date = localData.settings.pto_start_date;
        }
        if (localData.settings.carry_over_limit !== undefined) {
          settingsUpdate.carry_over_limit = localData.settings.carry_over_limit;
        }
        if (localData.settings.pto_display_unit !== undefined) {
          settingsUpdate.pto_display_unit = localData.settings.pto_display_unit;
        }
        if (localData.settings.hours_per_day !== undefined) {
          settingsUpdate.hours_per_day = localData.settings.hours_per_day;
        }
        if (localData.settings.hours_per_week !== undefined) {
          settingsUpdate.hours_per_week = localData.settings.hours_per_week;
        }

        await settingsRef.update(settingsUpdate);
      }
    }

    // 4. Merge weekend config
    if (localData.weekendDays && localData.weekendDays.length > 0) {
      const weekendCollection = getWeekendConfigCollection();
      const existingConfig = await weekendCollection.where('user_id', '==', userId).get();

      for (const doc of existingConfig.docs) {
        const data = doc.data();
        const isWeekend = localData.weekendDays.includes(data.day_of_week);
        await doc.ref.update({ is_weekend: isWeekend, updated_at: now });
      }
    }

    // 5. Merge accrual rules
    if (localData.accrualRules && localData.accrualRules.length > 0) {
      const rulesCollection = getPtoAccrualRulesCollection();
      const existingRules = await rulesCollection.where('user_id', '==', userId).get();
      const existingNames = new Set(existingRules.docs.map(doc => doc.data().name));

      const batch = db.batch();
      for (const rule of localData.accrualRules) {
        if (!existingNames.has(rule.name)) {
          const docRef = rulesCollection.doc();
          batch.set(docRef, {
            user_id: userId,
            name: rule.name,
            accrual_amount: rule.accrual_amount,
            accrual_frequency: rule.accrual_frequency,
            accrual_day: rule.accrual_day ?? null,
            effective_date: rule.effective_date,
            end_date: rule.end_date ?? null,
            is_active: rule.is_active,
            created_at: now,
            updated_at: now,
          });
          mergedAccrualRules++;
        }
      }
      if (mergedAccrualRules > 0) {
        await batch.commit();
      }
    }

    revalidatePath('/');
    revalidatePath('/dashboard');

    const refreshed = await getUserDashboardData();
    if (!refreshed.success || !refreshed.data) {
      return { success: false, error: 'Failed to refresh data after merge' };
    }

    return {
      success: true,
      data: {
        plannerData: refreshed.data,
        mergedCounts: { ptoDays: mergedPtoDays, holidays: mergedHolidays, accrualRules: mergedAccrualRules },
      },
    };
  } catch (error) {
    console.error('[mergeLocalData] Error:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to merge data' };
  }
}
