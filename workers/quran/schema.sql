-- Schema for km_quran.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.

CREATE TABLE qr_academic_positions (
  id                   TEXT PRIMARY KEY,
  question_id          TEXT NOT NULL,
  scholar_id           TEXT,
  paradigm_id          TEXT,
  position_text        TEXT NOT NULL,
  evidence_ids_json    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (question_id) REFERENCES qr_academic_question_registry(id)
);

CREATE TABLE qr_academic_question_registry (
  id                   TEXT PRIMARY KEY,
  question_text        TEXT NOT NULL,
  question_domain      TEXT NOT NULL,
  linked_surah         INTEGER,
  debate_cluster_id    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_analysis_claims (
  id                   TEXT PRIMARY KEY,
  scope_id             TEXT NOT NULL,
  claim_type           TEXT NOT NULL,
  claim_text           TEXT NOT NULL,
  claim_text_ar        TEXT,
  confidence           TEXT NOT NULL DEFAULT 'proposed',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scope_id) REFERENCES qr_analysis_scopes(id)
);

CREATE VIRTUAL TABLE qr_analysis_claims_fts USING fts5(scope_id UNINDEXED, claim_type, claim_text, claim_text_ar);

CREATE TABLE qr_analysis_scopes (
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

CREATE TABLE qr_argument_relations (
  id                   TEXT PRIMARY KEY,
  from_argument_id     TEXT NOT NULL,
  to_argument_id       TEXT NOT NULL,
  relation_type        TEXT NOT NULL,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_argument_id) REFERENCES qr_arguments(id),
  FOREIGN KEY (to_argument_id)   REFERENCES qr_arguments(id)
);

