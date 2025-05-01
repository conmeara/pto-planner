-- Create schema for PTO planner application
-- This migration sets up all the necessary tables for the PTO planner

-- Enable the pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- PTO settings table (one record per user)
CREATE TABLE IF NOT EXISTS pto_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pto_start_date DATE NOT NULL,
  initial_balance NUMERIC(8, 2) NOT NULL DEFAULT 0,
  carry_over_limit NUMERIC(8, 2),
  max_balance NUMERIC(8, 2),
  renewal_date DATE,
  allow_negative_balance BOOLEAN DEFAULT FALSE,
  pto_display_unit TEXT DEFAULT 'days', -- 'days' or 'hours'
  hours_per_day NUMERIC(4, 2) DEFAULT 8.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- PTO accrual rules (multiple possible per user)
CREATE TABLE IF NOT EXISTS pto_accrual_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  accrual_amount NUMERIC(8, 2) NOT NULL,
  accrual_frequency TEXT NOT NULL, -- 'daily', 'weekly', 'biweekly', 'monthly', 'yearly'
  accrual_day INTEGER, -- day of month/week for accrual (if applicable)
  effective_date DATE NOT NULL, -- when this rule starts applying
  end_date DATE, -- optional end date
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- PTO balance transactions (all changes to PTO balance)
CREATE TABLE IF NOT EXISTS pto_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  amount NUMERIC(8, 2) NOT NULL, -- positive for accrual, negative for usage
  transaction_type TEXT NOT NULL, -- 'accrual', 'usage', 'adjustment', 'expiration', 'carry-over'
  description TEXT,
  reference_id UUID, -- optional reference to PTO day or other entity
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- PTO days (requested/planned days off)
CREATE TABLE IF NOT EXISTS pto_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(8, 2) NOT NULL, -- amount of PTO used (in days or hours)
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'approved', 'taken', 'cancelled'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, date)
);

-- Custom holidays (user-defined holidays)
CREATE TABLE IF NOT EXISTS custom_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  repeats_yearly BOOLEAN DEFAULT FALSE,
  is_paid_holiday BOOLEAN DEFAULT TRUE, -- whether it counts as a paid holiday
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, name, date)
);

-- Weekend configuration (which days are considered weekend)
CREATE TABLE IF NOT EXISTS weekend_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 (Sunday) to 6 (Saturday)
  is_weekend BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, day_of_week)
);

-- Set up Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_accrual_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekend_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own data
CREATE POLICY users_policy ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY pto_settings_policy ON pto_settings
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY pto_accrual_rules_policy ON pto_accrual_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY pto_transactions_policy ON pto_transactions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY pto_days_policy ON pto_days
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY custom_holidays_policy ON custom_holidays
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY weekend_config_policy ON weekend_config
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX pto_settings_user_id_idx ON pto_settings(user_id);
CREATE INDEX pto_accrual_rules_user_id_idx ON pto_accrual_rules(user_id);
CREATE INDEX pto_transactions_user_id_idx ON pto_transactions(user_id);
CREATE INDEX pto_transactions_date_idx ON pto_transactions(transaction_date);
CREATE INDEX pto_days_user_id_idx ON pto_days(user_id);
CREATE INDEX pto_days_date_idx ON pto_days(date);
CREATE INDEX custom_holidays_user_id_idx ON custom_holidays(user_id);
CREATE INDEX custom_holidays_date_idx ON custom_holidays(date);
CREATE INDEX weekend_config_user_id_idx ON weekend_config(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for each table with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_pto_settings_updated_at
  BEFORE UPDATE ON pto_settings
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_pto_accrual_rules_updated_at
  BEFORE UPDATE ON pto_accrual_rules
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_pto_days_updated_at
  BEFORE UPDATE ON pto_days
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_custom_holidays_updated_at
  BEFORE UPDATE ON custom_holidays
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_weekend_config_updated_at
  BEFORE UPDATE ON weekend_config
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default weekend configuration function
CREATE OR REPLACE FUNCTION insert_default_weekend_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert Saturday and Sunday as default weekend days
  INSERT INTO weekend_config (user_id, day_of_week, is_weekend)
  VALUES 
    (NEW.id, 0, TRUE),  -- Sunday
    (NEW.id, 6, TRUE);  -- Saturday
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to set default weekend days when a user is created
CREATE TRIGGER set_default_weekend_days
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE PROCEDURE insert_default_weekend_config(); 