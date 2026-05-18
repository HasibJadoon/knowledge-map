-- Quick-capture notes for the planner. Each capture is a TipTap (ProseMirror)
-- document, kept in an inbox until it is triaged into a plan or archived.

CREATE TABLE IF NOT EXISTS pl_capture_notes (
  id            TEXT PRIMARY KEY,
  core_user_ref TEXT NOT NULL,
  core_ws_ref   TEXT,
  status        TEXT NOT NULL DEFAULT 'inbox',   -- 'inbox' | 'archived'
  title         TEXT,
  doc_json      TEXT NOT NULL,                   -- TipTap ProseMirror document JSON
  text          TEXT NOT NULL DEFAULT '',        -- plain-text extraction for previews/search
  meta_json     TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pl_capture_user
  ON pl_capture_notes(core_user_ref);

CREATE INDEX IF NOT EXISTS idx_pl_capture_inbox
  ON pl_capture_notes(core_user_ref, status, created_at);
