-- Allow planned PTO inserts even when the current balance is zero.
-- Balance checks now only apply when PTO is approved or taken.
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

  -- Only enforce balance limits when PTO actually consumes balance
  IF p_status IN ('approved', 'taken') THEN
    IF NOT v_allow_negative AND (v_current_balance - p_amount) < 0 THEN
      RAISE EXCEPTION 'Insufficient PTO balance';
    END IF;
  END IF;

  -- Insert the PTO day
  INSERT INTO pto_days (user_id, date, amount, status, description)
  VALUES (p_user_id, p_date, p_amount, p_status, p_description)
  RETURNING id INTO v_pto_day_id;

  -- Only create a transaction for approved or taken PTO
  IF p_status IN ('approved', 'taken') THEN
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
