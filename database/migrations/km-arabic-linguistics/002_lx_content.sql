-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_arabic_linguistics DB — Dictionary / Lexicon Layer
-- File   : database/migrations/km-arabic-linguistics/002_lx_content.sql
-- DB     : km_arabic_linguistics   (binding: DB_AL in Workers)
-- Prefix : ar_ling_*
-- Run AFTER: 001_al_schema.sql
-- Run    : wrangler d1 execute km_arabic_linguistics --file=... --remote
--
-- Scope:
--   The NARROW dictionary layer that lives inside km_arabic_linguistics.
--   km_lexicon is NOT a separate Cloudflare D1 database.
--   These tables provide:
--     - Arabic roots registry
--     - Lemmas with morphological links
--     - Lexicon entries (dictionary definitions + evidence)
--     - Expressions / collocates
--     - Tokens and sentence registry for sourced texts
--
--   Together with 001_al_schema.sql (backbone: nahw/sarf/balagha/analysis vocab)
--   and this file (dictionary), km_arabic_linguistics is the COMPLETE Arabic
--   linguistic foundation shared by km_quran (QR) and km_arabic (AR).
--
-- Cross-module typed refs:
--   Both 'LX:<id>' and 'AL:<id>' refs resolve to DB_AL at the Worker layer.
--   New code should use 'AL:<id>'. Legacy 'LX:<id>' refs in qr_ss_* column
--   names are resolved by the Worker's dbForModule() function.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- § 1  ROOTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_roots (
  id              TEXT PRIMARY KEY,               -- ULID
  root_text       TEXT NOT NULL UNIQUE,           -- the root (3–5 letters): ك-ت-ب
  root_letters    TEXT NOT NULL,                  -- JSON [letter1, letter2, ...]
  root_type       TEXT NOT NULL DEFAULT 'trilateral',
    -- 'trilateral'|'quadrilateral'|'quinqueliteral'
  weak_pattern    TEXT,
    -- 'sound'|'mithal_waw'|'mithal_ya'|'ajwaf_waw'|'ajwaf_ya'|
    -- 'naqis_waw'|'naqis_ya'|'mudha'af'|'mahmuz_fa'|'mahmuz_'ain'|'mahmuz_lam'
  frequency_quran INTEGER NOT NULL DEFAULT 0,
  frequency_hadith INTEGER NOT NULL DEFAULT 0,
  meaning_core_en TEXT,                           -- core semantic field in English
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ar_ling_root_type  ON ar_ling_roots(root_type);
CREATE INDEX IF NOT EXISTS idx_ar_ling_root_freq  ON ar_ling_roots(frequency_quran);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_roots_fts USING fts5(
  root_text,
  meaning_core_en
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 2  LEMMAS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_lemmas (
  id              TEXT PRIMARY KEY,               -- ULID
  root_id         TEXT,                           -- FK → ar_ling_roots.id (null if no root)
  lemma_text      TEXT NOT NULL,                  -- canonical lemma form (with diacritics)
  lemma_text_bare TEXT,                           -- without diacritics
  part_of_speech  TEXT NOT NULL DEFAULT 'noun',
    -- 'noun'|'verb'|'adjective'|'adverb'|'particle'|'preposition'|
    -- 'conjunction'|'pronoun'|'interjection'|'proper_noun'|'other'
  verb_form       TEXT,
    -- 'form_i'...'form_x'|'form_xi'...'form_xv'  (for verbs)
  is_quran_word   INTEGER NOT NULL DEFAULT 0,
  frequency_quran INTEGER NOT NULL DEFAULT 0,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (root_id) REFERENCES ar_ling_roots(id)
);

CREATE INDEX IF NOT EXISTS idx_ar_ling_lem_root ON ar_ling_lemmas(root_id);
CREATE INDEX IF NOT EXISTS idx_ar_ling_lem_pos  ON ar_ling_lemmas(part_of_speech);
CREATE INDEX IF NOT EXISTS idx_ar_ling_lem_qrn  ON ar_ling_lemmas(is_quran_word);

-- Morphological paradigm links for lemmas
CREATE TABLE IF NOT EXISTS ar_ling_morphology (
  id              TEXT PRIMARY KEY,               -- ULID
  pattern         TEXT NOT NULL,                  -- وزن e.g. فَاعِل
  gender          TEXT,                           -- 'masculine'|'feminine'|'both'
  number          TEXT,                           -- 'singular'|'dual'|'plural'|'broken_plural'
  case_marker     TEXT,                           -- 'triptote'|'diptote'|'indeclinable'
  tense           TEXT,                           -- 'past'|'present'|'imperative' (verbs)
  voice           TEXT,                           -- 'active'|'passive' (verbs)
  person          TEXT,                           -- '1st'|'2nd'|'3rd' (verbs)
  definiteness    TEXT,                           -- 'definite'|'indefinite'|'both'
  derivation_type TEXT,                           -- 'masdar'|'ism_fa'il'|'ism_maf'ul'|'sifah'|'other'
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ar_ling_morph_pattern ON ar_ling_morphology(pattern);

CREATE TABLE IF NOT EXISTS ar_ling_lemma_morphology (
  id              TEXT PRIMARY KEY,               -- ULID
  lemma_id        TEXT NOT NULL,
  morphology_id   TEXT NOT NULL,
  UNIQUE (lemma_id, morphology_id),
  FOREIGN KEY (lemma_id)     REFERENCES ar_ling_lemmas(id),
  FOREIGN KEY (morphology_id) REFERENCES ar_ling_morphology(id)
);

CREATE INDEX IF NOT EXISTS idx_ar_ling_lm_lemma ON ar_ling_lemma_morphology(lemma_id);
CREATE INDEX IF NOT EXISTS idx_ar_ling_lm_morph ON ar_ling_lemma_morphology(morphology_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 3  LEXICON ENTRIES (Dictionary Definitions)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_entries (
  id              TEXT PRIMARY KEY,               -- ULID
  lemma_id        TEXT NOT NULL,
  entry_text      TEXT NOT NULL,                  -- the entry headword
  definition_ar   TEXT,
  definition_en   TEXT NOT NULL,
  definition_source TEXT,                         -- classical lexicon source (e.g. Lisan al-Arab)
  semantic_field  TEXT,                           -- e.g. 'movement', 'speech', 'light'
  usage_register  TEXT DEFAULT 'classical',
    -- 'classical'|'quranic'|'modern'|'poetic'|'colloquial'
  related_lemmas  TEXT,                           -- JSON [ar_ling_lemmas.id]
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE INDEX IF NOT EXISTS idx_ar_ling_le_lemma ON ar_ling_lexicon_entries(lemma_id);
CREATE INDEX IF NOT EXISTS idx_ar_ling_le_field ON ar_ling_lexicon_entries(semantic_field);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_entries_fts USING fts5(
  entry_text,
  definition_ar,
  definition_en,
  semantic_field
);

-- Quranic + classical evidence for lexicon entries
CREATE TABLE IF NOT EXISTS ar_ling_lexicon_evidence (
  id              TEXT PRIMARY KEY,               -- ULID
  lexicon_entry_id TEXT NOT NULL,
  evidence_type   TEXT NOT NULL DEFAULT 'quran',
    -- 'quran'|'hadith'|'classical_poetry'|'classical_prose'|'lexicon_citation'|'other'
  text_ar         TEXT NOT NULL,
  text_en         TEXT,
  surah           INTEGER,
  ayah            INTEGER,
  source_ref      TEXT,                           -- for non-Quran evidence
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_ar_ling_lev_entry ON ar_ling_lexicon_evidence(lexicon_entry_id);
CREATE INDEX IF NOT EXISTS idx_ar_ling_lev_type  ON ar_ling_lexicon_evidence(evidence_type);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_evidence_fts USING fts5(
  text_ar,
  text_en,
  note_md
);

-- Lexicon morphology links (which morphological forms a lexicon entry exhibits)
CREATE TABLE IF NOT EXISTS ar_ling_lexicon_morphology (
  id              TEXT PRIMARY KEY,               -- ULID
  lexicon_entry_id TEXT NOT NULL,
  morphology_id   TEXT NOT NULL,
  inflected_form  TEXT,                           -- the actual inflected form
  UNIQUE (lexicon_entry_id, morphology_id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id),
  FOREIGN KEY (morphology_id)   REFERENCES ar_ling_morphology(id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 4  EXPRESSIONS (Idiomatic / Collocational Entries)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ar_ling_expressions (
  id              TEXT PRIMARY KEY,               -- ULID
  expression_ar   TEXT NOT NULL,
  expression_en   TEXT NOT NULL,
  expression_type TEXT NOT NULL DEFAULT 'phrase',
    -- 'idiom'|'phrase'|'proverb'|'hadith_phrase'|'classical_saying'|'collocate'|
    -- 'quranic_expression'|'other'
  explanation_md  TEXT,
  primary_lemma_id TEXT,                          -- FK → ar_ling_lemmas.id
  quran_refs_json TEXT,                           -- JSON [{surah, ayah, note}]
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (primary_lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE INDEX IF NOT EXISTS idx_ar_ling_exp_type  ON ar_ling_expressions(expression_type);
CREATE INDEX IF NOT EXISTS idx_ar_ling_exp_lemma ON ar_ling_expressions(primary_lemma_id);

CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_expressions_fts USING fts5(
  expression_ar,
  expression_en,
  explanation_md
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § 5  TOKENS & SENTENCES (Sourced Text Token Registry)
-- ─────────────────────────────────────────────────────────────────────────────

-- Token-level lexical entries (for indexed classical Arabic texts)
CREATE TABLE IF NOT EXISTS ar_ling_tokens (
  id              TEXT PRIMARY KEY,               -- ULID
  token_text      TEXT NOT NULL,
  token_text_bare TEXT,
  lemma_id        TEXT,                           -- FK → ar_ling_lemmas.id
  part_of_speech  TEXT,
  source_ref      TEXT,                           -- 'AL:<al_sources.id>'
  page_no         INTEGER,
  note_md         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lemma_id) REFERENCES ar_ling_lemmas(id)
);

CREATE INDEX IF NOT EXISTS idx_ar_ling_tok_lemma ON ar_ling_tokens(lemma_id);
CREATE INDEX IF NOT EXISTS idx_ar_ling_tok_pos   ON ar_ling_tokens(part_of_speech);

-- Sentences in sourced texts
CREATE TABLE IF NOT EXISTS ar_ling_sentences (
  id              TEXT PRIMARY KEY,               -- ULID
  source_ref      TEXT NOT NULL,                  -- 'AL:<al_sources.id>'
  sentence_text   TEXT NOT NULL,
  sentence_text_bare TEXT,
  sentence_type   TEXT NOT NULL DEFAULT 'prose',
    -- 'prose'|'verse'|'example'|'rule_statement'|'definition'
  page_no         INTEGER,
  tokens_json     TEXT,                           -- JSON [ar_ling_tokens.id] ordered
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ar_ling_sent_src ON ar_ling_sentences(source_ref);

-- Token ↔ Lexicon entry links
CREATE TABLE IF NOT EXISTS ar_ling_token_lexicon_link (
  id              TEXT PRIMARY KEY,               -- ULID
  token_id        TEXT NOT NULL,
  lexicon_entry_id TEXT NOT NULL,
  confidence      REAL NOT NULL DEFAULT 1.0,
  UNIQUE (token_id, lexicon_entry_id),
  FOREIGN KEY (token_id)        REFERENCES ar_ling_tokens(id),
  FOREIGN KEY (lexicon_entry_id) REFERENCES ar_ling_lexicon_entries(id)
);
