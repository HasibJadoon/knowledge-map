-- Notes capture schema (D1/SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ar_capture_notes (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'archived')),
  body_md TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_capture_notes_user_status_updated
  ON ar_capture_notes (user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ar_capture_notes_updated
  ON ar_capture_notes (updated_at DESC);

CREATE TABLE IF NOT EXISTS note_links (
  note_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (note_id, target_type, target_id),
  FOREIGN KEY (note_id) REFERENCES ar_capture_notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_note_links_target_created
  ON note_links (target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_note_links_note_created
  ON note_links (note_id, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('note', 'quran_ayah', 'ar_u_lexicon', 'wv_concept')),
  target_id TEXT NOT NULL,
  body_md TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_comments_target_created
  ON comments (target_type, target_id, created_at DESC);
