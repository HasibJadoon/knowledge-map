-- km_quran - schema snapshot
--
-- Generated from the live database, which is the source of truth:
--   SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL
--   ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'view' THEN 1 ELSE 2 END, name;
--
-- Binding: DB_QR. Regenerate after applying migrations rather than
-- editing by hand. Excludes d1_migrations (wrangler's ledger), _cf_KV, and
-- FTS5 shadow tables, which their virtual tables recreate automatically.
--
-- 151 tables, 22 views, 175 indexes.

-- Tables ------------------------------------------------------------------

CREATE TABLE "qr_analysis_claim" (
  id                   TEXT PRIMARY KEY,
  scope_id             TEXT NOT NULL,
  claim_type           TEXT NOT NULL,
  claim_text           TEXT NOT NULL,
  claim_text_ar        TEXT,
  confidence           TEXT NOT NULL DEFAULT 'proposed',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scope_id) REFERENCES "qr_analysis_scope"(id)
);

CREATE VIRTUAL TABLE qr_analysis_claims_fts USING fts5(scope_id UNINDEXED, claim_type, claim_text, claim_text_ar);

CREATE TABLE "qr_analysis_scope" (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  ref_id               TEXT,
  label                TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_argument" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER,
  title                TEXT NOT NULL,
  title_ar             TEXT,
  argument_type        TEXT NOT NULL DEFAULT 'analytical',
  summary_md           TEXT NOT NULL,
  claims_json          TEXT,
  evidence_ids_json    TEXT,
  confidence           TEXT NOT NULL DEFAULT 'proposed',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_argument_link" (
  id                   TEXT PRIMARY KEY,
  from_argument_id     TEXT NOT NULL,
  to_argument_id       TEXT NOT NULL,
  relation_type        TEXT NOT NULL,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_argument_id) REFERENCES "qr_argument"(id),
  FOREIGN KEY (to_argument_id)   REFERENCES "qr_argument"(id)
);

CREATE TABLE qr_ayah (
  id                TEXT PRIMARY KEY,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  text_uthmani_clean TEXT,
  text_uthmani      TEXT,
  text_bare         TEXT,
  text              TEXT,
  translation       TEXT,
  verse_mark        TEXT,
  page_number       INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')), juz INTEGER, hizb INTEGER, ruku INTEGER,
  UNIQUE (surah, ayah),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_citation" (
  id TEXT PRIMARY KEY, root_norm TEXT, from_domain TEXT NOT NULL DEFAULT 'qr',
  from_layer TEXT NOT NULL, from_id TEXT NOT NULL, to_ref TEXT NOT NULL, to_kind TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'grounds', source_slug TEXT, page_no INTEGER, quote_ar TEXT,
  confidence REAL, origin TEXT NOT NULL DEFAULT 'backfill', status TEXT NOT NULL DEFAULT 'live',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (from_domain, from_layer, from_id, to_ref, relation)
);

CREATE TABLE "qr_claim_evidence_link" (
  id                   TEXT PRIMARY KEY,
  claim_id             TEXT NOT NULL,
  evidence_id          TEXT NOT NULL,
  support_type         TEXT NOT NULL DEFAULT 'supports',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (claim_id, evidence_id),
  FOREIGN KEY (claim_id)   REFERENCES "qr_analysis_claim"(id),
  FOREIGN KEY (evidence_id) REFERENCES "qr_evidence"(id)
);

CREATE TABLE "qr_debate_cluster" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER,
  title_en             TEXT NOT NULL,
  title_ar             TEXT,
  cluster_type         TEXT NOT NULL DEFAULT 'theological',
  scope_description    TEXT,
  arguments_json       TEXT,
  summary_md           TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_doc_link" (
  id                   TEXT PRIMARY KEY,
  qr_scope_type        TEXT NOT NULL,
  qr_scope_id          TEXT NOT NULL,
  cm_doc_ref           TEXT NOT NULL,
  link_type            TEXT NOT NULL DEFAULT 'discusses',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_evidence" (
  id                   TEXT PRIMARY KEY,
  evidence_type        TEXT NOT NULL,
  provenance           TEXT,
  locator              TEXT,
  content_text         TEXT NOT NULL,
  content_text_ar      TEXT,
  is_disputed          INTEGER NOT NULL DEFAULT 0,
  dispute_note         TEXT,
  source_ref           TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE qr_evidence_items_fts USING fts5(evidence_type, provenance, content_text, content_text_ar);

