-- 0011_lane_support_tables.sql
-- Support tables for Lane Arabic-English Lexicon import.
-- All tables use CREATE TABLE IF NOT EXISTS for idempotency.

-- ── ar_ling_source_entry_refs ───────────────────────────────────────────────
-- Preserves Lane external node IDs, parent IDs, raw XML, Buckwalter, and
-- source identity. One row per Lane source node.

CREATE TABLE IF NOT EXISTS ar_ling_source_entry_refs (
  id                      TEXT PRIMARY KEY,
  source_id               TEXT NOT NULL,
  source_chunk_id          TEXT NOT NULL,

  external_node_id         TEXT NOT NULL,
  external_parent_node_id  TEXT,
  external_key             TEXT,
  external_type            TEXT,

  headword_ar              TEXT,
  buck                     TEXT,
  page_no                  INTEGER,

  raw_xml                  TEXT,
  meta_json                TEXT NOT NULL DEFAULT '{}',

  created_at               TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(source_id, external_node_id),
  FOREIGN KEY (source_id)       REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id)
);

CREATE INDEX IF NOT EXISTS idx_arl_ser_source_node
  ON ar_ling_source_entry_refs(source_id, external_node_id);

CREATE INDEX IF NOT EXISTS idx_arl_ser_chunk
  ON ar_ling_source_entry_refs(source_chunk_id);

CREATE INDEX IF NOT EXISTS idx_arl_ser_headword
  ON ar_ling_source_entry_refs(source_id, headword_ar);

CREATE INDEX IF NOT EXISTS idx_arl_ser_buck
  ON ar_ling_source_entry_refs(source_id, buck);

CREATE INDEX IF NOT EXISTS idx_arl_ser_page
  ON ar_ling_source_entry_refs(source_id, page_no);

-- ── ar_ling_source_display_blocks ──────────────────────────────────────────
-- UI-safe display rendering. The UI renders from this table or from
-- ar_ling_lexicon_entries.ui_json, never from raw XML.

CREATE TABLE IF NOT EXISTS ar_ling_source_display_blocks (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  source_chunk_id   TEXT NOT NULL,
  lexicon_entry_id  TEXT,

  block_seq         INTEGER NOT NULL,
  block_type        TEXT NOT NULL,
  lang              TEXT,

  title_ar          TEXT,
  title_en          TEXT,
  text_ar           TEXT,
  text_en           TEXT,

  html_safe         TEXT,
  data_json         TEXT NOT NULL DEFAULT '{}',

  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT,

  UNIQUE(source_chunk_id, block_seq),
  FOREIGN KEY (source_id)        REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id)  REFERENCES ar_ling_source_chunks(id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_arl_sdb_source
  ON ar_ling_source_display_blocks(source_id);

CREATE INDEX IF NOT EXISTS idx_arl_sdb_chunk
  ON ar_ling_source_display_blocks(source_chunk_id, block_seq);

CREATE INDEX IF NOT EXISTS idx_arl_sdb_entry
  ON ar_ling_source_display_blocks(lexicon_entry_id);

CREATE INDEX IF NOT EXISTS idx_arl_sdb_type
  ON ar_ling_source_display_blocks(block_type);

-- ── ar_ling_import_runs ──────────────────────────────────────────────────────
-- Tracks Lane imports and makes re-import safe.

CREATE TABLE IF NOT EXISTS ar_ling_import_runs (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  importer_name     TEXT NOT NULL,
  importer_version  TEXT NOT NULL,
  mode              TEXT NOT NULL,
  status            TEXT NOT NULL,
  started_at        TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at       TEXT,
  stats_json        TEXT NOT NULL DEFAULT '{}',
  error_json        TEXT,
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_arl_import_runs_source
  ON ar_ling_import_runs(source_id, started_at);

CREATE INDEX IF NOT EXISTS idx_arl_import_runs_status
  ON ar_ling_import_runs(status);

-- ── Lane source metadata ─────────────────────────────────────────────────────

INSERT OR IGNORE INTO ar_ling_sources (
  id, title_ar, title_en, source_type, author_name, period_label, note_md
) VALUES (
  'src_lane_lexicon',
  'معجم لين العربي الإنجليزي',
  'Lane Arabic-English Lexicon',
  'lexicon',
  'Edward William Lane',
  'modern / 19th century',
  'Imported from Lane GitHub SQLite/XML source. Raw Lane nodes preserved; parsed entries are derived.'
);

INSERT OR IGNORE INTO ar_ling_source_editions (
  id, source_id, edition_label, publisher, year, volume_count, note_md
) VALUES (
  'ed_lane_github_sqlite',
  'src_lane_lexicon',
  'GitHub SQLite / Perseus-derived Lane Lexicon',
  'Lane Lexicon digital project / Perseus-derived XML',
  NULL,
  NULL,
  'Imported from laneslexicon/lexicon_config lexicon.sqlite.zip.'
);