CREATE TABLE qr_arguments (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_irab_book_entries (
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

CREATE TABLE qr_irab_sources (
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

CREATE TABLE qr_irab_source_chunks (
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

CREATE TABLE qr_irab_extraction_runs (
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

CREATE TABLE qr_irab_import_errors (
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

CREATE INDEX idx_qr_irab_source_chunks_source ON qr_irab_source_chunks(source_slug);
CREATE INDEX idx_qr_irab_source_chunks_section ON qr_irab_source_chunks(section_kind);
CREATE INDEX idx_qr_irab_source_chunks_ayah ON qr_irab_source_chunks(surah, ayah_from, ayah_to);
CREATE UNIQUE INDEX ux_qr_irab_entry_dedupe ON qr_irab_book_entries(source_slug, source_chunk_id, entry_order, target_text_bare, source_quote_hash);
CREATE INDEX idx_qr_irab_book_entries_chunk ON qr_irab_book_entries(source_chunk_id);
CREATE INDEX idx_qr_irab_book_entries_mapping ON qr_irab_book_entries(al_mapping_status);
CREATE INDEX idx_qr_irab_book_entries_word_link ON qr_irab_book_entries(word_link_status);

CREATE TABLE qr_civilizational_claims (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER,
  topic                TEXT NOT NULL,
  claim_text           TEXT NOT NULL,
  civilization_context TEXT,
  debate_cluster_id    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_claim_evidence_links (
  id                   TEXT PRIMARY KEY,
  claim_id             TEXT NOT NULL,
  evidence_id          TEXT NOT NULL,
  support_type         TEXT NOT NULL DEFAULT 'supports',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (claim_id, evidence_id),
  FOREIGN KEY (claim_id)   REFERENCES qr_analysis_claims(id),
  FOREIGN KEY (evidence_id) REFERENCES qr_evidence_items(id)
);

CREATE TABLE qr_comparative_claims (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  tradition_source_id  TEXT,
  claim_type           TEXT NOT NULL DEFAULT 'parallel',
  claim_text           TEXT NOT NULL,
  evidence_ids_json    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_context_claims (
  id                   TEXT PRIMARY KEY,
  topic_id             TEXT NOT NULL,
  claim_text           TEXT NOT NULL,
  claim_type           TEXT NOT NULL DEFAULT 'historical',
  confidence           TEXT NOT NULL DEFAULT 'proposed',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id) REFERENCES qr_context_topics(id)
);

CREATE TABLE qr_context_evidence_items (
  id                   TEXT PRIMARY KEY,
  evidence_type        TEXT NOT NULL,
  provenance           TEXT,
  locator              TEXT,
  content_text         TEXT NOT NULL,
  is_disputed          INTEGER NOT NULL DEFAULT 0,
  dispute_note         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_context_evidence_links (
  claim_id             TEXT NOT NULL,
  evidence_id          TEXT NOT NULL,
  support_type         TEXT NOT NULL DEFAULT 'supports',
  PRIMARY KEY (claim_id, evidence_id),
  FOREIGN KEY (claim_id)    REFERENCES qr_context_claims(id),
  FOREIGN KEY (evidence_id) REFERENCES qr_context_evidence_items(id)
);

CREATE TABLE qr_context_topic_links (
  id                   TEXT PRIMARY KEY,
  topic_id             TEXT NOT NULL,
  scope_type           TEXT NOT NULL,
  surah                INTEGER,
  scope_ref            TEXT,
  relevance_note       TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (topic_id) REFERENCES qr_context_topics(id)
);

CREATE TABLE qr_context_topics (
  id                   TEXT PRIMARY KEY,
  topic_key            TEXT NOT NULL UNIQUE,
  topic_label          TEXT NOT NULL,
  topic_domain         TEXT NOT NULL,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_debate_clusters (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_diagram_instances (
  id                   TEXT PRIMARY KEY,
  spec_id              TEXT NOT NULL,
  scope_type           TEXT NOT NULL,
  scope_ref            TEXT NOT NULL,
  title                TEXT,
  payload_json         TEXT NOT NULL,
  generated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  is_stale             INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (spec_id) REFERENCES qr_diagram_specs(id)
);

CREATE TABLE qr_diagram_specs (
  id                   TEXT PRIMARY KEY,
  spec_key             TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  diagram_grammar      TEXT NOT NULL,
  renderer_key         TEXT NOT NULL,
  data_sources_json    TEXT,
  description_md       TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_doc_links (
  id                   TEXT PRIMARY KEY,
  qr_scope_type        TEXT NOT NULL,
  qr_scope_id          TEXT NOT NULL,
  cm_doc_ref           TEXT NOT NULL,
  link_type            TEXT NOT NULL DEFAULT 'discusses',
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_evidence_items (
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

CREATE TABLE qr_historical_context_profiles (
  surah                INTEGER PRIMARY KEY,
  arabian_milieu       TEXT,
  political_context    TEXT,
  late_antique_setting TEXT,
  inter_scriptural_env TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_interpretive_differences (
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

CREATE TABLE qr_lemma_occurrences (
  id                TEXT PRIMARY KEY,
  lemma_id          TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  word_index        INTEGER NOT NULL,
  word_occurrence_id TEXT NOT NULL,
  UNIQUE (lemma_id, surah, ayah, word_index),
  FOREIGN KEY (lemma_id)          REFERENCES qr_lemmas(id),
  FOREIGN KEY (word_occurrence_id) REFERENCES qr_word_occurrences(id)
);

CREATE TABLE qr_lemmas (
  id                TEXT PRIMARY KEY,
  lemma_text        TEXT NOT NULL UNIQUE,
  root              TEXT,
  lx_lemma_ref      TEXT,
  total_occurrences INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_material_witness_observations (
  id                   TEXT PRIMARY KEY,
  witness_id           TEXT NOT NULL,
  observation_type     TEXT NOT NULL,
  surah                INTEGER,
  ayah_from            INTEGER,
  ayah_to              INTEGER,
  observation_text     TEXT NOT NULL,
  source_ref           TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (witness_id) REFERENCES qr_material_witnesses(id)
);

CREATE TABLE qr_material_witnesses (
  id                   TEXT PRIMARY KEY,
  witness_type         TEXT NOT NULL,
  siglum               TEXT,
  common_name          TEXT,
  location             TEXT,
  date_range_ce        TEXT,
  dating_method        TEXT,
  script_style         TEXT,
  rasm_notes           TEXT,
  qiraat_notes         TEXT,
  digitized_url        TEXT,
  cm_document_ref      TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_page_layout_lines (
  id                TEXT PRIMARY KEY,
  page_number       INTEGER NOT NULL,
  line_number       INTEGER NOT NULL,
  surah             INTEGER NOT NULL,
  ayah_from         INTEGER NOT NULL,
  ayah_to           INTEGER NOT NULL,
  word_from_index   INTEGER,
  word_to_index     INTEGER,
  UNIQUE (page_number, line_number),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_mushaf_layout_lines (
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

CREATE TABLE qr_passage_analysis_cache (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  passage_id           TEXT NOT NULL,
  cache_version        INTEGER NOT NULL DEFAULT 1,
  cache_generated_at   TEXT,
  payload_json         TEXT,
  FOREIGN KEY (surah)      REFERENCES qr_surahs(id),
  FOREIGN KEY (passage_id) REFERENCES qr_surah_passages(id)
);

CREATE TABLE qr_quran_bil_quran_relations (
  id                   TEXT PRIMARY KEY,
  from_surah           INTEGER NOT NULL,
  from_ayah            INTEGER NOT NULL,
  to_surah             INTEGER NOT NULL,
  to_ayah              INTEGER NOT NULL,
  relation_type        TEXT NOT NULL,
  scholar_ref          TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_surah) REFERENCES qr_surahs(id),
  FOREIGN KEY (to_surah)   REFERENCES qr_surahs(id)
);

CREATE TABLE qr_scholar_paradigm_links (
  scholar_id           TEXT NOT NULL,
  paradigm_id          TEXT NOT NULL,
  affiliation_type     TEXT NOT NULL DEFAULT 'primary',
  note_md              TEXT,
  PRIMARY KEY (scholar_id, paradigm_id),
  FOREIGN KEY (scholar_id)  REFERENCES qr_scholar_profiles(id),
  FOREIGN KEY (paradigm_id) REFERENCES qr_scholarly_paradigms(id)
);

CREATE TABLE qr_scholar_positions (
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
  FOREIGN KEY (scholar_id) REFERENCES qr_scholar_profiles(id),
  FOREIGN KEY (work_id)    REFERENCES qr_scholar_works(id)
);

CREATE VIRTUAL TABLE qr_scholar_positions_fts USING fts5(scholar_id UNINDEXED, surah UNINDEXED, position_type, position_text_ar, position_text_en, position_summary);

CREATE TABLE qr_scholar_profiles (
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

CREATE TABLE qr_scholar_works (
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
  FOREIGN KEY (scholar_id) REFERENCES qr_scholar_profiles(id)
);

CREATE TABLE qr_scholarly_paradigms (
  id                   TEXT PRIMARY KEY,
  name_ar              TEXT NOT NULL,
  name_en              TEXT NOT NULL,
  paradigm_type        TEXT NOT NULL,
  description_md       TEXT,
  era_range            TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_scope_nuances (
  id                   TEXT PRIMARY KEY,
  scope_id             TEXT NOT NULL,
  claim_id             TEXT,
  nuance_type          TEXT NOT NULL DEFAULT 'qualification',
  nuance_text          TEXT NOT NULL,
  nuance_text_ar       TEXT,
  discourse_force      TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (scope_id) REFERENCES qr_analysis_scopes(id)
);

CREATE TABLE qr_scope_topics (
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
  FOREIGN KEY (surah)    REFERENCES qr_surahs(id)
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
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
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
  FOREIGN KEY (head_word_id) REFERENCES qr_word_occurrences(id)
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
  FOREIGN KEY (word_occurrence_id) REFERENCES qr_word_occurrences(id)
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
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
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
);

CREATE TABLE qr_ss_scope_grammar_link (
  id                   TEXT PRIMARY KEY,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  lx_grammar_ref       TEXT NOT NULL,
  application_note     TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_scope_member_map (
  id                   TEXT PRIMARY KEY,
  word_occurrence_id   TEXT NOT NULL,
  scope_type           TEXT NOT NULL,
  scope_id             TEXT NOT NULL,
  member_role          TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (word_occurrence_id, scope_type, scope_id),
  FOREIGN KEY (word_occurrence_id) REFERENCES qr_word_occurrences(id)
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
);

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
);

CREATE TABLE qr_ss_scope_reading_evidence_link (
  reading_id           TEXT NOT NULL,
  evidence_id          TEXT NOT NULL,
  support_type         TEXT NOT NULL DEFAULT 'supports',
  PRIMARY KEY (reading_id, evidence_id),
  FOREIGN KEY (reading_id)  REFERENCES qr_ss_scope_reading(id),
  FOREIGN KEY (evidence_id) REFERENCES qr_evidence_items(id)
);

CREATE VIRTUAL TABLE qr_ss_scope_reading_fts USING fts5(scope_type UNINDEXED, scope_id UNINDEXED, reading_type, reading_text, reading_text_ar);

CREATE TABLE qr_ss_scope_relations (
  id                   TEXT PRIMARY KEY,
  from_scope_type      TEXT NOT NULL,
  from_scope_id        TEXT NOT NULL,
  to_scope_type        TEXT NOT NULL,
  to_scope_id          TEXT NOT NULL,
  relation_type        TEXT NOT NULL,
  lx_relation_ref      TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_ss_syntax_relations (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah                 INTEGER NOT NULL,
  head_word_id         TEXT NOT NULL,
  dep_word_id          TEXT NOT NULL,
  relation_label       TEXT NOT NULL,
  lx_rel_type_ref      TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (head_word_id) REFERENCES qr_word_occurrences(id),
  FOREIGN KEY (dep_word_id)  REFERENCES qr_word_occurrences(id)
);

CREATE TABLE qr_ss_tree (
  id                   TEXT PRIMARY KEY,
  sentence_id          TEXT NOT NULL,
  tree_type            TEXT NOT NULL DEFAULT 'constituency',
  generated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  note_md              TEXT,
  grounding            TEXT NOT NULL DEFAULT 'authored',  -- authored | irab
  source_ref           TEXT,
  FOREIGN KEY (sentence_id) REFERENCES qr_ss_occ_sentence(id)
);

-- Global grammatical / balāgha term dictionary: term_key -> Arabic/English
-- label + stable colour, joined by qr_ss_tree_node.term_key and the grounded
-- iʿrāb roles surfaced by the sentence-structure step.
CREATE TABLE qr_ss_term (
  term_key    TEXT PRIMARY KEY,
  label_ar    TEXT,
  label_en    TEXT,
  color       TEXT,
  category    TEXT NOT NULL DEFAULT 'constituent',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
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

CREATE TABLE qr_ss_tree_layout_cache (
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
  term_key             TEXT,               -- qr_ss_term key (colour + label)
  label_ar             TEXT,               -- grammatical role label, e.g. 'مبتدأ'
  note_md              TEXT,               -- per-node nuance
  word_occurrence_id   TEXT,               -- leaf -> word (lexicon / iʿrāb xref)
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tree_id)        REFERENCES qr_ss_tree(id),
  FOREIGN KEY (parent_node_id) REFERENCES qr_ss_tree_node(id)
);

CREATE TABLE qr_surah_analysis_cache (
  surah                INTEGER PRIMARY KEY,
  cache_version        INTEGER NOT NULL DEFAULT 1,
  cache_generated_at   TEXT,
  payload_json         TEXT,
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_atomic_profiles (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_clause_patterns (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_closures (
  surah                  INTEGER PRIMARY KEY,
  ayah_from              INTEGER NOT NULL,
  ayah_to                INTEGER NOT NULL,
  closure_type           TEXT NOT NULL,
  echo_of_opening        INTEGER NOT NULL DEFAULT 0,
  rhetorical_force       TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_coherence_signals (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  signal_type            TEXT NOT NULL,
  description            TEXT NOT NULL,
  ayahs_json             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_diamond_patterns (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_ellipsis_patterns (
  surah                INTEGER PRIMARY KEY,
  dominant_ellipsis_type TEXT,
  total_ellipsis_count INTEGER NOT NULL DEFAULT 0,
  typical_effect       TEXT,
  notable_instances    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_motif_clusters (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  cluster_label          TEXT NOT NULL,
  cluster_label_ar       TEXT,
  motif_keys             TEXT NOT NULL,
  ayah_range_json        TEXT,
  semantic_role          TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_openings (
  surah                  INTEGER PRIMARY KEY,
  ayah_from              INTEGER NOT NULL DEFAULT 1,
  ayah_to                INTEGER NOT NULL,
  opening_type           TEXT NOT NULL,
  rhetorical_force       TEXT,
  sets_up_md             TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_passages (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  passage_index          INTEGER NOT NULL,
  ayah_from              INTEGER NOT NULL,
  ayah_to                INTEGER NOT NULL,
  theme                  TEXT,
  title_ar               TEXT,
  title_en               TEXT,
  discourse_role         TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, passage_index),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_profiles (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_reception_histories (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_register_shifts (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER NOT NULL,
  ayah_shift           INTEGER NOT NULL,
  shift_axis           TEXT NOT NULL,
  from_state           TEXT,
  to_state             TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_relations (
  id                   TEXT PRIMARY KEY,
  surah_a              INTEGER NOT NULL,
  surah_b              INTEGER NOT NULL,
  relation_type        TEXT NOT NULL,
  description          TEXT,
  evidence_summary     TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah_a) REFERENCES qr_surahs(id),
  FOREIGN KEY (surah_b) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_rhetoric_profiles (
  surah                INTEGER PRIMARY KEY,
  dominant_mode        TEXT,
  clause_density       TEXT,
  emphasis_patterns    TEXT,
  suspension_use       TEXT,
  contrast_patterns    TEXT,
  rhetorical_devices   TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_sequence_patterns (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  sequence_type          TEXT NOT NULL,
  stages_json            TEXT NOT NULL,
  description            TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_structural_pivots (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  pivot_index            INTEGER NOT NULL,
  ayah                   INTEGER NOT NULL,
  pivot_type             TEXT NOT NULL,
  description            TEXT NOT NULL,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, pivot_index),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_structure_links (
  id                     TEXT PRIMARY KEY,
  surah                  INTEGER NOT NULL,
  from_unit_id           TEXT NOT NULL,
  to_unit_id             TEXT NOT NULL,
  link_type              TEXT NOT NULL,
  link_evidence          TEXT,
  note_md                TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_unit_id) REFERENCES qr_surah_structure_units(id),
  FOREIGN KEY (to_unit_id)   REFERENCES qr_surah_structure_units(id)
);

CREATE TABLE qr_surah_structure_readings (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_structure_units (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_study_passages (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_study_steps (
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
  FOREIGN KEY (passage_id) REFERENCES qr_surah_study_passages(id) ON DELETE CASCADE
);

CREATE TABLE qr_surah_study_task_json_chunks (
  task_id       TEXT NOT NULL,
  passage_id    TEXT NOT NULL,
  chunk_index   INTEGER NOT NULL,
  chunk_text    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, chunk_index),
  FOREIGN KEY (task_id)    REFERENCES qr_surah_study_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (passage_id) REFERENCES qr_surah_study_passages(id) ON DELETE CASCADE
);

CREATE TABLE qr_surah_study_tasks (
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

  FOREIGN KEY (passage_id) REFERENCES qr_surah_study_passages(id) ON DELETE CASCADE,
  FOREIGN KEY (step_id)    REFERENCES qr_surah_study_steps(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_task_id) REFERENCES qr_surah_study_tasks(id) ON DELETE CASCADE
);

CREATE TABLE qr_surah_symmetry_patterns (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_theme_profiles (
  surah                INTEGER PRIMARY KEY,
  primary_theme        TEXT NOT NULL,
  secondary_themes     TEXT,
  theological_axis     TEXT,
  ethical_axis         TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_theology_profiles (
  surah                INTEGER PRIMARY KEY,
  divine_attributes    TEXT,
  prophethood_aspects  TEXT,
  eschatology_aspects  TEXT,
  cosmology_aspects    TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_topic_flows (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surah_worldview_profiles (
  surah                INTEGER PRIMARY KEY,
  anthropology_notes   TEXT,
  value_architecture   TEXT,
  moral_universe       TEXT,
  divine_human_rel     TEXT,
  worldview_tensions   TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_surahs (
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

CREATE TABLE qr_tafsir_entries (
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
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
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

CREATE TABLE qr_tradition_sources (
  id                   TEXT PRIMARY KEY,
  tradition_name       TEXT NOT NULL,
  source_text          TEXT NOT NULL,
  source_content       TEXT,
  relevance_note       TEXT,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_translation_passages (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah_from         INTEGER NOT NULL,
  ayah_to           INTEGER NOT NULL,
  passage_translation TEXT NOT NULL,
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES qr_translation_sources(id)
);

CREATE TABLE qr_translation_sources (
  id                TEXT PRIMARY KEY,
  source_code       TEXT NOT NULL UNIQUE,
  translator_name   TEXT NOT NULL,
  language          TEXT NOT NULL DEFAULT 'en',
  edition           TEXT,
  is_default        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE qr_translations (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  translation_text  TEXT NOT NULL,
  footnote_md       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_id, surah, ayah),
  FOREIGN KEY (source_id) REFERENCES qr_translation_sources(id)
);

CREATE TABLE qr_word_occurrences (
  id                  TEXT PRIMARY KEY,
  surah               INTEGER NOT NULL,
  ayah                INTEGER NOT NULL,
  word_index          INTEGER NOT NULL,
  word_text           TEXT NOT NULL,
  word_text_bare      TEXT,
  root                TEXT,
  lemma               TEXT,
  pos                 TEXT,
  morphology_tag      TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  -- morphology_tag_json was added later via ALTER TABLE so it appears
  -- after created_at in live D1; ordering matters here only insofar as
  -- this file should reflect the deployed shape verbatim.
  morphology_tag_json JSON CHECK (morphology_tag_json IS NULL OR json_valid(morphology_tag_json)),
  UNIQUE (surah, ayah, word_index),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE TABLE qr_worldview_edges (
  id                   TEXT PRIMARY KEY,
  from_node_id         TEXT NOT NULL,
  to_node_id           TEXT NOT NULL,
  relation_type        TEXT NOT NULL,
  note_md              TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_node_id) REFERENCES qr_worldview_nodes(id),
  FOREIGN KEY (to_node_id)   REFERENCES qr_worldview_nodes(id)
);

CREATE TABLE qr_worldview_nodes (
  id                   TEXT PRIMARY KEY,
  surah                INTEGER,
  node_type            TEXT NOT NULL,
  label_en             TEXT NOT NULL,
  label_ar             TEXT,
  summary_md           TEXT,
  source_claim_id      TEXT,
  wv_node_ref          TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

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
FROM qr_surah_study_tasks t
JOIN qr_surah_study_passages p ON p.id = t.passage_id
LEFT JOIN qr_surah_study_tasks parent ON parent.id = t.parent_task_id;

CREATE INDEX idx_qra_page  ON qr_ayah(page_number);

CREATE INDEX idx_qra_surah ON qr_ayah(surah);

CREATE INDEX idx_qrac_scope ON qr_analysis_claims(scope_id);

CREATE INDEX idx_qrac_type  ON qr_analysis_claims(claim_type);

CREATE INDEX idx_qrap_question ON qr_academic_positions(question_id);

CREATE INDEX idx_qrar_from ON qr_argument_relations(from_argument_id);

CREATE INDEX idx_qrar_to   ON qr_argument_relations(to_argument_id);

CREATE INDEX idx_qrarg_surah ON qr_arguments(surah);

CREATE INDEX idx_qrarg_type  ON qr_arguments(argument_type);

CREATE INDEX idx_qras_surah ON qr_analysis_scopes(surah);

CREATE INDEX idx_qras_type  ON qr_analysis_scopes(scope_type);

CREATE INDEX idx_qrcel_claim    ON qr_claim_evidence_links(claim_id);

CREATE INDEX idx_qrcel_evidence ON qr_claim_evidence_links(evidence_id);

CREATE INDEX idx_qrcl_parent   ON qr_ss_occ_clause(parent_clause_id);

CREATE INDEX idx_qrcl_sentence ON qr_ss_occ_clause(sentence_id);

CREATE INDEX idx_qrcl_surah    ON qr_ss_occ_clause(surah, ayah_from);

CREATE INDEX idx_qrdc_surah ON qr_debate_clusters(surah);

CREATE INDEX idx_qrdc_type  ON qr_debate_clusters(cluster_type);

CREATE INDEX idx_qrdi_scope ON qr_diagram_instances(scope_type, scope_ref);

CREATE INDEX idx_qrdi_spec  ON qr_diagram_instances(spec_id);

CREATE INDEX idx_qrdl_scope ON qr_doc_links(qr_scope_type, qr_scope_id);

CREATE INDEX idx_qrei_type ON qr_evidence_items(evidence_type);

CREATE INDEX idx_qrid_surah ON qr_interpretive_differences(surah, ayah_from);

CREATE INDEX idx_qrl_root ON qr_lemmas(root);

CREATE INDEX idx_qrlo_lemma      ON qr_lemma_occurrences(lemma_id);

CREATE INDEX idx_qrlo_surah_ayah ON qr_lemma_occurrences(surah, ayah);

CREATE INDEX idx_qrmw_type ON qr_material_witnesses(witness_type);

CREATE INDEX idx_qrmwo_witness ON qr_material_witness_observations(witness_id);

CREATE INDEX idx_qrph_clause ON qr_ss_occ_phrase(clause_id);

CREATE INDEX idx_qrph_surah  ON qr_ss_occ_phrase(surah, ayah);

CREATE INDEX idx_qrpiv_surah ON qr_surah_structural_pivots(surah);

CREATE INDEX idx_qrpll_page ON qr_page_layout_lines(page_number);

CREATE INDEX idx_qr_mushaf_layout_page
  ON qr_mushaf_layout_lines(layout_key, page_number, line_number);

CREATE INDEX idx_qr_mushaf_layout_surah
  ON qr_mushaf_layout_lines(layout_key, surah_number);

CREATE INDEX idx_qrqbq_from ON qr_quran_bil_quran_relations(from_surah, from_ayah);

CREATE INDEX idx_qrqbq_to   ON qr_quran_bil_quran_relations(to_surah, to_ayah);

CREATE INDEX idx_qrsbl_scope ON qr_ss_scope_balagha_link(scope_type, scope_id);

CREATE INDEX idx_qrschp_era    ON qr_scholar_profiles(era);

CREATE INDEX idx_qrschp_madhab ON qr_scholar_profiles(madhab);

CREATE INDEX idx_qrschw_scholar ON qr_scholar_works(scholar_id);

CREATE INDEX idx_qrscpos_scholar ON qr_scholar_positions(scholar_id);

CREATE INDEX idx_qrscpos_scope   ON qr_scholar_positions(surah, ayah_from);

CREATE INDEX idx_qrscr_from ON qr_ss_scope_relations(from_scope_type, from_scope_id);

CREATE INDEX idx_qrscr_to   ON qr_ss_scope_relations(to_scope_type, to_scope_id);

CREATE INDEX idx_qrscs_surah ON qr_surah_coherence_signals(surah);

CREATE INDEX idx_qrsee_sentence ON qr_ss_ellipsis_event(sentence_id);

CREATE INDEX idx_qrseg_surah ON qr_ss_occ_segment(surah, ayah);

CREATE INDEX idx_qrseg_word  ON qr_ss_occ_segment(word_occurrence_id);

CREATE INDEX idx_qrsen_surah ON qr_ss_occ_sentence(surah, ayah_from);

CREATE INDEX idx_qrsgl_scope ON qr_ss_scope_grammar_link(scope_type, scope_id);

-- qr_irab_book_entries is already covered by idx_qr_irab_book_entries_chunk
-- and idx_qr_irab_book_entries_mapping (declared near the table); the four
-- duplicate idx_qr_irab_* indexes that used to live here were never applied
-- to live D1 and have been removed to keep this file in sync.

CREATE INDEX idx_qrsmc_surah ON qr_surah_motif_clusters(surah);

CREATE INDEX idx_qrsml_scope ON qr_ss_scope_morph_link(scope_type, scope_id);

CREATE INDEX idx_qrsmm_scope ON qr_ss_scope_member_map(scope_type, scope_id);

CREATE INDEX idx_qrsmm_word  ON qr_ss_scope_member_map(word_occurrence_id);

CREATE INDEX idx_qrsn_scope ON qr_scope_nuances(scope_id);

CREATE INDEX idx_qrsp_range ON qr_surah_passages(surah, ayah_from, ayah_to);

CREATE INDEX idx_qrsp_surah ON qr_surah_passages(surah);

CREATE INDEX idx_qrsr_surah_a ON qr_surah_relations(surah_a);

CREATE INDEX idx_qrsr_surah_b ON qr_surah_relations(surah_b);

CREATE INDEX idx_qrsrs_surah ON qr_surah_register_shifts(surah);

CREATE INDEX idx_qrssn_scope ON qr_ss_scope_nuance(scope_type, scope_id);

CREATE INDEX idx_qrssp_range
  ON qr_surah_study_passages(surah, ayah_from, ayah_to);

CREATE INDEX idx_qrssp_surah
  ON qr_surah_study_passages(surah, passage_no);

CREATE INDEX idx_qrssr_scope ON qr_ss_scope_reading(scope_type, scope_id);

CREATE INDEX idx_qrssr_surah ON qr_surah_structure_readings(surah);

CREATE INDEX idx_qrsss_passage_order
  ON qr_surah_study_steps(passage_id, step_no);

CREATE INDEX idx_qrsst_parent
  ON qr_surah_study_tasks(parent_task_id, step_no);

CREATE INDEX idx_qrsst_passage_type
  ON qr_surah_study_tasks(passage_id, task_type, step_no);

CREATE UNIQUE INDEX idx_qrsst_root_type_unique
  ON qr_surah_study_tasks(passage_id, task_type)
  WHERE parent_task_id IS NULL;

CREATE INDEX idx_qrsstjc_passage
  ON qr_surah_study_task_json_chunks(passage_id, task_id, chunk_index);

CREATE INDEX idx_qrssu_surah ON qr_surah_structure_units(surah);

CREATE INDEX idx_qrst_surah  ON qr_scope_topics(surah);

CREATE INDEX idx_qrst_topic  ON qr_scope_topics(topic_id);

CREATE INDEX idx_qrste_tree ON qr_ss_tree_edge(tree_id);

CREATE INDEX idx_qrstf_surah ON qr_surah_topic_flows(surah);

CREATE INDEX idx_qrstn_parent ON qr_ss_tree_node(parent_node_id);

CREATE INDEX idx_qrstn_tree   ON qr_ss_tree_node(tree_id);

CREATE INDEX idx_qrsyn_dep   ON qr_ss_syntax_relations(dep_word_id);

CREATE INDEX idx_qrsyn_head  ON qr_ss_syntax_relations(head_word_id);

CREATE INDEX idx_qrsyn_surah ON qr_ss_syntax_relations(surah, ayah);

CREATE INDEX idx_qrte_scholar ON qr_tafsir_entries(scholar_id);

CREATE INDEX idx_qrte_surah   ON qr_tafsir_entries(surah, ayah_from);

CREATE INDEX idx_qrtp_source_surah ON qr_translation_passages(source_id, surah);

CREATE INDEX idx_qrtr_source_surah ON qr_translations(source_id, surah);

CREATE INDEX idx_qrwo_lemma      ON qr_word_occurrences(lemma);

CREATE INDEX idx_qrwo_root       ON qr_word_occurrences(root);

CREATE INDEX idx_qrwo_surah_ayah ON qr_word_occurrences(surah, ayah);

CREATE INDEX idx_qrwvn_surah ON qr_worldview_nodes(surah);

CREATE INDEX idx_qrwvn_type  ON qr_worldview_nodes(node_type);

-- ─── FTS5 virtual tables ──────────────────────────────────────────────────────
-- Full-text search indexes mirroring source tables. SQLite auto-creates the
-- shadow tables (_config, _content, _data, _docsize, _idx) when these are
-- created; do not list them here. These FTS tables are populated from
-- application code (no auto-sync triggers — searches across analysis_claims,
-- evidence_items, scholar_profiles, scholar_positions, and the surah-study
-- scope nuance/reading tables).

CREATE VIRTUAL TABLE qr_analysis_claims_fts USING fts5(
  scope_id UNINDEXED,
  claim_type,
  claim_text,
  claim_text_ar
);

CREATE VIRTUAL TABLE qr_evidence_items_fts USING fts5(
  evidence_type,
  provenance,
  content_text,
  content_text_ar
);

CREATE VIRTUAL TABLE qr_scholar_positions_fts USING fts5(
  scholar_id UNINDEXED,
  surah UNINDEXED,
  position_type,
  position_text_ar,
  position_text_en,
  position_summary
);

CREATE VIRTUAL TABLE qr_scholar_profiles_fts USING fts5(
  name_ar,
  name_en,
  laqab,
  nisba,
  biography_md
);

CREATE VIRTUAL TABLE qr_ss_scope_nuance_fts USING fts5(
  scope_type UNINDEXED,
  scope_id UNINDEXED,
  nuance_type,
  nuance_text,
  nuance_text_ar
);

CREATE VIRTUAL TABLE qr_ss_scope_reading_fts USING fts5(
  scope_type UNINDEXED,
  scope_id UNINDEXED,
  reading_type,
  reading_text,
  reading_text_ar
);

CREATE TABLE qr_passage_sections (
  id           TEXT PRIMARY KEY,
  passage_id   TEXT NOT NULL,
  surah        INTEGER NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  section_key  TEXT,
  title        TEXT,
  badge        TEXT,
  tone         TEXT,
  renderer     TEXT NOT NULL,
  data_json    TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