CREATE TABLE "qr_historical_context" (
  surah                INTEGER PRIMARY KEY,
  arabian_milieu       TEXT,
  political_context    TEXT,
  late_antique_setting TEXT,
  inter_scriptural_env TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_interpretive_difference" (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  question_ar          TEXT NOT NULL,
  question_en          TEXT,
  difference_type      TEXT NOT NULL DEFAULT 'meaning',
  positions_summary    TEXT,
  majority_view        TEXT,
  minority_view        TEXT,
  resolution_note      TEXT,
  is_doctrinally_significant INTEGER NOT NULL DEFAULT 0,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_display_block" (
  id                  TEXT PRIMARY KEY,
  -- Provenance ----------------------------------------------------------------
  source_id           TEXT,
  source_chunk_id     TEXT,                            -- → qr_irab_source_chunks.id (NULL for Phase A entry-only blocks)
  source_entry_id     TEXT,                            -- → qr_irab_book_entries.id when projected from entries (Phase A)
  source_slug         TEXT NOT NULL,
  book_title          TEXT,
  author              TEXT,
  -- Locator -------------------------------------------------------------------
  surah_no            INTEGER,
  ayah_no             INTEGER,                         -- start ayah (best-effort; trust ayah_keys_json for span)
  ayah_to             INTEGER,                         -- end ayah of range
  ayah_key            TEXT,                            -- e.g. "2:3" — singleton anchor
  ayah_group_key      TEXT,                            -- e.g. "2:1-5" — canonical group form
  ayah_keys_json      JSON,                            -- e.g. ["2:1","2:2","2:3","2:4","2:5"]
  is_grouped          INTEGER NOT NULL DEFAULT 0,      -- 1 if span > 1 ayah
  word_index          INTEGER,
  word_text           TEXT,                            -- bare word as displayed
  phrase_text         TEXT,
  scope_type          TEXT,
  -- Block identity ------------------------------------------------------------
  block_type          TEXT NOT NULL,
  block_subtype       TEXT,                            -- finer category, free-form
  display_order       INTEGER NOT NULL DEFAULT 0,
  -- Content -------------------------------------------------------------------
  title_ar            TEXT,
  title_en            TEXT,
  text_ar             TEXT,
  text_en             TEXT,
  raw_text            TEXT,                            -- preserved verbatim
  -- Denormalized arrays for one-shot UI rendering -----------------------------
  tags_json               JSON,                        -- ["tafsir","2:3","jadwal"]
  grammar_tags_json       JSON,                        -- ["اسم موصول","مبني","فاعل"]
  sarf_tags_json          JSON,                        -- ["أفعال خمسة","حذف الهمزة"]
  balagha_tags_json       JSON,                        -- ["تكرار","تبعيض"]
  quran_refs_json         JSON,                        -- [{surah,ayah,word_index?}]
  backlinks_json          JSON,                        -- [{block_id,kind,label}]
  related_links_json      JSON,                        -- [{block_id,kind,label}]
  external_resource_json  JSON,                        -- {"r2_key":"…","kind":"svg","bytes":N} for dependency_graph blocks
  -- Provenance / QA -----------------------------------------------------------
  confidence          TEXT DEFAULT 'medium',
  review_status       TEXT NOT NULL DEFAULT 'ai_candidate',
  extraction_method   TEXT DEFAULT 'regex_parser',
  meta_json           JSON,
  -- Audit ---------------------------------------------------------------------
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE "qr_irab_book_display_block_fts"
USING fts5 (
  block_id UNINDEXED,
  source_slug UNINDEXED,
  surah_no UNINDEXED,
  ayah_no UNINDEXED,
  ayah_key UNINDEXED,
  ayah_group_key UNINDEXED,
  block_type UNINDEXED,
  title_ar, title_en,
  text_ar, text_en,
  raw_text,
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TABLE "qr_irab_book_display_link" (
  id            TEXT PRIMARY KEY,
  from_block_id TEXT NOT NULL,
  to_block_id   TEXT NOT NULL,
  link_kind     TEXT NOT NULL,                         -- 'backlink'|'related'|'same_ayah'|'same_word'|'same_grammar'|'comparison'|'disagreement'
  label         TEXT,
  weight        INTEGER NOT NULL DEFAULT 1,
  meta_json     JSON,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_display_note" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT,                                -- nullable: notes can stand alone
  note_kind       TEXT NOT NULL,                       -- 'author'|'teaching'|'footnote'|'reviewer'
  note_text_ar    TEXT,
  note_text_en    TEXT,
  is_inline       INTEGER NOT NULL DEFAULT 0,          -- inline footnote vs side-note
  surah_no        INTEGER,                             -- denormalized for filtering
  ayah_no         INTEGER,
  ayah_key        TEXT,                                -- "2:3"
  ayah_group_key  TEXT,                                -- "2:1-5" — filter by group quickly
  source_slug     TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  meta_json       JSON,
  review_status   TEXT NOT NULL DEFAULT 'ai_candidate',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_display_ref" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,
  ref_kind        TEXT NOT NULL,                       -- 'ayah'|'word'|'lemma'|'root'|'concept'
  surah_no        INTEGER,
  ayah_no         INTEGER,
  ayah_to         INTEGER,
  ayah_key        TEXT,                                -- "2:3"
  ayah_group_key  TEXT,                                -- "2:1-5" — filter by group quickly
  word_index      INTEGER,
  typed_ref       TEXT,                                -- e.g. 'AL:01HX…' | 'QR:2:3:1' | 'LX:…'
  label           TEXT,                                -- display label for the chip
  meta_json       JSON,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_display_source" (
  id                TEXT PRIMARY KEY,                  -- mirrors qr_irab_sources.id
  source_slug       TEXT NOT NULL UNIQUE,
  book_title_ar     TEXT,
  book_title_en     TEXT,
  author_name_ar    TEXT,
  author_name_en    TEXT,
  author_period     TEXT,                              -- e.g. "Classical (d. 745 AH)"
  badge_color       TEXT,                              -- UI hint, hex like '#C9A227'
  badge_glyph       TEXT,                              -- UI hint, short symbol
  short_description TEXT,
  long_description  TEXT,
  cover_image_url   TEXT,
  display_order     INTEGER DEFAULT 0,
  is_visible        INTEGER NOT NULL DEFAULT 1,
  meta_json         JSON,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_display_tag" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,                       -- → qr_iraab_book_display_blocks.id
  tag_kind        TEXT NOT NULL,                       -- 'general'|'grammar'|'sarf'|'balagha'|'topic'|'review'
  tag_value       TEXT NOT NULL,                       -- 'اسم موصول' | 'tafsir' | 'needs_review' …
  tag_value_norm  TEXT,                                -- diacritics-stripped form for matching
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_irab_book_entry" (
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

CREATE TABLE "qr_irab_extraction_run" (
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

CREATE TABLE "qr_irab_import_error" (
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

CREATE TABLE "qr_irab_source" (
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

CREATE TABLE "qr_irab_source_chunk" (
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

CREATE TABLE "qr_lemma" (
  id                TEXT PRIMARY KEY,
  lemma_text        TEXT NOT NULL UNIQUE,
  root              TEXT,
  lx_lemma_ref      TEXT,
  total_occurrences INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
, wazn_ar TEXT);

CREATE TABLE "qr_lemma_occurrence" (
  id                TEXT PRIMARY KEY,
  lemma_id          TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  word_index        INTEGER NOT NULL,
  word_occurrence_id TEXT NOT NULL,
  UNIQUE (lemma_id, surah, ayah, word_index),
  FOREIGN KEY (lemma_id)          REFERENCES "qr_lemma"(id),
  FOREIGN KEY (word_occurrence_id) REFERENCES "qr_word_occurrence"(id)
);

CREATE TABLE qr_lemma_ref_resolution (
  lemma_ref TEXT PRIMARY KEY, lemma_text TEXT NOT NULL, root TEXT NOT NULL,
  al_lemma_id TEXT, al_lemma_text TEXT, match_basis TEXT NOT NULL, confidence TEXT NOT NULL,
  note TEXT, resolved_at TEXT NOT NULL DEFAULT (datetime('now')));

CREATE TABLE "qr_morph_display_block" (
  id TEXT PRIMARY KEY,
  scope_level TEXT NOT NULL CHECK (scope_level IN ('root','lemma','context')),
  scope_key   TEXT NOT NULL,
  word_occ_ref TEXT, surah_no INTEGER, ayah_no INTEGER, word_index INTEGER,
  ayah_key TEXT, root_ar TEXT, lemma_ar TEXT,
  block_type TEXT NOT NULL,
  block_subtype TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 0,
  title_ar TEXT, title_en TEXT, title_ur TEXT,
  text_ar TEXT, text_en TEXT, text_ur TEXT,
  data_json JSON NOT NULL DEFAULT '{}',
  source_slug TEXT NOT NULL REFERENCES "qr_morph_display_source"(source_slug),
  source_ref TEXT, source_page TEXT,
  is_synthesis INTEGER NOT NULL DEFAULT 0, register TEXT,
  confidence TEXT DEFAULT 'medium', status TEXT NOT NULL DEFAULT 'live', meta_json JSON,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  registers_json JSON, media_r2_key TEXT, media_kind TEXT, media_alt TEXT,
  UNIQUE(scope_level, scope_key, block_type, block_subtype),
  CHECK ((is_synthesis = 1 AND source_slug LIKE 'kmaps_%')
      OR (is_synthesis = 0 AND source_slug NOT LIKE 'kmaps_%' AND source_ref IS NOT NULL))
);

CREATE TABLE "qr_morph_display_lemma" (
  id            TEXT PRIMARY KEY,            -- 'MDL:{bare}#{qr_lemmas.id[:8]}'
  lemma_ref     TEXT NOT NULL UNIQUE,        -- qr_lemmas.id (the real key)
  lemma_ar      TEXT NOT NULL,
  lemma_bare    TEXT,
  root_ar       TEXT,
  morphology_id TEXT,                        -- ar_ling_morphology bundle (km_arabic_linguistic)
  form_family_id TEXT,                       -- qr_morph_form_families.id
  tier_key      TEXT,                        -- qr_morph_form_tiers.tier_key
  wazn_ar       TEXT,
  derived_type_ar TEXT, derived_type_en TEXT, derived_type_ur TEXT,
  gloss_ar TEXT, gloss_en TEXT, gloss_ur TEXT,
  total_occurrences INTEGER,
  first_surah   INTEGER, first_ayah INTEGER,
  is_anchor     INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',
  display_order INTEGER NOT NULL DEFAULT 0,
  meta_json     JSON,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
, form_roman TEXT, form_ar TEXT, verb_form_ar TEXT);

CREATE TABLE qr_morph_display_media (
  id                 TEXT PRIMARY KEY,               -- 'MDM:بين:root_dna'
  r2_key             TEXT NOT NULL UNIQUE,           -- object key inside the bucket
  bucket             TEXT NOT NULL DEFAULT 'kmaps-media',
  kind               TEXT NOT NULL,                  -- 'image' | 'animation' | 'audio'
  mime               TEXT,                           -- image/svg+xml · image/webp · video/mp4
  -- what it illustrates ------------------------------------------------------
  root_ar            TEXT,
  surah_no           INTEGER, ayah_no INTEGER, word_index INTEGER,
  block_type         TEXT,                           -- links the asset to its block
  alt_en             TEXT, alt_ar TEXT,
  -- provenance (the "source" of the asset) -----------------------------------
  source_kind        TEXT,                           -- 'generated' | 'licensed' | 'public_domain'
  source_url         TEXT,                           -- origin the pipeline fetched from (if any)
  source_attribution TEXT,
  license            TEXT,
  sha256             TEXT,                           -- integrity of the stored object
  width_px           INTEGER, height_px INTEGER, duration_ms INTEGER,
  status             TEXT NOT NULL DEFAULT 'pending',-- 'pending' | 'stored' | 'live'
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_morph_display_root" (
  id                 TEXT PRIMARY KEY,             -- 'MDR:بين'
  root_ar            TEXT NOT NULL UNIQUE,         -- 'بين'
  root_display       TEXT,                         -- 'ب ي ن'
  root_type          TEXT,                         -- 'ثلاثي'
  frequency_quran    INTEGER,
  meaning_core_ar    TEXT,
  meaning_core_en    TEXT,
  meaning_core_ur    TEXT,
  hook_ar            TEXT,
  hook_en            TEXT,
  hook_ur            TEXT,
  family_json        JSON,   -- [{ lemma_ar, pos, pos_icon, verb_form, is_quran_word }]
  lens_coverage_json JSON,   -- [{ key, label, icon, on }]
  senses_json        JSON,   -- ["…", …]
  semantic_field     TEXT,
  section_icons_json JSON,   -- { family, senses, hook, freq }  (all lucide names)
  is_anchor          INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'live',
  display_order      INTEGER NOT NULL DEFAULT 0,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
, root_uid TEXT, al_root_ref TEXT, content_source TEXT NOT NULL DEFAULT 'al_projection', content_synced_at TEXT);

CREATE TABLE "qr_morph_display_source" (
  id TEXT PRIMARY KEY, source_slug TEXT NOT NULL UNIQUE, kind TEXT NOT NULL,
  title_ar TEXT, title_en TEXT, author_name_ar TEXT, author_name_en TEXT,
  death_year_hijri INTEGER, register TEXT, badge_color TEXT, badge_glyph TEXT,
  display_order INTEGER NOT NULL DEFAULT 0, is_visible INTEGER NOT NULL DEFAULT 1,
  meta_json JSON, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, title_ur TEXT, author_name_ur TEXT, icon TEXT);

CREATE TABLE "qr_morph_display_word" (
  id TEXT PRIMARY KEY, word_occ_ref TEXT, surah_no INTEGER NOT NULL, ayah_no INTEGER NOT NULL,
  word_index INTEGER NOT NULL, ayah_key TEXT, surface_ar TEXT NOT NULL, surface_bare TEXT,
  lemma_ar TEXT, root_ar TEXT, root_display TEXT, root_ref TEXT, word_group TEXT NOT NULL,
  pos_ar TEXT, pos_en TEXT, gloss_ar TEXT, gloss_en TEXT, badge_color TEXT,
  derived_type_ar TEXT, derived_type_en TEXT, wazn_ar TEXT, form_roman TEXT, features_json JSON,
  is_promoted INTEGER NOT NULL DEFAULT 1, is_content_word INTEGER NOT NULL DEFAULT 1,
  importance INTEGER NOT NULL DEFAULT 3, difficulty INTEGER, frequency_quran INTEGER,
  status TEXT NOT NULL DEFAULT 'live', display_order INTEGER NOT NULL DEFAULT 0, meta_json JSON,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), gloss_ur TEXT, derived_type_ur TEXT, pos_ur TEXT, is_anchor INTEGER NOT NULL DEFAULT 0, quran_meanings_json JSON, root_meaning_ar TEXT, root_meaning_en TEXT, form_ar TEXT, sense_arc_en   TEXT, sense_range_en TEXT, verb_form_ar TEXT, lemma_ref TEXT,
  UNIQUE(surah_no, ayah_no, word_index)
);

CREATE TABLE "qr_morph_form_family" (
  id            TEXT PRIMARY KEY,          -- 'FORM:IV' · 'BAB:nasara'
  family_order  INTEGER NOT NULL,          -- 1..N display order
  kind          TEXT NOT NULL,             -- 'form_i_bab' | 'derived_verb' | 'noun'
  roman         TEXT,                      -- 'I'..'X' (null for bāb/noun)
  verb_form_key TEXT,                      -- matches ar_ling_lemmas.verb_form (grouping key)
  arabic_name   TEXT NOT NULL,             -- 'إفعال' · 'تفعيل' · 'نصر'
  english_name  TEXT,                      -- 'Form IV — ifʿāl'
  urdu_name     TEXT,
  wazn          TEXT,                      -- 'أَفْعَلَ' · 'نَصَرَ يَنْصُرُ'
  example_ar    TEXT,                      -- 'نَصَرَ'
  note_md       TEXT,
  icon          TEXT,
  status        TEXT NOT NULL DEFAULT 'live'
, tier TEXT);

CREATE TABLE "qr_morph_form_tier" (
  tier_key     TEXT PRIMARY KEY,
  tier_order   INTEGER NOT NULL,
  arabic_name  TEXT NOT NULL,
  english_name TEXT,
  urdu_name    TEXT,
  icon         TEXT
);

CREATE TABLE "qr_mushaf_layout_line" (
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

CREATE TABLE qr_nazm_group (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT,
  name_en TEXT NOT NULL,
  name_translit TEXT,
  surah_from INTEGER NOT NULL,
  surah_to INTEGER NOT NULL,
  member_count INTEGER NOT NULL,
  contiguous INTEGER NOT NULL DEFAULT 1,
  group_basis TEXT NOT NULL,
  revelation_type TEXT,
  epithet_ar TEXT,
  epithet_attrib TEXT,
  summary_md TEXT NOT NULL,
  note_md TEXT,
  gloss_json TEXT,
  source_slug TEXT,
  evidence_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, confidence TEXT NOT NULL DEFAULT 'attested');

CREATE TABLE qr_nazm_group_member (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  surah INTEGER NOT NULL,
  member_index INTEGER NOT NULL,
  member_role TEXT,
  opening_ayah INTEGER,
  opening_form TEXT,
  opening_text_ar TEXT,
  epithet_pair_ar TEXT,
  epithet_case TEXT,
  is_anomaly INTEGER NOT NULL DEFAULT 0,
  anomaly_note TEXT,
  note_md TEXT,
  gloss_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (group_id, surah),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_nazm_link (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  reading_id TEXT,
  surah_a INTEGER NOT NULL,
  surah_b INTEGER NOT NULL,
  link_type TEXT NOT NULL,
  link_strength TEXT,
  link_evidence TEXT,
  ayah_a INTEGER,
  ayah_b INTEGER,
  note_md TEXT,
  source_slug TEXT,
  evidence_ref TEXT,
  gloss_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id),
  FOREIGN KEY (reading_id) REFERENCES qr_nazm_reading(id),
  FOREIGN KEY (surah_a) REFERENCES "qr_surah"(id),
  FOREIGN KEY (surah_b) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_nazm_pass (
  id TEXT PRIMARY KEY,
  reading_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  pass_index INTEGER NOT NULL,
  pass_label TEXT NOT NULL,
  surahs_json TEXT NOT NULL,
  surfaces_md TEXT NOT NULL,
  note_md TEXT,
  gloss_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reading_id, pass_index),
  FOREIGN KEY (reading_id) REFERENCES qr_nazm_reading(id),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id)
);

CREATE TABLE qr_nazm_reading (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  reading_label TEXT NOT NULL,
  structure_type TEXT NOT NULL,
  pattern_notation TEXT,
  scholar_ref TEXT,
  paradigm_ref TEXT,
  confidence TEXT NOT NULL DEFAULT 'proposed',
  summary_md TEXT NOT NULL,
  dissent_md TEXT,
  note_md TEXT,
  source_slug TEXT,
  evidence_ref TEXT,
  gloss_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id)
);

CREATE TABLE qr_nazm_theme (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  theme_key TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  marker_ar TEXT,
  summary_md TEXT NOT NULL,
  distribution_note TEXT,
  note_md TEXT,
  gloss_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (group_id, theme_key),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id)
);

CREATE TABLE qr_nazm_theme_attestation (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER,
  text_ar TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  verified_against TEXT,
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (theme_id) REFERENCES qr_nazm_theme(id),
  FOREIGN KEY (group_id) REFERENCES qr_nazm_group(id),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_passage_analysis" (
  id                 TEXT PRIMARY KEY,
  surah              INTEGER NOT NULL,
  study_passage_id   TEXT,
  cache_version      INTEGER NOT NULL DEFAULT 1,
  cache_generated_at TEXT,
  payload_json       TEXT,
  FOREIGN KEY (surah)            REFERENCES "qr_surah"(id),
  FOREIGN KEY (study_passage_id) REFERENCES "qr_surah_study_passage"(id)
);

CREATE TABLE "qr_passage_section" (
  id TEXT PRIMARY KEY, passage_id TEXT NOT NULL, surah INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0, section_key TEXT, title TEXT, badge TEXT,
  tone TEXT, renderer TEXT NOT NULL, data_json TEXT,
  status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_quran_bil_quran_link" (
  id                   TEXT PRIMARY KEY,
  from_surah           INTEGER NOT NULL,
  from_ayah            INTEGER NOT NULL,
  to_surah             INTEGER NOT NULL,
  to_ayah              INTEGER NOT NULL,
  relation_type        TEXT NOT NULL,
  scholar_ref          TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_surah) REFERENCES "qr_surah"(id),
  FOREIGN KEY (to_surah)   REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_root_raw (
  id TEXT PRIMARY KEY, root_uid TEXT NOT NULL, root_norm TEXT, source_code TEXT NOT NULL,
  discipline TEXT NOT NULL, fetch_strategy TEXT NOT NULL, origin_db TEXT NOT NULL DEFAULT 'km_quran',
  origin_table TEXT NOT NULL, origin_id TEXT NOT NULL,
  surah INTEGER, ayah INTEGER, word_index INTEGER, word_text TEXT, lemma TEXT, pos TEXT, morphology_tag TEXT,
  text_ar TEXT, data_json TEXT, status TEXT NOT NULL DEFAULT 'raw', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_root_registry (
  root_ar   TEXT PRIMARY KEY,
  root_uid  TEXT NOT NULL,
  buckwalter TEXT
);

CREATE TABLE "qr_scholar_method_profile" (
  source_slug TEXT PRIMARY KEY,
  author_name_ar TEXT, author_name_en TEXT, death_year_hijri INTEGER,
  discipline_bias TEXT,
  method_ar TEXT, method_en TEXT, method_ur TEXT,
  signature_tools_json TEXT,
  tell_md TEXT,
  status TEXT NOT NULL DEFAULT 'live'
);

CREATE TABLE "qr_scholar_paradigm_link" (
  scholar_id           TEXT NOT NULL,
  paradigm_id          TEXT NOT NULL,
  affiliation_type     TEXT NOT NULL DEFAULT 'primary',
  note_md              TEXT,
  PRIMARY KEY (scholar_id, paradigm_id),
  FOREIGN KEY (scholar_id)  REFERENCES "qr_scholar_profile"(id),
  FOREIGN KEY (paradigm_id) REFERENCES "qr_scholarly_paradigm"(id)
);

CREATE TABLE "qr_scholar_passage_movement" (
  id TEXT PRIMARY KEY,
  tafsir_id TEXT NOT NULL,
  section_id TEXT,
  movement_ord INTEGER NOT NULL,
  incipit_ar TEXT NOT NULL,
  incipit_verified INTEGER NOT NULL DEFAULT 0,
  gloss_en TEXT, gloss_ur TEXT,
  ayah_anchor TEXT, section_kind TEXT,
  body_ar TEXT, body_en TEXT, body_ur TEXT,
  quote_ar TEXT, evidence_ref TEXT,
  verdict TEXT NOT NULL DEFAULT 'adopted',
  note_md TEXT,
  UNIQUE (tafsir_id, movement_ord)
);

CREATE TABLE "qr_scholar_passage_reading" (
  id TEXT PRIMARY KEY,
  passage_ref TEXT NOT NULL,
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER NOT NULL,
  source_slug TEXT NOT NULL,
  author_name_ar TEXT,
  author_name_en TEXT,
  death_year_hijri INTEGER,
  reading_stance TEXT,
  thesis_ar TEXT, thesis_en TEXT, thesis_ur TEXT,
  method_note_md TEXT,
  section_count INTEGER NOT NULL DEFAULT 0,
  evidence_refs_json TEXT,
  status TEXT NOT NULL DEFAULT 'live',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), summary_ar TEXT, summary_en TEXT, summary_ur TEXT, key_notes_json TEXT,
  UNIQUE (passage_ref, source_slug)
);

CREATE TABLE "qr_scholar_passage_section" (
  id TEXT PRIMARY KEY,
  tafsir_id TEXT NOT NULL REFERENCES "qr_scholar_passage_reading"(id) ON DELETE CASCADE,
  section_ord INTEGER NOT NULL,
  heading_ar TEXT NOT NULL,
  heading_en TEXT NOT NULL,
  heading_ur TEXT,
  ayah_anchor TEXT,
  section_kind TEXT,
  body_ar TEXT, body_en TEXT, body_ur TEXT,
  quote_ar TEXT,
  evidence_ref TEXT,
  verdict TEXT NOT NULL DEFAULT 'adopted',
  note_md TEXT, incipit_ar TEXT, incipit_verified INTEGER NOT NULL DEFAULT 0, heading_origin TEXT NOT NULL DEFAULT 'mufassir_text', movement_from INTEGER, movement_to INTEGER,
  UNIQUE (tafsir_id, section_ord)
);

CREATE TABLE "qr_scholar_passage_term" (
  tafsir_id TEXT NOT NULL REFERENCES "qr_scholar_passage_reading"(id) ON DELETE CASCADE,
  section_id TEXT,
  term_ref TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'applied',
  ayah_anchor TEXT NOT NULL DEFAULT '',
  quote_ar TEXT,
  PRIMARY KEY (tafsir_id, term_ref, ayah_anchor)
);

CREATE TABLE qr_scholar_passage_xref (
  id TEXT PRIMARY KEY,
  reading_id TEXT NOT NULL,
  section_id TEXT,
  movement_ord INTEGER,
  xref_kind TEXT NOT NULL,
  ref_label_ar TEXT NOT NULL,
  ref_surah INTEGER, ref_ayah INTEGER,
  ref_key TEXT,
  cited_function TEXT NOT NULL,
  quoted_text_ar TEXT,
  host_ayah TEXT,
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_scholar_position" (
  id                   TEXT PRIMARY KEY,
  scholar_id           TEXT NOT NULL,
  work_id              TEXT,
  scope_type           TEXT NOT NULL,
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  position_type        TEXT NOT NULL DEFAULT 'meaning',
  position_text_ar     TEXT NOT NULL,
  position_text_en     TEXT,
  position_summary     TEXT,
  original_page        TEXT,
  is_minority_view     INTEGER NOT NULL DEFAULT 0,
  is_contested         INTEGER NOT NULL DEFAULT 0,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scholar_id) REFERENCES "qr_scholar_profile"(id),
  FOREIGN KEY (work_id)    REFERENCES "qr_scholar_work"(id)
);

CREATE VIRTUAL TABLE qr_scholar_positions_fts USING fts5(scholar_id UNINDEXED, surah UNINDEXED, position_type, position_text_ar, position_text_en, position_summary);

CREATE TABLE "qr_scholar_profile" (
  id                   TEXT PRIMARY KEY,
  name_ar              TEXT NOT NULL,
  name_en              TEXT,
  kunya                TEXT,
  laqab                TEXT,
  nisba                TEXT,
  birth_year_hijri     INTEGER,
  death_year_hijri     INTEGER,
  birth_year_ce        INTEGER,
  death_year_ce        INTEGER,
  era                  TEXT,
  madhab               TEXT,
  kalam_school         TEXT,
  specialization       TEXT,
  biography_md         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE qr_scholar_profiles_fts USING fts5(name_ar, name_en, laqab, nisba, biography_md);

CREATE TABLE "qr_scholar_work" (
  id                   TEXT PRIMARY KEY,
  scholar_id           TEXT NOT NULL,
  title_ar             TEXT NOT NULL,
  title_en             TEXT,
  work_type            TEXT NOT NULL DEFAULT 'tafsir',
  composition_year_hijri INTEGER,
  composition_year_ce  INTEGER,
  lx_source_ref        TEXT,
  volumes              INTEGER,
  is_complete          INTEGER NOT NULL DEFAULT 1,
  print_edition        TEXT,
  summary              TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scholar_id) REFERENCES "qr_scholar_profile"(id)
);

CREATE TABLE "qr_scholarly_paradigm" (
  id                   TEXT PRIMARY KEY,
  name_ar              TEXT NOT NULL,
  name_en              TEXT NOT NULL,
  paradigm_type        TEXT NOT NULL,
  description_md       TEXT,
  era_range            TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_scope_nuance" (
  id                   TEXT PRIMARY KEY,
  scope_id             TEXT NOT NULL,
  claim_id             TEXT,
  nuance_type          TEXT NOT NULL DEFAULT 'qualification',
  nuance_text          TEXT NOT NULL,
  nuance_text_ar       TEXT,
  discourse_force      TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scope_id) REFERENCES "qr_analysis_scope"(id)
);

CREATE TABLE "qr_scope_topic" (
  id                   TEXT PRIMARY KEY,
  topic_id             TEXT NOT NULL,
  scope_type           TEXT NOT NULL,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  prominence           TEXT NOT NULL DEFAULT 'secondary',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id) REFERENCES qr_topic_registry(id),
  FOREIGN KEY (surah)    REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_src_code (data_slug TEXT PRIMARY KEY, code TEXT NOT NULL, discipline TEXT NOT NULL, title_en TEXT);

CREATE TABLE qr_ss_discourse_citation (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL,
  reading_ref TEXT,
  seq INTEGER NOT NULL DEFAULT 0,
  position_ar TEXT NOT NULL,
  sources_ar TEXT,
  source_kind TEXT,
  stance TEXT,
  page_ref TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (note_id) REFERENCES qr_ss_discourse_note(id)
);

CREATE TABLE qr_ss_discourse_note (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL DEFAULT 'sentence',
  scope_id TEXT NOT NULL,
  surah INTEGER NOT NULL,
  marker TEXT,
  question_ar TEXT NOT NULL,
  verdict_ar TEXT,
  source_basis TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_discourse_source_link (
  id TEXT PRIMARY KEY,
  citation_id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  source_kind TEXT,
  source_slug TEXT,
  entry_ref TEXT,
  entry_table TEXT,
  ayah INTEGER,
  page_ref TEXT,
  link_status TEXT NOT NULL DEFAULT 'linked',
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (citation_id) REFERENCES qr_ss_discourse_citation(id)
);

CREATE TABLE qr_ss_ellipsis_event (
  id                   TEXT PRIMARY KEY,
  sentence_id          TEXT NOT NULL,
  scope_type           TEXT NOT NULL DEFAULT 'clause',
  scope_id             TEXT NOT NULL,
  ellipsis_type        TEXT NOT NULL,
  lx_ellipsis_ref      TEXT,
  elided_element       TEXT NOT NULL,
  rhetorical_effect    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sentence_id) REFERENCES qr_ss_occ_sentence(id)
);

CREATE TABLE qr_ss_migration_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch TEXT NOT NULL, table_name TEXT NOT NULL, row_id TEXT NOT NULL,
  column_name TEXT NOT NULL, old_value TEXT, new_value TEXT, reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_occ_clause (
  id                   TEXT PRIMARY KEY,
  sentence_id          TEXT NOT NULL,
  parent_clause_id     TEXT,
  clause_order         INTEGER NOT NULL DEFAULT 1,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  word_start_index     INTEGER,
  word_end_index       INTEGER,
  clause_type          TEXT NOT NULL DEFAULT 'main',
  lx_clause_type_ref   TEXT,
  clause_function      TEXT,
  lx_clause_func_ref   TEXT,
  governing_particle   TEXT,
  is_elliptical        INTEGER NOT NULL DEFAULT 0,
  elided_element       TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')), discourse_theme TEXT, is_virtual INTEGER NOT NULL DEFAULT 0, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), source_basis TEXT,
  FOREIGN KEY (sentence_id)      REFERENCES qr_ss_occ_sentence(id),
  FOREIGN KEY (parent_clause_id) REFERENCES qr_ss_occ_clause(id)
);

CREATE TABLE qr_ss_occ_phrase (
  id                   TEXT PRIMARY KEY,
  clause_id            TEXT NOT NULL,
  phrase_order         INTEGER NOT NULL DEFAULT 1,
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  word_start_index     INTEGER NOT NULL,
  word_end_index       INTEGER NOT NULL,
  phrase_type          TEXT NOT NULL,
  lx_phrase_type_ref   TEXT,
  phrase_function      TEXT,
  lx_phrase_func_ref   TEXT,
  head_word_id         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (clause_id)    REFERENCES qr_ss_occ_clause(id),
  FOREIGN KEY (head_word_id) REFERENCES "qr_word_occurrence"(id)
);

CREATE TABLE qr_ss_occ_segment (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  word_occurrence_id   TEXT NOT NULL,
  segment_index        INTEGER NOT NULL,
  segment_text         TEXT NOT NULL,
  segment_type         TEXT NOT NULL,
  lx_particle_ref      TEXT,
  morphology_tag       TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (word_occurrence_id) REFERENCES "qr_word_occurrence"(id)
);

CREATE TABLE qr_ss_occ_sentence (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  word_start_index     INTEGER,
  word_end_index       INTEGER,
  sentence_kind        TEXT NOT NULL DEFAULT 'declarative',
  lx_sentence_kind_ref TEXT,
  discourse_role       TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')), is_virtual INTEGER NOT NULL DEFAULT 0, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), source_basis TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_ss_pattern_register (
  pattern_key TEXT PRIMARY KEY,
  label_ar TEXT,
  signature_json TEXT CHECK (signature_json IS NULL OR json_valid(signature_json)),
  exemplar_sentence_id TEXT,
  exemplar_ayah TEXT,
  exemplar_tree_id TEXT,
  gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)),
  status TEXT NOT NULL DEFAULT 'canonical',
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_scope_balagha_link (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  lx_balagha_ref       TEXT NOT NULL,
  balagha_category     TEXT,
  rhetorical_effect    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)));

