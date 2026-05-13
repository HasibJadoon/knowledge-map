-- 0013_lane_repair_tables.sql
--
-- Lane-only repair support. These tables do not reload or replace Lane data.
-- They provide source-page cache metadata, a materialized quality index, and
-- an auditable patch log for source-clean Lane repairs.

CREATE TABLE IF NOT EXISTS ar_ling_lane_source_pages (
  id              TEXT PRIMARY KEY,
  root_text       TEXT NOT NULL,
  root_norm       TEXT NOT NULL,
  source_url      TEXT NOT NULL UNIQUE,
  source_path     TEXT,
  title_ar        TEXT,
  prev_root_text  TEXT,
  next_root_text  TEXT,
  page_refs_json  TEXT CHECK (page_refs_json IS NULL OR json_valid(page_refs_json)),
  html_sha256     TEXT,
  fetched_at      TEXT,
  parsed_at       TEXT,
  parser_version  TEXT,
  parse_status    TEXT NOT NULL DEFAULT 'pending',
  issue_json      TEXT CHECK (issue_json IS NULL OR json_valid(issue_json)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_arl_lane_source_pages_root
  ON ar_ling_lane_source_pages(root_text);

CREATE INDEX IF NOT EXISTS idx_arl_lane_source_pages_norm
  ON ar_ling_lane_source_pages(root_norm);

CREATE INDEX IF NOT EXISTS idx_arl_lane_source_pages_status
  ON ar_ling_lane_source_pages(parse_status);

CREATE TABLE IF NOT EXISTS ar_ling_lane_quality_index (
  lexicon_entry_id          TEXT PRIMARY KEY,
  root_text                 TEXT NOT NULL,
  heading_norm              TEXT,
  display_heading_ar        TEXT,
  page_no                   INTEGER,
  source_entry_seq          INTEGER,

  has_empty_aor             INTEGER NOT NULL DEFAULT 0,
  has_empty_infinitive      INTEGER NOT NULL DEFAULT 0,
  has_empty_synonym         INTEGER NOT NULL DEFAULT 0,
  has_circle_placeholder    INTEGER NOT NULL DEFAULT 0,
  has_form_missing          INTEGER NOT NULL DEFAULT 0,
  has_duplicate_and         INTEGER NOT NULL DEFAULT 0,
  has_bare_cross_ref        INTEGER NOT NULL DEFAULT 0,
  has_orphan_syn            INTEGER NOT NULL DEFAULT 0,
  has_quran_marker          INTEGER NOT NULL DEFAULT 0,
  has_arabic_form_block     INTEGER NOT NULL DEFAULT 0,

  entry_type                TEXT,
  broken_patterns_json      TEXT CHECK (broken_patterns_json IS NULL OR json_valid(broken_patterns_json)),
  repair_priority           INTEGER NOT NULL DEFAULT 0,
  issue_count               INTEGER NOT NULL DEFAULT 0,
  suggested_patch_types_json TEXT CHECK (suggested_patch_types_json IS NULL OR json_valid(suggested_patch_types_json)),

  last_scanned_at           TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_root
  ON ar_ling_lane_quality_index(root_text);

CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_priority
  ON ar_ling_lane_quality_index(repair_priority DESC, page_no, source_entry_seq);

CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_page
  ON ar_ling_lane_quality_index(page_no, source_entry_seq);

CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_aor
  ON ar_ling_lane_quality_index(has_empty_aor);

CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_inf
  ON ar_ling_lane_quality_index(has_empty_infinitive);

CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_syn
  ON ar_ling_lane_quality_index(has_empty_synonym);

CREATE INDEX IF NOT EXISTS idx_arl_lane_quality_missing
  ON ar_ling_lane_quality_index(has_form_missing);

CREATE TABLE IF NOT EXISTS ar_ling_lane_patch_log (
  id                TEXT PRIMARY KEY,

  lexicon_entry_id  TEXT,
  source_chunk_id   TEXT,
  display_block_id  TEXT,

  root_text         TEXT NOT NULL,
  heading_norm      TEXT,
  source_slug       TEXT NOT NULL DEFAULT 'lane_lexicon',

  patch_type        TEXT NOT NULL,
  field_path        TEXT,
  old_value         TEXT,
  new_value         TEXT NOT NULL,

  evidence_url      TEXT,
  evidence_note     TEXT,
  confidence        REAL NOT NULL DEFAULT 0.90,

  status            TEXT NOT NULL DEFAULT 'pending',
  reviewed_by       TEXT,
  reviewed_at       TEXT,
  applied_at        TEXT,

  ai_model          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id),
  FOREIGN KEY (source_chunk_id)  REFERENCES ar_ling_source_chunks(id),
  FOREIGN KEY (display_block_id) REFERENCES ar_ling_source_lexicon_display_blocks(id)
);

CREATE INDEX IF NOT EXISTS idx_arl_lane_patch_entry
  ON ar_ling_lane_patch_log(lexicon_entry_id);

CREATE INDEX IF NOT EXISTS idx_arl_lane_patch_root
  ON ar_ling_lane_patch_log(root_text);

CREATE INDEX IF NOT EXISTS idx_arl_lane_patch_status
  ON ar_ling_lane_patch_log(status);

CREATE INDEX IF NOT EXISTS idx_arl_lane_patch_type
  ON ar_ling_lane_patch_log(patch_type);
