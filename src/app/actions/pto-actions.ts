'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { PTODaySchema, type ActionResult, type PTODay } from '@/types';

/**
 * Add a new PTO day for the current user
 * Uses the database RPC function for proper transaction handling
 */
export async function addPTODay(
  date: string,
  amount: number,
  description?: string
): Promise<ActionResult<PTODay>> {
  try {
    // Validate input
    const validatedInput = PTODaySchema.parse({
      date,
      amount,
      status: 'planned',
      description,
    });

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call database function to add PTO day
    const { data, error } = await supabase.rpc('add_pto_day', {
      p_user_id: user.id,
      p_date: validatedInput.date,
      p_amount: validatedInput.amount,
      p_status: validatedInput.status,
      p_description: validatedInput.description || null,
    });

    if (error) {
      console.error('Error adding PTO day:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard to show updated data
    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error) {
    console.error('Error in addPTODay:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to add PTO day' };
  }
}

/**
 * Delete a PTO day
 * Uses the database RPC function for proper cleanup and transaction reversal
 */
export async function deletePTODay(ptoDate: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call database function to delete PTO day
    const { error } = await supabase.rpc('delete_pto_day', {
      p_user_id: user.id,
      p_date: ptoDate,
    });

    if (error) {
      console.error('Error deleting PTO day:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deletePTODay:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to delete PTO day' };
  }
}

/**
 * Update PTO day status
 * Transitions between planned → approved → taken
 */
export async function updatePTODayStatus(
  ptoDate: string,
  newStatus: 'planned' | 'approved' | 'taken' | 'cancelled'
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call database function to update status
    const { error } = await supabase.rpc('update_pto_day_status', {
      p_user_id: user.id,
      p_date: ptoDate,
      p_new_status: newStatus,
    });

    if (error) {
      console.error('Error updating PTO day status:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in updatePTODayStatus:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update PTO day status' };
  }
}

/**
 * Get all PTO days for the current user
 * Optionally filter by date range
 */
export async function getPTODays(
  startDate?: string,
  endDate?: string
): Promise<ActionResult<PTODay[]>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    let query = supabase
      .from('pto_days')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching PTO days:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as PTODay[] };
  } catch (error) {
    console.error('Error in getPTODays:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch PTO days' };
  }
}

/**
 * Batch add PTO days (useful for applying suggested PTO)
 */
export async function batchAddPTODays(
  days: Array<{ date: string; amount: number; description?: string }>
): Promise<ActionResult<PTODay[]>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!days || days.length === 0) {
      return { success: true, data: [] };
    }

    // Add all days
    const results: PTODay[] = [];
    const failures: string[] = [];

    for (const day of days) {
      const { data, error } = await supabase.rpc('add_pto_day', {
        p_user_id: user.id,
        p_date: day.date,
        p_amount: day.amount,
        p_status: 'planned',
        p_description: day.description || 'Suggested PTO',
      });

      if (error) {
        console.error('Error adding PTO day:', error);
        failures.push(day.date);
        continue;
      }

      if (data) {
        results.push(data);
      }
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    // Return failure if all items failed
    if (failures.length > 0 && results.length === 0) {
      return { success: false, error: `Failed to add all ${failures.length} PTO days` };
    }

    // Log partial failures for debugging (caller can compare input/output lengths)
    if (failures.length > 0) {
      console.warn(`Partial batch add: ${results.length} succeeded, ${failures.length} failed (dates: ${failures.join(', ')})`);
    }

    return { success: true, data: results };
  } catch (error) {
    console.error('Error in batchAddPTODays:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to batch add PTO days' };
  }
}