CREATE TABLE qr_ss_scope_grammar_link (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  lx_grammar_ref       TEXT NOT NULL,
  application_note     TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)));

CREATE TABLE "qr_ss_scope_link" (
  id                   TEXT PRIMARY KEY,
  from_scope_type      TEXT NOT NULL,
  from_scope_id        TEXT NOT NULL,
  to_scope_type        TEXT NOT NULL,
  to_scope_id          TEXT NOT NULL,
  relation_type        TEXT NOT NULL,
  lx_relation_ref      TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), source_basis TEXT);

CREATE TABLE qr_ss_scope_member_map (
  id                   TEXT PRIMARY KEY,
  word_occurrence_id   TEXT NOT NULL,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  member_role          TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (word_occurrence_id, scope_type, scope_id),
  FOREIGN KEY (word_occurrence_id) REFERENCES "qr_word_occurrence"(id)
);

CREATE TABLE qr_ss_scope_morph_link (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  lx_morph_ref         TEXT NOT NULL,
  irab_position        TEXT,
  irab_sign            TEXT,
  syntactic_function   TEXT,
  is_disputed          INTEGER NOT NULL DEFAULT 0,
  dispute_note         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_scope_nuance (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  nuance_type          TEXT NOT NULL DEFAULT 'discourse_force',
  lx_nuance_type_ref   TEXT,
  nuance_text          TEXT NOT NULL,
  nuance_text_ar       TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)));

CREATE VIRTUAL TABLE qr_ss_scope_nuance_fts USING fts5(scope_type UNINDEXED, scope_id UNINDEXED, nuance_type, nuance_text, nuance_text_ar);

CREATE TABLE qr_ss_scope_reading (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  scholar_ref          TEXT,
  paradigm_ref         TEXT,
  reading_type         TEXT NOT NULL DEFAULT 'irab',
  lx_reading_type_ref  TEXT,
  reading_text         TEXT NOT NULL,
  reading_text_ar      TEXT,
  is_minority          INTEGER NOT NULL DEFAULT 0,
  is_contested         INTEGER NOT NULL DEFAULT 0,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), is_selected INTEGER NOT NULL DEFAULT 0, selection_criteria TEXT, selection_rationale_json TEXT CHECK (selection_rationale_json IS NULL OR json_valid(selection_rationale_json)), witness_count INTEGER);

CREATE TABLE qr_ss_scope_reading_evidence_link (
  reading_id           TEXT NOT NULL,
  evidence_id          TEXT NOT NULL,
  support_type         TEXT NOT NULL DEFAULT 'supports',
  PRIMARY KEY (reading_id, evidence_id),
  FOREIGN KEY (reading_id)  REFERENCES qr_ss_scope_reading(id),
  FOREIGN KEY (evidence_id) REFERENCES "qr_evidence"(id)
);

CREATE VIRTUAL TABLE qr_ss_scope_reading_fts USING fts5(scope_type UNINDEXED, scope_id UNINDEXED, reading_type, reading_text, reading_text_ar);

CREATE TABLE qr_ss_source_register (
  band_code     TEXT NOT NULL,
  source_slug   TEXT NOT NULL,
  source_db     TEXT NOT NULL,
  source_table  TEXT NOT NULL,
  discipline    TEXT NOT NULL,
  title_ar      TEXT,
  title_en      TEXT,
  author_en     TEXT,
  death_ah      INTEGER,
  era           TEXT,
  source_role   TEXT NOT NULL DEFAULT 'primary',
  source_order  INTEGER NOT NULL DEFAULT 0,
  locator_json  TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(locator_json)),
  unit_count_at_audit INTEGER,
  status        TEXT NOT NULL DEFAULT 'live',
  audited_at    TEXT,
  PRIMARY KEY (band_code, source_slug)
);

