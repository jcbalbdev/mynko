-- Run this in the Supabase SQL Editor to add currency exchange support
-- ────────────────────────────────────────────────────────────────────

-- 1. Add columns for exchange records
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS from_currency  TEXT,
  ADD COLUMN IF NOT EXISTS from_amount    NUMERIC,
  ADD COLUMN IF NOT EXISTS exchange_rate  NUMERIC;

-- 2. Allow 'cambio' as a valid type (update CHECK constraint)
--    First drop old constraint, then recreate with new value
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_type_check;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_type_check
  CHECK (type IN ('personal', 'compartido', 'ingreso', 'cambio'));
