-- ══════════════════════════════════════════════════════════
-- fix_duplicate_subcategories.sql
-- 1. Reassign expenses from duplicate subcategories to the
--    oldest (canonical) record for that name+parent+user.
-- 2. Delete the duplicate rows.
-- 3. Add a unique index to prevent future duplicates.
-- ══════════════════════════════════════════════════════════

-- Step 1: Reasignar gastos que apuntan al duplicado → apuntan al original
WITH ranked AS (
  SELECT
    id,
    user_id,
    name,
    parent_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, LOWER(name), parent_id
      ORDER BY created_at ASC
    ) AS rn
  FROM user_categories
),
keepers AS (
  SELECT
    r_keep.id   AS keep_id,
    r_dup.id    AS dup_id
  FROM ranked r_keep
  JOIN ranked r_dup
    ON  r_keep.user_id   = r_dup.user_id
    AND LOWER(r_keep.name) = LOWER(r_dup.name)
    AND r_keep.parent_id = r_dup.parent_id
    AND r_keep.rn = 1
    AND r_dup.rn  > 1
)
UPDATE expenses
SET category = k.keep_id::text
FROM keepers k
WHERE expenses.category = k.dup_id::text;

-- Step 2: Eliminar los duplicados (mantiene el más antiguo de cada grupo)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, LOWER(name), parent_id
      ORDER BY created_at ASC
    ) AS rn
  FROM user_categories
)
DELETE FROM user_categories
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 3: Índice único case-insensitive para evitar futuros duplicados
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_subcat
  ON user_categories (user_id, LOWER(name), parent_id);
