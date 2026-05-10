-- Schema for km_arabic_linguistic.
-- Generated from remote Cloudflare D1 sqlite_schema with data excluded.
-- Internal D1 bookkeeping tables and FTS5 shadow tables are omitted.

CREATE TABLE ar_ling_arabic_links (
  id              TEXT PRIMARY KEY,
  al_entity_ref   TEXT NOT NULL,
  al_entity_type  TEXT NOT NULL,
  ar_entity_ref   TEXT NOT NULL,
  ar_entity_type  TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'referenced_by',
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_balagha_branches (
  id              TEXT PRIMARY KEY,
  branch_key      TEXT NOT NULL UNIQUE,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
);

CREATE TABLE ar_ling_balagha_concepts (
  id              TEXT PRIMARY KEY,
  parent_id       TEXT,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  branch          TEXT NOT NULL,
  concept_type    TEXT NOT NULL DEFAULT 'device',
  definition_ar   TEXT,
  definition_en   TEXT,
  effect_md       TEXT,
  discipline_unit_id TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_balagha_concepts(id)
);

CREATE VIRTUAL TABLE ar_ling_balagha_concepts_fts USING fts5(name_ar, name_en, definition_ar, definition_en);

CREATE TABLE ar_ling_balagha_examples (
  id              TEXT PRIMARY KEY,
  balagha_id      TEXT NOT NULL,
  example_ar      TEXT NOT NULL,
  example_en      TEXT,
  source_type     TEXT NOT NULL DEFAULT 'quran',
  qr_ref          TEXT,
  source_ref      TEXT,
  analysis_md     TEXT,
  note_md         TEXT,
  FOREIGN KEY (balagha_id) REFERENCES ar_ling_balagha_concepts(id)
);

CREATE TABLE ar_ling_clause_types (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  clause_function TEXT,
  description_md  TEXT
);

CREATE TABLE ar_ling_collocations (
  id              TEXT PRIMARY KEY,
  lemma_a_id      TEXT NOT NULL,
  lemma_b_id      TEXT NOT NULL,
  collocation_type TEXT NOT NULL DEFAULT 'general',
  frequency_note  TEXT,
  note_md         TEXT,
  UNIQUE (lemma_a_id, lemma_b_id, collocation_type),
  FOREIGN KEY (lemma_a_id) REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (lemma_b_id) REFERENCES ar_ling_lemmas(id)
);

CREATE TABLE ar_ling_conjugation_templates (
  id              TEXT PRIMARY KEY,
  paradigm_id     TEXT NOT NULL,
  person          TEXT NOT NULL,
  tense           TEXT NOT NULL,
  voice           TEXT NOT NULL DEFAULT 'active',
  template_form   TEXT NOT NULL,
  note_md         TEXT,
  FOREIGN KEY (paradigm_id) REFERENCES ar_ling_form_paradigms(id)
);

CREATE TABLE ar_ling_content_links (
  id              TEXT PRIMARY KEY,
  al_entity_ref   TEXT NOT NULL,
  al_entity_type  TEXT NOT NULL,
  cm_entity_ref   TEXT NOT NULL,
  cm_entity_type  TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'cited_in',
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_discipline_containers (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  parent_id       TEXT,
  discipline      TEXT NOT NULL,
  description_md  TEXT,
  FOREIGN KEY (parent_id) REFERENCES ar_ling_discipline_containers(id)
);

CREATE TABLE ar_ling_discipline_relations (
  id              TEXT PRIMARY KEY,
  from_unit_id    TEXT NOT NULL,
  to_unit_id      TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
  note_md         TEXT,
  FOREIGN KEY (from_unit_id) REFERENCES ar_ling_discipline_units(id),
  FOREIGN KEY (to_unit_id)   REFERENCES ar_ling_discipline_units(id)
);

CREATE TABLE ar_ling_discipline_units (
  id              TEXT PRIMARY KEY,
  container_id    TEXT NOT NULL,
  parent_unit_id  TEXT,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  unit_type       TEXT NOT NULL DEFAULT 'concept',
  description_md  TEXT,
  seq             INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (container_id)    REFERENCES ar_ling_discipline_containers(id),
  FOREIGN KEY (parent_unit_id)  REFERENCES ar_ling_discipline_units(id)
);

CREATE TABLE ar_ling_evidence_items (
  id              TEXT PRIMARY KEY,
  evidence_type   TEXT NOT NULL,
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  qr_ref          TEXT,
  source_ref      TEXT,
  locator_json    TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE ar_ling_evidence_items_fts USING fts5(text_ar, text_en, note_md);

CREATE TABLE ar_ling_expression_tokens (
  id              TEXT PRIMARY KEY,
  expression_id   TEXT NOT NULL,
  token_position  INTEGER NOT NULL,
  token_text      TEXT NOT NULL,
  lemma_id        TEXT,
  note_md         TEXT,
  FOREIGN KEY (expression_id) REFERENCES ar_ling_expressions(id),
  FOREIGN KEY (lemma_id)      REFERENCES ar_ling_lemmas(id)
);

CREATE TABLE ar_ling_expression_types (
  id              TEXT PRIMARY KEY,
  type_key        TEXT NOT NULL UNIQUE,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
);

CREATE TABLE ar_ling_expressions (
  id              TEXT PRIMARY KEY,
  expression_ar   TEXT NOT NULL,
  expression_en   TEXT NOT NULL,
  expression_type_id TEXT,
  primary_lemma_id TEXT,
  explanation_md  TEXT,
  qr_refs_json    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (expression_type_id) REFERENCES ar_ling_expression_types(id),
  FOREIGN KEY (primary_lemma_id)   REFERENCES ar_ling_lemmas(id)
);

CREATE VIRTUAL TABLE ar_ling_expressions_fts USING fts5(expression_ar, expression_en, explanation_md);

CREATE TABLE ar_ling_form_paradigms (
  id              TEXT PRIMARY KEY,
  paradigm_name   TEXT NOT NULL,
  paradigm_type   TEXT NOT NULL,
  verb_form       TEXT,
  root_type       TEXT,
  paradigm_json   TEXT NOT NULL,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_inflection_rules (
  id              TEXT PRIMARY KEY,
  rule_name       TEXT NOT NULL,
  rule_type       TEXT NOT NULL,
  applies_to      TEXT NOT NULL,
  rule_description_md TEXT NOT NULL,
  example_before  TEXT,
  example_after   TEXT,
  note_md         TEXT
);

CREATE TABLE ar_ling_lemma_morphology (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  morphology_id   TEXT NOT NULL,
  inflected_form  TEXT,
  UNIQUE (lemma_id, morphology_id),
  FOREIGN KEY (lemma_id)      REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (morphology_id) REFERENCES ar_ling_morphology(id)
);

CREATE TABLE ar_ling_lemma_registers (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  register        TEXT NOT NULL,
  frequency_note  TEXT,
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE TABLE ar_ling_lemma_root_links (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  root_id         TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'primary',
  note_md         TEXT,
  UNIQUE (lemma_id, root_id),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (root_id)  REFERENCES ar_ling_roots(id)
);

CREATE TABLE ar_ling_lemma_variants (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  variant_text    TEXT NOT NULL,
  variant_type    TEXT NOT NULL DEFAULT 'alternate',
  note_md         TEXT,
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE TABLE ar_ling_lemmas (
  id              TEXT PRIMARY KEY,
  root_id         TEXT,
  lemma_text      TEXT NOT NULL,
  lemma_text_bare TEXT,
  part_of_speech  TEXT NOT NULL DEFAULT 'noun',
  verb_form       TEXT,
  is_quran_word   INTEGER NOT NULL DEFAULT 0,
  frequency_quran INTEGER NOT NULL DEFAULT 0,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE VIRTUAL TABLE ar_ling_lemmas_fts USING fts5(lemma_text, lemma_text_bare);

CREATE TABLE ar_ling_lexicon_entries (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  entry_text      TEXT NOT NULL,
  definition_ar   TEXT,
  definition_en   TEXT NOT NULL,
  definition_source TEXT,
  usage_register  TEXT NOT NULL DEFAULT 'classical',
  root_id         TEXT,
  source_id       TEXT,
  source_slug     TEXT,
  source_chunk_id TEXT,
  entry_kind      TEXT,
  heading_norm    TEXT,
  source_entry_seq INTEGER,
  page_no         INTEGER,
  volume_no       INTEGER,
  tokens_approx   INTEGER,
  title_ar        TEXT,
  title_en        TEXT,
  display_heading_ar TEXT,
  display_heading_en TEXT,
  heading_key     TEXT,
  lemma_text      TEXT,
  root_text       TEXT,
  transliteration TEXT,
  pos_tag         TEXT,
  gloss_ar        TEXT,
  gloss_en        TEXT,
  summary_ar      TEXT,
  summary_en      TEXT,
  source_url      TEXT,
  is_embedded     INTEGER NOT NULL DEFAULT 0,
  qdrant_id       TEXT,
  embed_model     TEXT,
  meta_json       JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  semantic_field  TEXT,
  related_lemmas  JSON CHECK (related_lemmas IS NULL OR json_valid(related_lemmas)),
  sense_json      JSON CHECK (sense_json IS NULL OR json_valid(sense_json)),
  morphology_json JSON CHECK (morphology_json IS NULL OR json_valid(morphology_json)),
  examples_json   JSON CHECK (examples_json IS NULL OR json_valid(examples_json)),
  citations_json  JSON CHECK (citations_json IS NULL OR json_valid(citations_json)),
  ui_json         JSON CHECK (ui_json IS NULL OR json_valid(ui_json)),
  ai_json         JSON CHECK (ai_json IS NULL OR json_valid(ai_json)),
  cleaner_json    JSON CHECK (cleaner_json IS NULL OR json_valid(cleaner_json)),
  status          TEXT NOT NULL DEFAULT 'raw_promoted',
  quality_score   REAL,
  ai_fill_state   TEXT NOT NULL DEFAULT 'pending',
  ai_model        TEXT,
  ai_filled_at    TEXT,
  reviewed_at     TEXT,
  sort_key        TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id),
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_entries_fts USING fts5(
  entry_text,
  heading_norm,
  title_ar,
  title_en,
  display_heading_ar,
  display_heading_en,
  gloss_ar,
  gloss_en,
  summary_ar,
  summary_en,
  definition_ar,
  definition_en,
  definition_source,
  source_slug,
  content='ar_ling_lexicon_entries',
  content_rowid='rowid'
);

CREATE TABLE ar_ling_lexicon_evidence (
  id              TEXT PRIMARY KEY,
  lexicon_entry_id TEXT NOT NULL,
  sense_id        TEXT,
  evidence_type   TEXT NOT NULL DEFAULT 'quran',
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  qr_ref          TEXT,
  source_ref      TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id),
  FOREIGN KEY (sense_id)         REFERENCES ar_ling_senses(id)
);

CREATE VIRTUAL TABLE ar_ling_lexicon_evidence_fts USING fts5(text_ar, text_en, note_md);

CREATE TABLE ar_ling_lexicon_morphology (
  id              TEXT PRIMARY KEY,
  lexicon_entry_id TEXT NOT NULL,
  morphology_id   TEXT NOT NULL,
  inflected_form  TEXT,
  UNIQUE (lexicon_entry_id, morphology_id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id),
  FOREIGN KEY (morphology_id)    REFERENCES ar_ling_morphology(id)
);

CREATE TABLE ar_ling_morphology (
  id              TEXT PRIMARY KEY,
  pattern         TEXT NOT NULL,
  gender          TEXT,
  number          TEXT,
  case_marker     TEXT,
  tense           TEXT,
  voice           TEXT,
  person          TEXT,
  definiteness    TEXT,
  derivation_type TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_nahw_concepts (
  id              TEXT PRIMARY KEY,
  parent_id       TEXT,
  concept_name_ar TEXT NOT NULL,
  concept_name_en TEXT NOT NULL,
  concept_type    TEXT NOT NULL DEFAULT 'rule',
  definition_ar   TEXT,
  definition_en   TEXT,
  example_ar      TEXT,
  irab_label      TEXT,
  discipline_unit_id TEXT,
  source_ref      TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_nahw_concepts(id)
);

-- Core i'rab labels are seeded from seeds/ar_ling/nahw_irab_core_seed.sql.

CREATE VIRTUAL TABLE ar_ling_nahw_concepts_fts USING fts5(concept_name_ar, concept_name_en, definition_ar, definition_en);

CREATE TABLE ar_ling_nahw_relations (
  id              TEXT PRIMARY KEY,
  from_concept_id TEXT NOT NULL,
  to_concept_id   TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
  note_md         TEXT,
  FOREIGN KEY (from_concept_id) REFERENCES ar_ling_nahw_concepts(id),
  FOREIGN KEY (to_concept_id)   REFERENCES ar_ling_nahw_concepts(id)
);

CREATE TABLE ar_ling_near_synonym_sets (
  id                TEXT PRIMARY KEY,
  set_name          TEXT NOT NULL,
  description_md    TEXT NOT NULL,
  slug              TEXT,
  canonical_en      TEXT,
  canonical_ar      TEXT,
  canonical_ur      TEXT,
  semantic_domain_id TEXT,
  pos_hint          TEXT DEFAULT 'mixed',
  short_summary     TEXT,
  source_status     TEXT DEFAULT 'manual',
  confidence        TEXT DEFAULT 'needs_review',
  review_status     TEXT DEFAULT 'draft',
  updated_at        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_near_synonym_members (
  id                  TEXT PRIMARY KEY,
  set_id              TEXT NOT NULL,
  lemma_id            TEXT NOT NULL,
  nuance_note         TEXT NOT NULL,
  arabic_display      TEXT,
  arabic_bare         TEXT,
  basic_gloss         TEXT,
  basic_gloss_ur      TEXT,
  contrast_note       TEXT,
  contrast_note_ur    TEXT,
  usage_rule          TEXT,
  usage_rule_ur       TEXT,
  quran_usage_pattern TEXT,
  quran_usage_pattern_ur TEXT,
  nuance_note_ur      TEXT,
  source_status       TEXT DEFAULT 'manual',
  claim_basis         TEXT DEFAULT 'direct_source',
  confidence          TEXT DEFAULT 'needs_review',
  sort_order          INTEGER DEFAULT 0,
  UNIQUE (set_id, lemma_id),
  FOREIGN KEY (set_id)   REFERENCES ar_ling_near_synonym_sets(id),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE TABLE ar_ling_near_synonym_set_sources (
  id          TEXT PRIMARY KEY,
  set_id      TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  chunk_id    TEXT,
  source_role TEXT NOT NULL DEFAULT 'evidence',
  source_path TEXT,
  source_url  TEXT,
  note_md     TEXT,
  confidence  TEXT NOT NULL DEFAULT 'needs_review',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (set_id, source_id, chunk_id)
);

CREATE TABLE ar_ling_near_synonym_member_sources (
  id          TEXT PRIMARY KEY,
  member_id   TEXT NOT NULL,
  source_id   TEXT NOT NULL,
  chunk_id    TEXT,
  claim_type  TEXT NOT NULL DEFAULT 'nuance',
  claim_text  TEXT NOT NULL,
  claim_basis TEXT NOT NULL DEFAULT 'direct_source',
  confidence  TEXT NOT NULL DEFAULT 'needs_review',
  note_md     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_near_synonym_evidence (
  id                  TEXT PRIMARY KEY,
  set_id              TEXT NOT NULL,
  member_id           TEXT,
  lemma_id            TEXT,
  qr_ref              TEXT NOT NULL,
  surah               INTEGER NOT NULL,
  ayah                INTEGER NOT NULL,
  word_index          INTEGER,
  word_occurrence_ref TEXT,
  arabic_quote        TEXT,
  translation_quote   TEXT,
  explanation_md      TEXT,
  evidence_type       TEXT NOT NULL DEFAULT 'source_ref',
  source_id           TEXT,
  chunk_id            TEXT,
  confidence          TEXT NOT NULL DEFAULT 'needs_review',
  validation_status   TEXT NOT NULL DEFAULT 'pending',
  note_md             TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_near_synonym_review_queue (
  id           TEXT PRIMARY KEY,
  set_id       TEXT,
  member_id    TEXT,
  evidence_id  TEXT,
  issue_type   TEXT NOT NULL,
  issue_detail TEXT NOT NULL,
  source_id    TEXT,
  chunk_id     TEXT,
  status       TEXT NOT NULL DEFAULT 'open',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT
);

CREATE TABLE ar_ling_phrase_types (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  phrase_class    TEXT,
  description_md  TEXT
);

CREATE TABLE ar_ling_projection_cache (
  id              TEXT PRIMARY KEY,
  cache_key       TEXT NOT NULL UNIQUE,
  cache_type      TEXT NOT NULL,
  payload_json    TEXT NOT NULL,
  source_refs     TEXT,
  expires_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_quran_links (
  id              TEXT PRIMARY KEY,
  al_entity_ref   TEXT NOT NULL,
  al_entity_type  TEXT NOT NULL,
  qr_scope_ref    TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'attests',
  note_md         TEXT,
  confidence      REAL NOT NULL DEFAULT 1.0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_rhetorical_relations (
  id              TEXT PRIMARY KEY,
  from_concept_id TEXT NOT NULL,
  to_concept_id   TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
  note_md         TEXT,
  FOREIGN KEY (from_concept_id) REFERENCES ar_ling_balagha_concepts(id),
  FOREIGN KEY (to_concept_id)   REFERENCES ar_ling_balagha_concepts(id)
);

CREATE TABLE ar_ling_root_relations (
  id              TEXT PRIMARY KEY,
  from_root_id    TEXT NOT NULL,
  to_root_id      TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
  evidence_ref    TEXT,
  note_md         TEXT,
  UNIQUE (from_root_id, to_root_id, relation_type),
  FOREIGN KEY (from_root_id) REFERENCES ar_ling_roots(id),
  FOREIGN KEY (to_root_id)   REFERENCES ar_ling_roots(id)
);

CREATE TABLE ar_ling_root_semantic_fields (
  id              TEXT PRIMARY KEY,
  root_id         TEXT NOT NULL,
  field_name      TEXT NOT NULL,
  is_primary      INTEGER NOT NULL DEFAULT 0,
  note_md         TEXT,
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE TABLE ar_ling_root_variants (
  id              TEXT PRIMARY KEY,
  root_id         TEXT NOT NULL,
  variant_text    TEXT NOT NULL,
  variant_type    TEXT NOT NULL DEFAULT 'alternate',
  note_md         TEXT,
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE TABLE ar_ling_roots (
  id              TEXT PRIMARY KEY,
  root_text       TEXT NOT NULL UNIQUE,
  root_letters    TEXT NOT NULL,
  root_type       TEXT NOT NULL DEFAULT 'trilateral',
  weak_pattern    TEXT,
  frequency_quran  INTEGER NOT NULL DEFAULT 0,
  frequency_hadith INTEGER NOT NULL DEFAULT 0,
  meaning_core_en  TEXT,
  meaning_core_ar  TEXT,
  note_md          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE ar_ling_roots_fts USING fts5(root_text, meaning_core_en, meaning_core_ar);

CREATE TABLE ar_ling_semantic_fields (
  id              TEXT PRIMARY KEY,
  field_name_ar   TEXT NOT NULL,
  field_name_en   TEXT NOT NULL UNIQUE,
  parent_field_id TEXT,
  description_md  TEXT,
  FOREIGN KEY (parent_field_id) REFERENCES ar_ling_semantic_fields(id)
);

CREATE TABLE ar_ling_sense_relations (
  id              TEXT PRIMARY KEY,
  from_sense_id   TEXT NOT NULL,
  to_sense_id     TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
  nuance_note     TEXT,
  FOREIGN KEY (from_sense_id) REFERENCES ar_ling_senses(id),
  FOREIGN KEY (to_sense_id)   REFERENCES ar_ling_senses(id)
);

CREATE TABLE ar_ling_senses (
  id              TEXT PRIMARY KEY,
  lexicon_entry_id TEXT NOT NULL,
  sense_number    INTEGER NOT NULL,
  gloss_ar        TEXT,
  gloss_en        TEXT NOT NULL,
  context_note    TEXT,
  qr_ref          TEXT,
  note_md         TEXT,
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

CREATE TABLE ar_ling_sentence_types (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  sentence_class  TEXT NOT NULL,
  description_md  TEXT
);

CREATE TABLE ar_ling_sentences (
  id              TEXT PRIMARY KEY,
  source_ref      TEXT NOT NULL,
  sentence_text   TEXT NOT NULL,
  sentence_text_bare TEXT,
  sentence_type   TEXT NOT NULL DEFAULT 'prose',
  irab_json       TEXT,
  tree_json       TEXT,
  page_no         INTEGER,
  tokens_json     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_source_chunks (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  edition_id      TEXT,
  chunk_kind      TEXT,
  chunk_seq       INTEGER NOT NULL,
  heading_norm    TEXT,
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  page_no         INTEGER,
  volume_no       INTEGER,
  tokens_approx   INTEGER,
  is_embedded     INTEGER NOT NULL DEFAULT 0,
  qdrant_id       TEXT,
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id)  REFERENCES ar_ling_sources(id),
  FOREIGN KEY (edition_id) REFERENCES ar_ling_source_editions(id)
);

CREATE VIRTUAL TABLE ar_ling_source_chunks_fts USING fts5(heading_norm, text_ar, text_en);

CREATE TABLE ar_ling_source_editions (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  edition_label   TEXT NOT NULL,
  publisher       TEXT,
  year            TEXT,
  volume_count    INTEGER,
  note_md         TEXT,
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id)
);

CREATE TABLE ar_ling_source_index (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  keyword         TEXT NOT NULL,
  chunk_id        TEXT NOT NULL,
  page_no         INTEGER,
  note_md         TEXT,
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (chunk_id)  REFERENCES ar_ling_source_chunks(id)
);

CREATE TABLE ar_ling_source_toc (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  parent_id       TEXT,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  level           INTEGER NOT NULL DEFAULT 1,
  seq             INTEGER NOT NULL,
  page_start      INTEGER,
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_source_toc(id)
);

CREATE TABLE ar_ling_sources (
  id              TEXT PRIMARY KEY,
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  source_type     TEXT NOT NULL DEFAULT 'classical_grammar',
  author_ref      TEXT,
  author_name     TEXT,
  period_label    TEXT,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_syntax_relation_types (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
);

CREATE TABLE ar_ling_token_lexicon_link (
  id              TEXT PRIMARY KEY,
  token_id        TEXT NOT NULL,
  lexicon_entry_id TEXT NOT NULL,
  confidence      REAL NOT NULL DEFAULT 1.0,
  UNIQUE (token_id, lexicon_entry_id),
  FOREIGN KEY (token_id)         REFERENCES ar_ling_tokens(id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

CREATE TABLE ar_ling_tokens (
  id              TEXT PRIMARY KEY,
  token_text      TEXT NOT NULL,
  token_text_bare TEXT,
  lemma_id        TEXT,
  part_of_speech  TEXT,
  source_ref      TEXT,
  page_no         INTEGER,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE INDEX idx_arl_arl_ar     ON ar_ling_arabic_links(ar_entity_ref);

CREATE INDEX idx_arl_arl_entity ON ar_ling_arabic_links(al_entity_ref);

CREATE INDEX idx_arl_bc_branch ON ar_ling_balagha_concepts(branch);

CREATE INDEX idx_arl_bc_parent ON ar_ling_balagha_concepts(parent_id);

CREATE INDEX idx_arl_be_balagha ON ar_ling_balagha_examples(balagha_id);

CREATE INDEX idx_arl_cl_cm     ON ar_ling_content_links(cm_entity_ref);

CREATE INDEX idx_arl_cl_entity ON ar_ling_content_links(al_entity_ref);

CREATE INDEX idx_arl_col_a ON ar_ling_collocations(lemma_a_id);

CREATE INDEX idx_arl_col_b ON ar_ling_collocations(lemma_b_id);

CREATE INDEX idx_arl_ct_paradigm ON ar_ling_conjugation_templates(paradigm_id);

CREATE INDEX idx_arl_dr_from ON ar_ling_discipline_relations(from_unit_id);

CREATE INDEX idx_arl_du_container ON ar_ling_discipline_units(container_id);

CREATE INDEX idx_arl_du_parent    ON ar_ling_discipline_units(parent_unit_id);

CREATE INDEX idx_arl_ei_type ON ar_ling_evidence_items(evidence_type);

CREATE INDEX idx_arl_et_exp ON ar_ling_expression_tokens(expression_id);

CREATE INDEX idx_arl_exp_lemma ON ar_ling_expressions(primary_lemma_id);

CREATE INDEX idx_arl_exp_type  ON ar_ling_expressions(expression_type_id);

CREATE INDEX idx_arl_fp_type ON ar_ling_form_paradigms(paradigm_type);

CREATE INDEX idx_arl_le_lemma ON ar_ling_lexicon_entries(lemma_id);

CREATE INDEX idx_arl_le_reg   ON ar_ling_lexicon_entries(usage_register);

CREATE INDEX idx_arl_le_root ON ar_ling_lexicon_entries(root_id);

CREATE INDEX idx_arl_le_source ON ar_ling_lexicon_entries(source_id);

CREATE INDEX idx_arl_le_source_slug ON ar_ling_lexicon_entries(source_slug);

CREATE UNIQUE INDEX ux_arl_le_source_chunk
  ON ar_ling_lexicon_entries(source_chunk_id)
  WHERE source_chunk_id IS NOT NULL;

CREATE INDEX idx_arl_le_heading ON ar_ling_lexicon_entries(heading_norm);

CREATE INDEX idx_arl_le_heading_key ON ar_ling_lexicon_entries(heading_key);

CREATE INDEX idx_arl_le_heading_source ON ar_ling_lexicon_entries(heading_norm, source_slug);

CREATE INDEX idx_arl_le_status ON ar_ling_lexicon_entries(status);

CREATE INDEX idx_arl_le_ai_fill_state ON ar_ling_lexicon_entries(ai_fill_state);

CREATE INDEX idx_arl_le_sort_key ON ar_ling_lexicon_entries(sort_key);

CREATE INDEX idx_arl_le_embedded ON ar_ling_lexicon_entries(is_embedded);

CREATE INDEX idx_arl_le_qdrant ON ar_ling_lexicon_entries(qdrant_id);

CREATE INDEX idx_arl_lem_pos  ON ar_ling_lemmas(part_of_speech);

CREATE INDEX idx_arl_lem_qrn  ON ar_ling_lemmas(is_quran_word);

CREATE INDEX idx_arl_lem_root ON ar_ling_lemmas(root_id);

CREATE INDEX idx_arl_lev_entry ON ar_ling_lexicon_evidence(lexicon_entry_id);

CREATE INDEX idx_arl_lev_type  ON ar_ling_lexicon_evidence(evidence_type);

CREATE INDEX idx_arl_lm_lemma ON ar_ling_lemma_morphology(lemma_id);

CREATE INDEX idx_arl_lm_morph ON ar_ling_lemma_morphology(morphology_id);

CREATE INDEX idx_arl_lr_lemma    ON ar_ling_lemma_registers(lemma_id);

CREATE INDEX idx_arl_lr_register ON ar_ling_lemma_registers(register);

CREATE INDEX idx_arl_lrl_lemma ON ar_ling_lemma_root_links(lemma_id);

CREATE INDEX idx_arl_lrl_root  ON ar_ling_lemma_root_links(root_id);

CREATE INDEX idx_arl_lv_lemma ON ar_ling_lemma_variants(lemma_id);

CREATE INDEX idx_arl_morph_pattern ON ar_ling_morphology(pattern);

CREATE INDEX idx_arl_nc_parent ON ar_ling_nahw_concepts(parent_id);

CREATE INDEX idx_arl_nc_type   ON ar_ling_nahw_concepts(concept_type);

CREATE INDEX idx_arl_nr_from ON ar_ling_nahw_relations(from_concept_id);

CREATE INDEX idx_arl_nsm_lemma         ON ar_ling_near_synonym_members(lemma_id);

CREATE INDEX idx_arl_nsm_set           ON ar_ling_near_synonym_members(set_id);

CREATE INDEX idx_arl_nss_slug          ON ar_ling_near_synonym_sets(slug);

CREATE INDEX idx_arl_nss_domain        ON ar_ling_near_synonym_sets(semantic_domain_id);

CREATE INDEX idx_arl_nsm_set_id        ON ar_ling_near_synonym_members(set_id);

CREATE INDEX idx_arl_nsm_lemma_id      ON ar_ling_near_synonym_members(lemma_id);

CREATE INDEX idx_arl_nsm_arabic_bare   ON ar_ling_near_synonym_members(arabic_bare);

CREATE INDEX idx_arl_nse_set_id        ON ar_ling_near_synonym_evidence(set_id);

CREATE INDEX idx_arl_nse_member_id     ON ar_ling_near_synonym_evidence(member_id);

CREATE INDEX idx_arl_nse_surah_ayah    ON ar_ling_near_synonym_evidence(surah, ayah);

CREATE INDEX idx_arl_nse_qr_ref        ON ar_ling_near_synonym_evidence(qr_ref);

CREATE INDEX idx_arl_pc_type ON ar_ling_projection_cache(cache_type);

CREATE INDEX idx_arl_ql_entity ON ar_ling_quran_links(al_entity_ref);

CREATE INDEX idx_arl_ql_qr     ON ar_ling_quran_links(qr_scope_ref);

CREATE INDEX idx_arl_root_freq ON ar_ling_roots(frequency_quran);

CREATE INDEX idx_arl_root_type ON ar_ling_roots(root_type);

CREATE INDEX idx_arl_rr_from ON ar_ling_rhetorical_relations(from_concept_id);

CREATE INDEX idx_arl_rrel_from ON ar_ling_root_relations(from_root_id);

CREATE INDEX idx_arl_rrel_to   ON ar_ling_root_relations(to_root_id);

CREATE INDEX idx_arl_rsf_field ON ar_ling_root_semantic_fields(field_name);

CREATE INDEX idx_arl_rsf_root  ON ar_ling_root_semantic_fields(root_id);

CREATE INDEX idx_arl_rv_root ON ar_ling_root_variants(root_id);

CREATE INDEX idx_arl_sc_embedded ON ar_ling_source_chunks(is_embedded);

CREATE INDEX idx_arl_sc_kind     ON ar_ling_source_chunks(chunk_kind);

CREATE INDEX idx_arl_sc_source   ON ar_ling_source_chunks(source_id);

CREATE INDEX idx_arl_se_source ON ar_ling_source_editions(source_id);

CREATE INDEX idx_arl_sense_entry ON ar_ling_senses(lexicon_entry_id);

CREATE INDEX idx_arl_sent_src ON ar_ling_sentences(source_ref);

CREATE INDEX idx_arl_si_keyword ON ar_ling_source_index(keyword);

CREATE INDEX idx_arl_si_source  ON ar_ling_source_index(source_id);

CREATE INDEX idx_arl_sr_from ON ar_ling_sense_relations(from_sense_id);

CREATE INDEX idx_arl_src_type ON ar_ling_sources(source_type);

CREATE INDEX idx_arl_toc_source ON ar_ling_source_toc(source_id);

CREATE INDEX idx_arl_tok_lemma ON ar_ling_tokens(lemma_id);
-- Migration 004: Sarf (morphology) canonical tables
-- Domain: km_arabic_linguistics (AL)
-- Created: 2026-04-27
--
-- Six new tables supporting the K-Maps صرف ingestion layer:
--   ar_ling_sarf_notes            - per-word sarf claims (lexicon, grammar, idiom)
--   ar_ling_sarf_tafsir_notes     - tafsir-linked morphology notes
--   ar_ling_verb_frames           - verb + preposition frames with idiomatic meanings
--   ar_ling_verb_frame_evidence   - Quran verse evidence per verb frame
--   ar_ling_antonym_pairs         - antonym/opposition pairs
--   ar_ling_antonym_evidence      - Quran verse evidence per antonym pair
--   ar_ling_sarf_translation_loss - English translation-loss notes
--   ar_ling_sarf_context_activations - tafsir-grounded root-activation notes

-- ── Sarf notes (per-word, non-tafsir sources) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT,                     -- alias for id (same value, for FK references)
    word_occurrence_ref TEXT,          -- "QR:surah:ayah:word_index" typed reference
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    root_text TEXT,
    lemma_text TEXT,
    pattern TEXT,                      -- wazn / morphological pattern
    wazn TEXT,                         -- alternate pattern field
    verb_form TEXT,                    -- Form I–X
    noun_type TEXT,
    derivation_type TEXT,
    sarf_category TEXT NOT NULL,       -- claim_type from schema
    explanation_ar TEXT,
    explanation_en TEXT,
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_asn_surah_ayah ON ar_ling_sarf_notes(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_asn_root ON ar_ling_sarf_notes(root_text);
CREATE INDEX IF NOT EXISTS idx_asn_lemma ON ar_ling_sarf_notes(lemma_text);
CREATE INDEX IF NOT EXISTS idx_asn_word_ref ON ar_ling_sarf_notes(word_occurrence_ref);
CREATE INDEX IF NOT EXISTS idx_asn_confidence ON ar_ling_sarf_notes(confidence);
CREATE INDEX IF NOT EXISTS idx_asn_source ON ar_ling_sarf_notes(source_id);

-- ── Sarf tafsir notes (morphology claims from tafsir sources) ─────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_tafsir_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT,
    word_occurrence_ref TEXT,
    surah INTEGER,
    ayah_from INTEGER,
    ayah_to INTEGER,
    root_text TEXT,
    lemma_text TEXT,
    pattern TEXT,
    note_type TEXT NOT NULL,           -- tafsir_sarf claim_type
    note_ar TEXT,
    note_en TEXT,
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    locator_json TEXT,                 -- {chunk_id, source_id, surah, ayah_from, ayah_to}
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_astn_surah ON ar_ling_sarf_tafsir_notes(surah, ayah_from);
CREATE INDEX IF NOT EXISTS idx_astn_root ON ar_ling_sarf_tafsir_notes(root_text);
CREATE INDEX IF NOT EXISTS idx_astn_lemma ON ar_ling_sarf_tafsir_notes(lemma_text);
CREATE INDEX IF NOT EXISTS idx_astn_note_type ON ar_ling_sarf_tafsir_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_astn_confidence ON ar_ling_sarf_tafsir_notes(confidence);

-- ── Verb frames ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_verb_frames (
    id TEXT PRIMARY KEY,
    root_text TEXT,
    lemma_text TEXT,
    verb_form TEXT,
    preposition TEXT,
    frame_type TEXT NOT NULL,          -- direct/prep_object/double_object/idiom/tadmeen
    literal_meaning_en TEXT,
    idiomatic_meaning_en TEXT,
    idiomatic_meaning_ar TEXT,
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_avf_root ON ar_ling_verb_frames(root_text);
CREATE INDEX IF NOT EXISTS idx_avf_lemma ON ar_ling_verb_frames(lemma_text);
CREATE INDEX IF NOT EXISTS idx_avf_preposition ON ar_ling_verb_frames(preposition);

-- ── Verb frame evidence ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_verb_frame_evidence (
    id TEXT PRIMARY KEY,
    frame_id TEXT NOT NULL REFERENCES ar_ling_verb_frames(id),
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    quote_ar TEXT,
    translation_en TEXT,
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    note_md TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_avfe_frame ON ar_ling_verb_frame_evidence(frame_id);
CREATE INDEX IF NOT EXISTS idx_avfe_surah ON ar_ling_verb_frame_evidence(surah, ayah);

-- ── Antonym pairs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_antonym_pairs (
    id TEXT PRIMARY KEY,
    lemma_a_id TEXT,
    lemma_b_id TEXT,
    root_a TEXT,
    root_b TEXT,
    opposition_type TEXT NOT NULL,     -- direct/conceptual/gradational/complementary/directional/moral_charge
    opposition_note TEXT,
    pair_insight TEXT,
    source_status TEXT DEFAULT 'llm',  -- llm / human / classical_source
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aap_root_a ON ar_ling_antonym_pairs(root_a);
CREATE INDEX IF NOT EXISTS idx_aap_root_b ON ar_ling_antonym_pairs(root_b);

-- ── Antonym evidence ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_antonym_evidence (
    id TEXT PRIMARY KEY,
    pair_id TEXT NOT NULL REFERENCES ar_ling_antonym_pairs(id),
    side TEXT NOT NULL CHECK (side IN ('a','b')),
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    arabic_quote TEXT,
    explanation_md TEXT,
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aae_pair ON ar_ling_antonym_evidence(pair_id);
CREATE INDEX IF NOT EXISTS idx_aae_surah ON ar_ling_antonym_evidence(surah, ayah);

-- ── Translation loss notes ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_translation_loss (
    id TEXT PRIMARY KEY,
    word_occurrence_ref TEXT,
    surah INTEGER,
    ayah INTEGER,
    root_text TEXT,
    lemma_text TEXT,
    loss_type TEXT DEFAULT 'general',
    arabic_feature TEXT,               -- what morphological feature is lost
    english_loss_note TEXT,            -- how it collapses in English
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_astl_surah ON ar_ling_sarf_translation_loss(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_astl_root ON ar_ling_sarf_translation_loss(root_text);

-- ── Context activations (tafsir-grounded root sense per ayah) ─────────────────
CREATE TABLE IF NOT EXISTS ar_ling_sarf_context_activations (
    id TEXT PRIMARY KEY,
    root_text TEXT NOT NULL,
    lemma_text TEXT,
    surah INTEGER,
    ayah INTEGER,
    word_index INTEGER,
    active_sense_ar TEXT,              -- the root sense activated in this context
    active_sense_en TEXT,
    why_this_sense_md TEXT,            -- tafsir-backed explanation
    source_id TEXT REFERENCES ar_ling_sources(id),
    chunk_id TEXT REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review'
        CHECK (confidence IN ('needs_review','checked','approved','rejected')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (review_status IN ('pending','approved','rejected','flagged')),
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_asca_root ON ar_ling_sarf_context_activations(root_text);
CREATE INDEX IF NOT EXISTS idx_asca_surah ON ar_ling_sarf_context_activations(surah, ayah);

-- ── Display block tables (per-domain) ────────────────────────────────────────
-- Each domain gets its own display-block table so reads are narrow and
-- the table name carries the domain. All three share the same column shape.

-- Lexicon display blocks — Lane / classical lexicon entries (0011 + 0012)
CREATE TABLE IF NOT EXISTS ar_ling_source_lexicon_display_blocks (
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
CREATE INDEX IF NOT EXISTS idx_arl_sdb_source ON ar_ling_source_lexicon_display_blocks(source_id);
CREATE INDEX IF NOT EXISTS idx_arl_sdb_chunk  ON ar_ling_source_lexicon_display_blocks(source_chunk_id, block_seq);
CREATE INDEX IF NOT EXISTS idx_arl_sdb_entry  ON ar_ling_source_lexicon_display_blocks(lexicon_entry_id);
CREATE INDEX IF NOT EXISTS idx_arl_sdb_type   ON ar_ling_source_lexicon_display_blocks(block_type);

-- Iraab display blocks — إعراب syntactic-analysis entries (0012)
CREATE TABLE IF NOT EXISTS ar_ling_source_iraab_display_blocks (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  source_chunk_id   TEXT NOT NULL,
  iraab_entry_id    TEXT,
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
  FOREIGN KEY (source_id)       REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_idb_source ON ar_ling_source_iraab_display_blocks(source_id);
CREATE INDEX IF NOT EXISTS idx_arl_idb_chunk  ON ar_ling_source_iraab_display_blocks(source_chunk_id, block_seq);
CREATE INDEX IF NOT EXISTS idx_arl_idb_entry  ON ar_ling_source_iraab_display_blocks(iraab_entry_id);
CREATE INDEX IF NOT EXISTS idx_arl_idb_type   ON ar_ling_source_iraab_display_blocks(block_type);

-- Tafsir display blocks — تفسير exegesis entries (0012)
CREATE TABLE IF NOT EXISTS ar_ling_source_tafsir_display_blocks (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  source_chunk_id   TEXT NOT NULL,
  tafsir_entry_id   TEXT,
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
  FOREIGN KEY (source_id)       REFERENCES ar_ling_sources(id),
  FOREIGN KEY (source_chunk_id) REFERENCES ar_ling_source_chunks(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_tdb_source ON ar_ling_source_tafsir_display_blocks(source_id);
CREATE INDEX IF NOT EXISTS idx_arl_tdb_chunk  ON ar_ling_source_tafsir_display_blocks(source_chunk_id, block_seq);
CREATE INDEX IF NOT EXISTS idx_arl_tdb_entry  ON ar_ling_source_tafsir_display_blocks(tafsir_entry_id);
CREATE INDEX IF NOT EXISTS idx_arl_tdb_type   ON ar_ling_source_tafsir_display_blocks(block_type);
