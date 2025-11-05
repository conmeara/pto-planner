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
