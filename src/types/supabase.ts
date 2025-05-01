export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      pto_settings: {
        Row: {
          id: string
          user_id: string
          pto_start_date: string
          initial_balance: number
          carry_over_limit: number | null
          max_balance: number | null
          renewal_date: string | null
          allow_negative_balance: boolean
          pto_display_unit: string
          hours_per_day: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          pto_start_date: string
          initial_balance?: number
          carry_over_limit?: number | null
          max_balance?: number | null
          renewal_date?: string | null
          allow_negative_balance?: boolean
          pto_display_unit?: string
          hours_per_day?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          pto_start_date?: string
          initial_balance?: number
          carry_over_limit?: number | null
          max_balance?: number | null
          renewal_date?: string | null
          allow_negative_balance?: boolean
          pto_display_unit?: string
          hours_per_day?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pto_settings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      pto_accrual_rules: {
        Row: {
          id: string
          user_id: string
          name: string
          accrual_amount: number
          accrual_frequency: string
          accrual_day: number | null
          effective_date: string
          end_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          accrual_amount: number
          accrual_frequency: string
          accrual_day?: number | null
          effective_date: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          accrual_amount?: number
          accrual_frequency?: string
          accrual_day?: number | null
          effective_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pto_accrual_rules_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      pto_transactions: {
        Row: {
          id: string
          user_id: string
          transaction_date: string
          amount: number
          transaction_type: string
          description: string | null
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_date?: string
          amount: number
          transaction_type: string
          description?: string | null
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_date?: string
          amount?: number
          transaction_type?: string
          description?: string | null
          reference_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pto_transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      pto_days: {
        Row: {
          id: string
          user_id: string
          date: string
          amount: number
          status: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          amount: number
          status?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          amount?: number
          status?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pto_days_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      custom_holidays: {
        Row: {
          id: string
          user_id: string
          name: string
          date: string
          repeats_yearly: boolean
          is_paid_holiday: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          date: string
          repeats_yearly?: boolean
          is_paid_holiday?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          date?: string
          repeats_yearly?: boolean
          is_paid_holiday?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_holidays_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      weekend_config: {
        Row: {
          id: string
          user_id: string
          day_of_week: number
          is_weekend: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          day_of_week: number
          is_weekend?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          day_of_week?: number
          is_weekend?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekend_config_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      current_pto_balances: {
        Row: {
          user_id: string
          email: string
          full_name: string | null
          current_balance: number
          pto_display_unit: string | null
          max_balance: number | null
          carry_over_limit: number | null
          allow_negative_balance: boolean | null
        }
        Relationships: []
      }
      monthly_pto_usage: {
        Row: {
          user_id: string
          email: string
          full_name: string | null
          month: string | null
          total_pto_used: number | null
          days_count: number | null
        }
        Relationships: []
      }
      upcoming_pto_days: {
        Row: {
          user_id: string
          email: string
          full_name: string | null
          date: string
          amount: number
          status: string
          description: string | null
        }
        Relationships: []
      }
      active_accrual_rules: {
        Row: {
          user_id: string
          email: string
          full_name: string | null
          rule_id: string
          name: string
          accrual_amount: number
          accrual_frequency: string
          accrual_day: number | null
          effective_date: string
        }
        Relationships: []
      }
      upcoming_holidays: {
        Row: {
          user_id: string
          name: string
          date: string
          is_custom: boolean
          is_paid_holiday: boolean
        }
        Relationships: []
      }
      user_weekend_days: {
        Row: {
          user_id: string
          email: string
          full_name: string | null
          day_of_week: number
          day_name: string | null
          is_weekend: boolean
        }
        Relationships: []
      }
    }
    Functions: {
      add_accrual_rule: {
        Args: {
          p_user_id: string
          p_name: string
          p_accrual_amount: number
          p_accrual_frequency: string
          p_accrual_day?: number
          p_effective_date?: string
          p_end_date?: string
        }
        Returns: string
      }
      add_custom_holiday: {
        Args: {
          p_user_id: string
          p_name: string
          p_date: string
          p_repeats_yearly?: boolean
          p_is_paid_holiday?: boolean
        }
        Returns: string
      }
      add_pto_day: {
        Args: {
          p_user_id: string
          p_date: string
          p_amount: number
          p_status?: string
          p_description?: string
        }
        Returns: string
      }
      calculate_pto_accrual: {
        Args: {
          p_user_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          rule_id: string
          accrual_date: string
          accrual_amount: number
        }[]
      }
      delete_pto_day: {
        Args: {
          p_pto_day_id: string
        }
        Returns: boolean
      }
      process_pto_accruals: {
        Args: {
          p_user_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: number
      }
      update_pto_day_status: {
        Args: {
          p_pto_day_id: string
          p_new_status: string
        }
        Returns: boolean
      }
      update_weekend_config: {
        Args: {
          p_user_id: string
          p_day_of_week: number
          p_is_weekend: boolean
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for strongly-typed access
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']

// Custom type definitions for specific entities
export type User = Tables<'users'>
export type PtoSettings = Tables<'pto_settings'>
export type PtoAccrualRule = Tables<'pto_accrual_rules'>
export type PtoTransaction = Tables<'pto_transactions'>
export type PtoDay = Tables<'pto_days'>
export type CustomHoliday = Tables<'custom_holidays'>
export type WeekendConfig = Tables<'weekend_config'>

// View type definitions
export type CurrentPtoBalance = Views<'current_pto_balances'>
export type MonthlyPtoUsage = Views<'monthly_pto_usage'>
export type UpcomingPtoDay = Views<'upcoming_pto_days'>
export type ActiveAccrualRule = Views<'active_accrual_rules'>
export type UpcomingHoliday = Views<'upcoming_holidays'>
export type UserWeekendDay = Views<'user_weekend_days'>

// Enum-like types for various string fields
export const AccrualFrequency = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;
export type AccrualFrequency = typeof AccrualFrequency[keyof typeof AccrualFrequency]

export const TransactionType = {
  ACCRUAL: 'accrual',
  USAGE: 'usage',
  ADJUSTMENT: 'adjustment',
  EXPIRATION: 'expiration',
  CARRY_OVER: 'carry-over',
} as const;
export type TransactionType = typeof TransactionType[keyof typeof TransactionType]

export const PtoDisplayUnit = {
  DAYS: 'days',
  HOURS: 'hours',
} as const;
export type PtoDisplayUnit = typeof PtoDisplayUnit[keyof typeof PtoDisplayUnit]

export const PtoDayStatus = {
  PLANNED: 'planned',
  APPROVED: 'approved',
  TAKEN: 'taken',
  CANCELLED: 'cancelled',
} as const;
export type PtoDayStatus = typeof PtoDayStatus[keyof typeof PtoDayStatus] 