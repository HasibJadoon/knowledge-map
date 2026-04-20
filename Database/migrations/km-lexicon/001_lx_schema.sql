-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_lexicon DB — Complete LX Module Schema
-- File   : Database/migrations/km-lexicon/001_lx_schema.sql
-- Run    : wrangler d1 execute km_lexicon --file=... --remote
--
-- Table prefix: ar_ling_*  (canonical — from Phase 2 rename, settled 2026-04-19)
-- This DB is the single source of truth for:
--   • Shared Arabic lexical registries (roots, lemmas, morphology)
--   • Nahw / grammar concept registries
--   • Balagha term registries
--   • Particle + governance pattern registries
--   • Analysis vocabulary registries (lookup enums used by QR's qr_ss_* layer)
--   • Source chunks + pipeline infrastructure
-- ═══════════════════════════════════════════════════════════════════════════
PRAGMA journal_mode=WAL;

-- ─────────────────────────────────────────────────────────────────────────────
-- § 1  CORE LEXICAL REGISTRIES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_roots (
  id                TEXT PRIMARY KEY,         -- ULID
  root_text         TEXT NOT NULL UNIQUE,     -- unvowelled Arabic root (e.g. كتب)
  root_letters      INTEGER NOT NULL DEFAULT 3,  -- 3 or 4
  primary_meaning   TEXT,                     -- core semantic meaning in Arabic
  semantic_field    TEXT,                     -- broad field: 'action'|'quality'|'relation'|etc.
  frequency_quran   INTEGER NOT NULL DEFAULT 0,  -- occurrences in Quran
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alroot_text  ON ar_ling_roots(root_text);

CREATE TRIGGER trg_ar_ling_roots_updated_at
AFTER UPDATE ON ar_ling_roots
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN UPDATE ar_ling_roots SET updated_at = datetime('now') WHERE id = OLD.id; END;

CREATE TABLE IF NOT EXISTS ar_ling_lemmas (
  id                TEXT PRIMARY KEY,         -- ULID
  root_id           TEXT,                     -- FK → ar_ling_roots.id
  lemma_text        TEXT NOT NULL,            -- dictionary form with diacritics
  lemma_bare        TEXT NOT NULL,            -- without diacritics
  part_of_speech    TEXT NOT NULL,
    -- 'noun'|'verb'|'adjective'|'adverb'|'pronoun'|'preposition'|
    -- 'conjunction'|'particle'|'proper_noun'|'other'
  verb_form         INTEGER,                  -- verb form/bab (1–10)
  primary_meaning   TEXT,
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE INDEX IF NOT EXISTS idx_alll_root  ON ar_ling_lemmas(root_id);
CREATE INDEX IF NOT EXISTS idx_alll_bare  ON ar_ling_lemmas(lemma_bare);

CREATE TRIGGER trg_ar_ling_lemmas_updated_at
AFTER UPDATE ON ar_ling_lemmas
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN UPDATE ar_ling_lemmas SET updated_at = datetime('now') WHERE id = OLD.id; END;

-- Morphological forms of lemmas
CREATE TABLE IF NOT EXISTS ar_ling_morphology (
  id                TEXT PRIMARY KEY,         -- ULID
  lemma_id          TEXT NOT NULL,
  form_text         TEXT NOT NULL,            -- this specific inflected form
  pattern           TEXT,                     -- وزن / morphological pattern
  gender            TEXT,                     -- 'masc'|'fem'|'both'
  number            TEXT,                     -- 'singular'|'dual'|'plural'|'collective'
  case_marker       TEXT,                     -- 'marfu'|'mansub'|'majrur'|'majzum'
  tense             TEXT,                     -- 'perfect'|'imperfect'|'imperative' (verbs)
  voice             TEXT,                     -- 'active'|'passive' (verbs)
  person            TEXT,                     -- '1st'|'2nd'|'3rd'
  definiteness      TEXT,                     -- 'definite'|'indefinite'|'construct'
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE INDEX IF NOT EXISTS idx_allmorph_lemma ON ar_ling_morphology(lemma_id);

-- Lemma-morphology link table (which forms are associated with which lemma)
CREATE TABLE IF NOT EXISTS ar_ling_lemma_morphology (
  lemma_id          TEXT NOT NULL,
  morphology_id     TEXT NOT NULL,
  PRIMARY KEY (lemma_id, morphology_id),
  FOREIGN KEY (lemma_id)     REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (morphology_id) REFERENCES ar_ling_morphology(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 2  LEXICON — SEMANTIC ENTRIES + EVIDENCE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_entries (
  id                TEXT PRIMARY KEY,         -- ULID
  lemma_id          TEXT,                     -- FK → ar_ling_lemmas.id
  root_id           TEXT,                     -- FK → ar_ling_roots.id
  meaning_ar        TEXT NOT NULL,
  meaning_en        TEXT NOT NULL,
  semantic_domain   TEXT,
  register          TEXT,                     -- 'classical'|'quranic'|'modern'|'technical'
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (root_id)  REFERENCES ar_ling_roots(id)
);

CREATE INDEX IF NOT EXISTS idx_alle_lemma ON ar_ling_lexicon_entries(lemma_id);

CREATE TRIGGER trg_ar_ling_lexicon_entries_updated_at
AFTER UPDATE ON ar_ling_lexicon_entries
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN UPDATE ar_ling_lexicon_entries SET updated_at = datetime('now') WHERE id = OLD.id; END;

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_evidence (
  id                TEXT PRIMARY KEY,         -- ULID
  lexicon_entry_id  TEXT NOT NULL,
  evidence_type     TEXT NOT NULL,            -- 'quran_ayah'|'hadith'|'classical_text'|'linguistic'
  evidence_text     TEXT NOT NULL,
  source_ref        TEXT,
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_allevid_entry ON ar_ling_lexicon_evidence(lexicon_entry_id);

CREATE TRIGGER trg_ar_ling_lexicon_evidence_updated_at
AFTER UPDATE ON ar_ling_lexicon_evidence
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN UPDATE ar_ling_lexicon_evidence SET updated_at = datetime('now') WHERE id = OLD.id; END;

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_morphology (
  lexicon_entry_id  TEXT NOT NULL,
  morphology_id     TEXT NOT NULL,
  PRIMARY KEY (lexicon_entry_id, morphology_id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id),
  FOREIGN KEY (morphology_id)    REFERENCES ar_ling_morphology(id)
);

-- Expressions / idioms
CREATE TABLE IF NOT EXISTS ar_ling_expressions (
  id                TEXT PRIMARY KEY,         -- ULID
  expression_text   TEXT NOT NULL,
  meaning_ar        TEXT,
  meaning_en        TEXT,
  expression_type   TEXT,                     -- 'idiom'|'collocation'|'fixed_phrase'|'proverb'
  root_ids_json     TEXT,                     -- JSON array of ar_ling_roots.id
  quran_ref         TEXT,                     -- if it appears in the Quran
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 3  NAHW / GRAMMAR CONCEPT REGISTRY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_nahw_concepts (
  id                TEXT PRIMARY KEY,         -- ULID
  concept_key       TEXT NOT NULL UNIQUE,     -- slug: 'mubtada', 'khabar', 'ism_inna', etc.
  label_ar          TEXT NOT NULL,
  label_en          TEXT,
  parent_id         TEXT,                     -- FK → ar_ling_nahw_concepts.id
  category          TEXT NOT NULL,
    -- 'ism'|'fil'|'harf'|'irab'|'bina'|'tawabi'|'asalib'|'jumal'|'other'
  description_md    TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_nahw_concepts(id)
);

CREATE INDEX IF NOT EXISTS idx_allnahw_parent ON ar_ling_nahw_concepts(parent_id);

CREATE TABLE IF NOT EXISTS ar_ling_nahw_concepts_raw (
  id                TEXT PRIMARY KEY,
  raw_source        TEXT NOT NULL,            -- raw import source text
  mapped_concept_id TEXT,                     -- FK → ar_ling_nahw_concepts.id
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ar_ling_nahw_relations (
  id                TEXT PRIMARY KEY,         -- ULID
  from_concept_id   TEXT NOT NULL,
  to_concept_id     TEXT NOT NULL,
  relation_type     TEXT NOT NULL,
    -- 'governs'|'requires'|'modifies'|'precedes'|'contrasts_with'|'type_of'|'other'
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (from_concept_id) REFERENCES ar_ling_nahw_concepts(id),
  FOREIGN KEY (to_concept_id)   REFERENCES ar_ling_nahw_concepts(id)
);

CREATE INDEX IF NOT EXISTS idx_allnr_from ON ar_ling_nahw_relations(from_concept_id);
CREATE INDEX IF NOT EXISTS idx_allnr_to   ON ar_ling_nahw_relations(to_concept_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 4  BALAGHA TERM REGISTRIES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_balagha_terms (
  id                TEXT PRIMARY KEY,         -- ULID
  term_key          TEXT NOT NULL UNIQUE,     -- slug: 'tashbih', 'isti_ara', 'kinaya', etc.
  label_ar          TEXT NOT NULL,
  label_en          TEXT,
  balagha_category  TEXT NOT NULL,
    -- 'bayan'    (علم البيان)
    -- 'mani'     (علم المعاني)
    -- 'badi'     (علم البديع)
  subcategory       TEXT,
  definition_ar     TEXT,
  definition_en     TEXT,
  parent_id         TEXT,                     -- FK → ar_ling_balagha_terms.id
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_balagha_terms(id)
);

CREATE INDEX IF NOT EXISTS idx_allbt_category ON ar_ling_balagha_terms(balagha_category);

CREATE TABLE IF NOT EXISTS ar_ling_balagha_relations (
  from_term_id      TEXT NOT NULL,
  to_term_id        TEXT NOT NULL,
  relation_type     TEXT NOT NULL,            -- 'type_of'|'contrasts_with'|'related_to'|'other'
  PRIMARY KEY (from_term_id, to_term_id),
  FOREIGN KEY (from_term_id) REFERENCES ar_ling_balagha_terms(id),
  FOREIGN KEY (to_term_id)   REFERENCES ar_ling_balagha_terms(id)
);

CREATE TABLE IF NOT EXISTS ar_ling_balagha_examples (
  id                TEXT PRIMARY KEY,         -- ULID
  term_id           TEXT NOT NULL,
  example_text      TEXT NOT NULL,
  example_source    TEXT,                     -- e.g. 'Quran 2:255'
  explanation_ar    TEXT,
  explanation_en    TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (term_id) REFERENCES ar_ling_balagha_terms(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 5  PARTICLE + GOVERNANCE PATTERN REGISTRIES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_particles (
  id                TEXT PRIMARY KEY,         -- ULID
  particle_text     TEXT NOT NULL,            -- Arabic text: بِ، فِي، إِنَّ، لَا، etc.
  particle_type     TEXT NOT NULL,
    -- 'preposition'|'conjunction'|'subordination'|'conditional'|
    -- 'negation'|'emphasis'|'future'|'interrogative'|'vocative'|
    -- 'prohibition'|'exception'|'response'|'other'
  grammatical_effect TEXT,                    -- 'jarr'|'nasb_fil'|'jazm_fil'|'nasb_ism'|'none'
  description_ar    TEXT,
  description_en    TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_allp_type ON ar_ling_particles(particle_type);
CREATE INDEX IF NOT EXISTS idx_allp_text ON ar_ling_particles(particle_text);

CREATE TABLE IF NOT EXISTS ar_ling_governance_patterns (
  id                TEXT PRIMARY KEY,         -- ULID
  governor_text     TEXT NOT NULL,            -- e.g. 'آمَنَ' (verb that governs via particle)
  particle_id       TEXT NOT NULL,            -- FK → ar_ling_particles.id
  governed_category TEXT NOT NULL,            -- 'ism'|'fil'|'jumlah'
  semantic_note     TEXT,                     -- e.g. "آمَنَ بـ = believed in"
  example_quran_ref TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (particle_id) REFERENCES ar_ling_particles(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 6  ANALYSIS VOCABULARY REGISTRIES
--      Lookup / enum tables used by QR's qr_ss_* layer as typed refs.
--      LX owns these definitions; QR simply links to them.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_sentence_kinds (
  id                TEXT PRIMARY KEY,
  kind_key          TEXT NOT NULL UNIQUE,     -- 'declarative'|'nominal'|'verbal'|etc.
  label_ar          TEXT NOT NULL,
  label_en          TEXT NOT NULL,
  description_md    TEXT
);

CREATE TABLE IF NOT EXISTS ar_ling_clause_types (
  id                TEXT PRIMARY KEY,
  type_key          TEXT NOT NULL UNIQUE,
  label_ar          TEXT NOT NULL,
  label_en          TEXT NOT NULL,
  description_md    TEXT
);

CREATE TABLE IF NOT EXISTS ar_ling_clause_functions (
  id                TEXT PRIMARY KEY,
  function_key      TEXT NOT NULL UNIQUE,
  label_ar          TEXT NOT NULL,
  label_en          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ar_ling_phrase_types (
  id                TEXT PRIMARY KEY,
  type_key          TEXT NOT NULL UNIQUE,
  label_ar          TEXT NOT NULL,
  label_en          TEXT NOT NULL,
  description_md    TEXT
);

CREATE TABLE IF NOT EXISTS ar_ling_phrase_functions (
  id                TEXT PRIMARY KEY,
  function_key      TEXT NOT NULL UNIQUE,
  label_ar          TEXT NOT NULL,
  label_en          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ar_ling_syntax_relation_types (
  id                TEXT PRIMARY KEY,
  relation_key      TEXT NOT NULL UNIQUE,     -- 'nsubj'|'obj'|'nmod'|etc. (UD-style)
  label_ar          TEXT NOT NULL,
  label_en          TEXT NOT NULL,
  ud_equivalent     TEXT,                     -- Universal Dependencies equivalent
  description_md    TEXT
);

CREATE TABLE IF NOT EXISTS ar_ling_reading_types (
  id                TEXT PRIMARY KEY,
  type_key          TEXT NOT NULL UNIQUE,
  label_ar          TEXT NOT NULL,
  label_en          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ar_ling_evidence_types (
  id                TEXT PRIMARY KEY,
  type_key          TEXT NOT NULL UNIQUE,
  label_ar          TEXT NOT NULL,
  label_en          TEXT NOT NULL,
  description_md    TEXT
);

CREATE TABLE IF NOT EXISTS ar_ling_nuance_types (
  id                TEXT PRIMARY KEY,
  type_key          TEXT NOT NULL UNIQUE,
  label_ar          TEXT NOT NULL,
  label_en          TEXT NOT NULL,
  description_md    TEXT
);

CREATE TABLE IF NOT EXISTS ar_ling_ellipsis_types (
  id                TEXT PRIMARY KEY,
  type_key          TEXT NOT NULL UNIQUE,
  label_ar          TEXT NOT NULL,
  label_en          TEXT NOT NULL,
  description_md    TEXT
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 7  TOKENS + SENTENCES + TOKEN-LEXICON LINK
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_tokens (
  id                TEXT PRIMARY KEY,         -- ULID
  token_text        TEXT NOT NULL,
  token_bare        TEXT NOT NULL,
  pos               TEXT,
  root_id           TEXT,                     -- FK → ar_ling_roots.id
  lemma_id          TEXT,                     -- FK → ar_ling_lemmas.id
  morphology_tag    TEXT,
  source_code       TEXT,                     -- which source this token came from
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_id)  REFERENCES ar_ling_roots(id),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE INDEX IF NOT EXISTS idx_alltoken_bare   ON ar_ling_tokens(token_bare);
CREATE INDEX IF NOT EXISTS idx_alltoken_root   ON ar_ling_tokens(root_id);
CREATE INDEX IF NOT EXISTS idx_alltoken_lemma  ON ar_ling_tokens(lemma_id);

CREATE TABLE IF NOT EXISTS ar_ling_sentences (
  id                TEXT PRIMARY KEY,         -- ULID
  source_id         TEXT NOT NULL,            -- FK → ar_ling_sources.id
  sentence_text     TEXT NOT NULL,
  chapter_ref       TEXT,
  page_ref          TEXT,
  token_count       INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_allsent_source ON ar_ling_sentences(source_id);

CREATE TABLE IF NOT EXISTS ar_ling_token_lexicon_link (
  token_id          TEXT NOT NULL,
  lexicon_entry_id  TEXT NOT NULL,
  PRIMARY KEY (token_id, lexicon_entry_id),
  FOREIGN KEY (token_id)       REFERENCES ar_ling_tokens(id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 8  SOURCE PIPELINE INFRASTRUCTURE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_sources (
  id                TEXT PRIMARY KEY,         -- ULID
  source_code       TEXT NOT NULL UNIQUE,     -- short code e.g. 'ibn_kathir'
  title_ar          TEXT NOT NULL,
  title_en          TEXT,
  source_domain     TEXT NOT NULL DEFAULT 'classical_text',
    -- 'classical_text'|'grammar_book'|'balagha_book'|'dictionary'|'modern_study'
  author            TEXT,
  publication_year  INTEGER,
  total_chunks      INTEGER NOT NULL DEFAULT 0,
  is_embedded       INTEGER NOT NULL DEFAULT 0,  -- 1 = fully embedded in Qdrant
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER trg_ar_ling_sources_updated_at
AFTER UPDATE ON ar_ling_sources
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN UPDATE ar_ling_sources SET updated_at = datetime('now') WHERE id = OLD.id; END;

CREATE TABLE IF NOT EXISTS ar_ling_source_chunks (
  chunk_id          TEXT PRIMARY KEY,         -- ULID
  source_id         TEXT NOT NULL,
  source_code       TEXT NOT NULL,
  heading_norm      TEXT,
  text_search       TEXT NOT NULL,            -- main content for FTS and pipeline
  chunk_type        TEXT,
    -- 'discourse_link'|'rhetoric'|'lexical'|'syntax'|'grammar'|'semantic'|'theology'
  is_embedded       INTEGER NOT NULL DEFAULT 0,
  qdrant_id         TEXT,
  page_no           INTEGER,
  meta_json         TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_allchunk_source   ON ar_ling_source_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_allchunk_embedded ON ar_ling_source_chunks(is_embedded);

CREATE TABLE IF NOT EXISTS ar_ling_source_index (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  index_key         TEXT NOT NULL,
  index_value       TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id)
);

CREATE TABLE IF NOT EXISTS ar_ling_source_toc (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  chapter_title     TEXT NOT NULL,
  chapter_ref       TEXT,
  page_start        INTEGER,
  parent_id         TEXT,                     -- FK → ar_ling_source_toc.id (nesting)
  toc_order         INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES ar_ling_sources(id),
  FOREIGN KEY (parent_id) REFERENCES ar_ling_source_toc(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 9  FTS5 INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_entries_fts USING fts5(
  id           UNINDEXED,
  meaning_ar,
  meaning_en,
  semantic_domain
);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_evidence_fts USING fts5(
  lexicon_entry_id UNINDEXED,
  evidence_type,
  evidence_text
);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_source_chunks_fts USING fts5(
  chunk_id     UNINDEXED,
  source_code,
  heading_norm,
  text_search
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 10  SEED ANALYSIS VOCABULARY REGISTRIES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO ar_ling_sentence_kinds (id, kind_key, label_ar, label_en) VALUES
  ('01SENTENCE_DECL', 'declarative',   'خبرية',         'Declarative'),
  ('01SENTENCE_NOML', 'nominal',       'اسمية',          'Nominal'),
  ('01SENTENCE_VERB', 'verbal',        'فعلية',          'Verbal'),
  ('01SENTENCE_QUES', 'interrogative', 'استفهامية',      'Interrogative'),
  ('01SENTENCE_IMPR', 'imperative',    'أمرية',          'Imperative'),
  ('01SENTENCE_COND', 'conditional',   'شرطية',          'Conditional'),
  ('01SENTENCE_OATH', 'oath',          'قسمية',          'Oath'),
  ('01SENTENCE_FRAG', 'fragment',      'جملة ناقصة',    'Fragment');

INSERT OR IGNORE INTO ar_ling_clause_types (id, type_key, label_ar, label_en) VALUES
  ('01CLAUSE_MAIN',   'main',           'رئيسية',             'Main clause'),
  ('01CLAUSE_REL',    'relative',       'صلة الموصول',       'Relative clause'),
  ('01CLAUSE_COND_IF','conditional_if', 'جملة الشرط',        'Conditional (if)'),
  ('01CLAUSE_COND_TH','conditional_then','جواب الشرط',       'Conditional (then)'),
  ('01CLAUSE_ADV_T',  'adverbial_time', 'ظرفية زمانية',     'Adverbial (time)'),
  ('01CLAUSE_ADV_C',  'adverbial_cause','تعليلية',            'Adverbial (cause)'),
  ('01CLAUSE_ADV_R',  'adverbial_result','نتيجة',            'Adverbial (result)'),
  ('01CLAUSE_VOC',    'vocative',       'نداء',               'Vocative'),
  ('01CLAUSE_OATH',   'oath',           'قسم',                'Oath'),
  ('01CLAUSE_OATH_A', 'oath_answer',    'جواب القسم',        'Oath answer'),
  ('01CLAUSE_PAREN',  'parenthetical',  'معترضة',             'Parenthetical'),
  ('01CLAUSE_ELIP',   'elliptical',     'محذوف الركن',       'Elliptical');

INSERT OR IGNORE INTO ar_ling_phrase_types (id, type_key, label_ar, label_en) VALUES
  ('01PHRASE_IDAFA',  'idafa',          'إضافة',              'Construct state (idafa)'),
  ('01PHRASE_SIFA',   'sifa_mawsuf',    'صفة + موصوف',       'Adjective phrase'),
  ('01PHRASE_JAR',    'jar_majrur',     'جار ومجرور',        'Prepositional phrase'),
  ('01PHRASE_MAFUL',  'maf_ul_bih',     'مفعول به',          'Direct object'),
  ('01PHRASE_HAL',    'hal',            'حال',                'Circumstantial (hal)'),
  ('01PHRASE_TAMYIZ', 'tamyiz',         'تمييز',              'Tamyiz'),
  ('01PHRASE_MUNADA', 'munada',         'منادى',              'Vocative object'),
  ('01PHRASE_BADAL',  'badal',          'بدل',                'Apposition (badal)'),
  ('01PHRASE_ATF',    'atf',            'معطوف',              'Conjunction phrase'),
  ('01PHRASE_ISTTH',  'istithna',       'استثناء',            'Exception phrase');

INSERT OR IGNORE INTO ar_ling_syntax_relation_types (id, relation_key, label_ar, label_en, ud_equivalent) VALUES
  ('01SYN_NSUBJ',  'nsubj',    'الفاعل',          'Nominal subject',     'nsubj'),
  ('01SYN_OBJ',    'obj',      'المفعول به',      'Direct object',       'obj'),
  ('01SYN_IOBJ',   'iobj',     'المفعول غير المباشر','Indirect object',  'iobj'),
  ('01SYN_NMOD',   'nmod',     'المضاف إليه/الجار','Nominal modifier',   'nmod'),
  ('01SYN_AMOD',   'amod',     'الصفة/النعت',     'Adjectival modifier', 'amod'),
  ('01SYN_ADVMOD', 'advmod',   'ظرف',             'Adverbial modifier',  'advmod'),
  ('01SYN_AUX',    'aux',      'الفعل المساعد',   'Auxiliary',           'aux'),
  ('01SYN_COP',    'cop',      'الرابط',          'Copula',              'cop'),
  ('01SYN_MARK',   'mark',     'حرف التبعية',     'Subordination marker','mark'),
  ('01SYN_DET',    'det',      'ال التعريف',      'Determiner',          'det'),
  ('01SYN_APPOS',  'appos',    'البدل/عطف البيان','Apposition',          'appos'),
  ('01SYN_CONJ',   'conj',     'المعطوف',         'Conjunction',         'conj'),
  ('01SYN_CC',     'cc',       'حرف العطف',       'Coordinating conj.',  'cc'),
  ('01SYN_CASE',   'case',     'حرف الجر',        'Case marker',         'case'),
  ('01SYN_VOC',    'vocative', 'المنادى',         'Vocative',            'vocative'),
  ('01SYN_OTHER',  'other',    'أخرى',            'Other',               NULL);
