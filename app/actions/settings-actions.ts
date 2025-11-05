'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  PTOSettingsSchema,
  PTOAccrualRuleSchema,
  type ActionResult,
  type PTOSettings,
  type PTOAccrualRule,
  type PTOSettingsInput,
  type PTOAccrualRuleInput,
} from '@/types';

/**
 * Create or update PTO settings for the current user
 */
export async function savePTOSettings(
  settings: PTOSettingsInput
): Promise<ActionResult<PTOSettings>> {
  try {
    // Validate input
    const validatedSettings = PTOSettingsSchema.parse(settings);

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Check if settings already exist
    const { data: existing } = await supabase
      .from('pto_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let data: PTOSettings;

    if (existing) {
      // Update existing settings
      const { data: updated, error } = await supabase
        .from('pto_settings')
        .update({
          ...validatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating PTO settings:', error);
        return { success: false, error: error.message };
      }

      data = updated as PTOSettings;
    } else {
      // Insert new settings
      const { data: inserted, error } = await supabase
        .from('pto_settings')
        .insert({
          user_id: user.id,
          ...validatedSettings,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating PTO settings:', error);
        return { success: false, error: error.message };
      }

      data = inserted as PTOSettings;
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error) {
    console.error('Error in savePTOSettings:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to save PTO settings' };
  }
}

/**
 * Get PTO settings for the current user
 */
export async function getPTOSettings(): Promise<ActionResult<PTOSettings | null>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('pto_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching PTO settings:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as PTOSettings | null };
  } catch (error) {
    console.error('Error in getPTOSettings:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch PTO settings' };
  }
}

/**
 * Add an accrual rule for the current user
 * Uses the database RPC function for validation
 */
export async function addAccrualRule(
  rule: PTOAccrualRuleInput
): Promise<ActionResult<PTOAccrualRule>> {
  try {
    // Validate input
    const validatedRule = PTOAccrualRuleSchema.parse(rule);

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call database function to add accrual rule
    const { data, error } = await supabase.rpc('add_accrual_rule', {
      p_user_id: user.id,
      p_name: validatedRule.name,
      p_accrual_amount: validatedRule.accrual_amount,
      p_accrual_frequency: validatedRule.accrual_frequency,
      p_accrual_day: validatedRule.accrual_day || null,
      p_effective_date: validatedRule.effective_date,
      p_end_date: validatedRule.end_date || null,
    });

    if (error) {
      console.error('Error adding accrual rule:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data };
  } catch (error) {
    console.error('Error in addAccrualRule:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to add accrual rule' };
  }
}

/**
 * Get all accrual rules for the current user
 */
export async function getAccrualRules(): Promise<ActionResult<PTOAccrualRule[]>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data, error } = await supabase
      .from('pto_accrual_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('effective_date', { ascending: false });

    if (error) {
      console.error('Error fetching accrual rules:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as PTOAccrualRule[] };
  } catch (error) {
    console.error('Error in getAccrualRules:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch accrual rules' };
  }
}

/**
 * Deactivate an accrual rule
 */
export async function deactivateAccrualRule(ruleId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error } = await supabase
      .from('pto_accrual_rules')
      .update({ is_active: false })
      .eq('id', ruleId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deactivating accrual rule:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error('Error in deactivateAccrualRule:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to deactivate accrual rule' };
  }
}

/**
 * Process PTO accruals for the current user
 * Calculates and records accrued PTO based on active rules
 */
export async function processPTOAccruals(): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call database function to process accruals
    const { data, error } = await supabase.rpc('process_pto_accruals', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error processing PTO accruals:', error);
      return { success: false, error: error.message };
    }

    // Revalidate the dashboard
    revalidatePath('/dashboard');

    return { success: true, data: data as number };
  } catch (error) {
    console.error('Error in processPTOAccruals:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to process PTO accruals' };
  }
}
