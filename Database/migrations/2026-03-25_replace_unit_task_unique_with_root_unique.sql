CREATE TABLE IF NOT EXISTS ar_container_unit_task_v3 (
  task_id        TEXT PRIMARY KEY,
  unit_id        TEXT NOT NULL,
  parent_task_id TEXT,

  task_type      TEXT NOT NULL CHECK (task_type IN (
    'reading', 'sentence_structure', 'morphology',
    'grammar_concepts', 'expressions', 'comprehension', 'passage_structure',
    'worldview', 'translation_semantics', 'near_synonyms', 'surah_analysis',
    'cross_corpus',
    'children_lesson'
  )),

  task_name      TEXT NOT NULL,
  task_json      JSON NOT NULL CHECK (json_valid(task_json)),

  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ai_generated', 'review', 'approved', 'published', 'archived'
  )),

  version_no     INTEGER NOT NULL DEFAULT 1,
  deleted_at     TEXT,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO ar_container_unit_task_v3 (
  task_id, unit_id, parent_task_id, task_type, task_name, task_json,
  status, version_no, deleted_at, created_at, updated_at
)
SELECT
  task_id, unit_id, parent_task_id, task_type, task_name, task_json,
  status, version_no, deleted_at, created_at, updated_at
FROM ar_container_unit_task;

DROP TABLE ar_container_unit_task;
ALTER TABLE ar_container_unit_task_v3 RENAME TO ar_container_unit_task;

CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_unit
  ON ar_container_unit_task(unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_parent
  ON ar_container_unit_task(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_type
  ON ar_container_unit_task(task_type);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_status
  ON ar_container_unit_task(status);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_active
  ON ar_container_unit_task(unit_id, task_type)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_container_unit_task_root_type_unique
  ON ar_container_unit_task(unit_id, task_type)
  WHERE parent_task_id IS NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_ar_container_unit_task_updated_at
AFTER UPDATE ON ar_container_unit_task
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_container_unit_task SET updated_at = datetime('now') WHERE task_id = OLD.task_id;
END;
