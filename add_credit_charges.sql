-- ══════════════════════════════════════
-- HappyWallet — Tabla de consumos de tarjeta de crédito
-- Ejecutar en Supabase SQL Editor
-- ══════════════════════════════════════

-- 1. Tabla de consumos (cargos a tarjetas de crédito)
CREATE TABLE IF NOT EXISTS credit_charges (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES auth.users NOT NULL,
  account_id         UUID REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  amount             NUMERIC(14,2) NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'PEN',
  installments       INTEGER NOT NULL DEFAULT 1,
  installment_amount NUMERIC(14,2),
  date               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE credit_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own credit_charges"
  ON credit_charges FOR ALL
  USING (auth.uid() = user_id);

-- 2. Columna en expenses para vincular pagos a una tarjeta de crédito
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS credit_account_id UUID REFERENCES accounts(id);