CREATE TABLE "qr_ss_syntax_link" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  head_word_id         TEXT NOT NULL,
  dep_word_id          TEXT NOT NULL,
  relation_label       TEXT NOT NULL,
  lx_rel_type_ref      TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (head_word_id) REFERENCES "qr_word_occurrence"(id),
  FOREIGN KEY (dep_word_id)  REFERENCES "qr_word_occurrence"(id)
);

CREATE TABLE qr_ss_term (
  term_key    TEXT PRIMARY KEY,
  label_ar    TEXT,
  label_en    TEXT,
  color       TEXT,
  category    TEXT NOT NULL DEFAULT 'constituent',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_translation_buildup (
  id TEXT PRIMARY KEY,
  passage_id TEXT NOT NULL,
  surah INTEGER NOT NULL,
  step_seq INTEGER NOT NULL,
  unit_id TEXT,
  combination_ref TEXT,
  relation_type TEXT,
  connector_en TEXT,
  added_en TEXT,
  cumulative_en TEXT NOT NULL,
  layers_ar TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')), gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), added_gloss_json TEXT CHECK (added_gloss_json IS NULL OR json_valid(added_gloss_json)), driver_kind TEXT, driver_ref TEXT,
  FOREIGN KEY (passage_id) REFERENCES qr_ss_translation_passage(id)
);

CREATE TABLE qr_ss_translation_decision (
  id             TEXT PRIMARY KEY,
  unit_id        TEXT,
  buildup_id     TEXT,
  surah          INTEGER NOT NULL,
  ayah           INTEGER NOT NULL,
  step_seq       INTEGER,
  target_span_ar TEXT NOT NULL,
  rendered_json  TEXT CHECK (rendered_json IS NULL OR json_valid(rendered_json)),
  driver_kind    TEXT NOT NULL,
  driver_ref     TEXT NOT NULL,
  rationale_json TEXT CHECK (rationale_json IS NULL OR json_valid(rationale_json)),
  status         TEXT NOT NULL DEFAULT 'live',
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_translation_nuance (
  id TEXT PRIMARY KEY,
  translation_unit_id TEXT NOT NULL,
  driver_ar TEXT NOT NULL,
  fork_json TEXT NOT NULL DEFAULT '[]',
  chosen_en TEXT,
  changes_translation INTEGER NOT NULL DEFAULT 1,
  nuance_ref TEXT,
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (translation_unit_id) REFERENCES qr_ss_translation_unit(id)
);

CREATE TABLE qr_ss_translation_passage (
  id TEXT PRIMARY KEY,
  passage_ref TEXT,
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER NOT NULL,
  assembled_fluent_en TEXT,
  final_fluent_en TEXT NOT NULL,
  assembly_note_ar TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, synthesis_md TEXT, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), rejected_assemblies_json TEXT CHECK (rejected_assemblies_json IS NULL OR json_valid(rejected_assemblies_json)), nazm_ref TEXT);

CREATE TABLE qr_ss_translation_unit (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL DEFAULT 'sentence',
  scope_id TEXT NOT NULL,
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER NOT NULL,
  seq INTEGER NOT NULL DEFAULT 0,
  structural_literal_en TEXT,
  fluent_en TEXT NOT NULL,
  fluent_ar TEXT,
  decision_note_ar TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
, synthesis_md TEXT, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), reading_ref TEXT, rejected_readings_json TEXT CHECK (rejected_readings_json IS NULL OR json_valid(rejected_readings_json)));

CREATE TABLE qr_ss_tree (
  id                   TEXT PRIMARY KEY,
  sentence_id          TEXT NOT NULL,
  tree_type            TEXT NOT NULL DEFAULT 'constituency',
  generated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  note_md              TEXT, grounding TEXT NOT NULL DEFAULT 'authored', source_ref TEXT,
  FOREIGN KEY (sentence_id) REFERENCES qr_ss_occ_sentence(id)
);

CREATE TABLE qr_ss_tree_edge (
  id                   TEXT PRIMARY KEY,
  tree_id              TEXT NOT NULL,
  parent_node_id       TEXT NOT NULL,
  child_node_id        TEXT NOT NULL,
  edge_label           TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tree_id)        REFERENCES qr_ss_tree(id),
  FOREIGN KEY (parent_node_id) REFERENCES qr_ss_tree_node(id),
  FOREIGN KEY (child_node_id)  REFERENCES qr_ss_tree_node(id)
);

CREATE TABLE "qr_ss_tree_layout" (
  tree_id              TEXT PRIMARY KEY,
  layout_json          TEXT NOT NULL,
  renderer             TEXT NOT NULL DEFAULT 'd3_tidy_tree',
  generated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tree_id) REFERENCES qr_ss_tree(id)
);

CREATE TABLE qr_ss_tree_node (
  id                   TEXT PRIMARY KEY,
  tree_id              TEXT NOT NULL,
  parent_node_id       TEXT,
  node_label           TEXT NOT NULL,
  scope_type           TEXT,
  scope_id             TEXT,
  depth                INTEGER NOT NULL DEFAULT 0,
  node_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')), term_key TEXT, label_ar TEXT, note_md TEXT, word_occurrence_id TEXT, is_virtual INTEGER NOT NULL DEFAULT 0, tafsir_note_md TEXT, tafsir_refs TEXT, balagha_note_md TEXT, balagha_refs TEXT, gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)), sarf_note_md TEXT, sarf_refs TEXT, sarf_term_ref TEXT,
  FOREIGN KEY (tree_id)        REFERENCES qr_ss_tree(id),
  FOREIGN KEY (parent_node_id) REFERENCES qr_ss_tree_node(id)
);

CREATE TABLE qr_ss_vocab_register (
  kind TEXT NOT NULL,
  key TEXT NOT NULL,
  label_ar TEXT,
  label_en TEXT,
  gloss_json TEXT CHECK (gloss_json IS NULL OR json_valid(gloss_json)),
  category TEXT,
  discipline TEXT,
  status TEXT NOT NULL DEFAULT 'canonical',
  canonical_key TEXT,
  aliases_json TEXT,
  color TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), gram_term_id TEXT, mapping_status TEXT NOT NULL DEFAULT 'unset',
  PRIMARY KEY (kind, key)
);

CREATE TABLE "qr_study_question" (
  id            TEXT PRIMARY KEY,
  surah         INTEGER NOT NULL,
  passage_id    TEXT,
  scope_ref     TEXT,
  ayah_from     INTEGER,
  ayah_to       INTEGER,
  question_type TEXT NOT NULL DEFAULT 'comprehension',
  question_en   TEXT NOT NULL,
  question_ar   TEXT,
  options_json  TEXT,
  answer_md     TEXT,
  difficulty    TEXT NOT NULL DEFAULT 'standard',
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft',
  note_md       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id),
  FOREIGN KEY (passage_id) REFERENCES "qr_surah_study_passage"(id) ON DELETE CASCADE
);

CREATE TABLE "qr_surah" (
  id                INTEGER PRIMARY KEY,
  name_ar           TEXT NOT NULL,
  name_en           TEXT NOT NULL,
  name_transliteration TEXT,
  revelation_type   TEXT NOT NULL DEFAULT 'makki',
  ayah_count        INTEGER NOT NULL,
  juz_start         INTEGER,
  page_start        INTEGER,
  order_revelation  INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_surah_analysis" (
  surah                INTEGER PRIMARY KEY,
  cache_version        INTEGER NOT NULL DEFAULT 1,
  cache_generated_at   TEXT,
  payload_json         TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_atomic_profile" (
  surah                  INTEGER PRIMARY KEY,
  atomic_center          TEXT NOT NULL,
  atomic_center_ar       TEXT,
  structural_type        TEXT NOT NULL,
  structural_type_note   TEXT,
  resolution_pattern     TEXT,
  interpretive_lens      TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_surah_ayah_meta (
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  juz               INTEGER,
  hizb              INTEGER,
  ruku              INTEGER,
  manzil            INTEGER,
  sajda             INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (surah, ayah),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_clause_pattern" (
  surah                INTEGER PRIMARY KEY,
  dominant_clause_type TEXT,
  nominal_clause_pct   REAL,
  verbal_clause_pct    REAL,
  conditional_count    INTEGER NOT NULL DEFAULT 0,
  oath_count           INTEGER NOT NULL DEFAULT 0,
  interrogative_count  INTEGER NOT NULL DEFAULT 0,
  dominant_mood        TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_closure" (
  surah                  INTEGER PRIMARY KEY,
  ayah_from              INTEGER NOT NULL,
  ayah_to                INTEGER NOT NULL,
  closure_type           TEXT NOT NULL,
  echo_of_opening        INTEGER NOT NULL DEFAULT 0,
  rhetorical_force       TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_coherence_signal" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  signal_type            TEXT NOT NULL,
  description            TEXT NOT NULL,
  ayahs_json             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_diamond_pattern" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  structure_reading_id   TEXT,
  pattern_type           TEXT NOT NULL DEFAULT 'diamond',
  top_section_from       INTEGER,
  top_section_to         INTEGER,
  center_from            INTEGER,
  center_to              INTEGER,
  bottom_section_from    INTEGER,
  bottom_section_to      INTEGER,
  balance_note           TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_ellipsis_pattern" (
  surah                INTEGER PRIMARY KEY,
  dominant_ellipsis_type TEXT,
  total_ellipsis_count INTEGER NOT NULL DEFAULT 0,
  typical_effect       TEXT,
  notable_instances    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_link" (
  id                   TEXT PRIMARY KEY,
  surah_a              INTEGER NOT NULL,
  surah_b              INTEGER NOT NULL,
  relation_type        TEXT NOT NULL,
  description          TEXT,
  evidence_summary     TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah_a) REFERENCES "qr_surah"(id),
  FOREIGN KEY (surah_b) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_motif_cluster" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  cluster_label          TEXT NOT NULL,
  cluster_label_ar       TEXT,
  motif_keys             TEXT NOT NULL,
  ayah_range_json        TEXT,
  semantic_role          TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_opening" (
  surah                  INTEGER PRIMARY KEY,
  ayah_from              INTEGER NOT NULL DEFAULT 1,
  ayah_to                INTEGER NOT NULL,
  opening_type           TEXT NOT NULL,
  rhetorical_force       TEXT,
  sets_up_md             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_profile" (
  surah                  INTEGER PRIMARY KEY,
  governing_movement     TEXT,
  central_claim          TEXT,
  opening_force          TEXT,
  closure_force          TEXT,
  dominant_addressee     TEXT,
  dominant_tone          TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_reception" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  era                  TEXT NOT NULL,
  dominant_methodology TEXT,
  dominant_themes      TEXT,
  notable_scholars     TEXT,
  tendencies_md        TEXT,
  notable_shifts_md    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, era),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_register_shift" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah_shift           INTEGER NOT NULL,
  shift_axis           TEXT NOT NULL,
  from_state           TEXT,
  to_state             TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_rhetoric_profile" (
  surah                INTEGER PRIMARY KEY,
  dominant_mode        TEXT,
  clause_density       TEXT,
  emphasis_patterns    TEXT,
  suspension_use       TEXT,
  contrast_patterns    TEXT,
  rhetorical_devices   TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_sequence_pattern" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  sequence_type          TEXT NOT NULL,
  stages_json            TEXT NOT NULL,
  description            TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_structural_pivot" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  pivot_index            INTEGER NOT NULL,
  ayah                   INTEGER NOT NULL,
  pivot_type             TEXT NOT NULL,
  description            TEXT NOT NULL,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  UNIQUE (surah, pivot_index),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_structure_link" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  from_unit_id           TEXT NOT NULL,
  to_unit_id             TEXT NOT NULL,
  link_type              TEXT NOT NULL,
  link_evidence          TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')), source_slug TEXT, evidence_ref TEXT, gloss_json TEXT,
  FOREIGN KEY (from_unit_id) REFERENCES "qr_surah_structure_unit"(id),
  FOREIGN KEY (to_unit_id)   REFERENCES "qr_surah_structure_unit"(id)
);

CREATE TABLE "qr_surah_structure_reading" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  reading_label          TEXT NOT NULL,
  structure_type         TEXT NOT NULL,
  scholar_ref            TEXT,
  paradigm_ref           TEXT,
  confidence             TEXT DEFAULT 'proposed',
  summary_md             TEXT NOT NULL,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_structure_unit" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  unit_index             INTEGER NOT NULL,
  ayah_from              INTEGER NOT NULL,
  ayah_to                INTEGER NOT NULL,
  unit_role              TEXT NOT NULL,
  label                  TEXT,
  reading_id             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_study_passage" (
  id                    TEXT PRIMARY KEY,           -- QR:SP:{surah}:{ayah_from}-{ayah_to}
  surah                 INTEGER NOT NULL,
  passage_no            INTEGER NOT NULL,
  ayah_from             INTEGER NOT NULL,
  ayah_to               INTEGER NOT NULL,

  -- Public compatibility identifiers returned to existing clients.
  public_unit_id        TEXT NOT NULL UNIQUE,       -- U:C:QURAN:{surah}:{range}
  public_surah_unit_id  TEXT,                       -- U:C:QURAN:{surah}
  legacy_container_id   TEXT,
  legacy_lesson_id      INTEGER,

  label                 TEXT,
  title_en              TEXT,
  title_ar              TEXT,
  subtitle              TEXT,
  theme                 TEXT,
  summary_md            TEXT,
  start_ref             TEXT,
  end_ref               TEXT,
  text_cache            TEXT,
  meta_json             TEXT,
  status                TEXT NOT NULL DEFAULT 'draft',
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, passage_no),
  UNIQUE (surah, ayah_from, ayah_to),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_study_step" (
  id                    TEXT PRIMARY KEY,           -- QR:STEP:{surah}:{range}:{step_key}
  passage_id            TEXT NOT NULL,
  step_key              TEXT NOT NULL,              -- reading|morphology|sentence_structure|...
  step_no               INTEGER NOT NULL,
  title                 TEXT,
  title_ar              TEXT,
  intro_task_id         TEXT,                       -- public root task id for compatibility
  status                TEXT NOT NULL DEFAULT 'draft',
  meta_json             TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (passage_id, step_key),
  FOREIGN KEY (passage_id) REFERENCES "qr_surah_study_passage"(id) ON DELETE CASCADE
);

