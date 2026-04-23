-- =============================================================================
-- K-MAPS: km_capture upgrade + km_plans + sp_weekly_tasks planner linkage
-- Date: 2026-04-05
-- Spec: K-MAPS PLANNER DB + CAPTURE MODEL (canonical)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. UPGRADE km_capture — add canonical JSON columns
--    (existing columns kept: id, area, stage, status, title,
--     editor_json, plain_text, created_at, updated_at)
-- -----------------------------------------------------------------------------

ALTER TABLE km_capture ADD COLUMN capture_kind  TEXT NOT NULL DEFAULT 'note';
ALTER TABLE km_capture ADD COLUMN content_type  TEXT NOT NULL DEFAULT 'tiptap_doc';
ALTER TABLE km_capture ADD COLUMN editor_doc    JSON;      -- canonical Tiptap doc (mirrors editor_json)
ALTER TABLE km_capture ADD COLUMN source_json   JSON;      -- optional structured payload
ALTER TABLE km_capture ADD COLUMN footnotes     JSON NOT NULL DEFAULT '[]';
ALTER TABLE km_capture ADD COLUMN tags          JSON NOT NULL DEFAULT '[]';
ALTER TABLE km_capture ADD COLUMN sections      JSON NOT NULL DEFAULT '[]';
ALTER TABLE km_capture ADD COLUMN capture_refs  JSON NOT NULL DEFAULT '[]';  -- 'references' is reserved
ALTER TABLE km_capture ADD COLUMN r2_resources  JSON NOT NULL DEFAULT '[]';
ALTER TABLE km_capture ADD COLUMN preview       JSON;
ALTER TABLE km_capture ADD COLUMN target        JSON;
ALTER TABLE km_capture ADD COLUMN created_by    TEXT;
ALTER TABLE km_capture ADD COLUMN updated_by    TEXT;
ALTER TABLE km_capture ADD COLUMN source_kind   TEXT NOT NULL DEFAULT 'manual_capture';
ALTER TABLE km_capture ADD COLUMN autosave_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE km_capture ADD COLUMN schema_version  INTEGER NOT NULL DEFAULT 1;

-- Backfill editor_doc from existing editor_json
UPDATE km_capture
SET editor_doc = editor_json
WHERE editor_doc IS NULL AND editor_json IS NOT NULL;

-- Additional index for capture_kind lookups
CREATE INDEX IF NOT EXISTS idx_km_capture_kind ON km_capture(capture_kind, area, updated_at DESC);

-- =============================================================================
-- 2. km_plans — planner orchestration layer
-- =============================================================================

CREATE TABLE IF NOT EXISTS km_plans (
  id                TEXT PRIMARY KEY,            -- PLAN:01JVPLAN...
  schema_version    INTEGER NOT NULL DEFAULT 1,

  workspace_id      TEXT NOT NULL,
  group_id          TEXT,
  user_id           INTEGER,

  -- Source stream linkage
  source_stream     TEXT NOT NULL CHECK (source_stream IN ('capture', 'ar', 'wv')),
  source_type       TEXT NOT NULL,               -- e.g. 'sp_weekly_tasks', 'ar_unit', 'wv_note'
  source_id         TEXT NOT NULL,               -- ULID or integer stringified
  source_capture_id TEXT,                        -- CAP:... (always if capture exists)

  -- Human-readable plan data
  title             TEXT NOT NULL,
  summary           TEXT,
  notes             TEXT,

  -- Status & priority
  status            TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'inbox', 'refine', 'planned', 'ready', 'activated', 'blocked', 'fed', 'archived'
  )),
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low', 'medium', 'high', 'urgent'
  )),
  effort            TEXT CHECK (effort IN ('small', 'medium', 'large')),

  -- Scheduling
  scheduled_for     TEXT,
  due_at            TEXT,

  -- Execution model
  execution_mode    TEXT NOT NULL DEFAULT 'task_then_feed' CHECK (execution_mode IN (
    'direct_feed', 'task_then_feed'
  )),

  -- JSON payloads
  feed_target_json  JSON CHECK (feed_target_json IS NULL OR json_valid(feed_target_json)),
  plan_json         JSON CHECK (plan_json IS NULL OR json_valid(plan_json)),
  meta_json         JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  -- Audit
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_km_plans_workspace  ON km_plans(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_km_plans_source     ON km_plans(source_stream, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_km_plans_capture    ON km_plans(source_capture_id);
CREATE INDEX IF NOT EXISTS idx_km_plans_schedule   ON km_plans(scheduled_for, due_at);
CREATE INDEX IF NOT EXISTS idx_km_plans_status     ON km_plans(status, priority);

DROP TRIGGER IF EXISTS trg_km_plans_updated_at;
CREATE TRIGGER trg_km_plans_updated_at
AFTER UPDATE ON km_plans
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at OR NEW.updated_at IS NULL
BEGIN
  UPDATE km_plans
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

-- =============================================================================
-- 3. sp_weekly_tasks — add planner linkage columns
-- =============================================================================

ALTER TABLE sp_weekly_tasks ADD COLUMN source_plan_id    TEXT;
ALTER TABLE sp_weekly_tasks ADD COLUMN source_capture_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_plan
  ON sp_weekly_tasks(source_plan_id)
  WHERE source_plan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sp_weekly_tasks_capture
  ON sp_weekly_tasks(source_capture_id)
  WHERE source_capture_id IS NOT NULL;
