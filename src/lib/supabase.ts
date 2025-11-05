import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create a single supabase client for the browser
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Helper functions for working with our database

// Users
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return data;
}

// PTO Settings
export async function getUserPtoSettings(userId: string) {
  const { data } = await supabase
    .from('pto_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  return data;
}

// PTO Accrual Rules
export async function getUserAccrualRules(userId: string) {
  const { data } = await supabase
    .from('pto_accrual_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('effective_date', { ascending: false });
    
  return data || [];
}

// PTO Transactions
export async function getUserPtoTransactions(userId: string) {
  const { data } = await supabase
    .from('pto_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });
    
  return data || [];
}

// PTO Days
export async function getUserPtoDays(userId: string, startDate?: string, endDate?: string) {
  let query = supabase
    .from('pto_days')
    .select('*')
    .eq('user_id', userId);
    
  if (startDate) {
    query = query.gte('date', startDate);
  }
  
  if (endDate) {
    query = query.lte('date', endDate);
  }
  
  const { data } = await query.order('date');
  return data || [];
}

// Custom Holidays
export async function getUserCustomHolidays(userId: string) {
  const { data } = await supabase
    .from('custom_holidays')
    .select('*')
    .eq('user_id', userId)
    .order('date');
    
  return data || [];
}

// Weekend Configuration
export async function getUserWeekendConfig(userId: string) {
  const { data } = await supabase
    .from('weekend_config')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week');
    
  return data || [];
}

// Get current PTO balance using the view
export async function getCurrentPtoBalance(userId: string) {
  const { data } = await supabase
    .from('current_pto_balances')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  return data;
}

// Calculate current PTO balance based on transactions
export async function calculatePtoBalance(userId: string) {
  const { data: transactions } = await supabase
    .from('pto_transactions')
    .select('amount')
    .eq('user_id', userId);
    
  if (!transactions) return 0;
  
  return transactions.reduce((total, transaction) => total + transaction.amount, 0);
}

// Get monthly PTO usage
export async function getMonthlyPtoUsage(userId: string) {
  const { data } = await supabase
    .from('monthly_pto_usage')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: false });
    
  return data || [];
}

// Get upcoming PTO days
export async function getUpcomingPtoDays(userId: string) {
  const { data } = await supabase
    .from('upcoming_pto_days')
    .select('*')
    .eq('user_id', userId)
    .order('date');
    
  return data || [];
}

// Get active accrual rules
export async function getActiveAccrualRules(userId: string) {
  const { data } = await supabase
    .from('active_accrual_rules')
    .select('*')
    .eq('user_id', userId);
    
  return data || [];
}

// Get upcoming holidays
export async function getUpcomingHolidays(userId: string) {
  const { data } = await supabase
    .from('upcoming_holidays')
    .select('*')
    .eq('user_id', userId)
    .order('date');
    
  return data || [];
}

// Get weekend configuration with day names
export async function getUserWeekendDays(userId: string) {
  const { data } = await supabase
    .from('user_weekend_days')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week');
    
  return data || [];
}

// Add PTO day using the stored procedure
export async function addPtoDay(
  userId: string,
  date: string,
  amount: number,
  status: string = 'planned',
  description?: string
) {
  const { data, error } = await supabase.rpc('add_pto_day', {
    p_user_id: userId,
    p_date: date,
    p_amount: amount,
    p_status: status,
    p_description: description
  });
  
  if (error) throw error;
  
  return data; // Returns the UUID of the new PTO day
}

// Update PTO day status
export async function updatePtoDayStatus(ptoDayId: string, newStatus: string) {
  const { data, error } = await supabase.rpc('update_pto_day_status', {
    p_pto_day_id: ptoDayId,
    p_new_status: newStatus
  });
  
  if (error) throw error;
  
  return data;
}

// Delete PTO day
export async function deletePtoDay(ptoDayId: string) {
  const { data, error } = await supabase.rpc('delete_pto_day', {
    p_pto_day_id: ptoDayId
  });
  
  if (error) throw error;
  
  return data;
}

// Add accrual rule
export async function addAccrualRule(
  userId: string,
  name: string,
  accrualAmount: number,
  accrualFrequency: string,
  accrualDay?: number,
  effectiveDate?: string,
  endDate?: string
) {
  const { data, error } = await supabase.rpc('add_accrual_rule', {
    p_user_id: userId,
    p_name: name,
    p_accrual_amount: accrualAmount,
    p_accrual_frequency: accrualFrequency,
    p_accrual_day: accrualDay,
    p_effective_date: effectiveDate,
    p_end_date: endDate
  });
  
  if (error) throw error;
  
  return data; // Returns the UUID of the new accrual rule
}

// Process PTO accruals
export async function processPtoAccruals(
  userId: string,
  startDate?: string,
  endDate?: string
) {
  const { data, error } = await supabase.rpc('process_pto_accruals', {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate
  });
  
  if (error) throw error;
  
  return data; // Returns the number of accruals processed
}

// Add custom holiday
export async function addCustomHoliday(
  userId: string,
  name: string,
  date: string,
  repeatsYearly: boolean = false,
  isPaidHoliday: boolean = true
) {
  const { data, error } = await supabase.rpc('add_custom_holiday', {
    p_user_id: userId,
    p_name: name,
    p_date: date,
    p_repeats_yearly: repeatsYearly,
    p_is_paid_holiday: isPaidHoliday
  });
  
  if (error) throw error;
  
  return data; // Returns the UUID of the new custom holiday
}

// Update weekend configuration
export async function updateWeekendConfig(
  userId: string,
  dayOfWeek: number,
  isWeekend: boolean
) {
  const { data, error } = await supabase.rpc('update_weekend_config', {
    p_user_id: userId,
    p_day_of_week: dayOfWeek,
    p_is_weekend: isWeekend
  });
  
  if (error) throw error;
  
  return data;
}

// Initialize a new user's PTO settings
export async function initializeNewUserPto(
  userId: string, 
  initialBalance: number = 0, 
  ptoStartDate: string = new Date().toISOString().split('T')[0]
) {
  // Create user profile
  const { error: userError } = await supabase
    .from('users')
    .upsert({ 
      id: userId,
      email: (await supabase.auth.getUser()).data.user?.email || '',
      full_name: ''
    });
    
  if (userError) throw userError;
  
  // Create PTO settings
  const { error: settingsError } = await supabase
    .from('pto_settings')
    .upsert({ 
      user_id: userId,
      pto_start_date: ptoStartDate,
      initial_balance: initialBalance
    });
    
  if (settingsError) throw settingsError;
  
  // Add initial balance transaction
  if (initialBalance > 0) {
    const { error: transactionError } = await supabase
      .from('pto_transactions')
      .insert({ 
        user_id: userId,
        amount: initialBalance,
        transaction_type: 'accrual',
        description: 'Initial balance'
      });
      
    if (transactionError) throw transactionError;
  }
  
  // Weekend config will be automatically created by the database trigger
  
  return getUserPtoSettings(userId);
} 