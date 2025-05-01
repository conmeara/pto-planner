-- Create stored procedures for common PTO operations

-- Function to add PTO day and create corresponding transaction
CREATE OR REPLACE FUNCTION add_pto_day(
  p_user_id UUID,
  p_date DATE,
  p_amount NUMERIC,
  p_status TEXT DEFAULT 'planned',
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pto_day_id UUID;
  v_current_balance NUMERIC;
  v_max_balance NUMERIC;
  v_allow_negative BOOLEAN;
BEGIN
  -- Check if date already has PTO
  IF EXISTS (SELECT 1 FROM pto_days WHERE user_id = p_user_id AND date = p_date) THEN
    RAISE EXCEPTION 'PTO already exists for this date';
  END IF;

  -- Get current settings and balance
  SELECT 
    current_balance, 
    max_balance, 
    allow_negative_balance 
  INTO 
    v_current_balance, 
    v_max_balance, 
    v_allow_negative
  FROM 
    current_pto_balances 
  WHERE 
    user_id = p_user_id;

  -- Check if user has enough balance
  IF NOT v_allow_negative AND (v_current_balance - p_amount) < 0 THEN
    RAISE EXCEPTION 'Insufficient PTO balance';
  END IF;

  -- Insert the PTO day
  INSERT INTO pto_days (user_id, date, amount, status, description)
  VALUES (p_user_id, p_date, p_amount, p_status, p_description)
  RETURNING id INTO v_pto_day_id;

  -- Only create a transaction for approved or taken PTO
  IF p_status IN ('approved', 'taken') THEN
    -- Create the transaction
    INSERT INTO pto_transactions (
      user_id,
      transaction_date,
      amount,
      transaction_type,
      description,
      reference_id
    ) VALUES (
      p_user_id,
      p_date,
      -p_amount, -- Negative amount for usage
      'usage',
      COALESCE(p_description, 'PTO day'),
      v_pto_day_id
    );
  END IF;

  RETURN v_pto_day_id;
END;
$$;

-- Function to update PTO day status
CREATE OR REPLACE FUNCTION update_pto_day_status(
  p_pto_day_id UUID,
  p_new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
  v_amount NUMERIC;
  v_old_status TEXT;
  v_description TEXT;
BEGIN
  -- Get current PTO day information
  SELECT 
    user_id, 
    date, 
    amount, 
    status,
    description
  INTO 
    v_user_id, 
    v_date, 
    v_amount, 
    v_old_status,
    v_description
  FROM 
    pto_days 
  WHERE 
    id = p_pto_day_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PTO day not found';
  END IF;

  -- Update the status
  UPDATE pto_days
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_pto_day_id;

  -- Handle transactions based on status change
  IF v_old_status NOT IN ('approved', 'taken') AND p_new_status IN ('approved', 'taken') THEN
    -- Create a new transaction record for approved/taken
    INSERT INTO pto_transactions (
      user_id,
      transaction_date,
      amount,
      transaction_type,
      description,
      reference_id
    ) VALUES (
      v_user_id,
      v_date,
      -v_amount, -- Negative amount for usage
      'usage',
      COALESCE(v_description, 'PTO day'),
      p_pto_day_id
    );
  ELSIF v_old_status IN ('approved', 'taken') AND p_new_status NOT IN ('approved', 'taken') THEN
    -- Remove transaction if PTO is no longer approved/taken
    DELETE FROM pto_transactions
    WHERE reference_id = p_pto_day_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Function to delete PTO day
CREATE OR REPLACE FUNCTION delete_pto_day(
  p_pto_day_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
BEGIN
  -- Get current PTO day information
  SELECT 
    user_id, 
    status
  INTO 
    v_user_id, 
    v_status
  FROM 
    pto_days 
  WHERE 
    id = p_pto_day_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PTO day not found';
  END IF;

  -- Remove associated transaction if exists
  DELETE FROM pto_transactions
  WHERE reference_id = p_pto_day_id;

  -- Delete the PTO day
  DELETE FROM pto_days
  WHERE id = p_pto_day_id;

  RETURN TRUE;
END;
$$;

-- Function to add accrual rule
CREATE OR REPLACE FUNCTION add_accrual_rule(
  p_user_id UUID,
  p_name TEXT,
  p_accrual_amount NUMERIC,
  p_accrual_frequency TEXT,
  p_accrual_day INTEGER DEFAULT NULL,
  p_effective_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule_id UUID;
BEGIN
  -- Validate accrual frequency
  IF p_accrual_frequency NOT IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid accrual frequency';
  END IF;

  -- Insert the accrual rule
  INSERT INTO pto_accrual_rules (
    user_id,
    name,
    accrual_amount,
    accrual_frequency,
    accrual_day,
    effective_date,
    end_date,
    is_active
  ) VALUES (
    p_user_id,
    p_name,
    p_accrual_amount,
    p_accrual_frequency,
    p_accrual_day,
    p_effective_date,
    p_end_date,
    TRUE
  ) RETURNING id INTO v_rule_id;

  RETURN v_rule_id;
END;
$$;

-- Function to calculate PTO accrual
CREATE OR REPLACE FUNCTION calculate_pto_accrual(
  p_user_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  rule_id UUID,
  accrual_date DATE,
  accrual_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule RECORD;
  v_current_date DATE;
  v_accrual_date DATE;
  v_rule_start_date DATE;
BEGIN
  -- Loop through each active accrual rule
  FOR v_rule IN 
    SELECT *
    FROM pto_accrual_rules
    WHERE user_id = p_user_id
      AND is_active = TRUE
      AND effective_date <= p_end_date
      AND (end_date IS NULL OR end_date >= p_start_date)
  LOOP
    -- Set the starting point for calculation
    v_rule_start_date := GREATEST(v_rule.effective_date, p_start_date);
    v_current_date := v_rule_start_date;
    
    -- Calculate accrual dates based on frequency
    WHILE v_current_date <= p_end_date LOOP
      CASE v_rule.accrual_frequency
        WHEN 'daily' THEN
          rule_id := v_rule.id;
          accrual_date := v_current_date;
          accrual_amount := v_rule.accrual_amount;
          RETURN NEXT;
          v_current_date := v_current_date + INTERVAL '1 day';
          
        WHEN 'weekly' THEN
          -- If accrual_day is set (0-6), check if current date is that day of week
          IF v_rule.accrual_day IS NULL OR EXTRACT(DOW FROM v_current_date) = v_rule.accrual_day THEN
            IF EXTRACT(DOW FROM v_current_date) = COALESCE(v_rule.accrual_day, 1) THEN
              rule_id := v_rule.id;
              accrual_date := v_current_date;
              accrual_amount := v_rule.accrual_amount;
              RETURN NEXT;
            END IF;
          END IF;
          v_current_date := v_current_date + INTERVAL '1 day';
          
        WHEN 'biweekly' THEN
          -- Calculate if this is a biweekly date (every other Monday by default)
          IF EXTRACT(DOW FROM v_current_date) = COALESCE(v_rule.accrual_day, 1) AND 
             EXTRACT(WEEK FROM v_current_date) % 2 = 0 THEN
            rule_id := v_rule.id;
            accrual_date := v_current_date;
            accrual_amount := v_rule.accrual_amount;
            RETURN NEXT;
          END IF;
          v_current_date := v_current_date + INTERVAL '1 day';
          
        WHEN 'monthly' THEN
          -- If accrual_day is set (1-31), check if current date matches
          IF EXTRACT(DAY FROM v_current_date) = COALESCE(v_rule.accrual_day, 1) THEN
            rule_id := v_rule.id;
            accrual_date := v_current_date;
            accrual_amount := v_rule.accrual_amount;
            RETURN NEXT;
          END IF;
          v_current_date := v_current_date + INTERVAL '1 day';
          
        WHEN 'yearly' THEN
          -- Special case - need to check month and day
          IF (EXTRACT(MONTH FROM v_current_date) = EXTRACT(MONTH FROM v_rule.effective_date) AND
              EXTRACT(DAY FROM v_current_date) = EXTRACT(DAY FROM v_rule.effective_date)) THEN
            rule_id := v_rule.id;
            accrual_date := v_current_date;
            accrual_amount := v_rule.accrual_amount;
            RETURN NEXT;
          END IF;
          v_current_date := v_current_date + INTERVAL '1 day';
          
        ELSE
          -- Invalid frequency
          RAISE EXCEPTION 'Invalid accrual frequency: %', v_rule.accrual_frequency;
      END CASE;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$;

-- Function to process PTO accruals
CREATE OR REPLACE FUNCTION process_pto_accruals(
  p_user_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_accrual RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Calculate accruals
  FOR v_accrual IN 
    SELECT * FROM calculate_pto_accrual(p_user_id, p_start_date, p_end_date)
  LOOP
    -- Check if transaction already exists for this accrual
    IF NOT EXISTS (
      SELECT 1 
      FROM pto_transactions 
      WHERE user_id = p_user_id 
        AND DATE(transaction_date) = v_accrual.accrual_date
        AND transaction_type = 'accrual'
        AND reference_id = v_accrual.rule_id::text::uuid
    ) THEN
      -- Insert the transaction
      INSERT INTO pto_transactions (
        user_id,
        transaction_date,
        amount,
        transaction_type,
        description,
        reference_id
      ) VALUES (
        p_user_id,
        v_accrual.accrual_date,
        v_accrual.accrual_amount,
        'accrual',
        (SELECT name FROM pto_accrual_rules WHERE id = v_accrual.rule_id),
        v_accrual.rule_id
      );
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Function to add custom holiday
CREATE OR REPLACE FUNCTION add_custom_holiday(
  p_user_id UUID,
  p_name TEXT,
  p_date DATE,
  p_repeats_yearly BOOLEAN DEFAULT FALSE,
  p_is_paid_holiday BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_holiday_id UUID;
BEGIN
  -- Insert the custom holiday
  INSERT INTO custom_holidays (
    user_id,
    name,
    date,
    repeats_yearly,
    is_paid_holiday
  ) VALUES (
    p_user_id,
    p_name,
    p_date,
    p_repeats_yearly,
    p_is_paid_holiday
  ) RETURNING id INTO v_holiday_id;

  RETURN v_holiday_id;
END;
$$;

-- Function to update weekend configuration
CREATE OR REPLACE FUNCTION update_weekend_config(
  p_user_id UUID,
  p_day_of_week INTEGER,
  p_is_weekend BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate day of week
  IF p_day_of_week < 0 OR p_day_of_week > 6 THEN
    RAISE EXCEPTION 'Invalid day of week. Must be between 0 (Sunday) and 6 (Saturday)';
  END IF;

  -- Insert or update weekend configuration
  INSERT INTO weekend_config (user_id, day_of_week, is_weekend)
  VALUES (p_user_id, p_day_of_week, p_is_weekend)
  ON CONFLICT (user_id, day_of_week) 
  DO UPDATE SET is_weekend = p_is_weekend, updated_at = now();

  RETURN TRUE;
END;
$$; 