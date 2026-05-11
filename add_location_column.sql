-- Run this in the Supabase SQL Editor to add the optional location field
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS location TEXT;
