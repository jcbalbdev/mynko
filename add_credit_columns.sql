-- ══════════════════════════════════════
-- HappyWallet — Columnas para cuentas de crédito
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS is_credit    boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_limit numeric(14,2),
  ADD COLUMN IF NOT EXISTS cut_day      integer       CHECK (cut_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS payment_day  integer       CHECK (payment_day BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS tcea         numeric(8,4);
