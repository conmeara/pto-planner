-- Add hours_per_week column to PTO settings
ALTER TABLE pto_settings
  ADD COLUMN IF NOT EXISTS hours_per_week NUMERIC(5, 2) DEFAULT 40.0;

-- Backfill existing records with default value
UPDATE pto_settings
SET hours_per_week = 40.0
WHERE hours_per_week IS NULL;

