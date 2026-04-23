PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS ar_capture_notes__next (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('inbox', 'archived', 'draft', 'flag', 'published')),
  body_md TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO ar_capture_notes__next (id, user_id, status, body_md, title, created_at, updated_at)
SELECT
  id,
  user_id,
  CASE
    WHEN lower(trim(status)) = 'published' THEN 'published'
    WHEN lower(trim(status)) = 'flag' THEN 'flag'
    WHEN lower(trim(status)) = 'archived' THEN 'archived'
    WHEN lower(trim(status)) = 'draft' THEN 'draft'
    WHEN lower(trim(status)) = 'inbox' THEN 'inbox'
    ELSE 'inbox'
  END,
  body_md,
  title,
  created_at,
  updated_at
FROM ar_capture_notes;

DROP TABLE ar_capture_notes;
ALTER TABLE ar_capture_notes__next RENAME TO ar_capture_notes;

CREATE INDEX IF NOT EXISTS idx_ar_capture_notes_user_status_updated
  ON ar_capture_notes (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ar_capture_notes_updated
  ON ar_capture_notes (updated_at DESC);

PRAGMA foreign_keys = ON;
