-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_quran DB — Layer 1: Corpus Base
-- File   : Database/migrations/km-quran/001_corpus_base.sql
-- Run    : wrangler d1 execute km_quran --file=... --remote
--
-- Establishes the canonical corpus base in the standalone km_quran database.
-- These tables migrate FROM the existing `knowledgemap` DB (after Phase 1 rename).
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- qr_surahs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surahs (
  id                INTEGER PRIMARY KEY,        -- 1–114
  name_ar           TEXT NOT NULL,
  name_en           TEXT NOT NULL,
  name_transliteration TEXT,
  revelation_type   TEXT NOT NULL DEFAULT 'makki',  -- 'makki'|'madani'
  ayah_count        INTEGER NOT NULL,
  juz_start         INTEGER,
  page_start        INTEGER,
  order_revelation  INTEGER,                   -- approximate chronological order
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);



-- ─────────────────────────────────────────────────────────────────────────────
-- qr_ayah
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_ayah (
  id                TEXT PRIMARY KEY,           -- ULID
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  text_uthmani_clean TEXT,                      -- PREFERRED: no U+06DD, no verse number
  text_uthmani      TEXT,
  text_bare         TEXT,                       -- stripped diacritics
  text              TEXT,                       -- fallback
  translation       TEXT,                       -- default EN translation
  verse_mark        TEXT,                       -- Arabic-Indic digits only (١٢٣ never ۝)
  page_number       INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, ayah),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qra_surah ON qr_ayah(surah);
CREATE INDEX IF NOT EXISTS idx_qra_page  ON qr_ayah(page_number);



-- ─────────────────────────────────────────────────────────────────────────────
-- qr_word_occurrences  — SINGLE canonical owner of visible Quranic word occurrences
-- NOTE: Do NOT create qr_ss_occ_word — this is the owner.
--       qr_ss_occ_segment handles attached sub-word elements (particles, articles).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_word_occurrences (
  id                TEXT PRIMARY KEY,           -- ULID
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  word_index        INTEGER NOT NULL,           -- 1-based position in ayah
  word_text         TEXT NOT NULL,              -- Arabic text with diacritics
  word_text_bare    TEXT,                       -- stripped
  root              TEXT,                       -- trilateral root (unvowelled)
  lemma             TEXT,                       -- dictionary form
  pos               TEXT,                       -- part of speech tag
  morphology_tag    TEXT,                       -- full morphology tag string (e.g. from QCF/Quranic Corpus)
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (surah, ayah, word_index),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);

CREATE INDEX IF NOT EXISTS idx_qrwo_surah_ayah ON qr_word_occurrences(surah, ayah);
CREATE INDEX IF NOT EXISTS idx_qrwo_root       ON qr_word_occurrences(root);
CREATE INDEX IF NOT EXISTS idx_qrwo_lemma      ON qr_word_occurrences(lemma);

-- ─────────────────────────────────────────────────────────────────────────────
-- qr_lemmas  — Quran-native lemma index (concordance / lexical indexing)
-- Note: Universal lemma ownership stays in km_lexicon (ar_ling_lemmas).
--       These rows are Quran-specific occurrences for concordance + semantic fields.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_lemmas (
  id                TEXT PRIMARY KEY,           -- ULID
  lemma_text        TEXT NOT NULL UNIQUE,       -- dictionary form
  root              TEXT,
  lx_lemma_ref      TEXT,                       -- typed ref: LX:<ar_ling_lemmas.id>
  total_occurrences INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_qrl_root ON qr_lemmas(root);

CREATE TABLE IF NOT EXISTS qr_lemma_occurrences (
  id                TEXT PRIMARY KEY,           -- ULID
  lemma_id          TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  word_index        INTEGER NOT NULL,
  word_occurrence_id TEXT NOT NULL,             -- FK → qr_word_occurrences.id
  UNIQUE (lemma_id, surah, ayah, word_index),
  FOREIGN KEY (lemma_id)          REFERENCES qr_lemmas(id),
  FOREIGN KEY (word_occurrence_id) REFERENCES qr_word_occurrences(id)
);

CREATE INDEX IF NOT EXISTS idx_qrlo_lemma      ON qr_lemma_occurrences(lemma_id);
CREATE INDEX IF NOT EXISTS idx_qrlo_surah_ayah ON qr_lemma_occurrences(surah, ayah);

-- ─────────────────────────────────────────────────────────────────────────────
-- qr_translation_sources
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_translation_sources (
  id                TEXT PRIMARY KEY,           -- ULID
  source_code       TEXT NOT NULL UNIQUE,       -- e.g. 'haleem'|'sahih_intl'|'yusuf_ali'
  translator_name   TEXT NOT NULL,
  language          TEXT NOT NULL DEFAULT 'en',
  edition           TEXT,
  is_default        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- qr_translations  — per-ayah translations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_translations (
  id                TEXT PRIMARY KEY,           -- ULID
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

CREATE INDEX IF NOT EXISTS idx_qrtr_source_surah ON qr_translations(source_id, surah);

-- ─────────────────────────────────────────────────────────────────────────────
-- qr_translation_passages  — passage-level translations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_translation_passages (
  id                TEXT PRIMARY KEY,           -- ULID
  source_id         TEXT NOT NULL,
  surah             INTEGER NOT NULL,
  ayah_from         INTEGER NOT NULL,
  ayah_to           INTEGER NOT NULL,
  passage_translation TEXT NOT NULL,
  note_md           TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_id) REFERENCES qr_translation_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_qrtp_source_surah ON qr_translation_passages(source_id, surah);

-- ─────────────────────────────────────────────────────────────────────────────
-- qr_page_layout_lines  — mushaf page layout
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_page_layout_lines (
  id                TEXT PRIMARY KEY,           -- ULID
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

CREATE INDEX IF NOT EXISTS idx_qrpll_page ON qr_page_layout_lines(page_number);

-- ─────────────────────────────────────────────────────────────────────────────
-- qr_surah_ayah_meta  — additional per-ayah metadata
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_surah_ayah_meta (
  surah             INTEGER NOT NULL,
  ayah              INTEGER NOT NULL,
  juz               INTEGER,
  hizb              INTEGER,
  ruku              INTEGER,
  manzil            INTEGER,
  sajda             INTEGER NOT NULL DEFAULT 0,  -- 1 = sajda ayah
  PRIMARY KEY (surah, ayah),
  FOREIGN KEY (surah) REFERENCES qr_surahs(id)
);
