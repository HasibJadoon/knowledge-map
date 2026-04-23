-- Migration: 2026-03-25 — Normalize Quran container hierarchy
--
-- Target model:
--   ar_containers.id       = C:QURAN
--   ar_container_units.id  = U:C:QURAN:{surah}
--   ar_container_units.id  = U:C:QURAN:{surah}:{ayah_from}-{ayah_to}
--
-- This migration also adds parent_unit_id so Surah -> Passage -> Ayah
-- hierarchy can be represented directly in ar_container_units.

ALTER TABLE ar_container_units ADD COLUMN parent_unit_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ar_container_units_parent_unit_id
  ON ar_container_units(parent_unit_id);

CREATE INDEX IF NOT EXISTS idx_ar_container_units_parent_unit_order
  ON ar_container_units(parent_unit_id, unit_type, order_index);

INSERT OR IGNORE INTO ar_containers (
  id, container_type, container_key, title, meta_json, created_at, updated_at
) VALUES (
  'C:QURAN',
  'quran',
  'quran',
  'Quran',
  json_object('source', 'normalized-quran-container', 'kind', 'quran'),
  datetime('now'),
  datetime('now')
);

UPDATE ar_containers
SET
  container_type = 'quran',
  container_key = 'quran',
  title = 'Quran',
  updated_at = datetime('now')
WHERE id = 'C:QURAN';

INSERT OR REPLACE INTO ar_container_units (
  id, container_id, parent_unit_id, unit_type, order_index, ayah_from, ayah_to,
  start_ref, end_ref, text_cache, meta_json, created_at, updated_at, surah, surah_ref
)
SELECT
  'U:C:QURAN:12',
  'C:QURAN',
  NULL,
  'surah',
  12,
  1,
  COALESCE((SELECT ayah_count FROM ar_quran_surahs WHERE surah = 12), 111),
  '12:1',
  '12:' || COALESCE((SELECT ayah_count FROM ar_quran_surahs WHERE surah = 12), 111),
  NULL,
  json_set(
    COALESCE(c.meta_json, '{}'),
    '$.title', COALESCE(json_extract(c.meta_json, '$.title'), c.title),
    '$.name_ar', COALESCE(json_extract(c.meta_json, '$.name_ar'), (SELECT name_ar FROM ar_quran_surahs WHERE surah = 12)),
    '$.name_en', COALESCE(json_extract(c.meta_json, '$.name_en'), (SELECT name_en FROM ar_quran_surahs WHERE surah = 12)),
    '$.surah', 12
  ),
  COALESCE(c.created_at, datetime('now')),
  datetime('now'),
  12,
  '12'
FROM ar_containers c
WHERE c.id = 'C:QURAN:12';

INSERT OR REPLACE INTO ar_container_units (
  id, container_id, parent_unit_id, unit_type, order_index, ayah_from, ayah_to,
  start_ref, end_ref, text_cache, meta_json, created_at, updated_at, surah, surah_ref
)
SELECT
  'U:C:QURAN:30',
  'C:QURAN',
  NULL,
  'surah',
  30,
  1,
  COALESCE((SELECT ayah_count FROM ar_quran_surahs WHERE surah = 30), 60),
  '30:1',
  '30:' || COALESCE((SELECT ayah_count FROM ar_quran_surahs WHERE surah = 30), 60),
  NULL,
  json_set(
    COALESCE(c.meta_json, '{}'),
    '$.title', COALESCE(json_extract(c.meta_json, '$.title'), json_extract(c.meta_json, '$.title_en'), c.title),
    '$.name_ar', COALESCE(json_extract(c.meta_json, '$.name_ar'), (SELECT name_ar FROM ar_quran_surahs WHERE surah = 30)),
    '$.name_en', COALESCE(json_extract(c.meta_json, '$.name_en'), json_extract(c.meta_json, '$.title_en'), (SELECT name_en FROM ar_quran_surahs WHERE surah = 30)),
    '$.surah', 30
  ),
  COALESCE(c.created_at, datetime('now')),
  datetime('now'),
  30,
  '30'
FROM ar_containers c
WHERE c.id = 'C:QURAN:30';

INSERT OR REPLACE INTO ar_container_units (
  id, container_id, parent_unit_id, unit_type, order_index, ayah_from, ayah_to,
  start_ref, end_ref, text_cache, meta_json, created_at, updated_at, surah, surah_ref
)
SELECT
  'U:C:QURAN:12:1-7',
  'C:QURAN',
  'U:C:QURAN:12',
  'passage',
  COALESCE(u.order_index, 1),
  u.ayah_from,
  u.ayah_to,
  u.start_ref,
  u.end_ref,
  u.text_cache,
  u.meta_json,
  COALESCE(u.created_at, datetime('now')),
  datetime('now'),
  12,
  COALESCE(u.surah_ref, '12:1-7')
FROM ar_container_units u
WHERE u.id = 'U:C:QURAN:12:12:1-7';

INSERT OR REPLACE INTO ar_container_units (
  id, container_id, parent_unit_id, unit_type, order_index, ayah_from, ayah_to,
  start_ref, end_ref, text_cache, meta_json, created_at, updated_at, surah, surah_ref
)
SELECT
  'U:C:QURAN:30:2-6',
  'C:QURAN',
  'U:C:QURAN:30',
  'passage',
  COALESCE(u.order_index, 1),
  u.ayah_from,
  u.ayah_to,
  u.start_ref,
  u.end_ref,
  u.text_cache,
  u.meta_json,
  COALESCE(u.created_at, datetime('now')),
  datetime('now'),
  30,
  COALESCE(u.surah_ref, '30:2-6')
