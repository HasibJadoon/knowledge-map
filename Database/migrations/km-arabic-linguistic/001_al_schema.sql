-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_arabic_linguistic — Canonical Arabic Linguistic Truth
-- File   : Database/migrations/km-arabic-linguistic/001_al_schema.sql
-- DB     : km_arabic_linguistic   (binding: DB_AL in Workers)
-- Prefix : ar_ling_*  (SINGLE prefix — no al_* prefix anywhere)
-- Run    : wrangler d1 execute km_arabic_linguistic --file=... --remote
--
-- Purpose:
--   The shared Arabic linguistic truth module for the entire K-MAPS platform.
--   Owns ALL Arabic linguistic science: roots, lemmas, sarf (morphology),
--   nahw (syntax), balagha (rhetoric), lexicon/semantics, expressions,
--   sources + evidence, disciplinary trees, and bridge/projection tables.
--
--   This module feeds:
--     km_quran (QR)  — via typed refs: AL:ULID in qr_ss_* analysis columns
--     km_arabic (AR) — via typed refs: AL:ULID in ar_vocabulary, ar_grammar
--     km_content (CM) — via typed refs in document blocks
--
-- Module code: AL
-- Typed ref format: AL:<ULID>  (legacy LX:<ULID> also resolves to DB_AL)
-- RULE: Never duplicate linguistic truth in AR or QR. Always reference AL.
--
-- 10-Layer schema:
--   L1  Root science
--   L2  Lemma science
--   L3  Sarf / morphology (patterns, paradigms, inflection)
--   L4  Nahw / syntax (concepts, relations, sentence/clause/phrase types)
--   L5  Balagha (rhetoric concepts, branches, relations, examples)
--   L6  Lexicon / semantics (entries, senses, semantic fields, synonyms)
--   L7  Expressions (formulae, collocations, idioms)
--   L8  Sources + evidence (books, chunks, evidence items)
--   L9  Disciplinary trees (Sarf / Nahw / Balagha formal hierarchy)
--   L10 Bridges + projections (typed links into consumer modules)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- L1  ROOT SCIENCE
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_roots (
  id              TEXT PRIMARY KEY,               -- ULID   (typed ref: AL:<id>)
  root_text       TEXT NOT NULL UNIQUE,           -- e.g. ك-ت-ب  (with hyphens)
  root_letters    TEXT NOT NULL,                  -- JSON ["ك","ت","ب"]
  root_type       TEXT NOT NULL DEFAULT 'trilateral',
    -- 'trilateral'|'quadrilateral'|'quinqueliteral'
  weak_pattern    TEXT,
    -- 'sound'|'mithal_waw'|'mithal_ya'|'ajwaf_waw'|'ajwaf_ya'|
    -- 'naqis_waw'|'naqis_ya'|'mudha_af'|'mahmuz_fa'|'mahmuz_ain'|'mahmuz_lam'
  frequency_quran  INTEGER NOT NULL DEFAULT 0,
  frequency_hadith INTEGER NOT NULL DEFAULT 0,
  meaning_core_en  TEXT,
  meaning_core_ar  TEXT,
  note_md          TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_arl_root_type ON ar_ling_roots(root_type);
CREATE INDEX IF NOT EXISTS idx_arl_root_freq ON ar_ling_roots(frequency_quran);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_roots_fts USING fts5(
  root_text, meaning_core_en, meaning_core_ar
);

-- Alternate and archaic forms of a root
CREATE TABLE IF NOT EXISTS ar_ling_root_variants (
  id              TEXT PRIMARY KEY,
  root_id         TEXT NOT NULL,
  variant_text    TEXT NOT NULL,
  variant_type    TEXT NOT NULL DEFAULT 'alternate',
    -- 'alternate'|'archaic'|'regional'|'orthographic'
  note_md         TEXT,
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_rv_root ON ar_ling_root_variants(root_id);

-- Derivational / semantic relations between roots
CREATE TABLE IF NOT EXISTS ar_ling_root_relations (
  id              TEXT PRIMARY KEY,
  from_root_id    TEXT NOT NULL,
  to_root_id      TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
    -- 'derivational'|'semantic_overlap'|'historical_cognate'|'partial_overlap'|'antonym_root'|'other'
  evidence_ref    TEXT,                           -- AL:<ar_ling_evidence_items.id>
  note_md         TEXT,
  UNIQUE (from_root_id, to_root_id, relation_type),
  FOREIGN KEY (from_root_id) REFERENCES ar_ling_roots(id),
  FOREIGN KEY (to_root_id)   REFERENCES ar_ling_roots(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_rrel_from ON ar_ling_root_relations(from_root_id);
CREATE INDEX IF NOT EXISTS idx_arl_rrel_to   ON ar_ling_root_relations(to_root_id);

-- Semantic field classification for roots
CREATE TABLE IF NOT EXISTS ar_ling_root_semantic_fields (
  id              TEXT PRIMARY KEY,
  root_id         TEXT NOT NULL,
  field_name      TEXT NOT NULL,
    -- e.g. 'movement'|'knowledge'|'light'|'speech'|'water'|'worship'|'war'|'covenant'
  is_primary      INTEGER NOT NULL DEFAULT 0,
  note_md         TEXT,
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_rsf_root  ON ar_ling_root_semantic_fields(root_id);
CREATE INDEX IF NOT EXISTS idx_arl_rsf_field ON ar_ling_root_semantic_fields(field_name);

-- ─────────────────────────────────────────────────────────────────────────
-- L2  LEMMA SCIENCE
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_lemmas (
  id              TEXT PRIMARY KEY,               -- ULID   (typed ref: AL:<id>)
  root_id         TEXT,                           -- FK → ar_ling_roots.id (null if rootless)
  lemma_text      TEXT NOT NULL,                  -- canonical form with diacritics
  lemma_text_bare TEXT,                           -- stripped diacritics
  part_of_speech  TEXT NOT NULL DEFAULT 'noun',
    -- 'noun'|'verb'|'adjective'|'adverb'|'particle'|'preposition'|
    -- 'conjunction'|'pronoun'|'interjection'|'proper_noun'|'other'
  verb_form       TEXT,
    -- 'form_i'…'form_xv'  (verbs only)
  is_quran_word   INTEGER NOT NULL DEFAULT 0,
  frequency_quran INTEGER NOT NULL DEFAULT 0,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE INDEX IF NOT EXISTS idx_arl_lem_root ON ar_ling_lemmas(root_id);
CREATE INDEX IF NOT EXISTS idx_arl_lem_pos  ON ar_ling_lemmas(part_of_speech);
CREATE INDEX IF NOT EXISTS idx_arl_lem_qrn  ON ar_ling_lemmas(is_quran_word);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lemmas_fts USING fts5(
  lemma_text, lemma_text_bare
);

-- Spelling / pronunciation variants of a lemma
CREATE TABLE IF NOT EXISTS ar_ling_lemma_variants (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  variant_text    TEXT NOT NULL,
  variant_type    TEXT NOT NULL DEFAULT 'alternate',
    -- 'alternate'|'archaic'|'regional'|'quranic_recitation'|'MSA'
  note_md         TEXT,
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_lv_lemma ON ar_ling_lemma_variants(lemma_id);

-- Explicit lemma → root link (may differ from lemmas.root_id for multi-root derivations)
CREATE TABLE IF NOT EXISTS ar_ling_lemma_root_links (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  root_id         TEXT NOT NULL,
  link_type       TEXT NOT NULL DEFAULT 'primary',
    -- 'primary'|'secondary'|'folk_etymology'|'disputed'
  note_md         TEXT,
  UNIQUE (lemma_id, root_id),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (root_id)  REFERENCES ar_ling_roots(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_lrl_lemma ON ar_ling_lemma_root_links(lemma_id);
CREATE INDEX IF NOT EXISTS idx_arl_lrl_root  ON ar_ling_lemma_root_links(root_id);

-- Register tagging (Quranic, Classical, MSA) per lemma
CREATE TABLE IF NOT EXISTS ar_ling_lemma_registers (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  register        TEXT NOT NULL,
    -- 'quranic'|'classical'|'MSA'|'poetic'|'archaic'|'colloquial'
  frequency_note  TEXT,
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_lr_lemma    ON ar_ling_lemma_registers(lemma_id);
CREATE INDEX IF NOT EXISTS idx_arl_lr_register ON ar_ling_lemma_registers(register);

-- ─────────────────────────────────────────────────────────────────────────
-- L3  SARF / MORPHOLOGY
-- ─────────────────────────────────────────────────────────────────────────

-- Morphological paradigm descriptors
CREATE TABLE IF NOT EXISTS ar_ling_morphology (
  id              TEXT PRIMARY KEY,               -- ULID
  pattern         TEXT NOT NULL,                  -- وزن  e.g. فَاعِل
  gender          TEXT,                           -- 'masculine'|'feminine'|'both'
  number          TEXT,                           -- 'singular'|'dual'|'plural'|'broken_plural'
  case_marker     TEXT,                           -- 'triptote'|'diptote'|'indeclinable'
  tense           TEXT,                           -- 'past'|'present'|'imperative' (verbs)
  voice           TEXT,                           -- 'active'|'passive'
  person          TEXT,                           -- '1st'|'2nd'|'3rd'
  definiteness    TEXT,                           -- 'definite'|'indefinite'|'both'
  derivation_type TEXT,
    -- 'masdar'|'ism_fail'|'ism_maf_ul'|'sifah'|'ism_makan'|'ism_zaman'|'ism_alah'|'other'
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arl_morph_pattern ON ar_ling_morphology(pattern);

-- Bridge: lemma ↔ morphology pattern
CREATE TABLE IF NOT EXISTS ar_ling_lemma_morphology (
  id              TEXT PRIMARY KEY,
  lemma_id        TEXT NOT NULL,
  morphology_id   TEXT NOT NULL,
  inflected_form  TEXT,                           -- actual inflected surface form
  UNIQUE (lemma_id, morphology_id),
  FOREIGN KEY (lemma_id)      REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (morphology_id) REFERENCES ar_ling_morphology(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_lm_lemma ON ar_ling_lemma_morphology(lemma_id);
CREATE INDEX IF NOT EXISTS idx_arl_lm_morph ON ar_ling_lemma_morphology(morphology_id);

-- Reusable sarf paradigm templates (verb/noun conjugation tables)
CREATE TABLE IF NOT EXISTS ar_ling_form_paradigms (
  id              TEXT PRIMARY KEY,
  paradigm_name   TEXT NOT NULL,                  -- e.g. 'فَعَلَ trilateral sound verb'
  paradigm_type   TEXT NOT NULL,
    -- 'verb_conjugation'|'noun_declension'|'adjective_declension'|'broken_plural_pattern'
  verb_form       TEXT,                           -- form_i … form_xv
  root_type       TEXT,                           -- sound/weak/hamzated/doubled
  paradigm_json   TEXT NOT NULL,                  -- JSON: {past_3ms, past_3fs, …}
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arl_fp_type ON ar_ling_form_paradigms(paradigm_type);

-- Productive inflection rules (machine-readable morphological logic)
CREATE TABLE IF NOT EXISTS ar_ling_inflection_rules (
  id              TEXT PRIMARY KEY,
  rule_name       TEXT NOT NULL,
  rule_type       TEXT NOT NULL,
    -- 'assimilation'|'deletion'|'substitution'|'hamza_rule'|'weak_verb_change'|'nunation'|'other'
  applies_to      TEXT NOT NULL,                  -- pattern, root_type, context
  rule_description_md TEXT NOT NULL,
  example_before  TEXT,
  example_after   TEXT,
  note_md         TEXT
);

-- Conjugation template rows (individual cells of a paradigm table)
CREATE TABLE IF NOT EXISTS ar_ling_conjugation_templates (
  id              TEXT PRIMARY KEY,
  paradigm_id     TEXT NOT NULL,
  person          TEXT NOT NULL,                  -- '3ms'|'3fs'|'3md'|'3mp'|'3fp'|'2ms'|…
  tense           TEXT NOT NULL,                  -- 'past'|'present'|'imperative'|'subjunctive'|'jussive'
  voice           TEXT NOT NULL DEFAULT 'active', -- 'active'|'passive'
  template_form   TEXT NOT NULL,                  -- abstract form using ف-ع-ل placeholders
  note_md         TEXT,
  FOREIGN KEY (paradigm_id) REFERENCES ar_ling_form_paradigms(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_ct_paradigm ON ar_ling_conjugation_templates(paradigm_id);

-- ─────────────────────────────────────────────────────────────────────────
-- L4  NAHW / SYNTAX
-- ─────────────────────────────────────────────────────────────────────────

-- Canonical grammar concepts (recursive hierarchy)
CREATE TABLE IF NOT EXISTS ar_ling_nahw_concepts (
  id              TEXT PRIMARY KEY,               -- ULID   (typed ref: AL:<id>)
  parent_id       TEXT,                           -- self-ref for hierarchy
  concept_name_ar TEXT NOT NULL,
  concept_name_en TEXT NOT NULL,
  concept_type    TEXT NOT NULL DEFAULT 'rule',
    -- 'rule'|'term'|'category'|'function'|'phenomenon'|'irab_case'|'particle_class'
  definition_ar   TEXT,
  definition_en   TEXT,
  example_ar      TEXT,
  irab_label      TEXT,                           -- e.g. 'مرفوع'|'منصوب'|'مجرور'|'مجزوم'
  discipline_unit_id TEXT,                        -- FK → ar_ling_discipline_units.id
  source_ref      TEXT,                           -- AL:<ar_ling_sources.id>
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_nahw_concepts(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_nc_parent ON ar_ling_nahw_concepts(parent_id);
CREATE INDEX IF NOT EXISTS idx_arl_nc_type   ON ar_ling_nahw_concepts(concept_type);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_nahw_concepts_fts USING fts5(
  concept_name_ar, concept_name_en, definition_ar, definition_en
);

-- Relations between nahw concepts
CREATE TABLE IF NOT EXISTS ar_ling_nahw_relations (
  id              TEXT PRIMARY KEY,
  from_concept_id TEXT NOT NULL,
  to_concept_id   TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
    -- 'governs'|'subcategory_of'|'requires'|'conflicts_with'|'example_of'|'related_to'
  note_md         TEXT,
  FOREIGN KEY (from_concept_id) REFERENCES ar_ling_nahw_concepts(id),
  FOREIGN KEY (to_concept_id)   REFERENCES ar_ling_nahw_concepts(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_nr_from ON ar_ling_nahw_relations(from_concept_id);

-- Sentence type registry (consumed by qr_ss_occ_sentence.lx_sentence_kind_ref)
CREATE TABLE IF NOT EXISTS ar_ling_sentence_types (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  sentence_class  TEXT NOT NULL,
    -- 'ismiyyah'|'fi_liyyah'|'conditional'|'interrogative'|'nominal_verbless'|'other'
  description_md  TEXT
);

-- Clause type registry (consumed by qr_ss_occ_clause.lx_clause_type_ref)
CREATE TABLE IF NOT EXISTS ar_ling_clause_types (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  clause_function TEXT,
    -- 'sifah'|'hal'|'maf_ul'|'relative'|'conditional_protasis'|'conditional_apodosis'|'other'
  description_md  TEXT
);

-- Phrase type registry (consumed by qr_ss_occ_phrase.lx_phrase_type_ref)
CREATE TABLE IF NOT EXISTS ar_ling_phrase_types (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  phrase_class    TEXT,
    -- 'idafa'|'na_t'|'tawkid'|'hal_phrase'|'jar_majrur'|'mubtada_khabar'|'other'
  description_md  TEXT
);

-- Syntax relation type registry (consumed by qr_ss_syntax_relations.lx_relation_type_ref)
CREATE TABLE IF NOT EXISTS ar_ling_syntax_relation_types (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
);

-- Seed data for analysis vocab registries ─────────────────────────────────

INSERT OR IGNORE INTO ar_ling_sentence_types (id, name_ar, name_en, sentence_class) VALUES
  ('arl-st-01', 'الجملة الاسمية',  'Nominal sentence',     'ismiyyah'),
  ('arl-st-02', 'الجملة الفعلية',  'Verbal sentence',      'fi_liyyah'),
  ('arl-st-03', 'الجملة الشرطية',  'Conditional sentence', 'conditional'),
  ('arl-st-04', 'الجملة الاستفهامية','Interrogative sentence','interrogative'),
  ('arl-st-05', 'الجملة المنفية',   'Negated sentence',     'other'),
  ('arl-st-06', 'جملة النداء',      'Vocative sentence',    'other'),
  ('arl-st-07', 'جملة الأمر',       'Command sentence',     'other'),
  ('arl-st-08', 'جملة التعجب',      'Exclamatory sentence', 'other');

-- ─────────────────────────────────────────────────────────────────────────
-- L5  BALAGHA / RHETORIC
-- ─────────────────────────────────────────────────────────────────────────

-- Canonical rhetorical device registry
CREATE TABLE IF NOT EXISTS ar_ling_balagha_concepts (
  id              TEXT PRIMARY KEY,               -- ULID   (typed ref: AL:<id>)
  parent_id       TEXT,                           -- self-ref for hierarchy under Bayan/Mani/Badi
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  branch          TEXT NOT NULL,
    -- 'bayan'|'mani'|'badi'
  concept_type    TEXT NOT NULL DEFAULT 'device',
    -- 'device'|'principle'|'category'|'phenomenon'|'sub_device'
  definition_ar   TEXT,
  definition_en   TEXT,
  effect_md       TEXT,                           -- rhetorical/aesthetic effect
  discipline_unit_id TEXT,                        -- FK → ar_ling_discipline_units.id
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_balagha_concepts(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_bc_branch ON ar_ling_balagha_concepts(branch);
CREATE INDEX IF NOT EXISTS idx_arl_bc_parent ON ar_ling_balagha_concepts(parent_id);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_balagha_concepts_fts USING fts5(
  name_ar, name_en, definition_ar, definition_en
);

-- Major branches of balagha (top-level containers)
CREATE TABLE IF NOT EXISTS ar_ling_balagha_branches (
  id              TEXT PRIMARY KEY,
  branch_key      TEXT NOT NULL UNIQUE,           -- 'bayan'|'mani'|'badi'
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
);

INSERT OR IGNORE INTO ar_ling_balagha_branches (id, branch_key, name_ar, name_en) VALUES
  ('arl-bb-01', 'bayan', 'علم البيان', 'Bayan — Clarity and imagery'),
  ('arl-bb-02', 'mani',  'علم المعاني','Mani — Meaning and intent'),
  ('arl-bb-03', 'badi',  'علم البديع', 'Badi — Ornamentation and elegance');

-- Relations between rhetorical concepts
CREATE TABLE IF NOT EXISTS ar_ling_rhetorical_relations (
  id              TEXT PRIMARY KEY,
  from_concept_id TEXT NOT NULL,
  to_concept_id   TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
    -- 'subcategory_of'|'contrasts_with'|'combines_with'|'implies'|'related_to'
  note_md         TEXT,
  FOREIGN KEY (from_concept_id) REFERENCES ar_ling_balagha_concepts(id),
  FOREIGN KEY (to_concept_id)   REFERENCES ar_ling_balagha_concepts(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_rr_from ON ar_ling_rhetorical_relations(from_concept_id);

-- Canonical rhetorical examples (sourced + evidence-backed)
CREATE TABLE IF NOT EXISTS ar_ling_balagha_examples (
  id              TEXT PRIMARY KEY,
  balagha_id      TEXT NOT NULL,
  example_ar      TEXT NOT NULL,
  example_en      TEXT,
  source_type     TEXT NOT NULL DEFAULT 'quran',
    -- 'quran'|'hadith'|'classical_poetry'|'classical_prose'|'modern'|'other'
  qr_ref          TEXT,                           -- QR:2:255 shorthand or QR:<ULID>
  source_ref      TEXT,                           -- AL:<ar_ling_sources.id>
  analysis_md     TEXT,
  note_md         TEXT,
  FOREIGN KEY (balagha_id) REFERENCES ar_ling_balagha_concepts(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_be_balagha ON ar_ling_balagha_examples(balagha_id);

-- Seed core balagha concepts ─────────────────────────────────────────────
INSERT OR IGNORE INTO ar_ling_balagha_concepts (id, name_ar, name_en, branch, concept_type, definition_en) VALUES
  ('arl-bc-01', 'التشبيه',     'Tashbih — Simile',          'bayan', 'device', 'Explicit comparison between two things using a particle of comparison'),
  ('arl-bc-02', 'الاستعارة',   'Isti_arah — Metaphor',      'bayan', 'device', 'Implicit comparison where one thing is described as another'),
  ('arl-bc-03', 'الكناية',     'Kinayah — Metonymy',        'bayan', 'device', 'A word used for other than its literal meaning through implication'),
  ('arl-bc-04', 'المجاز',      'Majaz — Trope',             'bayan', 'device', 'Non-literal usage of language for rhetorical effect'),
  ('arl-bc-05', 'الإيجاز',     'Ijaz — Conciseness',        'mani',  'principle','Conveying maximum meaning with minimum words'),
  ('arl-bc-06', 'الإطناب',     'Itnab — Elaboration',       'mani',  'principle','Deliberate expansion for rhetorical emphasis'),
  ('arl-bc-07', 'الطباق',      'Tibaq — Antithesis',        'badi',  'device', 'Bringing opposites together for rhetorical effect'),
  ('arl-bc-08', 'الجناس',      'Jinas — Paronomasia',       'badi',  'device', 'Words with similar sound but different meaning'),
  ('arl-bc-09', 'الالتفات',    'Iltifat — Apostrophe/Shift','mani',  'device', 'Shift in person, number, or tense for rhetorical effect'),
  ('arl-bc-10', 'القصر',       'Qasr — Restriction',        'mani',  'device', 'Restricting a quality to a specific subject'),
  ('arl-bc-11', 'التقديم والتأخير','Taqdim/Ta_khir — Fronting','mani','device','Deliberate word order change for emphasis'),
  ('arl-bc-12', 'المشاكلة',    'Mushakala — Conformity',    'badi',  'device', 'Using a word in a sense matching the context of another word');

-- ─────────────────────────────────────────────────────────────────────────
-- L6  LEXICON / SEMANTICS
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_entries (
  id              TEXT PRIMARY KEY,               -- ULID   (typed ref: AL:<id>)
  lemma_id        TEXT NOT NULL,
  entry_text      TEXT NOT NULL,
  definition_ar   TEXT,
  definition_en   TEXT NOT NULL,
  definition_source TEXT,                         -- e.g. 'Lisan al-Arab', 'Mufradat'
  usage_register  TEXT NOT NULL DEFAULT 'classical',
    -- 'classical'|'quranic'|'modern'|'poetic'|'archaic'|'colloquial'
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_le_lemma ON ar_ling_lexicon_entries(lemma_id);
CREATE INDEX IF NOT EXISTS idx_arl_le_reg   ON ar_ling_lexicon_entries(usage_register);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_entries_fts USING fts5(
  entry_text, definition_ar, definition_en
);

-- Individual senses within a lexicon entry (polysemy support)
CREATE TABLE IF NOT EXISTS ar_ling_senses (
  id              TEXT PRIMARY KEY,
  lexicon_entry_id TEXT NOT NULL,
  sense_number    INTEGER NOT NULL,               -- ordering within the entry
  gloss_ar        TEXT,
  gloss_en        TEXT NOT NULL,
  context_note    TEXT,                           -- contextual restriction
  qr_ref          TEXT,                           -- QR:<ULID> if attested in Quran
  note_md         TEXT,
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_sense_entry ON ar_ling_senses(lexicon_entry_id);

-- Relations between senses (synonymy, antonymy, hyponymy)
CREATE TABLE IF NOT EXISTS ar_ling_sense_relations (
  id              TEXT PRIMARY KEY,
  from_sense_id   TEXT NOT NULL,
  to_sense_id     TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
    -- 'synonym'|'near_synonym'|'antonym'|'hyponym'|'hypernym'|'related'
  nuance_note     TEXT,
  FOREIGN KEY (from_sense_id) REFERENCES ar_ling_senses(id),
  FOREIGN KEY (to_sense_id)   REFERENCES ar_ling_senses(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_sr_from ON ar_ling_sense_relations(from_sense_id);

-- Semantic field classification (broader than root-level)
CREATE TABLE IF NOT EXISTS ar_ling_semantic_fields (
  id              TEXT PRIMARY KEY,
  field_name_ar   TEXT NOT NULL,
  field_name_en   TEXT NOT NULL UNIQUE,
  parent_field_id TEXT,
  description_md  TEXT,
  FOREIGN KEY (parent_field_id) REFERENCES ar_ling_semantic_fields(id)
);

-- Near-synonym sets (nuanced distinctions between close words)
CREATE TABLE IF NOT EXISTS ar_ling_near_synonym_sets (
  id              TEXT PRIMARY KEY,
  set_name        TEXT NOT NULL,
  description_md  TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ar_ling_near_synonym_members (
  id              TEXT PRIMARY KEY,
  set_id          TEXT NOT NULL,
  lemma_id        TEXT NOT NULL,
  nuance_note     TEXT NOT NULL,                  -- what distinguishes this word from siblings
  UNIQUE (set_id, lemma_id),
  FOREIGN KEY (set_id)   REFERENCES ar_ling_near_synonym_sets(id),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_nsm_set   ON ar_ling_near_synonym_members(set_id);
CREATE INDEX IF NOT EXISTS idx_arl_nsm_lemma ON ar_ling_near_synonym_members(lemma_id);

-- Lexical evidence (sourced attestations for entries)
CREATE TABLE IF NOT EXISTS ar_ling_lexicon_evidence (
  id              TEXT PRIMARY KEY,
  lexicon_entry_id TEXT NOT NULL,
  sense_id        TEXT,                           -- FK → ar_ling_senses.id (optional)
  evidence_type   TEXT NOT NULL DEFAULT 'quran',
    -- 'quran'|'hadith'|'classical_poetry'|'classical_prose'|'lexicon_citation'|'other'
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  qr_ref          TEXT,                           -- QR:surah:ayah or QR:<ULID>
  source_ref      TEXT,                           -- AL:<ar_ling_sources.id>
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id),
  FOREIGN KEY (sense_id)         REFERENCES ar_ling_senses(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_lev_entry ON ar_ling_lexicon_evidence(lexicon_entry_id);
CREATE INDEX IF NOT EXISTS idx_arl_lev_type  ON ar_ling_lexicon_evidence(evidence_type);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_evidence_fts USING fts5(
  text_ar, text_en, note_md
);

-- Morphology link for lexicon entries (which inflected forms an entry exhibits)
CREATE TABLE IF NOT EXISTS ar_ling_lexicon_morphology (
  id              TEXT PRIMARY KEY,
  lexicon_entry_id TEXT NOT NULL,
  morphology_id   TEXT NOT NULL,
  inflected_form  TEXT,
  UNIQUE (lexicon_entry_id, morphology_id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id),
  FOREIGN KEY (morphology_id)    REFERENCES ar_ling_morphology(id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- L7  EXPRESSIONS (Formulae, collocations, idioms)
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_expression_types (
  id              TEXT PRIMARY KEY,
  type_key        TEXT NOT NULL UNIQUE,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_md  TEXT
);

INSERT OR IGNORE INTO ar_ling_expression_types (id, type_key, name_ar, name_en) VALUES
  ('arl-et-01', 'idiom',              'تعبير اصطلاحي',   'Idiom'),
  ('arl-et-02', 'phrase',             'عبارة',           'Fixed phrase'),
  ('arl-et-03', 'proverb',            'مثل',             'Proverb'),
  ('arl-et-04', 'hadith_phrase',      'عبارة حديثية',    'Hadith phrase'),
  ('arl-et-05', 'classical_saying',   'قول مأثور',       'Classical saying'),
  ('arl-et-06', 'collocate',          'تلازم لفظي',      'Collocation'),
  ('arl-et-07', 'quranic_expression', 'تعبير قرآني',     'Quranic expression'),
  ('arl-et-08', 'formula',            'صيغة نمطية',      'Formulaic expression');

CREATE TABLE IF NOT EXISTS ar_ling_expressions (
  id              TEXT PRIMARY KEY,               -- ULID
  expression_ar   TEXT NOT NULL,
  expression_en   TEXT NOT NULL,
  expression_type_id TEXT,                        -- FK → ar_ling_expression_types.id
  primary_lemma_id TEXT,                          -- FK → ar_ling_lemmas.id
  explanation_md  TEXT,
  qr_refs_json    TEXT,                           -- JSON [{qr_ref, note}]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (expression_type_id) REFERENCES ar_ling_expression_types(id),
  FOREIGN KEY (primary_lemma_id)   REFERENCES ar_ling_lemmas(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_exp_type  ON ar_ling_expressions(expression_type_id);
CREATE INDEX IF NOT EXISTS idx_arl_exp_lemma ON ar_ling_expressions(primary_lemma_id);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_expressions_fts USING fts5(
  expression_ar, expression_en, explanation_md
);

-- Token-level breakdown of an expression
CREATE TABLE IF NOT EXISTS ar_ling_expression_tokens (
  id              TEXT PRIMARY KEY,
  expression_id   TEXT NOT NULL,
  token_position  INTEGER NOT NULL,
  token_text      TEXT NOT NULL,
  lemma_id        TEXT,                           -- FK → ar_ling_lemmas.id
  note_md         TEXT,
  FOREIGN KEY (expression_id) REFERENCES ar_ling_expressions(id),
  FOREIGN KEY (lemma_id)      REFERENCES ar_ling_lemmas(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_et_exp ON ar_ling_expression_tokens(expression_id);

-- Collocations (recurring word-pair patterns)
CREATE TABLE IF NOT EXISTS ar_ling_collocations (
  id              TEXT PRIMARY KEY,
  lemma_a_id      TEXT NOT NULL,
  lemma_b_id      TEXT NOT NULL,
  collocation_type TEXT NOT NULL DEFAULT 'general',
    -- 'general'|'verb_object'|'noun_adjective'|'idafa'|'verb_particle'|'other'
  frequency_note  TEXT,
  note_md         TEXT,
  UNIQUE (lemma_a_id, lemma_b_id, collocation_type),
  FOREIGN KEY (lemma_a_id) REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (lemma_b_id) REFERENCES ar_ling_lemmas(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_col_a ON ar_ling_collocations(lemma_a_id);
CREATE INDEX IF NOT EXISTS idx_arl_col_b ON ar_ling_collocations(lemma_b_id);

-- ─────────────────────────────────────────────────────────────────────────
-- L8  SOURCES + EVIDENCE
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_sources (
  id              TEXT PRIMARY KEY,               -- ULID   (typed ref: AL:<id>)
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  source_type     TEXT NOT NULL DEFAULT 'classical_grammar',
    -- 'classical_grammar'|'classical_lexicon'|'modern_grammar'|'tafsir_linguistic'|
    -- 'encyclopedia'|'academic_paper'|'other'
  author_ref      TEXT,                           -- WV:<wv_people.id> or free text
  author_name     TEXT,
  period_label    TEXT,                           -- e.g. '3rd century AH'
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arl_src_type ON ar_ling_sources(source_type);

-- Published editions of a source
CREATE TABLE IF NOT EXISTS ar_ling_source_editions (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  edition_label   TEXT NOT NULL,                  -- e.g. 'Bulaq 1281 AH'
  publisher       TEXT,
  year            TEXT,
  volume_count    INTEGER,
  note_md         TEXT,
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_se_source ON ar_ling_source_editions(source_id);

-- Text chunks from sources (for AI pipeline embedding)
CREATE TABLE IF NOT EXISTS ar_ling_source_chunks (
  id              TEXT PRIMARY KEY,               -- ULID
  source_id       TEXT NOT NULL,
  edition_id      TEXT,
  chunk_kind      TEXT,
    -- 'discourse_link'|'rhetoric'|'lexical'|'syntax'|'grammar'|'semantic'|'theology'|'general'
  chunk_seq       INTEGER NOT NULL,
  heading_norm    TEXT,
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  page_no         INTEGER,
  volume_no       INTEGER,
  tokens_approx   INTEGER,
  is_embedded     INTEGER NOT NULL DEFAULT 0,     -- 1 = stored in Qdrant
  qdrant_id       TEXT,                           -- UUID in Qdrant collection
  meta_json       TEXT,                           -- {embed_model, …}
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id)  REFERENCES ar_ling_sources(id),
  FOREIGN KEY (edition_id) REFERENCES ar_ling_source_editions(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_sc_source   ON ar_ling_source_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_arl_sc_kind     ON ar_ling_source_chunks(chunk_kind);
CREATE INDEX IF NOT EXISTS idx_arl_sc_embedded ON ar_ling_source_chunks(is_embedded);

-- Table of contents for sources
CREATE TABLE IF NOT EXISTS ar_ling_source_toc (
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
CREATE INDEX IF NOT EXISTS idx_arl_toc_source ON ar_ling_source_toc(source_id);

-- Full-text index over source chunks
CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_source_chunks_fts USING fts5(
  heading_norm, text_ar, text_en
);

-- Source index (keyword index into source positions)
CREATE TABLE IF NOT EXISTS ar_ling_source_index (
  id              TEXT PRIMARY KEY,
  source_id       TEXT NOT NULL,
  keyword         TEXT NOT NULL,
  chunk_id        TEXT NOT NULL,
  page_no         INTEGER,
  note_md         TEXT,
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (chunk_id)  REFERENCES ar_ling_source_chunks(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_si_source  ON ar_ling_source_index(source_id);
CREATE INDEX IF NOT EXISTS idx_arl_si_keyword ON ar_ling_source_index(keyword);

-- Canonical evidence items (typed, provenance-bearing)
CREATE TABLE IF NOT EXISTS ar_ling_evidence_items (
  id              TEXT PRIMARY KEY,               -- ULID
  evidence_type   TEXT NOT NULL,
    -- 'quran_text'|'hadith'|'classical_verse'|'classical_prose'|'lexicon_entry'|'grammatical_rule'|'other'
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  qr_ref          TEXT,                           -- QR:<ULID> or QR:surah:ayah
  source_ref      TEXT,                           -- AL:<ar_ling_sources.id>
  locator_json    TEXT,                           -- {volume, page, line}
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arl_ei_type ON ar_ling_evidence_items(evidence_type);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_evidence_items_fts USING fts5(
  text_ar, text_en, note_md
);

-- Tokens and sentences (parsed corpus for irab/analysis)
CREATE TABLE IF NOT EXISTS ar_ling_tokens (
  id              TEXT PRIMARY KEY,
  token_text      TEXT NOT NULL,
  token_text_bare TEXT,
  lemma_id        TEXT,
  part_of_speech  TEXT,
  source_ref      TEXT,                           -- AL:<ar_ling_sources.id>
  page_no         INTEGER,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_tok_lemma ON ar_ling_tokens(lemma_id);

CREATE TABLE IF NOT EXISTS ar_ling_sentences (
  id              TEXT PRIMARY KEY,
  source_ref      TEXT NOT NULL,                  -- AL:<ar_ling_sources.id>
  sentence_text   TEXT NOT NULL,
  sentence_text_bare TEXT,
  sentence_type   TEXT NOT NULL DEFAULT 'prose',
    -- 'prose'|'verse'|'example'|'rule_statement'|'definition'
  irab_json       TEXT,                           -- full irab annotation
  tree_json       TEXT,                           -- dependency tree
  page_no         INTEGER,
  tokens_json     TEXT,                           -- JSON [ar_ling_tokens.id] ordered
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arl_sent_src ON ar_ling_sentences(source_ref);

-- Token ↔ Lexicon entry link
CREATE TABLE IF NOT EXISTS ar_ling_token_lexicon_link (
  id              TEXT PRIMARY KEY,
  token_id        TEXT NOT NULL,
  lexicon_entry_id TEXT NOT NULL,
  confidence      REAL NOT NULL DEFAULT 1.0,
  UNIQUE (token_id, lexicon_entry_id),
  FOREIGN KEY (token_id)         REFERENCES ar_ling_tokens(id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- L9  DISCIPLINARY TREES  (Sarf / Nahw / Balagha formal hierarchy)
-- ─────────────────────────────────────────────────────────────────────────

-- Top-level and sub-unit discipline containers
CREATE TABLE IF NOT EXISTS ar_ling_discipline_containers (
  id              TEXT PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  parent_id       TEXT,                           -- self-ref
  discipline      TEXT NOT NULL,
    -- 'sarf'|'nahw'|'balagha'|'lexicology'|'rhetoric_theory'|'cross_cutting'
  description_md  TEXT,
  FOREIGN KEY (parent_id) REFERENCES ar_ling_discipline_containers(id)
);

INSERT OR IGNORE INTO ar_ling_discipline_containers (id, name_ar, name_en, discipline) VALUES
  ('arl-dc-01', 'العلوم اللغوية العربية', 'Arabic Linguistic Sciences', 'cross_cutting'),
  ('arl-dc-02', 'علم الصرف',  'Sarf — Morphology',   'sarf'),
  ('arl-dc-03', 'علم النحو',  'Nahw — Syntax',       'nahw'),
  ('arl-dc-04', 'علم البلاغة','Balagha — Rhetoric',  'balagha');

-- Canonical discipline units (sub-topics within a container)
CREATE TABLE IF NOT EXISTS ar_ling_discipline_units (
  id              TEXT PRIMARY KEY,
  container_id    TEXT NOT NULL,
  parent_unit_id  TEXT,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  unit_type       TEXT NOT NULL DEFAULT 'concept',
    -- 'concept'|'rule'|'pattern_family'|'device_family'|'exercise_topic'
  description_md  TEXT,
  seq             INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (container_id)    REFERENCES ar_ling_discipline_containers(id),
  FOREIGN KEY (parent_unit_id)  REFERENCES ar_ling_discipline_units(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_du_container ON ar_ling_discipline_units(container_id);
CREATE INDEX IF NOT EXISTS idx_arl_du_parent    ON ar_ling_discipline_units(parent_unit_id);

-- Relations between discipline units (prerequisite, see-also, contrast)
CREATE TABLE IF NOT EXISTS ar_ling_discipline_relations (
  id              TEXT PRIMARY KEY,
  from_unit_id    TEXT NOT NULL,
  to_unit_id      TEXT NOT NULL,
  relation_type   TEXT NOT NULL,
    -- 'prerequisite'|'see_also'|'contrasts_with'|'builds_on'|'part_of'
  note_md         TEXT,
  FOREIGN KEY (from_unit_id) REFERENCES ar_ling_discipline_units(id),
  FOREIGN KEY (to_unit_id)   REFERENCES ar_ling_discipline_units(id)
);
CREATE INDEX IF NOT EXISTS idx_arl_dr_from ON ar_ling_discipline_relations(from_unit_id);

-- ─────────────────────────────────────────────────────────────────────────
-- L10 BRIDGES + PROJECTIONS  (Typed links into consumer modules)
-- ─────────────────────────────────────────────────────────────────────────

-- AL → QR bridge (linguistic enrichment of Quranic scopes)
CREATE TABLE IF NOT EXISTS ar_ling_quran_links (
  id              TEXT PRIMARY KEY,
  al_entity_ref   TEXT NOT NULL,                  -- AL:<ULID> of any ar_ling_* entity
  al_entity_type  TEXT NOT NULL,
    -- 'root'|'lemma'|'morphology'|'nahw_concept'|'balagha_concept'|
    -- 'lexicon_entry'|'sense'|'expression'|'discipline_unit'
  qr_scope_ref    TEXT NOT NULL,                  -- QR:<ULID> or QR:surah:ayah
  link_type       TEXT NOT NULL DEFAULT 'attests',
    -- 'attests'|'illustrates'|'defines'|'applies_to'|'is_rhetorical_device_in'|'other'
  note_md         TEXT,
  confidence      REAL NOT NULL DEFAULT 1.0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arl_ql_entity ON ar_ling_quran_links(al_entity_ref);
CREATE INDEX IF NOT EXISTS idx_arl_ql_qr     ON ar_ling_quran_links(qr_scope_ref);

-- AL → AR bridge (knowledge packets for Arabic pedagogy)
CREATE TABLE IF NOT EXISTS ar_ling_arabic_links (
  id              TEXT PRIMARY KEY,
  al_entity_ref   TEXT NOT NULL,                  -- AL:<ULID>
  al_entity_type  TEXT NOT NULL,
  ar_entity_ref   TEXT NOT NULL,                  -- AR:<ULID>
  ar_entity_type  TEXT NOT NULL,
    -- 'container'|'unit'|'vocabulary'|'grammar'|'exercise'|'lesson'
  link_type       TEXT NOT NULL DEFAULT 'referenced_by',
    -- 'referenced_by'|'used_in_exercise'|'taught_in'|'illustrated_by'
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arl_arl_entity ON ar_ling_arabic_links(al_entity_ref);
CREATE INDEX IF NOT EXISTS idx_arl_arl_ar     ON ar_ling_arabic_links(ar_entity_ref);

-- AL → CM bridge (document citations of linguistic concepts)
CREATE TABLE IF NOT EXISTS ar_ling_content_links (
  id              TEXT PRIMARY KEY,
  al_entity_ref   TEXT NOT NULL,                  -- AL:<ULID>
  al_entity_type  TEXT NOT NULL,
  cm_entity_ref   TEXT NOT NULL,                  -- CM:<ULID>
  cm_entity_type  TEXT NOT NULL,                  -- 'document'|'note'|'source_unit'|'block'
  link_type       TEXT NOT NULL DEFAULT 'cited_in',
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arl_cl_entity ON ar_ling_content_links(al_entity_ref);
CREATE INDEX IF NOT EXISTS idx_arl_cl_cm     ON ar_ling_content_links(cm_entity_ref);

-- Projection cache (pre-computed app-facing packets for performance)
CREATE TABLE IF NOT EXISTS ar_ling_projection_cache (
  id              TEXT PRIMARY KEY,
  cache_key       TEXT NOT NULL UNIQUE,
  cache_type      TEXT NOT NULL,
    -- 'lemma_card'|'root_family'|'morphology_table'|'nahw_summary'|'balagha_device'
  payload_json    TEXT NOT NULL,
  source_refs     TEXT,                           -- JSON [AL:<ULID>, …]
  expires_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_arl_pc_type ON ar_ling_projection_cache(cache_type);
