PRAGMA foreign_keys = ON;

--------------------------------------------------------------------------------
-- 4a) WORLDVIEW SOURCE READING LAYER (wv_sources / wv_source_units / wv_notes)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wv_sources (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  user_id          INTEGER,

  source_type      TEXT NOT NULL CHECK (
    source_type IN (
      'book','article','lecture','podcast','video',
      'story','paper','conversation','document','other'
    )
  ),

  title            TEXT NOT NULL,
  subtitle         TEXT,
  creator          TEXT,
  publisher        TEXT,
  publication_year INTEGER CHECK (publication_year IS NULL OR publication_year BETWEEN 1 AND 3000),
  language         TEXT,
  source_url       TEXT,
  source_ref       TEXT,

  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('draft','active','archived')),

  source_json      JSON CHECK (source_json IS NULL OR json_valid(source_json)),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wv_source_units (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  source_id        TEXT NOT NULL,
  parent_unit_id   TEXT,

  unit_type        TEXT NOT NULL CHECK (
    unit_type IN (
      'chapter','section','heading','scene','timestamp',
      'topic','passage','segment','other'
    )
  ),

  title            TEXT,
  order_index      INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),

  start_ref        TEXT,
  end_ref          TEXT,
  anchor_text      TEXT,
  summary          TEXT,

  unit_json        JSON CHECK (unit_json IS NULL OR json_valid(unit_json)),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_unit_id) REFERENCES wv_source_units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wv_notes (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  user_id          INTEGER,
  source_id        TEXT NOT NULL,
  source_unit_id   TEXT,

  note_kind        TEXT NOT NULL CHECK (
    note_kind IN (
      'highlight','quote','summary','reflection','question',
      'claim_seed','insight','observation','reference','todo','idea'
    )
  ),

  title            TEXT,
  body_md          TEXT NOT NULL,
  excerpt_text     TEXT,
  locator          TEXT,

  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('draft','active','archived')),

  note_json        JSON CHECK (note_json IS NULL OR json_valid(note_json)),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (source_id) REFERENCES wv_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wv_note_links (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,

  note_id          TEXT NOT NULL,
  target_type      TEXT NOT NULL CHECK (
    target_type IN (
      'concept','claim','content_item','quran_relation',
      'source','source_unit','note','external','other'
    )
  ),
  target_id        TEXT NOT NULL,
  relation         TEXT NOT NULL CHECK (
    relation IN (
      'supports','questions','distills_to_concept','supports_claim',
      'feeds_content','references_source','references_unit',
      'related_note','about','other'
    )
  ),

  note             TEXT,
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),

  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,

  FOREIGN KEY (note_id) REFERENCES wv_notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wv_sources_user_type
  ON wv_sources(user_id, source_type);
CREATE INDEX IF NOT EXISTS idx_wv_sources_status
  ON wv_sources(status);

CREATE INDEX IF NOT EXISTS idx_wv_source_units_source_parent
  ON wv_source_units(source_id, parent_unit_id, order_index);
CREATE INDEX IF NOT EXISTS idx_wv_source_units_type
  ON wv_source_units(unit_type);

CREATE INDEX IF NOT EXISTS idx_wv_notes_source_unit_kind
  ON wv_notes(source_id, source_unit_id, note_kind);
CREATE INDEX IF NOT EXISTS idx_wv_notes_user_created
  ON wv_notes(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wv_notes_status
  ON wv_notes(status);

CREATE INDEX IF NOT EXISTS idx_wv_note_links_note
  ON wv_note_links(note_id);
CREATE INDEX IF NOT EXISTS idx_wv_note_links_target
  ON wv_note_links(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_wv_note_links_relation
  ON wv_note_links(relation);

CREATE TRIGGER IF NOT EXISTS trg_wv_sources_updated_at
AFTER UPDATE ON wv_sources
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_sources
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_source_units_updated_at
AFTER UPDATE ON wv_source_units
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_source_units
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_notes_updated_at
AFTER UPDATE ON wv_notes
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_notes
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_wv_note_links_updated_at
AFTER UPDATE ON wv_note_links
FOR EACH ROW
WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_note_links
  SET updated_at = datetime('now')
  WHERE id = OLD.id;
END;
