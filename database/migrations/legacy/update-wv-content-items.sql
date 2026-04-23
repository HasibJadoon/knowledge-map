PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS wv_content_items (
  id TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('podcast_episode', 'youtube_episode', 'article', 'newsletter', 'short', 'slides', 'script', 'study_note', 'note', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'published', 'archived')),
  related_type TEXT,
  related_id TEXT,
  refs_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(refs_json)),
  content_json JSON NOT NULL DEFAULT '{}' CHECK (json_valid(content_json)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wv_content_items_user_type_status
  ON wv_content_items(user_id, content_type, status);

CREATE INDEX IF NOT EXISTS idx_wv_content_items_related
  ON wv_content_items(related_type, related_id);
