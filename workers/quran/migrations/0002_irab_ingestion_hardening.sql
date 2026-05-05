-- Harden QUL/OpenITI i'rab ingestion with source chunk provenance,
-- parser audit rows, import quarantine rows, and entry-level fields.

CREATE TABLE IF NOT EXISTS qr_irab_sources (
  id TEXT PRIMARY KEY,
  source_slug TEXT NOT NULL UNIQUE,
  source_title_ar TEXT,
  source_title_en TEXT,
  source_kind TEXT NOT NULL DEFAULT 'irab_book',
  source_version TEXT,
  source_downloaded_at TEXT,
  source_file_hash TEXT,
  source_file_size INTEGER,
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qr_irab_source_chunks (
  id TEXT PRIMARY KEY,
  extraction_run_id TEXT,
  source_id TEXT,
  source_slug TEXT NOT NULL,
  source_record_id TEXT,
  ayah_key TEXT,
  group_ayah_key TEXT,
  from_ayah TEXT,
  to_ayah TEXT,
  ayah_keys TEXT,
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  section_kind TEXT NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,
  content_format TEXT NOT NULL DEFAULT 'text',
  raw_html TEXT,
  raw_text TEXT,
  clean_text TEXT,
  source_record_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(source_slug, source_record_id, section_kind, section_order)
);

CREATE INDEX IF NOT EXISTS idx_qr_irab_source_chunks_source
  ON qr_irab_source_chunks(source_slug);
CREATE INDEX IF NOT EXISTS idx_qr_irab_source_chunks_section
  ON qr_irab_source_chunks(section_kind);
CREATE INDEX IF NOT EXISTS idx_qr_irab_source_chunks_ayah
  ON qr_irab_source_chunks(surah, ayah_from, ayah_to);

CREATE TABLE IF NOT EXISTS qr_irab_extraction_runs (
  id TEXT PRIMARY KEY,
  source_slug TEXT NOT NULL,
  resource_id INTEGER,
  input_path TEXT,
  parser_version TEXT,
  started_at TEXT,
  finished_at TEXT,
  status TEXT,
  records_read INTEGER DEFAULT 0,
  chunks_created INTEGER DEFAULT 0,
  entries_created INTEGER DEFAULT 0,
  entries_linked INTEGER DEFAULT 0,
  entries_unmapped INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS qr_irab_import_errors (
  id TEXT PRIMARY KEY,
  extraction_run_id TEXT,
  source_slug TEXT,
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  source_chunk_id TEXT,
  error_type TEXT,
  error_message TEXT,
  raw_fragment TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qr_irab_book_entries_v2 (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  source_slug TEXT NOT NULL,
  source_title TEXT,
  ayah_key TEXT NOT NULL,
  group_ayah_key TEXT,
  from_ayah TEXT,
  to_ayah TEXT,
  ayah_keys TEXT,
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  entry_html TEXT,
  irab_text TEXT,
  source_chunk_id TEXT,
  entry_order INTEGER,
  source_quote_ar TEXT,
  source_quote_hash TEXT NOT NULL DEFAULT '',
  irab_text_ar TEXT,
  target_text_ar TEXT,
  target_text_bare TEXT,
  target_text_match_key TEXT,
  grammar_role_ar TEXT,
  grammar_role_norm TEXT,
  grammar_case_ar TEXT,
  mahal_ar TEXT,
  grammar_concept_ref TEXT,
  syntax_relation_ref TEXT,
  case_concept_ref TEXT,
  mahal_concept_ref TEXT,
  alternative_json TEXT,
  inline_note_ar TEXT,
  raw_annotation_ar TEXT,
  word_occurrence_id TEXT,
  word_link_status TEXT DEFAULT 'pending',
  word_link_note TEXT,
  promotion_candidate_json TEXT,
  al_mapping_status TEXT DEFAULT 'pending',
  al_mapping_confidence REAL,
  al_mapping_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO qr_irab_book_entries_v2 (
  id, source_id, source_slug, source_title, ayah_key, group_ayah_key,
  from_ayah, to_ayah, ayah_keys, surah, ayah_from, ayah_to,
  entry_html, irab_text, source_quote_ar, source_quote_hash, irab_text_ar,
  grammar_role_ar, grammar_role_norm, grammar_concept_ref, syntax_relation_ref,
  case_concept_ref, mahal_concept_ref, al_mapping_status, al_mapping_confidence,
  al_mapping_note, created_at, updated_at
)
SELECT
  id, source_id, source_slug, source_title, ayah_key, group_ayah_key,
  from_ayah, to_ayah, ayah_keys, surah, ayah_from, ayah_to,
  entry_html, irab_text, irab_text, lower(hex(randomblob(16))), irab_text,
  grammar_role_ar, grammar_role_norm, grammar_concept_ref, syntax_relation_ref,
  case_concept_ref, mahal_concept_ref, al_mapping_status, al_mapping_confidence,
  al_mapping_note, created_at, updated_at
FROM qr_irab_book_entries;

DROP TABLE qr_irab_book_entries;
ALTER TABLE qr_irab_book_entries_v2 RENAME TO qr_irab_book_entries;

CREATE UNIQUE INDEX IF NOT EXISTS ux_qr_irab_entry_dedupe
  ON qr_irab_book_entries(source_slug, source_chunk_id, entry_order, target_text_bare, source_quote_hash);

CREATE INDEX IF NOT EXISTS idx_qr_irab_book_entries_chunk
  ON qr_irab_book_entries(source_chunk_id);
CREATE INDEX IF NOT EXISTS idx_qr_irab_book_entries_mapping
  ON qr_irab_book_entries(al_mapping_status);
CREATE INDEX IF NOT EXISTS idx_qr_irab_book_entries_word_link
  ON qr_irab_book_entries(word_link_status);
