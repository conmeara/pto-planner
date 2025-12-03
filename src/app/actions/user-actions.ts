'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { type ActionResult, type User, type PlannerData } from '@/types';
import { formatDateLocal } from '@/lib/date-utils';

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
    const supabase = await createClient();

    // Create user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName || null,
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', userError);
      return { success: false, error: userError.message };
    }

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
    
    const { error: settingsError } = await supabase
      .from('pto_settings')
      .insert({
        user_id: userId,
        pto_start_date: ptoStartDate,
        initial_balance: 15,
        pto_display_unit: 'days',
        hours_per_day: 8,
        allow_negative_balance: false,
      });

    if (settingsError) {
      console.error('Error creating default settings:', settingsError);
      // Don't fail if settings creation fails - user can set up later
    }

    // Create default accrual rule (monthly, 1.25 days)
    const { error: accrualError } = await supabase
      .from('pto_accrual_rules')
      .insert({
        user_id: userId,
        name: 'Monthly accrual',
        accrual_amount: 1.25,
        accrual_frequency: 'monthly',
        accrual_day: null,
        effective_date: ptoStartDate,
        end_date: null,
        is_active: true,
      });

    if (accrualError) {
      console.error('Error creating default accrual rule:', accrualError);
      // Don't fail if accrual rule creation fails - user can set up later
    }

    // Note: Weekend config is created automatically via database trigger

    revalidatePath('/dashboard');

    return { success: true, data: userData as User };
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
    const supabase = await createClient();

    // Get current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return { success: false, error: 'Unauthorized' };
    }

    // Fetch all data in parallel
    const [
      userResult,
      settingsResult,
      ptoDaysResult,
      holidaysResult,
      weekendConfigResult,
      accrualRulesResult,
      balanceResult,
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', authUser.id).single(),
      supabase.from('pto_settings').select('*').eq('user_id', authUser.id).single(),
      supabase.from('pto_days').select('*').eq('user_id', authUser.id).order('date'),
      supabase.from('custom_holidays').select('*').eq('user_id', authUser.id).order('date'),
      supabase.from('weekend_config').select('*').eq('user_id', authUser.id).order('day_of_week'),
      supabase.from('pto_accrual_rules').select('*').eq('user_id', authUser.id).eq('is_active', true),
      supabase.from('current_pto_balances').select('*').eq('user_id', authUser.id).single(),
    ]);

    // User record is required - fail if not found
    if (userResult.error) {
      console.error('Error fetching user:', userResult.error);
      return { success: false, error: userResult.error.message };
    }

    // Log errors for other queries but continue (data may be empty for new users)
    if (settingsResult.error && settingsResult.error.code !== 'PGRST116') {
      console.error('Error fetching settings:', settingsResult.error);
    }
    if (ptoDaysResult.error) {
      console.error('Error fetching PTO days:', ptoDaysResult.error);
    }
    if (holidaysResult.error) {
      console.error('Error fetching holidays:', holidaysResult.error);
    }
    if (weekendConfigResult.error) {
      console.error('Error fetching weekend config:', weekendConfigResult.error);
    }
    if (accrualRulesResult.error) {
      console.error('Error fetching accrual rules:', accrualRulesResult.error);
    }
    if (balanceResult.error && balanceResult.error.code !== 'PGRST116') {
      console.error('Error fetching balance:', balanceResult.error);
    }

    // Construct the data object (some fields can be null for new users)
    // Ensure holiday dates are properly formatted to avoid timezone issues
    const holidays = (holidaysResult.data || []).map((holiday: any) => ({
      ...holiday,
      date: typeof holiday.date === 'string' ? holiday.date : formatDateLocal(new Date(holiday.date)),
    }));

    const data: PlannerData = {
      user: userResult.data as User,
      settings: settingsResult.data || null,
      ptoDays: ptoDaysResult.data || [],
      holidays,
      weekendConfig: weekendConfigResult.data || [],
      accrualRules: accrualRulesResult.data || [],
      currentBalance: balanceResult.data || null,
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
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('users')
      .update({ full_name: fullName })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');

    return { success: true, data: data as User };
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
 * This is called when a user who has been using the app locally signs in for the first time
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
}): Promise<ActionResult<{ migrated: boolean; details: string[]; plannerData?: PlannerData }>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const details: string[] = [];
    let migratedSomething = false;

    // 1. Migrate PTO Settings
    // Check if there are meaningful local settings to migrate (not just empty defaults)
    const hasLocalSettings = localData.settings && (
      localData.settings.initial_balance !== undefined ||
      localData.settings.pto_start_date !== undefined ||
      localData.settings.carry_over_limit !== undefined ||
      localData.settings.pto_display_unit !== undefined ||
      localData.settings.hours_per_day !== undefined ||
      localData.settings.hours_per_week !== undefined
    );

    if (hasLocalSettings) {
      // Build update object with only the fields that have local values
      const settingsUpdate: Record<string, unknown> = {};

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

      if (Object.keys(settingsUpdate).length > 0) {
        const { error: settingsError } = await supabase
          .from('pto_settings')
          .update(settingsUpdate)
          .eq('user_id', user.id);

        if (!settingsError) {
          details.push('Migrated PTO settings');
          migratedSomething = true;
        } else {
          console.error('Error migrating settings:', settingsError);
        }
      }
    }

    // 2. Migrate PTO Days
    if (localData.selectedDays && localData.selectedDays.length > 0) {
      // Check if any PTO days already exist to prevent duplication
      const { data: existingPtoDays } = await supabase
        .from('pto_days')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!existingPtoDays || existingPtoDays.length === 0) {
        const ptoAmount = localData.settings?.pto_display_unit === 'hours'
          ? (localData.settings.hours_per_day || 8)
          : 1;

        let migratedDays = 0;
        for (const dateStr of localData.selectedDays) {
          const { error: dayError } = await supabase.rpc('add_pto_day', {
            p_user_id: user.id,
            p_date: dateStr,
            p_amount: ptoAmount,
            p_status: 'planned',
            p_description: 'Migrated from local storage',
          });

          if (!dayError) {
            migratedDays++;
          }
        }

        if (migratedDays > 0) {
          details.push(`Migrated ${migratedDays} PTO day${migratedDays === 1 ? '' : 's'}`);
          migratedSomething = true;
        }
      } else {
        details.push(`Skipped ${localData.selectedDays.length} PTO day${localData.selectedDays.length === 1 ? '' : 's'} (PTO days already exist)`);
      }
    }

    // 3. Migrate Holidays
    if (localData.holidays && localData.holidays.length > 0) {
      // Check if any holidays already exist to prevent duplication
      const { data: existingHolidays } = await supabase
        .from('custom_holidays')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (!existingHolidays || existingHolidays.length === 0) {
        let migratedHolidays = 0;
        for (const holiday of localData.holidays) {
          const { error: holidayError } = await supabase
            .from('custom_holidays')
            .insert({
              user_id: user.id,
              name: holiday.name,
              date: holiday.date,
              repeats_yearly: holiday.repeats_yearly ?? true,
              is_paid_holiday: holiday.is_paid_holiday ?? true,
            });

          if (!holidayError) {
            migratedHolidays++;
          }
        }

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
      for (const dayOfWeek of localData.weekendDays) {
        const { error: weekendError } = await supabase
          .from('weekend_config')
          .upsert({
            user_id: user.id,
            day_of_week: dayOfWeek,
            is_weekend: true,
          }, {
            onConflict: 'user_id,day_of_week',
          });

        if (weekendError) {
          console.error('Error migrating weekend config:', weekendError);
        }
      }
      details.push('Migrated weekend configuration');
      migratedSomething = true;
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
 * Used when user chooses "use local" during conflict resolution
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
}): Promise<ActionResult<{ plannerData: PlannerData }>> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // 1. Delete all existing PTO days
    const { error: deletePtoError } = await supabase
      .from('pto_days')
      .delete()
      .eq('user_id', user.id);

    if (deletePtoError) {
      console.error('Error deleting PTO days:', deletePtoError);
    }

    // 2. Delete all existing holidays (keep only non-user holidays if any)
    const { error: deleteHolidaysError } = await supabase
      .from('custom_holidays')
      .delete()
      .eq('user_id', user.id);

    if (deleteHolidaysError) {
      console.error('Error deleting holidays:', deleteHolidaysError);
    }

    // 3. Insert local PTO days
    if (localData.selectedDays && localData.selectedDays.length > 0) {
      const ptoAmount = localData.settings?.pto_display_unit === 'hours'
        ? (localData.settings.hours_per_day || 8)
        : 1;

      for (const dateStr of localData.selectedDays) {
        await supabase.rpc('add_pto_day', {
          p_user_id: user.id,
          p_date: dateStr,
          p_amount: ptoAmount,
          p_status: 'planned',
          p_description: 'Imported from local storage',
        });
      }
    }

    // 4. Insert local holidays
    if (localData.holidays && localData.holidays.length > 0) {
      for (const holiday of localData.holidays) {
        await supabase
          .from('custom_holidays')
          .insert({
            user_id: user.id,
            name: holiday.name,
            date: holiday.date,
            repeats_yearly: holiday.repeats_yearly ?? true,
            is_paid_holiday: holiday.is_paid_holiday ?? true,
          });
      }
    }

    // 5. Update settings if provided
    if (localData.settings && Object.keys(localData.settings).length > 0) {
      const settingsUpdate: Record<string, unknown> = {};
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

      if (Object.keys(settingsUpdate).length > 0) {
        await supabase
          .from('pto_settings')
          .update(settingsUpdate)
          .eq('user_id', user.id);
      }
    }

    // 6. Update weekend config if provided
    if (localData.weekendDays && localData.weekendDays.length > 0) {
      // Reset all to non-weekend first
      await supabase
        .from('weekend_config')
        .update({ is_weekend: false })
        .eq('user_id', user.id);

      // Set the local weekend days
      for (const dayOfWeek of localData.weekendDays) {
        await supabase
          .from('weekend_config')
          .upsert({
            user_id: user.id,
            day_of_week: dayOfWeek,
            is_weekend: true,
          }, {
            onConflict: 'user_id,day_of_week',
          });
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
    console.error('Error in replaceWithLocalData:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to replace data' };
  }
}

