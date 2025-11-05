'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { WeekendConfigSchema, type ActionResult, type WeekendConfig } from '@/types';

/**
 * Update weekend configuration for the current user
 * Uses the database RPC function
 */
export async function updateWeekendConfig(
  dayOfWeek: number,
  isWeekend: boolean
): Promise<ActionResult> {
  try {
    // Validate input
    WeekendConfigSchema.parse({ day_of_week: dayOfWeek, is_weekend: isWeekend });

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call database function to update weekend config
    const { error } = await supabase.rpc('update_weekend_config', {
      p_user_id: user.id,
      p_day_of_week: dayOfWeek,
      p_is_weekend: isWeekend,
    });

    if (error) {
      console.error('Error updating weekend config:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updateWeekendConfig:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update weekend configuration' };
  }
}

/**
 * Get weekend configuration for the current user
 */
export async function getWeekendConfig(): Promise<ActionResult<WeekendConfig[]>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('weekend_config')
      .select('*')
      .eq('user_id', user.id)
      .order('day_of_week', { ascending: true });

    if (error) {
      console.error('Error fetching weekend config:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as WeekendConfig[] };
  } catch (error) {
    console.error('Error in getWeekendConfig:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch weekend configuration' };
  }
}

/**
 * Get weekend days as an array of day numbers (0-6)
 * Returns only the days marked as weekend
 */
export async function getWeekendDays(): Promise<ActionResult<number[]>> {
  try {
    const result = await getWeekendConfig();

    if (!result.success) {
      return result;
    }

    const weekendDays = result.data
      .filter((config) => config.is_weekend)
      .map((config) => config.day_of_week);

    return { success: true, data: weekendDays };
  } catch (error) {
    console.error('Error in getWeekendDays:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch weekend days' };
  }
}

/**
 * Batch update weekend configuration
 * Useful for setting all days at once
 */
export async function batchUpdateWeekendConfig(
  weekendDays: number[]
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Update all days (0-6)
    for (let day = 0; day <= 6; day++) {
      const isWeekend = weekendDays.includes(day);

      const { error } = await supabase.rpc('update_weekend_config', {
        p_user_id: user.id,
        p_day_of_week: day,
        p_is_weekend: isWeekend,
      });

      if (error) {
        console.error(`Error updating day ${day}:`, error);
        // Continue with other days even if one fails
      }
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in batchUpdateWeekendConfig:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to batch update weekend configuration' };
  }
}