CREATE TABLE "qr_surah_study_task" (
  id                    TEXT PRIMARY KEY,
  passage_id            TEXT NOT NULL,
  step_id               TEXT NOT NULL,
  parent_task_id        TEXT,                       -- internal id; currently same as public_task_id

  -- Public compatibility identifier returned to existing clients.
  public_task_id        TEXT NOT NULL UNIQUE,       -- UT:C:QURAN:{surah}:{range}:{code}:{step}

  task_type             TEXT NOT NULL,
  task_name             TEXT,
  step_no               INTEGER,
  status                TEXT NOT NULL DEFAULT 'draft',
  task_json             TEXT,

  source_table          TEXT DEFAULT 'ar_container_unit_task',
  source_id             TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (passage_id) REFERENCES "qr_surah_study_passage"(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id)    REFERENCES "qr_surah_study_step"(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_task_id) REFERENCES "qr_surah_study_task"(id) ON DELETE CASCADE
);

CREATE TABLE "qr_surah_study_task_chunk" (
  task_id       TEXT NOT NULL,
  passage_id    TEXT NOT NULL,
  chunk_index   INTEGER NOT NULL,
  chunk_text    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, chunk_index),
  FOREIGN KEY (task_id)    REFERENCES "qr_surah_study_task"(id) ON DELETE CASCADE,
  FOREIGN KEY (passage_id) REFERENCES "qr_surah_study_passage"(id) ON DELETE CASCADE
);

CREATE TABLE "qr_surah_symmetry_pattern" (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  structure_reading_id   TEXT,
  pattern_type           TEXT NOT NULL,
  center_ayah_from       INTEGER,
  center_ayah_to         INTEGER,
  pattern_notation       TEXT,
  pairs_json             TEXT,
  summary_md             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_surah_tafsir_chunk (
  id           TEXT PRIMARY KEY,
  reading_id   TEXT NOT NULL,
  theme_id     TEXT,
  passage_id   TEXT,
  surah        INTEGER NOT NULL,
  source_slug  TEXT NOT NULL,
  chunk_index  INTEGER NOT NULL,
  chunk_kind   TEXT NOT NULL,
  heading_ar   TEXT,
  heading_en   TEXT,
  char_start   INTEGER,
  char_len     INTEGER,
  text_ar      TEXT NOT NULL,
  text_en      TEXT,
  note_md      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reading_id, chunk_index)
);

CREATE TABLE qr_surah_tafsir_hadith (
  id               TEXT PRIMARY KEY,
  reading_id       TEXT NOT NULL,
  theme_id         TEXT,
  chunk_id         TEXT,
  passage_id       TEXT,
  surah            INTEGER NOT NULL,
  source_slug      TEXT NOT NULL,
  hadith_topic     TEXT,
  companion_ar     TEXT,
  companion_en     TEXT,
  narrator_ar      TEXT,
  narrator_en      TEXT,
  collectors_json  JSON NOT NULL,
  grade_vocab_kind TEXT DEFAULT 'term_key',
  grade_vocab_key  TEXT,
  grade_note       TEXT,
  grade_external   TEXT,
  matn_ar          TEXT NOT NULL,
  matn_en          TEXT,
  is_marfu         INTEGER NOT NULL DEFAULT 0,
  is_mursal        INTEGER NOT NULL DEFAULT 0,
  variant_of       TEXT,
  display_order    INTEGER NOT NULL DEFAULT 0,
  note_md          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (grade_vocab_kind, grade_vocab_key) REFERENCES qr_ss_vocab_register(kind, key)
);

CREATE TABLE qr_surah_tafsir_reading (
  id                     TEXT PRIMARY KEY,
  passage_id             TEXT,
  surah                  INTEGER NOT NULL,
  ayah_from              INTEGER,
  ayah_to                INTEGER,
  source_slug            TEXT NOT NULL,
  scholar_id             TEXT,
  work_id                TEXT,
  source_tafsir_entry_id TEXT,
  source_page            TEXT,
  source_url             TEXT,
  scope_kind             TEXT NOT NULL DEFAULT 'ayah',
  text_ar                TEXT NOT NULL,
  text_en                TEXT,
  chunk_count            INTEGER NOT NULL DEFAULT 0,
  theme_count            INTEGER NOT NULL DEFAULT 0,
  translation_status     TEXT NOT NULL DEFAULT 'none',
  translator             TEXT,
  confidence             TEXT DEFAULT 'medium',
  review_status          TEXT NOT NULL DEFAULT 'ai_candidate',
  study_status           TEXT NOT NULL DEFAULT 'unread',
  extraction_method      TEXT DEFAULT 'entry_split',
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_slug, surah, scope_kind, ayah_from, ayah_to),
  FOREIGN KEY (passage_id) REFERENCES qr_surah_study_passage(id),
  FOREIGN KEY (surah) REFERENCES qr_surah(id)
);

CREATE TABLE qr_surah_tafsir_term (
  id           TEXT PRIMARY KEY,
  reading_id   TEXT NOT NULL,
  theme_id     TEXT,
  chunk_id     TEXT,
  passage_id   TEXT,
  surah        INTEGER NOT NULL,
  source_slug  TEXT NOT NULL,
  vocab_kind   TEXT NOT NULL,
  vocab_key    TEXT NOT NULL,
  discipline   TEXT NOT NULL,
  surface_ar   TEXT NOT NULL,
  gloss_en     TEXT,
  role         TEXT,
  confidence   TEXT DEFAULT 'high',
  note_md      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reading_id, chunk_id, vocab_kind, vocab_key, surface_ar),
  FOREIGN KEY (vocab_kind, vocab_key) REFERENCES qr_ss_vocab_register(kind, key)
);

CREATE TABLE qr_surah_tafsir_theme (
  id           TEXT PRIMARY KEY,
  reading_id   TEXT NOT NULL,
  passage_id   TEXT,
  surah        INTEGER NOT NULL,
  source_slug  TEXT NOT NULL,
  theme_index  INTEGER NOT NULL,
  theme_key    TEXT NOT NULL,
  title_ar     TEXT,
  title_en     TEXT,
  char_start   INTEGER NOT NULL,
  char_len     INTEGER NOT NULL,
  chunk_from   INTEGER,
  chunk_to     INTEGER,
  text_ar      TEXT NOT NULL,
  text_en      TEXT,
  note_md      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (reading_id, theme_index)
);

CREATE TABLE qr_surah_tafsir_xref (
  id            TEXT PRIMARY KEY,
  reading_id    TEXT NOT NULL,
  theme_id      TEXT,
  chunk_id      TEXT,
  passage_id    TEXT,
  surah         INTEGER NOT NULL,
  source_slug   TEXT NOT NULL,
  xref_kind     TEXT NOT NULL,
  target_surah  INTEGER,
  target_ayah   INTEGER,
  target_ayah_to INTEGER,
  ayah_key      TEXT,
  quote_ar      TEXT,
  quote_en      TEXT,
  relation      TEXT,
  verified      INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  note_md       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (target_surah, target_ayah) REFERENCES qr_ayah(surah, ayah)
);

CREATE TABLE "qr_surah_theme_profile" (
  surah                INTEGER PRIMARY KEY,
  primary_theme        TEXT NOT NULL,
  secondary_themes     TEXT,
  theological_axis     TEXT,
  ethical_axis         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_theology_profile" (
  surah                INTEGER PRIMARY KEY,
  divine_attributes    TEXT,
  prophethood_aspects  TEXT,
  eschatology_aspects  TEXT,
  cosmology_aspects    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_topic_flow" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  flow_index           INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  topic_label          TEXT NOT NULL,
  topic_label_ar       TEXT,
  flow_direction       TEXT,
  transitions_from_id  TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, flow_index),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_surah_worldview_profile" (
  surah                INTEGER PRIMARY KEY,
  anthropology_notes   TEXT,
  value_architecture   TEXT,
  moral_universe       TEXT,
  divine_human_rel     TEXT,
  worldview_tensions   TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE "qr_tafsir_book_display_block" (
  id                       TEXT PRIMARY KEY,
  -- Provenance --------------------------------------------------------------
  source_id                TEXT,
  source_tafsir_entry_id   TEXT,                        -- → qr_tafsir_entries.id (Phase A)
  source_slug              TEXT NOT NULL,
  book_title               TEXT,
  author                   TEXT,
  -- Scholar metadata denormalized for fast filter/render --------------------
  scholar_id               TEXT,                        -- → qr_scholar_profiles.id
  work_id                  TEXT,                        -- → qr_scholar_works.id
  scholar_name_ar          TEXT,
  scholar_name_en          TEXT,
  madhab                   TEXT,
  era                      TEXT,
  kalam_school             TEXT,
  death_year_hijri         INTEGER,
  -- Locator -----------------------------------------------------------------
  surah_no                 INTEGER,
  ayah_no                  INTEGER,                     -- start ayah
  ayah_to                  INTEGER,                     -- end ayah (range)
  ayah_key                 TEXT,                        -- "2:255"
  ayah_group_key           TEXT,                        -- "3:131-133"
  ayah_keys_json           JSON,                        -- ["3:131","3:132","3:133"]
  is_grouped               INTEGER NOT NULL DEFAULT 0,
  word_index               INTEGER,
  word_text                TEXT,
  phrase_text              TEXT,
  scope_type               TEXT,
  -- Block identity ----------------------------------------------------------
  block_type               TEXT NOT NULL,
  block_subtype            TEXT,
  display_order            INTEGER NOT NULL DEFAULT 0,
  paragraph_index          INTEGER,                     -- for paragraph_section blocks
  paragraph_count          INTEGER,                     -- total in source entry
  is_long_form             INTEGER NOT NULL DEFAULT 0,  -- 1 if source >5000 chars
  -- Content -----------------------------------------------------------------
  title_ar                 TEXT,
  title_en                 TEXT,
  text_ar                  TEXT,                        -- HTML-stripped
  text_en                  TEXT,                        -- reserved (NULL today)
  raw_text                 TEXT,                        -- verbatim with markup
  markup_tier              TEXT,                        -- copied from source
  source_page              TEXT,                        -- e.g. '٤' or '39'
  -- Denormalized arrays for one-shot UI render ------------------------------
  tags_json                JSON,                        -- ["explanation","tabari","narration"]
  grammar_tags_json        JSON,                        -- nullable
  theology_tags_json       JSON,                        -- ["mutazili_rebuttal","ashari_response"]
  narration_tags_json      JSON,                        -- ["sahih_muslim","sahih_bukhari"]
  quran_refs_json          JSON,                        -- [{surah,ayah,…}]
  scholar_refs_json        JSON,                        -- [{scholar_id,role,label}] who's quoted/responded
  backlinks_json           JSON,                        -- [{block_id,kind,label}]
  related_links_json       JSON,
  external_resource_json   JSON,                        -- reserved for audio/scan refs
  -- QA --------------------------------------------------------------------
  confidence               TEXT DEFAULT 'medium',
  review_status            TEXT NOT NULL DEFAULT 'ai_candidate',
  extraction_method        TEXT DEFAULT 'entry_projection',
  meta_json                JSON,                        -- structured payload (isnad_chain, paragraph_offsets, source_quote_hash, …)
  -- Audit -----------------------------------------------------------------
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE qr_tafsir_book_display_blocks_fts
USING fts5 (
  block_id UNINDEXED,
  source_slug UNINDEXED,
  scholar_id UNINDEXED,
  madhab UNINDEXED,
  era UNINDEXED,
  surah_no UNINDEXED,
  ayah_no UNINDEXED,
  ayah_key UNINDEXED,
  ayah_group_key UNINDEXED,
  block_type UNINDEXED,
  title_ar, title_en,
  text_ar, text_en,
  raw_text,
  tokenize = "unicode61 remove_diacritics 2"
);

CREATE TABLE "qr_tafsir_book_display_link" (
  id              TEXT PRIMARY KEY,
  from_block_id   TEXT NOT NULL,
  to_block_id     TEXT,                                 -- nullable when target is a canonical record
  to_typed_ref    TEXT,                                 -- 'QR:POSITION:01HX…' | 'QR:INTERPRETIVE_DIFF:…'
  link_kind       TEXT NOT NULL,                        -- 'backlink'|'related'|'same_ayah'|'same_word'|'same_grammar'|'same_paradigm'|'comparison'|'disagreement'|'scholar_response'|'reception_note'|'isnad_continues'
  label           TEXT,
  weight          INTEGER NOT NULL DEFAULT 1,
  meta_json       JSON,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_tafsir_book_display_note" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT,                                 -- nullable: notes can float
  note_kind       TEXT NOT NULL,                        -- 'author'|'teaching'|'footnote'|'reviewer'|'editorial'|'source_citation'|'mutazili_rebuttal'
  note_text_ar    TEXT,
  note_text_en    TEXT,
  is_inline       INTEGER NOT NULL DEFAULT 0,
  surah_no        INTEGER,
  ayah_no         INTEGER,
  ayah_key        TEXT,
  ayah_group_key  TEXT,
  source_slug     TEXT,
  scholar_id      TEXT,                                 -- which scholar's note this is
  display_order   INTEGER NOT NULL DEFAULT 0,
  meta_json       JSON,                                 -- e.g. {"hadith_book":"المسند","volume":5,"page":133}
  review_status   TEXT NOT NULL DEFAULT 'ai_candidate',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_tafsir_book_display_ref" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,
  ref_kind        TEXT NOT NULL,                        -- 'ayah'|'word'|'lemma'|'root'|'concept'|'scholar'|'position'|'hadith_source'
  surah_no        INTEGER,
  ayah_no         INTEGER,
  ayah_to         INTEGER,
  ayah_key        TEXT,
  ayah_group_key  TEXT,
  word_index      INTEGER,
  typed_ref       TEXT,                                 -- 'QR:2:3' | 'QR:SCH:TABARI' | 'QR:POSITION:01HX…' | 'HADITH:MUSLIM:V5/P133'
  label           TEXT,
  meta_json       JSON,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_tafsir_book_display_source" (
  id                 TEXT PRIMARY KEY,                  -- mirrors qr_scholar_works.id
  source_slug        TEXT NOT NULL UNIQUE,              -- 'tabari','razi','zamakhshari',…
  scholar_id         TEXT,                              -- → qr_scholar_profiles.id
  work_id            TEXT,                              -- → qr_scholar_works.id
  book_title_ar      TEXT,
  book_title_en      TEXT,
  author_name_ar     TEXT,
  author_name_en     TEXT,
  author_kunya       TEXT,
  author_laqab       TEXT,
  death_year_hijri   INTEGER,
  death_year_ce      INTEGER,
  era                TEXT,                              -- 'classical' | 'modern'
  madhab             TEXT,                              -- 'sunni'|'maliki'|'shafii'|'hanbali'|'hanafi'|'mutazili'|'ashari'
  kalam_school       TEXT,
  specialization     TEXT,
  badge_color        TEXT,                              -- UI hint, hex
  badge_glyph        TEXT,                              -- UI hint, short symbol
  markup_tier        TEXT,                              -- 'full' | 'minimal' | 'none'
  short_description  TEXT,
  long_description   TEXT,
  cover_image_url    TEXT,
  display_order      INTEGER DEFAULT 0,
  is_visible         INTEGER NOT NULL DEFAULT 1,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_tafsir_book_display_tag" (
  id              TEXT PRIMARY KEY,
  block_id        TEXT NOT NULL,                        -- → blocks.id
  tag_kind        TEXT NOT NULL,                        -- 'general'|'narration'|'theology'|'paradigm'|'madhab'|'topic'|'review'
  tag_value       TEXT NOT NULL,
  tag_value_norm  TEXT,                                 -- diacritic-stripped
  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_tafsir_entry" (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  entry_type           TEXT NOT NULL DEFAULT 'explanation',
  scholar_id           TEXT,
  work_id              TEXT,
  content_ar           TEXT NOT NULL,
  content_en           TEXT,
  source_page          TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_tafsir_sura_preface (
  id TEXT PRIMARY KEY,
  source_slug TEXT NOT NULL,
  surah_no INTEGER NOT NULL,
  host_block_id TEXT NOT NULL,
  host_surah_no INTEGER NOT NULL,
  char_offset INTEGER NOT NULL,
  preface_len INTEGER NOT NULL,
  text_ar TEXT NOT NULL,
  has_aghrad INTEGER NOT NULL DEFAULT 0,
  has_naming INTEGER NOT NULL DEFAULT 0,
  has_revelation_place INTEGER NOT NULL DEFAULT 0,
  extraction_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'raw',
  note_md TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_slug, surah_no)
);

CREATE TABLE qr_topic_registry (
  id                   TEXT PRIMARY KEY,
  topic_key            TEXT NOT NULL UNIQUE,
  topic_label_en       TEXT NOT NULL,
  topic_label_ar       TEXT,
  topic_domain         TEXT NOT NULL,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_translation" (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  translation_text  TEXT NOT NULL,
  footnote_md       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_id, surah, ayah),
  FOREIGN KEY (source_id) REFERENCES "qr_translation_source"(id)
);

