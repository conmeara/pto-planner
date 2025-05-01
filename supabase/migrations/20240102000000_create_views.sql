-- Create SQL views for common queries in the PTO Planner

-- Current PTO balances for all users
CREATE OR REPLACE VIEW current_pto_balances AS
SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  COALESCE(SUM(pt.amount), 0) AS current_balance,
  ps.pto_display_unit,
  ps.max_balance,
  ps.carry_over_limit,
  ps.allow_negative_balance
FROM 
  users u
LEFT JOIN 
  pto_settings ps ON u.id = ps.user_id
LEFT JOIN 
  pto_transactions pt ON u.id = pt.user_id
GROUP BY 
  u.id, u.email, u.full_name, ps.pto_display_unit, ps.max_balance, ps.carry_over_limit, ps.allow_negative_balance;

-- PTO usage per month for each user
CREATE OR REPLACE VIEW monthly_pto_usage AS
SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  DATE_TRUNC('month', pd.date)::DATE AS month,
  SUM(pd.amount) AS total_pto_used,
  COUNT(pd.id) AS days_count
FROM 
  users u
LEFT JOIN 
  pto_days pd ON u.id = pd.user_id
WHERE 
  pd.status IN ('taken', 'approved', 'planned')
GROUP BY 
  u.id, u.email, u.full_name, DATE_TRUNC('month', pd.date)::DATE
ORDER BY 
  u.id, month;

-- Upcoming PTO days for each user
CREATE OR REPLACE VIEW upcoming_pto_days AS
SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  pd.date,
  pd.amount,
  pd.status,
  pd.description
FROM 
  users u
JOIN 
  pto_days pd ON u.id = pd.user_id
WHERE 
  pd.date >= CURRENT_DATE
  AND pd.status IN ('planned', 'approved')
ORDER BY 
  u.id, pd.date;

-- Active accrual rules
CREATE OR REPLACE VIEW active_accrual_rules AS
SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  ar.id AS rule_id,
  ar.name,
  ar.accrual_amount,
  ar.accrual_frequency,
  ar.accrual_day,
  ar.effective_date
FROM 
  users u
JOIN 
  pto_accrual_rules ar ON u.id = ar.user_id
WHERE 
  ar.is_active = TRUE
  AND (ar.end_date IS NULL OR ar.end_date >= CURRENT_DATE)
ORDER BY 
  u.id, ar.effective_date DESC;

-- Upcoming holidays including custom holidays
CREATE OR REPLACE VIEW upcoming_holidays AS
SELECT
  user_id,
  name,
  date,
  TRUE AS is_custom,
  is_paid_holiday
FROM
  custom_holidays
WHERE
  date >= CURRENT_DATE OR repeats_yearly = TRUE
ORDER BY
  CASE 
    WHEN date >= CURRENT_DATE THEN date
    ELSE date + INTERVAL '1 year' * CEIL(EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM date))
  END;

-- User's weekend days
CREATE OR REPLACE VIEW user_weekend_days AS
SELECT 
  u.id AS user_id,
  u.email,
  u.full_name,
  wc.day_of_week,
  CASE 
    WHEN wc.day_of_week = 0 THEN 'Sunday'
    WHEN wc.day_of_week = 1 THEN 'Monday'
    WHEN wc.day_of_week = 2 THEN 'Tuesday'
    WHEN wc.day_of_week = 3 THEN 'Wednesday'
    WHEN wc.day_of_week = 4 THEN 'Thursday'
    WHEN wc.day_of_week = 5 THEN 'Friday'
    WHEN wc.day_of_week = 6 THEN 'Saturday'
  END AS day_name,
  wc.is_weekend
FROM 
  users u
JOIN 
  weekend_config wc ON u.id = wc.user_id
ORDER BY 
  u.id, wc.day_of_week; 