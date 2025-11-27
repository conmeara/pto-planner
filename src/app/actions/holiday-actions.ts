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
    const { data, error } = await supabase
      .from('custom_holidays')
      .insert({
        user_id: user.id,
        name,
        date,
        repeats_yearly: repeatsYearly,
        is_paid_holiday: isPaidHoliday,
      })
      .select()
      .single();

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
    if (!holidayId || typeof holidayId !== 'string' || holidayId.trim() === '') {
      return { success: false, error: 'Holiday ID is required' };
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('custom_holidays')
      .delete()
      .eq('id', holidayId.trim())
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
  holidays: Array<{ name: string; date: string; repeatsYearly?: boolean; isPaidHoliday?: boolean }>
): Promise<ActionResult<CustomHoliday[]>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Add all holidays
    if (holidays.length === 0) {
      return { success: true, data: [] };
    }

    const insertPayload = holidays.map((holiday) => ({
      user_id: user.id,
      name: holiday.name,
      date: holiday.date,
      repeats_yearly: holiday.repeatsYearly ?? false,
      is_paid_holiday: holiday.isPaidHoliday ?? true,
    }));

    const { data, error } = await supabase
      .from('custom_holidays')
      .insert(insertPayload)
      .select();

    if (error) {
      console.error('Error adding holidays:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data: (data || []) as CustomHoliday[] };
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
export async function clearHolidaysForYear(year: number, includeRepeating: boolean = true): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let query = supabase
      .from('custom_holidays')
      .delete()
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (!includeRepeating) {
      query = query.eq('repeats_yearly', false);
    }

    const { error } = await query;

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

export async function updateCustomHoliday(
  holidayId: string,
  updates: Partial<Pick<CustomHoliday, 'name' | 'date' | 'repeats_yearly' | 'is_paid_holiday'>>
): Promise<ActionResult<CustomHoliday>> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!holidayId) {
      return { success: false, error: 'Holiday ID is required' };
    }

    const payload: Record<string, unknown> = {};

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.repeats_yearly !== undefined) payload.repeats_yearly = updates.repeats_yearly;
    if (updates.is_paid_holiday !== undefined) payload.is_paid_holiday = updates.is_paid_holiday;

    if (Object.keys(payload).length === 0) {
      return { success: false, error: 'No updates provided' };
    }

    const { data, error } = await supabase
      .from('custom_holidays')
      .update(payload)
      .eq('id', holidayId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating holiday:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard');

    return { success: true, data: data as CustomHoliday };
  } catch (error) {
    console.error('Error in updateCustomHoliday:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update holiday' };
  }
}
