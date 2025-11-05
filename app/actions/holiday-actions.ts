'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { CustomHolidaySchema, type ActionResult, type CustomHoliday } from '@/types';

/**
 * Add a custom holiday for the current user
 * Uses the database RPC function
 */
export async function addCustomHoliday(
  name: string,
  date: string,
  repeatsYearly: boolean = false,
  isPaidHoliday: boolean = true
): Promise<ActionResult<CustomHoliday>> {
  try {
    // Validate input
    CustomHolidaySchema.parse({
      name,
      date,
      repeats_yearly: repeatsYearly,
      is_paid_holiday: isPaidHoliday,
    });

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call database function to add custom holiday
    const { data, error } = await supabase.rpc('add_custom_holiday', {
      p_user_id: user.id,
      p_name: name,
      p_date: date,
      p_repeats_yearly: repeatsYearly,
      p_is_paid_holiday: isPaidHoliday,
    });

    if (error) {
      console.error('Error adding custom holiday:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error) {
    console.error('Error in addCustomHoliday:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to add custom holiday' };
  }
}

/**
 * Delete a custom holiday
 */
export async function deleteCustomHoliday(holidayId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('custom_holidays')
      .delete()
      .eq('id', holidayId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting custom holiday:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deleteCustomHoliday:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete custom holiday' };
  }
}

/**
 * Get all custom holidays for the current user
 */
export async function getCustomHolidays(year?: number): Promise<ActionResult<CustomHoliday[]>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    let query = supabase
      .from('custom_holidays')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    // Filter by year if provided
    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching custom holidays:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as CustomHoliday[] };
  } catch (error) {
    console.error('Error in getCustomHolidays:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch custom holidays' };
  }
}

/**
 * Batch add holidays from external API
 * Useful when importing country-specific holidays
 */
export async function batchAddHolidays(
  holidays: Array<{ name: string; date: string; repeatsYearly?: boolean }>
): Promise<ActionResult<CustomHoliday[]>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Add all holidays
    const results: CustomHoliday[] = [];
    for (const holiday of holidays) {
      const { data, error } = await supabase.rpc('add_custom_holiday', {
        p_user_id: user.id,
        p_name: holiday.name,
        p_date: holiday.date,
        p_repeats_yearly: holiday.repeatsYearly || false,
        p_is_paid_holiday: true,
      });

      if (error) {
        console.error('Error adding holiday:', error);
        // Continue with other holidays even if one fails
        continue;
      }

      if (data) {
        results.push(data);
      }
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data: results };
  } catch (error) {
    console.error('Error in batchAddHolidays:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to batch add holidays' };
  }
}

/**
 * Clear all holidays for a specific year
 * Useful when refreshing holidays from API
 */
export async function clearHolidaysForYear(year: number): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { error } = await supabase
      .from('custom_holidays')
      .delete()
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('repeats_yearly', false); // Only clear non-repeating holidays

    if (error) {
      console.error('Error clearing holidays:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in clearHolidaysForYear:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to clear holidays' };
  }
}