CREATE TABLE "qr_translation_passage" (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah_from         INTEGER NOT NULL,
  ayah_to           INTEGER NOT NULL,
  passage_translation TEXT NOT NULL,
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES "qr_translation_source"(id)
);

CREATE TABLE "qr_translation_source" (
  id                TEXT PRIMARY KEY,
  source_code       TEXT NOT NULL UNIQUE,
  translator_name   TEXT NOT NULL,
  language          TEXT NOT NULL DEFAULT 'en',
  edition           TEXT,
  is_default        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE "qr_word_occurrence" (
  id                TEXT PRIMARY KEY,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  word_index        INTEGER NOT NULL,
  word_text         TEXT NOT NULL,
  word_text_bare    TEXT,
  root              TEXT,
  lemma             TEXT,
  pos               TEXT,
  morphology_tag    TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')), morphology_tag_json JSON
  CHECK (morphology_tag_json IS NULL OR json_valid(morphology_tag_json)), root_uid TEXT, lemma_ref TEXT,
  UNIQUE (surah, ayah, word_index),
  FOREIGN KEY (surah) REFERENCES "qr_surah"(id)
);

CREATE TABLE qr_word_sense_link (
  id            TEXT PRIMARY KEY,
  word_occ_id   TEXT NOT NULL REFERENCES qr_word_occurrence(id),
  al_sense_id   TEXT NOT NULL,
  al_arc_id     TEXT,
  surah_no      INTEGER NOT NULL,
  ayah_no       INTEGER NOT NULL,
  word_index    INTEGER NOT NULL,
  ayah_key      TEXT,
  is_contextual INTEGER NOT NULL DEFAULT 0,
  is_primary    INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  evidence_json JSON NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_json)),
  confidence    TEXT DEFAULT 'medium',
  status        TEXT NOT NULL DEFAULT 'live',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (word_occ_id, al_sense_id)
);

-- Views -------------------------------------------------------------------

CREATE VIEW qr_nazm_group_openings AS
SELECT g.slug, m.member_index, m.surah, s.name_ar AS surah_ar, s.name_transliteration AS surah_translit,
       m.member_role, m.opening_form, m.opening_ayah, a.text_uthmani_clean AS opening_live,
       m.opening_text_ar AS opening_stored,
       CASE WHEN a.text_uthmani_clean = m.opening_text_ar THEN 'ok' ELSE 'DRIFT' END AS integrity,
       m.epithet_pair_ar, m.epithet_case, m.is_anomaly
FROM qr_nazm_group_member m
JOIN qr_nazm_group g ON g.id = m.group_id
JOIN "qr_surah" s ON s.id = m.surah
LEFT JOIN qr_ayah a ON a.surah = m.surah AND a.ayah = m.opening_ayah
ORDER BY g.slug, m.member_index;

CREATE VIEW qr_nazm_scholar_layer AS
SELECT p.id AS scholar_id, p.name_en, p.birth_year_ce AS born, p.death_year_ce AS died,
       par.name_en AS paradigm, l.affiliation_type,
       (SELECT COUNT(*) FROM qr_nazm_group g
          WHERE (p.id='QR:SCH:ISLAHI' AND g.slug LIKE 'islahi_%')
             OR (p.id='QR:SCH:FARRIN' AND g.slug LIKE 'farrin_%')) AS group_rows,
       CASE
         WHEN p.id='QR:SCH:ISLAHI'   THEN 'complete group scheme'
         WHEN p.id='QR:SCH:FARRIN'   THEN 'rival group scheme (partial)'
         WHEN p.id='QR:SCH:FARAHI'   THEN 'principle only (amud)'
         WHEN p.id='QR:SCH:NAK'      THEN 'macro-order engagement, no named groups'
         WHEN p.id='QR:SCH:RANDHAWA' THEN 'macro-order engagement, no named groups'
         WHEN p.id='QR:SCH:GHAMIDI'  THEN 'follows Islahi, none independent'
         ELSE 'unassessed'
       END AS group_layer_contribution
FROM qr_scholar_profile p
JOIN qr_scholar_paradigm_link l ON l.scholar_id = p.id
JOIN qr_scholarly_paradigm par ON par.id = l.paradigm_id
WHERE l.affiliation_type <> 'influenced_by';

CREATE VIEW qr_nazm_surah_groups AS
SELECT s.id AS surah, s.name_transliteration AS surah_translit,
       COUNT(m.id) AS group_count,
       GROUP_CONCAT(g.slug) AS groups
FROM "qr_surah" s
LEFT JOIN qr_nazm_group_member m ON m.surah = s.id
LEFT JOIN qr_nazm_group g ON g.id = m.group_id
GROUP BY s.id;

CREATE VIEW qr_scholar_passage_incipit_check AS
SELECT m.id, m.tafsir_id reading_id, m.movement_ord, m.incipit_ar, m.evidence_ref,
  CASE WHEN instr(
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(b.text_ar,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ',''),
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(m.incipit_ar,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','')
  )>0 THEN 1 ELSE 0 END AS verified_stripped
FROM qr_scholar_passage_movement m
LEFT JOIN qr_tafsir_book_display_block b ON b.id = m.evidence_ref;

CREATE VIEW qr_ss_band_rows AS
 SELECT '310-40-IRAB' band_code, r.sentence_id, COUNT(*) n
   FROM qr_ss_scope_reading x JOIN qr_ss_scope_resolve r ON r.scope_id=x.scope_id GROUP BY 2
 UNION ALL
 SELECT '310-50-NAHW', r.sentence_id, COUNT(*)
   FROM qr_ss_scope_grammar_link x JOIN qr_ss_scope_resolve r ON r.scope_id=x.scope_id GROUP BY 2
 UNION ALL
 SELECT '310-60-BALAGHA', r.sentence_id, COUNT(*)
   FROM qr_ss_scope_balagha_link x JOIN qr_ss_scope_resolve r ON r.scope_id=x.scope_id GROUP BY 2
 UNION ALL
 SELECT '310-70-SIYAQ', r.sentence_id, COUNT(*)
   FROM qr_ss_scope_nuance x JOIN qr_ss_scope_resolve r ON r.scope_id=x.scope_id GROUP BY 2;

CREATE VIEW qr_ss_gaps AS
 SELECT * FROM qr_ss_gaps_core UNION ALL SELECT * FROM qr_ss_gaps_gloss;

CREATE VIEW qr_ss_gaps_core AS
SELECT '310-30-SHAJARA' band_code,'node_unexpanded' gap_kind,'high' severity, a.surah, a.ayah,'tree_node' scope_type, a.id scope_id, a.node_label detail
  FROM qr_ss_node_anchor a WHERE a.anchor_state='unexpanded'
UNION ALL
SELECT '310-20-TARKIB','segment_missing','high', a.surah, a.ayah,'tree_node', a.id, a.node_label
  FROM qr_ss_node_anchor a WHERE a.anchor_state='sub_word'
UNION ALL
SELECT '310-30-SHAJARA','leaf_unanchored','high', a.surah, a.ayah,'tree_node', a.id, a.node_label
  FROM qr_ss_node_anchor a WHERE a.anchor_state='unanchored'
UNION ALL
SELECT '310-40-IRAB','gloss_missing','medium', NULL, NULL,'scope_reading', r.id, r.scope_type
  FROM qr_ss_scope_reading r WHERE r.gloss_json IS NULL
UNION ALL
SELECT '310-40-IRAB','evidence_missing','high', NULL, NULL,'scope_reading', r.id, r.scope_type
  FROM qr_ss_scope_reading r
 WHERE NOT EXISTS (SELECT 1 FROM qr_ss_scope_reading_evidence_link e WHERE e.reading_id=r.id);

CREATE VIEW qr_ss_gaps_gloss AS
SELECT '310-50-NAHW' band_code,'gloss_missing' gap_kind,'medium' severity, NULL surah, NULL ayah,
       'scope_grammar_link' scope_type, id scope_id, lx_grammar_ref detail
  FROM qr_ss_scope_grammar_link WHERE gloss_json IS NULL
UNION ALL
SELECT '310-60-BALAGHA','gloss_missing','medium', NULL, NULL,'scope_balagha_link', id, lx_balagha_ref
  FROM qr_ss_scope_balagha_link WHERE gloss_json IS NULL
UNION ALL
SELECT '310-70-SIYAQ','gloss_missing','medium', NULL, NULL,'scope_nuance', id, nuance_type
  FROM qr_ss_scope_nuance WHERE gloss_json IS NULL
UNION ALL
SELECT '310-75-RABT','gloss_missing','medium', NULL, NULL,'scope_link', id, relation_type
  FROM qr_ss_scope_link WHERE gloss_json IS NULL
UNION ALL
SELECT '310-10-JUMLA','gloss_missing','medium', surah, ayah_from,'occ_sentence', id, sentence_kind
  FROM qr_ss_occ_sentence WHERE gloss_json IS NULL AND is_virtual=0;

CREATE VIEW qr_ss_node_anchor AS
SELECT n.id, n.tree_id, t.sentence_id, s.surah, s.ayah_from ayah, n.node_label, n.term_key, n.depth,
 n.word_occurrence_id, n.is_virtual,
 trim(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
 n.node_label,'َ',''),'ً',''),'ُ',''),'ٌ',''),'ِ',''),'ٍ',''),'ْ',''),'ّ',''),'ٰ',''),'ۖ',''),'ـ','')) label_bare,
 CASE WHEN EXISTS (SELECT 1 FROM qr_ss_tree_node c WHERE c.parent_node_id=n.id) THEN 'internal'
      WHEN n.is_virtual=1                   THEN 'virtual'
      WHEN n.scope_type='segment'           THEN 'segment'
      WHEN n.word_occurrence_id IS NOT NULL THEN 'anchored'
      WHEN instr(trim(n.node_label),' ')>0  THEN 'unexpanded'
      WHEN EXISTS (SELECT 1 FROM qr_word_occurrence w WHERE w.surah=s.surah AND w.ayah=s.ayah_from
            AND w.word_index BETWEEN COALESCE(s.word_start_index,1) AND COALESCE(s.word_end_index,999)
            AND instr(w.word_text_bare, trim(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
                n.node_label,'َ',''),'ً',''),'ُ',''),'ٌ',''),'ِ',''),'ٍ',''),'ْ',''),'ّ',''),'ٰ',''),'ۖ',''),'ـ','')))>0)
                                            THEN 'sub_word'
      ELSE 'unanchored' END anchor_state
FROM qr_ss_tree_node n
JOIN qr_ss_tree t ON t.id=n.tree_id
JOIN qr_ss_occ_sentence s ON s.id=t.sentence_id;