FROM ar_container_units u
WHERE u.id = 'U:C:QURAN:30:30:2-6';

INSERT OR REPLACE INTO ar_container_units (
  id, container_id, parent_unit_id, unit_type, order_index, ayah_from, ayah_to,
  start_ref, end_ref, text_cache, meta_json, created_at, updated_at, surah, surah_ref
)
SELECT
  'U:C:QURAN:12:' || a.ayah,
  'C:QURAN',
  'U:C:QURAN:12:1-7',
  'ayah',
  a.ayah,
  a.ayah,
  a.ayah,
  '12:' || a.ayah,
  '12:' || a.ayah,
  a.text,
  json_object('source', 'normalized-quran-unit', 'unit_type', 'ayah'),
  datetime('now'),
  datetime('now'),
  12,
  '12:' || a.ayah
FROM ar_quran_ayah a
WHERE a.surah = 12
  AND a.ayah BETWEEN 1 AND 7;

INSERT OR REPLACE INTO ar_container_units (
  id, container_id, parent_unit_id, unit_type, order_index, ayah_from, ayah_to,
  start_ref, end_ref, text_cache, meta_json, created_at, updated_at, surah, surah_ref
)
SELECT
  'U:C:QURAN:30:' || a.ayah,
  'C:QURAN',
  'U:C:QURAN:30:2-6',
  'ayah',
  a.ayah,
  a.ayah,
  a.ayah,
  '30:' || a.ayah,
  '30:' || a.ayah,
  a.text,
  json_object('source', 'normalized-quran-unit', 'unit_type', 'ayah'),
  datetime('now'),
  datetime('now'),
  30,
  '30:' || a.ayah
FROM ar_quran_ayah a
WHERE a.surah = 30
  AND a.ayah BETWEEN 2 AND 6;

UPDATE ar_lessons
SET
  container_id = 'C:QURAN',
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END,
  updated_at = datetime('now')
WHERE container_id IN ('C:QURAN:12', 'C:QURAN:30')
   OR unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

UPDATE ar_lesson_unit_link
SET
  container_id = 'C:QURAN',
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END
WHERE container_id IN ('C:QURAN:12', 'C:QURAN:30')
   OR unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

UPDATE ar_lesson_unit_progress
SET
  container_id = 'C:QURAN',
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END
WHERE container_id IN ('C:QURAN:12', 'C:QURAN:30')
   OR unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

UPDATE ar_note_targets
SET
  container_id = CASE
    WHEN container_id IN ('C:QURAN:12', 'C:QURAN:30') THEN 'C:QURAN'
    ELSE container_id
  END,
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END
WHERE container_id IN ('C:QURAN:12', 'C:QURAN:30')
   OR unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

UPDATE ar_occ_token
SET
  container_id = CASE
    WHEN container_id IN ('C:QURAN:12', 'C:QURAN:30') THEN 'C:QURAN'
    ELSE container_id
  END,
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END,
  updated_at = datetime('now')
WHERE container_id IN ('C:QURAN:12', 'C:QURAN:30')
   OR unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

UPDATE ar_occ_sentence
SET
  container_id = CASE
    WHEN container_id IN ('C:QURAN:12', 'C:QURAN:30') THEN 'C:QURAN'
    ELSE container_id
  END,
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END,
  updated_at = datetime('now')
WHERE container_id IN ('C:QURAN:12', 'C:QURAN:30')
   OR unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

UPDATE ar_occ_grammar
SET
  container_id = CASE
    WHEN container_id IN ('C:QURAN:12', 'C:QURAN:30') THEN 'C:QURAN'
    ELSE container_id
  END,
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END,
  updated_at = datetime('now')
WHERE container_id IN ('C:QURAN:12', 'C:QURAN:30')
   OR unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

UPDATE ar_token_pair_links
SET
  container_id = CASE
    WHEN container_id IN ('C:QURAN:12', 'C:QURAN:30') THEN 'C:QURAN'
    ELSE container_id
  END,
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END,
  updated_at = datetime('now')
WHERE container_id IN ('C:QURAN:12', 'C:QURAN:30')
   OR unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

UPDATE ar_container_unit_task
SET
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END,
  updated_at = datetime('now')
WHERE unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

UPDATE ar_quran_surah_passage
SET
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END,
  updated_at = datetime('now')
WHERE unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

UPDATE ui_passage_diagrams
SET
  unit_id = CASE unit_id
    WHEN 'U:C:QURAN:12:12:1-7' THEN 'U:C:QURAN:12:1-7'
    WHEN 'U:C:QURAN:30:30:2-6' THEN 'U:C:QURAN:30:2-6'
    ELSE unit_id
  END,
  updated_at = datetime('now')
WHERE unit_id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

DELETE FROM ar_container_units
WHERE id IN ('U:C:QURAN:12:12:1-7', 'U:C:QURAN:30:30:2-6');

DELETE FROM ar_containers
WHERE id IN ('C:QURAN:12', 'C:QURAN:30');
