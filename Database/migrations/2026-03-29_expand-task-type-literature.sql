-- 2026-03-29: Expand ar_container_unit_task.task_type CHECK to include
--   vocabulary  → vocabulary-building tasks for Arabic Literature
--   reaction    → podcast/video reaction tasks with OBS/React script
--
-- SQLite requires full table rebuild to change CHECK constraints.

CREATE TABLE IF NOT EXISTS ar_container_unit_task_v3 (
  task_id        TEXT PRIMARY KEY,
  unit_id        TEXT NOT NULL,
  parent_task_id TEXT,

  task_type      TEXT NOT NULL CHECK (task_type IN (
    -- Core Quran passage tasks
    'reading', 'sentence_structure', 'morphology',
    'grammar_concepts', 'expressions', 'comprehension', 'passage_structure',
    -- Quranic linguistics & meaning
    'worldview', 'translation_semantics', 'near_synonyms', 'surah_analysis',
    -- Cross-domain
    'cross_corpus',
    -- Children-specific
    'children_lesson',
    -- Arabic Literature (books, videos, podcasts)
    'vocabulary', 'reaction'
  )),

  task_name      TEXT NOT NULL,
  task_json      JSON NOT NULL CHECK (json_valid(task_json)),

  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ai_generated', 'review', 'approved', 'published', 'archived'
  )),

  version_no     INTEGER NOT NULL DEFAULT 1,
  step_no        INTEGER,
  deleted_at     TEXT,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO ar_container_unit_task_v3
SELECT task_id, unit_id, parent_task_id, task_type, task_name, task_json,
       status, version_no, step_no, deleted_at, created_at, updated_at
FROM ar_container_unit_task;

DROP TABLE ar_container_unit_task;
ALTER TABLE ar_container_unit_task_v3 RENAME TO ar_container_unit_task;

CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_unit
  ON ar_container_unit_task(unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_type
  ON ar_container_unit_task(task_type);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_status
  ON ar_container_unit_task(status);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_parent
  ON ar_container_unit_task(parent_task_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_container_unit_task_root_type_unique
  ON ar_container_unit_task(unit_id, task_type)
  WHERE parent_task_id IS NULL;