CREATE VIEW qr_ss_reading_verdict AS
SELECT r.scope_id, r.id reading_id, r.scholar_ref, r.paradigm_ref, r.witness_count,
 CASE WHEN r.is_selected=1 THEN 'SELECTED'
      WHEN r.selection_criteria LIKE 'rejected:%' THEN 'rejected'
      WHEN r.selection_criteria LIKE 'n/a:%' THEN 'n/a'
      WHEN r.selection_criteria='adopted_as_mechanism' THEN 'mechanism'
      ELSE 'unjudged' END verdict,
 r.selection_criteria,
 json_extract(r.selection_rationale_json,'$.en') why_en,
 json_extract(r.selection_rationale_json,'$.ar') why_ar,
 r.reading_text_ar,
 (SELECT COUNT(*) FROM qr_ss_scope_reading_evidence_link e WHERE e.reading_id=r.id) evidence_rows,
 (SELECT GROUP_CONCAT(e.evidence_id,' | ') FROM qr_ss_scope_reading_evidence_link e WHERE e.reading_id=r.id) evidence_ids
FROM qr_ss_scope_reading r;

CREATE VIEW qr_ss_ref_violations AS
 SELECT 'lx_grammar_ref' kind, g.lx_grammar_ref key, 'qr_ss_scope_grammar_link' tbl, g.id row_id
   FROM qr_ss_scope_grammar_link g WHERE g.lx_grammar_ref IS NULL OR g.lx_grammar_ref NOT LIKE 'GT:%'
 UNION ALL
 SELECT 'lx_balagha_ref', b.lx_balagha_ref, 'qr_ss_scope_balagha_link', b.id
   FROM qr_ss_scope_balagha_link b WHERE b.lx_balagha_ref IS NULL OR b.lx_balagha_ref NOT LIKE 'GT:%';

CREATE VIEW qr_ss_scope_resolve AS
 SELECT id scope_id,'sentence' scope_type, id sentence_id, surah, ayah_from ayah FROM qr_ss_occ_sentence
 UNION ALL
 SELECT id,'clause', sentence_id, surah, ayah_from FROM qr_ss_occ_clause
 UNION ALL
 SELECT p.id,'phrase', c.sentence_id, p.surah, p.ayah FROM qr_ss_occ_phrase p LEFT JOIN qr_ss_occ_clause c ON c.id=p.clause_id
 UNION ALL
 SELECT g.id,'segment', s.id, g.surah, g.ayah FROM qr_ss_occ_segment g
   LEFT JOIN qr_ss_occ_sentence s ON s.surah=g.surah AND g.ayah BETWEEN s.ayah_from AND s.ayah_to;

CREATE VIEW qr_ss_translation_basis AS
SELECT u.id unit_id, u.scope_id, u.surah, u.ayah_from ayah, u.fluent_en,
 u.reading_ref taken_reading, r.scholar_ref taken_scholar, r.witness_count, r.selection_criteria taken_because,
 json_extract(r.selection_rationale_json,'$.en') taken_why_en,
 json_extract(r.selection_rationale_json,'$.ar') taken_why_ar,
 r.reading_text_ar taken_position_ar,
 json_array_length(COALESCE(u.rejected_readings_json,'[]')) rejected_count,
 u.rejected_readings_json rejected_detail,
 (SELECT COUNT(*) FROM qr_ss_translation_decision d WHERE d.unit_id=u.id) decisions,
 (SELECT COUNT(*) FROM qr_ss_translation_nuance n WHERE n.translation_unit_id=u.id) forks,
 u.synthesis_md
FROM qr_ss_translation_unit u
LEFT JOIN qr_ss_scope_reading r ON r.id=u.reading_ref;

CREATE VIEW qr_ss_vocab_violations AS
 SELECT * FROM qr_ss_vocab_violations_core UNION ALL SELECT * FROM qr_ss_ref_violations;

CREATE VIEW qr_ss_vocab_violations_core AS
 SELECT 'term_key' kind, n.term_key key, 'qr_ss_tree_node' tbl, n.id row_id FROM qr_ss_tree_node n
   WHERE n.term_key IS NOT NULL AND n.term_key NOT IN (SELECT key FROM qr_ss_vocab_register WHERE kind='term_key' AND status='canonical')
 UNION ALL
 SELECT 'clause_function', c.clause_function, 'qr_ss_occ_clause', c.id FROM qr_ss_occ_clause c
   WHERE c.clause_function IS NOT NULL AND c.clause_function NOT IN (SELECT key FROM qr_ss_vocab_register WHERE kind='clause_function' AND status='canonical')
 UNION ALL
 SELECT 'clause_type', c.clause_type, 'qr_ss_occ_clause', c.id FROM qr_ss_occ_clause c
   WHERE c.clause_type IS NOT NULL AND c.clause_type NOT IN (SELECT key FROM qr_ss_vocab_register WHERE kind='clause_type' AND status='canonical')
 UNION ALL
 SELECT 'segment_type', s.segment_type, 'qr_ss_occ_segment', s.id FROM qr_ss_occ_segment s
   WHERE s.segment_type IS NOT NULL AND s.segment_type NOT IN (SELECT key FROM qr_ss_vocab_register WHERE kind='segment_type' AND status='canonical')
 UNION ALL
 SELECT 'relation_label', x.relation_label, 'qr_ss_syntax_link', x.id FROM qr_ss_syntax_link x
   WHERE x.relation_label IS NOT NULL AND x.relation_label NOT IN (SELECT key FROM qr_ss_vocab_register WHERE kind='relation_label' AND status='canonical');

CREATE VIEW qr_strip AS SELECT 1 x;

CREATE VIEW qr_tafsir_block_bare AS
SELECT id, source_slug, surah_no, ayah_no, ayah_to, block_type, display_order, LENGTH(text_ar) len,
 replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(text_ar,'ً',''),'ٌ',''),'ٍ',''),'َ',''),'ُ',''),'ِ',''),'ّ',''),'ْ',''),'ٰ',''),'ـ','') AS bare
FROM qr_tafsir_book_display_block;

CREATE VIEW qr_vw_surah_study_tasks_compat AS
SELECT
  t.public_task_id AS task_id,
  p.public_unit_id AS unit_id,
  parent.public_task_id AS parent_task_id,
  t.task_type,
  t.task_name,
  t.step_no,
  t.status,
  t.task_json,
  t.updated_at,
  t.passage_id,
  t.step_id
FROM "qr_surah_study_task" t
JOIN "qr_surah_study_passage" p ON p.id = t.passage_id
LEFT JOIN "qr_surah_study_task" parent ON parent.id = t.parent_task_id;

CREATE VIEW v_root_lemma_word AS
SELECT w.root, w.root_uid, w.lemma_ref, w.lemma AS lemma_surface,
       w.id AS word_occ_id, w.surah, w.ayah, w.word_index,
       w.word_text, w.pos, w.morphology_tag,
       w.surah || ':' || w.ayah AS ayah_key
  FROM qr_word_occurrence w;

CREATE VIEW v_ss_scope_span AS
  SELECT 'sentence' AS scope_type, id AS scope_id, surah,
         ayah_from, ayah_to, word_start_index AS word_start, word_end_index AS word_end
    FROM qr_ss_occ_sentence
  UNION ALL
  SELECT 'clause', id, surah, ayah_from, ayah_to, word_start_index, word_end_index
    FROM qr_ss_occ_clause
  UNION ALL
  SELECT 'phrase', id, surah, ayah, ayah, word_start_index, word_end_index
    FROM qr_ss_occ_phrase
  UNION ALL
  SELECT 'word', id, surah, ayah, ayah, word_index, word_index
    FROM qr_word_occurrence;

CREATE VIEW v_ss_scope_term AS
  SELECT scope_type, scope_id, 'balagha' AS discipline, lx_balagha_ref AS term_ref,
         balagha_category AS category, rhetorical_effect AS note, gloss_json
    FROM qr_ss_scope_balagha_link
  UNION ALL
  SELECT scope_type, scope_id, 'nahw', lx_grammar_ref, NULL, application_note, gloss_json
    FROM qr_ss_scope_grammar_link
  UNION ALL
  SELECT scope_type, scope_id, 'irab', lx_morph_ref, syntactic_function, irab_position, NULL
    FROM qr_ss_scope_morph_link;

CREATE VIEW v_word_term AS
SELECT w.root, w.root_uid, w.lemma_ref, w.lemma AS lemma_surface,
       w.id AS word_occ_id, w.surah, w.ayah, w.word_index, w.word_text,
       t.discipline, t.term_ref, t.category, t.note,
       t.scope_type AS attachment, t.scope_id
  FROM v_ss_scope_term t
  JOIN v_ss_scope_span s
    ON s.scope_type = t.scope_type AND s.scope_id = t.scope_id
  JOIN qr_word_occurrence w
    ON w.surah = s.surah
   AND w.ayah BETWEEN s.ayah_from AND s.ayah_to
   AND (s.word_start IS NULL OR w.word_index BETWEEN s.word_start AND s.word_end);

-- Indexes -----------------------------------------------------------------

CREATE INDEX idx_iraab_block_ayah       ON "qr_irab_book_display_block" (surah_no, ayah_no);

CREATE INDEX idx_iraab_block_ayah_key   ON "qr_irab_book_display_block" (ayah_key);

CREATE INDEX idx_iraab_block_chunk      ON "qr_irab_book_display_block" (source_chunk_id);

CREATE INDEX idx_iraab_block_entry      ON "qr_irab_book_display_block" (source_entry_id);

CREATE INDEX idx_iraab_block_group      ON "qr_irab_book_display_block" (ayah_group_key);

CREATE INDEX idx_iraab_block_grouped    ON "qr_irab_book_display_block" (surah_no, is_grouped);

CREATE INDEX idx_iraab_block_order      ON "qr_irab_book_display_block" (surah_no, ayah_no, display_order);

CREATE INDEX idx_iraab_block_review     ON "qr_irab_book_display_block" (review_status);

CREATE INDEX idx_iraab_block_slug       ON "qr_irab_book_display_block" (source_slug);

CREATE INDEX idx_iraab_block_source     ON "qr_irab_book_display_block" (source_id);

CREATE INDEX idx_iraab_block_surah      ON "qr_irab_book_display_block" (surah_no);

CREATE INDEX idx_iraab_block_type       ON "qr_irab_book_display_block" (block_type);

CREATE INDEX idx_iraab_link_to ON "qr_irab_book_display_link" (to_block_id, link_kind);

CREATE INDEX idx_iraab_note_ayah  ON "qr_irab_book_display_note" (surah_no, ayah_no);

CREATE INDEX idx_iraab_note_block ON "qr_irab_book_display_note" (block_id);

CREATE INDEX idx_iraab_note_group ON "qr_irab_book_display_note" (ayah_group_key);

CREATE INDEX idx_iraab_note_kind  ON "qr_irab_book_display_note" (note_kind);

CREATE INDEX idx_iraab_ref_ayah    ON "qr_irab_book_display_ref" (surah_no, ayah_no);

CREATE INDEX idx_iraab_ref_block   ON "qr_irab_book_display_ref" (block_id);

CREATE INDEX idx_iraab_ref_group   ON "qr_irab_book_display_ref" (ayah_group_key);

CREATE INDEX idx_iraab_ref_typed   ON "qr_irab_book_display_ref" (typed_ref);

CREATE INDEX idx_iraab_tag_value_norm
  ON "qr_irab_book_display_tag" (tag_kind, tag_value_norm);

CREATE INDEX idx_mdl_bare ON "qr_morph_display_lemma"(lemma_bare);

CREATE INDEX idx_mdl_root ON "qr_morph_display_lemma"(root_ar);

CREATE INDEX idx_morph_blocks_ayah  ON "qr_morph_display_block"(ayah_key, scope_level);

CREATE INDEX idx_morph_blocks_root  ON "qr_morph_display_block"(root_ar, scope_level);

CREATE INDEX idx_morph_blocks_scope ON "qr_morph_display_block"(scope_level, scope_key, display_order);

CREATE INDEX idx_morph_media_root ON qr_morph_display_media(root_ar, block_type);

CREATE INDEX idx_morph_media_word ON qr_morph_display_media(surah_no, ayah_no, word_index);

CREATE INDEX idx_morph_words_grid ON "qr_morph_display_word"(surah_no, is_promoted, word_group, display_order);

CREATE INDEX idx_morph_words_passage ON "qr_morph_display_word"(surah_no, ayah_no, word_index);

CREATE INDEX idx_morph_words_root ON "qr_morph_display_word"(root_ar);

CREATE INDEX idx_qr_irab_book_entries_chunk
  ON "qr_irab_book_entry"(source_chunk_id);

CREATE INDEX idx_qr_irab_book_entries_mapping
  ON "qr_irab_book_entry"(al_mapping_status);

CREATE INDEX idx_qr_irab_book_entries_word_link
  ON "qr_irab_book_entry"(word_link_status);

CREATE INDEX idx_qr_irab_source_chunks_ayah
  ON "qr_irab_source_chunk"(surah, ayah_from, ayah_to);

CREATE INDEX idx_qr_irab_source_chunks_section
  ON "qr_irab_source_chunk"(section_kind);

CREATE INDEX idx_qr_irab_source_chunks_source
  ON "qr_irab_source_chunk"(source_slug);

CREATE INDEX idx_qr_mdr_al_ref ON "qr_morph_display_root"(al_root_ref);

CREATE INDEX idx_qr_mushaf_layout_page
  ON "qr_mushaf_layout_line"(layout_key, page_number, line_number);

CREATE INDEX idx_qr_mushaf_layout_surah
  ON "qr_mushaf_layout_line"(layout_key, surah_number);

CREATE INDEX idx_qr_passage_sections_passage ON "qr_passage_section"(passage_id, sort_order);

CREATE INDEX idx_qr_ss_term_cat ON qr_ss_term(category, sort_order);

CREATE INDEX idx_qr_ss_tree_node_term ON qr_ss_tree_node(term_key);

CREATE INDEX idx_qr_ss_tree_node_word ON qr_ss_tree_node(word_occurrence_id);

CREATE INDEX idx_qra_page  ON qr_ayah(page_number);

