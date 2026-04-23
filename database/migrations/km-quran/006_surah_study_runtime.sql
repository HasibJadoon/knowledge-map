-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS km_quran DB — Surah-centered study runtime
-- File: database/migrations/km-quran/006_surah_study_runtime.sql
--
-- Purpose:
--   Move the Quran study runtime model away from legacy generic
--   ar_container_units / ar_container_unit_task tables while preserving the
--   public API shape consumed by Angular and Ionic.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS qr_surah_study_passages (
  id                    TEXT PRIMARY KEY,           -- QR:SP:{surah}:{ayah_from}-{ayah_to}
  surah                 INTEGER NOT NULL,
  passage_no            INTEGER NOT NULL,
  ayah_from             INTEGER NOT NULL,
  ayah_to               INTEGER NOT NULL,

  -- Public compatibility identifiers returned to existing clients.
  public_unit_id        TEXT NOT NULL UNIQUE,       -- U:C:QURAN:{surah}:{range}
  public_surah_unit_id  TEXT,                       -- U:C:QURAN:{surah}
  legacy_container_id   TEXT,
  legacy_lesson_id      INTEGER,

  label                 TEXT,
  title_en              TEXT,
  title_ar              TEXT,
  subtitle              TEXT,
  theme                 TEXT,
  summary_md            TEXT,
  start_ref             TEXT,
  end_ref               TEXT,
  text_cache            TEXT,
  meta_json             TEXT,
  status                TEXT NOT NULL DEFAULT 'draft',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, passage_no),
  UNIQUE (surah, ayah_from, ayah_to),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrssp_surah
  ON qr_surah_study_passages(surah, passage_no);

CREATE INDEX IF NOT EXISTS idx_qrssp_range
  ON qr_surah_study_passages(surah, ayah_from, ayah_to);

CREATE TABLE IF NOT EXISTS qr_surah_study_steps (
  id                    TEXT PRIMARY KEY,           -- QR:STEP:{surah}:{range}:{step_key}
  passage_id            TEXT NOT NULL,
  step_key              TEXT NOT NULL,              -- reading|morphology|sentence_structure|...
  step_no               INTEGER NOT NULL,
  title                 TEXT,
  title_ar              TEXT,
  intro_task_id         TEXT,                       -- public root task id for compatibility
  status                TEXT NOT NULL DEFAULT 'draft',
  meta_json             TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (passage_id, step_key),
  FOREIGN KEY (passage_id) REFERENCES qr_surah_study_passages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qrsss_passage_order
  ON qr_surah_study_steps(passage_id, step_no);

CREATE TABLE IF NOT EXISTS qr_surah_study_tasks (
  id                    TEXT PRIMARY KEY,
  passage_id            TEXT NOT NULL,
  step_id               TEXT NOT NULL,
  parent_task_id        TEXT,                       -- internal id; currently same as public_task_id

  -- Public compatibility identifier returned to existing clients.
  public_task_id        TEXT NOT NULL UNIQUE,       -- UT:C:QURAN:{surah}:{range}:{code}:{step}

  task_type             TEXT NOT NULL,
  task_name             TEXT,
  step_no               INTEGER,
  status                TEXT NOT NULL DEFAULT 'draft',
  task_json             TEXT,

  source_table          TEXT DEFAULT 'ar_container_unit_task',
  source_id             TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (passage_id) REFERENCES qr_surah_study_passages(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id)    REFERENCES qr_surah_study_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_task_id) REFERENCES qr_surah_study_tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_qrsst_passage_type
  ON qr_surah_study_tasks(passage_id, task_type, step_no);

CREATE INDEX IF NOT EXISTS idx_qrsst_parent
  ON qr_surah_study_tasks(parent_task_id, step_no);

CREATE UNIQUE INDEX IF NOT EXISTS idx_qrsst_root_type_unique
  ON qr_surah_study_tasks(passage_id, task_type)
  WHERE parent_task_id IS NULL;

CREATE VIEW IF NOT EXISTS qr_vw_surah_study_tasks_compat AS
SELECT
  t.public_task_id AS task_id,
  p.public_unit_id AS unit_id,
  parent.public_task_id AS parent_task_id,
  t.task_type,
  t.task_name,
  t.step_no,
  t.status,
  t.task_json,
  t.updated_at,
  t.passage_id,
  t.step_id
FROM qr_surah_study_tasks t
JOIN qr_surah_study_passages p ON p.id = t.passage_id
LEFT JOIN qr_surah_study_tasks parent ON parent.id = t.parent_task_id;