/**
 * Merge local data with existing database data
 * Used when user chooses "merge" during conflict resolution
 * - PTO days: Add local days that don't already exist in DB
 * - Settings: Local settings override DB settings
 * - Holidays: Add local holidays that don't already exist (by date+name)
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
}): Promise<ActionResult<{ plannerData: PlannerData; mergedCounts: { ptoDays: number; holidays: number } }>> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    let mergedPtoDays = 0;
    let mergedHolidays = 0;

    // 1. Merge PTO days (add only non-duplicate dates)
    if (localData.selectedDays && localData.selectedDays.length > 0) {
      // Get existing PTO days
      const { data: existingPtoDays } = await supabase
        .from('pto_days')
        .select('date')
        .eq('user_id', user.id);

      const existingDates = new Set(existingPtoDays?.map(d => d.date) || []);

      const ptoAmount = localData.settings?.pto_display_unit === 'hours'
        ? (localData.settings.hours_per_day || 8)
        : 1;

      for (const dateStr of localData.selectedDays) {
        if (!existingDates.has(dateStr)) {
          const { error } = await supabase.rpc('add_pto_day', {
            p_user_id: user.id,
            p_date: dateStr,
            p_amount: ptoAmount,
            p_status: 'planned',
            p_description: 'Merged from local storage',
          });
          if (!error) {
            mergedPtoDays++;
          }
        }
      }
    }

    // 2. Merge holidays (add only non-duplicate date+name combinations)
    if (localData.holidays && localData.holidays.length > 0) {
      // Get existing holidays
      const { data: existingHolidays } = await supabase
        .from('custom_holidays')
        .select('date, name')
        .eq('user_id', user.id);

      const existingKeys = new Set(
        existingHolidays?.map(h => `${h.date}__${h.name}`) || []
      );

      for (const holiday of localData.holidays) {
        const key = `${holiday.date}__${holiday.name}`;
        if (!existingKeys.has(key)) {
          const { error } = await supabase
            .from('custom_holidays')
            .insert({
              user_id: user.id,
              name: holiday.name,
              date: holiday.date,
              repeats_yearly: holiday.repeats_yearly ?? true,
              is_paid_holiday: holiday.is_paid_holiday ?? true,
            });
          if (!error) {
            mergedHolidays++;
          }
        }
      }
    }

    // 3. Update settings (local settings override)
    if (localData.settings && Object.keys(localData.settings).length > 0) {
      const settingsUpdate: Record<string, unknown> = {};
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

      if (Object.keys(settingsUpdate).length > 0) {
        await supabase
          .from('pto_settings')
          .update(settingsUpdate)
          .eq('user_id', user.id);
      }
    }

    // 4. Merge weekend config (local overrides)
    if (localData.weekendDays && localData.weekendDays.length > 0) {
      // Reset all to non-weekend first
      await supabase
        .from('weekend_config')
        .update({ is_weekend: false })
        .eq('user_id', user.id);

      // Set the local weekend days
      for (const dayOfWeek of localData.weekendDays) {
        await supabase
          .from('weekend_config')
          .upsert({
            user_id: user.id,
            day_of_week: dayOfWeek,
            is_weekend: true,
          }, {
            onConflict: 'user_id,day_of_week',
          });
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
        mergedCounts: { ptoDays: mergedPtoDays, holidays: mergedHolidays },
      },
    };
  } catch (error) {
    console.error('Error in mergeLocalData:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to merge data' };
  }
}
