-- ============================================================
-- PHASE 7: CANONICAL SUBJECT NORMALIZATION
-- ============================================================

-- 1. Create a mapping of duplicate subjects to a single canonical subject per normalized name.
-- We use a CTE to rank subjects by created_at, then id, so we deterministically pick ONE canonical subject.
WITH ranked_subjects AS (
  SELECT 
    id,
    user_id,
    lower(btrim(name)) AS norm_name,
    ROW_NUMBER() OVER(PARTITION BY user_id, lower(btrim(name)) ORDER BY created_at ASC, id ASC) as rn
  FROM subjects
),
canonical_mapping AS (
  SELECT 
    dup.id AS duplicate_id,
    can.id AS canonical_id
  FROM ranked_subjects dup
  JOIN ranked_subjects can 
    ON dup.user_id = can.user_id 
    AND dup.norm_name = can.norm_name 
    AND can.rn = 1
  WHERE dup.rn > 1
)
-- 2. Update all study sessions pointing to duplicate subjects to point to the canonical subject instead.
UPDATE study_sessions ss
SET subject_id = cm.canonical_id
FROM canonical_mapping cm
WHERE ss.subject_id = cm.duplicate_id;

-- 3. Delete the duplicate subjects safely, as they are no longer referenced.
WITH ranked_subjects AS (
  SELECT 
    id,
    user_id,
    lower(btrim(name)) AS norm_name,
    ROW_NUMBER() OVER(PARTITION BY user_id, lower(btrim(name)) ORDER BY created_at ASC, id ASC) as rn
  FROM subjects
)
DELETE FROM subjects
WHERE id IN (
  SELECT id FROM ranked_subjects WHERE rn > 1
);

-- 4. Add the generated normalized column.
ALTER TABLE subjects 
ADD COLUMN name_normalized TEXT GENERATED ALWAYS AS (lower(btrim(name))) STORED;

-- 5. Add the robust unique constraint.
ALTER TABLE subjects 
ADD CONSTRAINT unique_user_subject_normalized UNIQUE(user_id, name_normalized);
