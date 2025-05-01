-- Seed data for testing the PTO Planner application

-- Test User (uses Supabase Auth ID format)
INSERT INTO users (id, email, full_name)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'test@example.com', 'Test User')
ON CONFLICT (id) DO NOTHING;

-- PTO Settings for Test User
INSERT INTO pto_settings (user_id, pto_start_date, initial_balance, carry_over_limit, max_balance, renewal_date, allow_negative_balance, pto_display_unit, hours_per_day)
VALUES
  ('00000000-0000-0000-0000-000000000001', '2024-01-01', 80, 40, 120, '2025-01-01', false, 'hours', 8)
ON CONFLICT (user_id) DO NOTHING;

-- PTO Accrual Rules for Test User
INSERT INTO pto_accrual_rules (user_id, name, accrual_amount, accrual_frequency, accrual_day, effective_date, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Bi-weekly Accrual', 4.62, 'biweekly', NULL, '2024-01-01', true),
  ('00000000-0000-0000-0000-000000000001', 'Anniversary Bonus', 8, 'yearly', NULL, '2024-01-01', true)
ON CONFLICT DO NOTHING;

-- PTO Transactions for Test User
INSERT INTO pto_transactions (user_id, transaction_date, amount, transaction_type, description)
VALUES
  ('00000000-0000-0000-0000-000000000001', '2024-01-01', 80, 'accrual', 'Initial balance'),
  ('00000000-0000-0000-0000-000000000001', '2024-01-15', 4.62, 'accrual', 'Bi-weekly accrual'),
  ('00000000-0000-0000-0000-000000000001', '2024-01-31', -8, 'usage', 'Vacation day')
ON CONFLICT DO NOTHING;

-- PTO Days for Test User
INSERT INTO pto_days (user_id, date, amount, status, description)
VALUES
  ('00000000-0000-0000-0000-000000000001', '2024-01-31', 8, 'taken', 'Vacation day'),
  ('00000000-0000-0000-0000-000000000001', '2024-02-15', 8, 'planned', 'Doctor appointment'),
  ('00000000-0000-0000-0000-000000000001', '2024-05-23', 8, 'planned', 'Personal day')
ON CONFLICT DO NOTHING;

-- Custom Holidays for Test User
INSERT INTO custom_holidays (user_id, name, date, repeats_yearly, is_paid_holiday)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Company Foundation Day', '2024-03-15', true, true),
  ('00000000-0000-0000-0000-000000000001', 'Team Building Day', '2024-07-10', false, true)
ON CONFLICT DO NOTHING;

-- Weekend Configuration for Test User
-- Note: Default trigger will create weekend entries for Saturday and Sunday

-- Add a non-standard weekend day (Friday is a weekend for this user)
INSERT INTO weekend_config (user_id, day_of_week, is_weekend)
VALUES
  ('00000000-0000-0000-0000-000000000001', 5, true)
ON CONFLICT DO NOTHING;

-- Set Monday as a working day (explicitly not a weekend) - just for demonstration
INSERT INTO weekend_config (user_id, day_of_week, is_weekend)
VALUES
  ('00000000-0000-0000-0000-000000000001', 1, false)
ON CONFLICT DO NOTHING; 