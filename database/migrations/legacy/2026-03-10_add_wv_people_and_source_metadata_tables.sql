PRAGMA foreign_keys = ON;

--------------------------------------------------------------------------------
-- 4b) WORLDVIEW SOURCE PEOPLE / SOURCE DETAIL LAYER
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wv_people (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL,
  sort_name        TEXT,
  person_type      TEXT NOT NULL DEFAULT 'person'
                   CHECK (person_type IN ('person','organization')),
  bio_short        TEXT,
  website_url      TEXT,
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);

CREATE TABLE IF NOT EXISTS wv_source_people (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,
  source_id        TEXT NOT NULL,
  person_id        TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (
    role IN (
      'author','co_author','editor','translator','speaker',
      'host','guest','interviewer','publisher','organization',
      'narrator','reviewer','other'
    )
  ),
  order_index      INTEGER NOT NULL DEFAULT 0,
  is_primary       INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  note             TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES wv_people(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_source_details (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,
  source_id        TEXT NOT NULL,
  detail_key       TEXT NOT NULL,
  detail_value     TEXT,
  order_index      INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  UNIQUE (source_id, detail_key, order_index)
);

CREATE INDEX IF NOT EXISTS idx_wv_people_display_name
  ON wv_people(display_name);

CREATE INDEX IF NOT EXISTS idx_wv_source_people_source
  ON wv_source_people(source_id, role, order_index);

CREATE INDEX IF NOT EXISTS idx_wv_source_people_person
  ON wv_source_people(person_id);

CREATE INDEX IF NOT EXISTS idx_wv_source_details_source
  ON wv_source_details(source_id, detail_key);

CREATE TRIGGER IF NOT EXISTS trg_wv_people_updated_at
AFTER UPDATE ON wv_people
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_people
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_source_people_updated_at
AFTER UPDATE ON wv_source_people
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_source_people
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_source_details_updated_at
AFTER UPDATE ON wv_source_details
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_source_details
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;
