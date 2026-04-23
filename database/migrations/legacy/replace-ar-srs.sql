PRAGMA foreign_keys=OFF;

DROP TABLE IF EXISTS ar_srs;
DROP TABLE IF EXISTS ar_srs_reviews;
DROP TABLE IF EXISTS ar_srs_state;
DROP TABLE IF EXISTS ar_srs_items;

CREATE TABLE IF NOT EXISTS ar_srs (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,

  user_id         INTEGER NOT NULL,
  lesson_id       INTEGER,

  item_type       TEXT NOT NULL,   -- verb | noun | idiom | verb_prep | stanza | etc
  item_key        TEXT NOT NULL,   -- your stable key (e.g. "Q:12:1:root:متع" etc)

  -- SINGLE CARD JSON (front+example+morph+back+tags)
  card_json       JSON NOT NULL CHECK (json_valid(card_json)),

  -- scheduler
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','archived')),

  due_at          TEXT NOT NULL,
  last_review_at  TEXT,

  interval_days   REAL NOT NULL DEFAULT 0,
  ease            REAL NOT NULL DEFAULT 2.5,
  reps            INTEGER NOT NULL DEFAULT 0,
  lapses          INTEGER NOT NULL DEFAULT 0,

  again_count     INTEGER NOT NULL DEFAULT 0,
  hard_count      INTEGER NOT NULL DEFAULT 0,
  good_count      INTEGER NOT NULL DEFAULT 0,
  easy_count      INTEGER NOT NULL DEFAULT 0,

  last_rating     TEXT CHECK (last_rating IS NULL OR last_rating IN ('again','hard','good','easy')),
  last_response_ms INTEGER,

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT,

  FOREIGN KEY (user_id)  REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES ar_lessons(id) ON DELETE SET NULL,

  -- prevent duplicates within a user’s collection
  UNIQUE (user_id, item_type, item_key)
);

-- fast queues (review screen)
CREATE INDEX IF NOT EXISTS idx_ar_srs_user_due
  ON ar_srs(user_id, status, due_at);

-- quick filtering
CREATE INDEX IF NOT EXISTS idx_ar_srs_user_lesson
  ON ar_srs(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_ar_srs_type_key
  ON ar_srs(item_type, item_key);

CREATE TRIGGER IF NOT EXISTS trg_ar_srs_updated_at
AFTER UPDATE ON ar_srs
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE ar_srs
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

PRAGMA foreign_keys=ON;
