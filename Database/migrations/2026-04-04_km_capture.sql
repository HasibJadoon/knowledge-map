-- km_capture: Tiptap-based capture notes
-- Replaces legacy capture_items payload shape with canonical editor_json

CREATE TABLE IF NOT EXISTS km_capture (
  id          TEXT PRIMARY KEY,
  area        TEXT NOT NULL DEFAULT 'quran',  -- 'quran'|'arabic'|'wv'|'vocabulary'
  stage       TEXT NOT NULL DEFAULT 'inbox',  -- 'inbox'|'review'|'done'
  status      TEXT NOT NULL DEFAULT 'draft',  -- 'draft'|'active'|'archived'
  title       TEXT NOT NULL DEFAULT '',
  editor_json TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  plain_text  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_km_capture_area   ON km_capture(area, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_km_capture_stage  ON km_capture(stage, updated_at DESC);