CREATE INDEX idx_qra_surah ON qr_ayah(surah);

CREATE INDEX idx_qrac_scope ON "qr_analysis_claim"(scope_id);

CREATE INDEX idx_qrac_type  ON "qr_analysis_claim"(claim_type);

CREATE INDEX idx_qrar_from ON "qr_argument_link"(from_argument_id);

CREATE INDEX idx_qrar_to   ON "qr_argument_link"(to_argument_id);

CREATE INDEX idx_qrarg_surah ON "qr_argument"(surah);

CREATE INDEX idx_qrarg_type  ON "qr_argument"(argument_type);

CREATE INDEX idx_qras_surah ON "qr_analysis_scope"(surah);

CREATE INDEX idx_qras_type  ON "qr_analysis_scope"(scope_type);

CREATE INDEX idx_qrc_from  ON "qr_citation"(from_domain, from_layer, from_id);

CREATE INDEX idx_qrc_root  ON "qr_citation"(root_norm);

CREATE INDEX idx_qrc_toref ON "qr_citation"(to_ref);

CREATE INDEX idx_qrcel_claim    ON "qr_claim_evidence_link"(claim_id);

CREATE INDEX idx_qrcel_evidence ON "qr_claim_evidence_link"(evidence_id);

CREATE INDEX idx_qrcl_parent   ON qr_ss_occ_clause(parent_clause_id);

CREATE INDEX idx_qrcl_sentence ON qr_ss_occ_clause(sentence_id);

CREATE INDEX idx_qrcl_surah    ON qr_ss_occ_clause(surah, ayah_from);

CREATE INDEX idx_qrdc_surah ON "qr_debate_cluster"(surah);

CREATE INDEX idx_qrdc_type  ON "qr_debate_cluster"(cluster_type);

CREATE INDEX idx_qrdl_scope ON "qr_doc_link"(qr_scope_type, qr_scope_id);

CREATE INDEX idx_qrei_type ON "qr_evidence"(evidence_type);

CREATE INDEX idx_qrid_surah ON "qr_interpretive_difference"(surah, ayah_from);

CREATE INDEX idx_qrl_root ON "qr_lemma"(root);

CREATE INDEX idx_qrlo_lemma      ON "qr_lemma_occurrence"(lemma_id);

CREATE INDEX idx_qrlo_surah_ayah ON "qr_lemma_occurrence"(surah, ayah);

CREATE INDEX idx_qrlo_woid ON "qr_lemma_occurrence"(word_occurrence_id);

CREATE INDEX idx_qrph_clause ON qr_ss_occ_phrase(clause_id);

CREATE INDEX idx_qrph_surah  ON qr_ss_occ_phrase(surah, ayah);

CREATE INDEX idx_qrpiv_surah ON "qr_surah_structural_pivot"(surah);

CREATE INDEX idx_qrqbq_from ON "qr_quran_bil_quran_link"(from_surah, from_ayah);

CREATE INDEX idx_qrqbq_to   ON "qr_quran_bil_quran_link"(to_surah, to_ayah);

CREATE INDEX idx_qrsbl_scope ON qr_ss_scope_balagha_link(scope_type, scope_id);

CREATE INDEX idx_qrschp_era    ON "qr_scholar_profile"(era);

CREATE INDEX idx_qrschp_madhab ON "qr_scholar_profile"(madhab);

CREATE INDEX idx_qrschw_scholar ON "qr_scholar_work"(scholar_id);

CREATE INDEX idx_qrscpos_scholar ON "qr_scholar_position"(scholar_id);

CREATE INDEX idx_qrscpos_scope   ON "qr_scholar_position"(surah, ayah_from);

CREATE INDEX idx_qrscr_from ON "qr_ss_scope_link"(from_scope_type, from_scope_id);

CREATE INDEX idx_qrscr_to   ON "qr_ss_scope_link"(to_scope_type, to_scope_id);

CREATE INDEX idx_qrscs_surah ON "qr_surah_coherence_signal"(surah);

CREATE INDEX idx_qrsee_sentence ON qr_ss_ellipsis_event(sentence_id);

CREATE INDEX idx_qrseg_surah ON qr_ss_occ_segment(surah, ayah);

CREATE INDEX idx_qrseg_word  ON qr_ss_occ_segment(word_occurrence_id);

CREATE INDEX idx_qrsen_surah ON qr_ss_occ_sentence(surah, ayah_from);

CREATE INDEX idx_qrsgl_scope ON qr_ss_scope_grammar_link(scope_type, scope_id);

CREATE INDEX idx_qrsmc_surah ON "qr_surah_motif_cluster"(surah);

CREATE INDEX idx_qrsml_scope ON qr_ss_scope_morph_link(scope_type, scope_id);

CREATE INDEX idx_qrsmm_scope ON qr_ss_scope_member_map(scope_type, scope_id);

CREATE INDEX idx_qrsmm_word  ON qr_ss_scope_member_map(word_occurrence_id);

CREATE INDEX idx_qrsn_scope ON "qr_scope_nuance"(scope_id);

CREATE INDEX idx_qrsq_passage ON "qr_study_question"(passage_id, sort_order);

CREATE INDEX idx_qrsr_surah_a ON "qr_surah_link"(surah_a);

CREATE INDEX idx_qrsr_surah_b ON "qr_surah_link"(surah_b);

CREATE INDEX idx_qrsrs_surah ON "qr_surah_register_shift"(surah);

CREATE INDEX idx_qrssn_scope ON qr_ss_scope_nuance(scope_type, scope_id);

CREATE INDEX idx_qrssp_range
  ON "qr_surah_study_passage"(surah, ayah_from, ayah_to);

CREATE INDEX idx_qrssp_surah
  ON "qr_surah_study_passage"(surah, passage_no);

CREATE INDEX idx_qrssr_scope ON qr_ss_scope_reading(scope_type, scope_id);

CREATE INDEX idx_qrssr_surah ON "qr_surah_structure_reading"(surah);

CREATE INDEX idx_qrsss_passage_order
  ON "qr_surah_study_step"(passage_id, step_no);

CREATE INDEX idx_qrsst_parent
  ON "qr_surah_study_task"(parent_task_id, step_no);

CREATE INDEX idx_qrsst_passage_type
  ON "qr_surah_study_task"(passage_id, task_type, step_no);

CREATE UNIQUE INDEX idx_qrsst_root_type_unique
  ON "qr_surah_study_task"(passage_id, task_type)
  WHERE parent_task_id IS NULL;

CREATE INDEX idx_qrsstjc_passage
  ON "qr_surah_study_task_chunk"(passage_id, task_id, chunk_index);

CREATE INDEX idx_qrssu_surah ON "qr_surah_structure_unit"(surah);

CREATE INDEX idx_qrst_surah  ON "qr_scope_topic"(surah);

CREATE INDEX idx_qrst_topic  ON "qr_scope_topic"(topic_id);

CREATE INDEX idx_qrste_tree ON qr_ss_tree_edge(tree_id);

CREATE INDEX idx_qrstf_surah ON "qr_surah_topic_flow"(surah);

CREATE INDEX idx_qrstn_parent ON qr_ss_tree_node(parent_node_id);

CREATE INDEX idx_qrstn_tree   ON qr_ss_tree_node(tree_id);

CREATE INDEX idx_qrsyn_dep   ON "qr_ss_syntax_link"(dep_word_id);

CREATE INDEX idx_qrsyn_head  ON "qr_ss_syntax_link"(head_word_id);

CREATE INDEX idx_qrsyn_surah ON "qr_ss_syntax_link"(surah, ayah);

CREATE INDEX idx_qrte_scholar ON "qr_tafsir_entry"(scholar_id);

CREATE INDEX idx_qrte_surah   ON "qr_tafsir_entry"(surah, ayah_from);

CREATE INDEX idx_qrtp_source_surah ON "qr_translation_passage"(source_id, surah);

CREATE INDEX idx_qrtr_source_surah ON "qr_translation"(source_id, surah);

CREATE INDEX idx_qrwo_lemma      ON "qr_word_occurrence"(lemma);

CREATE INDEX idx_qrwo_lemma_ref ON "qr_word_occurrence"(lemma_ref);

CREATE INDEX idx_qrwo_root       ON "qr_word_occurrence"(root);

CREATE INDEX idx_qrwo_surah_ayah ON "qr_word_occurrence"(surah, ayah);

CREATE INDEX idx_tafsir_block_ayah        ON "qr_tafsir_book_display_block" (surah_no, ayah_no);

CREATE INDEX idx_tafsir_block_ayah_key    ON "qr_tafsir_book_display_block" (ayah_key);

CREATE INDEX idx_tafsir_block_ayah_scholar
  ON "qr_tafsir_book_display_block" (surah_no, ayah_no, scholar_id, display_order);

CREATE INDEX idx_tafsir_block_entry       ON "qr_tafsir_book_display_block" (source_tafsir_entry_id);

CREATE INDEX idx_tafsir_block_group       ON "qr_tafsir_book_display_block" (ayah_group_key);

CREATE INDEX idx_tafsir_block_grouped     ON "qr_tafsir_book_display_block" (surah_no, is_grouped);

CREATE INDEX idx_tafsir_block_madhab_era  ON "qr_tafsir_book_display_block" (madhab, era);

CREATE INDEX idx_tafsir_block_review      ON "qr_tafsir_book_display_block" (review_status);

CREATE INDEX idx_tafsir_block_scholar     ON "qr_tafsir_book_display_block" (scholar_id, surah_no);

CREATE INDEX idx_tafsir_block_slug        ON "qr_tafsir_book_display_block" (source_slug);

CREATE INDEX idx_tafsir_block_source      ON "qr_tafsir_book_display_block" (source_id);

CREATE INDEX idx_tafsir_block_surah       ON "qr_tafsir_book_display_block" (surah_no);

CREATE INDEX idx_tafsir_block_type        ON "qr_tafsir_book_display_block" (block_type);

CREATE INDEX idx_tafsir_block_work        ON "qr_tafsir_book_display_block" (work_id, surah_no);

CREATE INDEX idx_tafsir_display_sources_era     ON "qr_tafsir_book_display_source" (era);

CREATE INDEX idx_tafsir_display_sources_madhab  ON "qr_tafsir_book_display_source" (madhab);

CREATE INDEX idx_tafsir_display_sources_order   ON "qr_tafsir_book_display_source" (display_order);

CREATE INDEX idx_tafsir_link_to        ON "qr_tafsir_book_display_link" (to_block_id, link_kind);

CREATE INDEX idx_tafsir_link_to_typed  ON "qr_tafsir_book_display_link" (to_typed_ref);

CREATE INDEX idx_tafsir_note_ayah    ON "qr_tafsir_book_display_note" (surah_no, ayah_no);

CREATE INDEX idx_tafsir_note_block   ON "qr_tafsir_book_display_note" (block_id);

CREATE INDEX idx_tafsir_note_group   ON "qr_tafsir_book_display_note" (ayah_group_key);

CREATE INDEX idx_tafsir_note_kind    ON "qr_tafsir_book_display_note" (note_kind);

CREATE INDEX idx_tafsir_note_scholar ON "qr_tafsir_book_display_note" (scholar_id);

CREATE INDEX idx_tafsir_ref_ayah   ON "qr_tafsir_book_display_ref" (surah_no, ayah_no);

CREATE INDEX idx_tafsir_ref_block  ON "qr_tafsir_book_display_ref" (block_id);

CREATE INDEX idx_tafsir_ref_group  ON "qr_tafsir_book_display_ref" (ayah_group_key);

CREATE INDEX idx_tafsir_ref_typed  ON "qr_tafsir_book_display_ref" (typed_ref);

CREATE INDEX idx_tafsir_tag_value_norm
  ON "qr_tafsir_book_display_tag" (tag_kind, tag_value_norm);

CREATE INDEX idx_wsl_ayah ON qr_word_sense_link(surah_no, ayah_no, word_index);

CREATE INDEX idx_wsl_sense ON qr_word_sense_link(al_sense_id);

CREATE INDEX idx_wsl_word ON qr_word_sense_link(word_occ_id, display_order);

CREATE INDEX ix_nazm_att_surah ON qr_nazm_theme_attestation(surah, ayah_from);

CREATE INDEX ix_nazm_member_surah ON qr_nazm_group_member(surah);

CREATE INDEX ix_pts_tafsir ON "qr_scholar_passage_section"(tafsir_id, section_ord);

CREATE INDEX ix_ptt_term ON "qr_scholar_passage_term"(term_ref);

CREATE INDEX ix_qrreg_uid ON qr_root_registry(root_uid);

CREATE INDEX ix_qwo_root_uid ON "qr_word_occurrence"(root_uid);

CREATE INDEX ix_spx_reading ON qr_scholar_passage_xref(reading_id, section_id);

CREATE INDEX qr_root_raw_root ON qr_root_raw(root_uid, source_code);

CREATE UNIQUE INDEX uq_iraab_block_natural
  ON "qr_irab_book_display_block" (source_chunk_id, source_entry_id, block_type, display_order);

CREATE UNIQUE INDEX uq_iraab_link_natural
  ON "qr_irab_book_display_link" (from_block_id, to_block_id, link_kind);

CREATE UNIQUE INDEX uq_iraab_tag_natural
  ON "qr_irab_book_display_tag" (block_id, tag_kind, tag_value);

CREATE UNIQUE INDEX uq_tafsir_block_natural
  ON "qr_tafsir_book_display_block" (source_tafsir_entry_id, block_type, display_order, paragraph_index);

CREATE UNIQUE INDEX uq_tafsir_link_natural
  ON "qr_tafsir_book_display_link" (from_block_id, to_block_id, link_kind);

CREATE UNIQUE INDEX uq_tafsir_tag_natural
  ON "qr_tafsir_book_display_tag" (block_id, tag_kind, tag_value);

CREATE UNIQUE INDEX ux_qr_irab_entry_dedupe
  ON "qr_irab_book_entry"(source_slug, source_chunk_id, entry_order, target_text_bare, source_quote_hash);
