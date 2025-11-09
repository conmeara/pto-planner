'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { type ActionResult, type User, type PlannerData } from '@/types';

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
    const today = new Date().toISOString().split('T')[0];
    const { error: settingsError } = await supabase
      .from('pto_settings')
      .insert({
        user_id: userId,
        pto_start_date: today,
        initial_balance: 0,
        pto_display_unit: 'days',
        hours_per_day: 8,
        allow_negative_balance: false,
      });

    if (settingsError) {
      console.error('Error creating default settings:', settingsError);
      // Don't fail if settings creation fails - user can set up later
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

    if (userResult.error) {
      console.error('Error fetching user:', userResult.error);
      return { success: false, error: userResult.error.message };
    }

    // Construct the data object (some fields can be null for new users)
    const data: PlannerData = {
      user: userResult.data as User,
      settings: settingsResult.data || null,
      ptoDays: ptoDaysResult.data || [],
      holidays: holidaysResult.data || [],
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
}): Promise<ActionResult<{ migrated: boolean; details: string[] }>> {
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
    if (localData.settings) {
      const { data: existingSettings } = await supabase
        .from('pto_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!existingSettings) {
        const { error: settingsError } = await supabase
          .from('pto_settings')
          .upsert({
            user_id: user.id,
            pto_start_date: localData.settings.pto_start_date || new Date().toISOString().split('T')[0],
            initial_balance: localData.settings.initial_balance ?? 15,
            carry_over_limit: localData.settings.carry_over_limit ?? 5,
            pto_display_unit: localData.settings.pto_display_unit || 'days',
            hours_per_day: localData.settings.hours_per_day || 8,
            hours_per_week: localData.settings.hours_per_week || 40,
            allow_negative_balance: false,
          });

        if (!settingsError) {
          details.push('Migrated PTO settings');
          migratedSomething = true;
        }
      }
    }

    // 2. Migrate PTO Days
    if (localData.selectedDays && localData.selectedDays.length > 0) {
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
    }

    // 3. Migrate Holidays
    if (localData.holidays && localData.holidays.length > 0) {
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

    revalidatePath('/');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: {
        migrated: migratedSomething,
        details,
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
