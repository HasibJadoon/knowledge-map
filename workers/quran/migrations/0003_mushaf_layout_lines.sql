-- Mushaf page layout lines generated from the QUL KFGQPC V2 layout
-- in data/quran-layouts/digital-khatt-15-lines.db plus QPC V2 page tokens.

CREATE TABLE IF NOT EXISTS qr_mushaf_layout_lines (
  id              TEXT PRIMARY KEY,
  layout_key      TEXT NOT NULL,
  page_number     INTEGER NOT NULL,
  line_number     INTEGER NOT NULL,
  line_type       TEXT NOT NULL CHECK (line_type IN ('ayah', 'surah_name', 'basmallah')),
  is_centered     INTEGER NOT NULL DEFAULT 0 CHECK (is_centered IN (0, 1)),
  first_token_id  INTEGER,
  last_token_id   INTEGER,
  surah_number    INTEGER,
  text_qpc_hafs   TEXT NOT NULL DEFAULT '',
  tokens_json     TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tokens_json)),
  refs_json       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(refs_json)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (layout_key, page_number, line_number)
);

CREATE INDEX IF NOT EXISTS idx_qr_mushaf_layout_page
  ON qr_mushaf_layout_lines(layout_key, page_number, line_number);

CREATE INDEX IF NOT EXISTS idx_qr_mushaf_layout_surah
  ON qr_mushaf_layout_lines(layout_key, surah_number);
