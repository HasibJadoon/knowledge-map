CREATE TABLE IF NOT EXISTS ar_quran_translation_sources (
  source_key   TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  translator   TEXT,
  language     TEXT NOT NULL DEFAULT 'en',
  publisher    TEXT,
  year         INTEGER,
  isbn         TEXT,
  edition      TEXT,
  rights       TEXT,
  source_path  TEXT,
  meta_json    JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT
);

CREATE TABLE IF NOT EXISTS ar_quran_translation_passages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key    TEXT NOT NULL,
  surah         INTEGER NOT NULL,
  ayah_from     INTEGER NOT NULL,
  ayah_to       INTEGER NOT NULL,
  passage_index INTEGER NOT NULL,
  page_pdf      INTEGER,
  page_book     INTEGER,
  text          TEXT,
  meta_json     JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT,
  FOREIGN KEY (source_key) REFERENCES ar_quran_translation_sources(source_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ar_quran_translation_passages_range
  ON ar_quran_translation_passages(source_key, surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_ar_quran_translation_passages_page
  ON ar_quran_translation_passages(source_key, page_book, page_pdf);
