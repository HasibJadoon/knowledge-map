-- 014_morphology_display_layer.sql
-- DISPLAY-ONLY projection layer for the Qurʾān **Morphology study step**.
-- Parallel to 011 (iʿrāb display) and 012 (tafsīr display). Its job: hold
-- crisp, render-ready rows so the UI renders a word with ZERO logic — the
-- grid of noun/verb cards and the deep word modal both bind straight to
-- these tables.
--
-- SCOPE / CURATION RULE — this layer is NOT every token:
--   • Only **promoted content words** (nouns/verbs/adjectives worth study)
--     get a `qr_morph_display_words` row. Particles (ḥarf), pronouns,
--     relatives, demonstratives are NOT promoted → they never hit the grid.
--   • A word is promotable to a difficulty tier (SRS). Importance 1..5.
--
-- EXTEND-DON'T-DUPLICATE:
--   • words   : UNIQUE(surah_no, ayah_no, word_index)
--   • blocks  : UNIQUE(word_id, block_type, block_subtype)
--   Re-running a word ADDS missing blocks / fills new nuances; never dupes.
--
-- TRILINGUAL: every display string exists as *_en / *_ar / *_ur. English is
--   RICH + explanatory (plain-language morphology + semantic core + hook) so an
--   English learner understands and retains — not a bare gloss. Urdu mirrors
--   the Arabic register. data_json payloads carry _en/_ar/_ur variants too.
--
-- REGISTER DISCIPLINE (inherited from WMP): linguistic ≠ tafsīr ≠ modern;
--   blocks carry `register` and stay disjoint — linked, never merged.
--
-- Canonical truth is untouched: this layer READS qr_word_occurrences (QR) and
-- the ar_ling_* suite (AL, via the build step) and PROJECTS render-ready rows.
-- JSON columns are documentary in SQLite; validation lives in parser+worker.

------------------------------------------------------------------------------
-- 1. SOURCES — lens / scholar / synthesis registry for the word view
--    Denormalized names + badges + order so the UI picker needs no join.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_morph_display_sources (
  id                 TEXT PRIMARY KEY,
  source_slug        TEXT NOT NULL UNIQUE,          -- 'saaid_maqayis_al_lugha','sinai_key_terms','kmaps_five_lens','TABARI',…
  kind               TEXT NOT NULL,                 -- 'lexicon' | 'scholar' | 'synthesis' | 'corpus'
  title_ar           TEXT,
  title_en           TEXT,
  title_ur           TEXT,
  author_name_ar     TEXT,
  author_name_en     TEXT,
  author_name_ur     TEXT,
  death_year_hijri   INTEGER,
  register           TEXT,                          -- 'linguistic' | 'tafsir' | 'modern'
  badge_color        TEXT,                          -- UI hint, hex
  badge_glyph        TEXT,                          -- UI hint, short glyph
  display_order      INTEGER NOT NULL DEFAULT 0,
  is_visible         INTEGER NOT NULL DEFAULT 1,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

------------------------------------------------------------------------------
-- 2. WORDS — one row per PROMOTED content word.
--    Drives (a) the grid card and (b) the modal header / identity / ṣarf.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_morph_display_words (
  id                 TEXT PRIMARY KEY,              -- 'MDW:44:2:2'  (surah:ayah:word_index)
  word_occ_ref       TEXT,                          -- qr_word_occurrences.id (word-hash)
  surah_no           INTEGER NOT NULL,
  ayah_no            INTEGER NOT NULL,
  word_index         INTEGER NOT NULL,
  ayah_key           TEXT,                          -- '44:2'
  -- Surface identity --------------------------------------------------------
  surface_ar         TEXT NOT NULL,                 -- الْمُبِينِ (harakāt)
  surface_bare       TEXT,                          -- المبين
  lemma_ar           TEXT,                          -- مُبِين
  root_ar            TEXT,                          -- بين
  root_display       TEXT,                          -- 'ب ي ن'
  root_ref           TEXT,                          -- 'AL:root:بين'
  -- Grid card ---------------------------------------------------------------
  word_group         TEXT NOT NULL,                 -- 'noun' | 'verb'
  pos_ar             TEXT,                          -- اسم / فعل / صفة
  pos_en             TEXT,
  pos_ur             TEXT,
  gloss_ar           TEXT,
  gloss_en           TEXT,                          -- short card gloss (rich EN)
  gloss_ur           TEXT,
  badge_color        TEXT,
  -- Ṣarf summary (card badge + modal header) --------------------------------
  derived_type_ar    TEXT,                          -- اسم فاعل
  derived_type_en    TEXT,                          -- active participle
  derived_type_ur    TEXT,
  wazn_ar            TEXT,                          -- مُفْعِل
  form_roman         TEXT,                          -- IV
  features_json      JSON,                          -- [{key_ar,key_en,val_ar}]
  -- Curation / promotion ----------------------------------------------------
  is_promoted        INTEGER NOT NULL DEFAULT 1,    -- shows in the grid
  is_content_word    INTEGER NOT NULL DEFAULT 1,    -- excludes ḥarf/pronoun/etc.
  is_anchor          INTEGER NOT NULL DEFAULT 0,    -- root's flagship word — others inferred from it
  importance         INTEGER NOT NULL DEFAULT 3,    -- 1..5 salience
  difficulty         INTEGER,                        -- promotable SRS tier
  frequency_quran    INTEGER,
  -- State -------------------------------------------------------------------
  status             TEXT NOT NULL DEFAULT 'live',   -- 'raw' | 'live'
  display_order      INTEGER NOT NULL DEFAULT 0,
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(surah_no, ayah_no, word_index)
);

------------------------------------------------------------------------------
-- 3. BLOCKS — one row per typed panel of the deep word view.
--    The ENTIRE layer is WORD-focused (never verse exegesis). Blocks are TIERED
--    so universal understanding is captured once and reused, contextual info is
--    per occurrence — the read query merges tiers from what the frontend sends:
--      scope_level = 'occurrence' → scope_key = word-hash   (this word's ṣarf,
--                     iʿrāb from qr_ss_scope_morph_link SML) — CONTEXTUAL
--      scope_level = 'ayah'       → scope_key = ayah_key     (context; the verse
--                     is shown only to ground the word, highlighted) — CONTEXTUAL
--      scope_level = 'root'       → scope_key = root_ar      (meaning, family,
--                     hook, five-lens, lexicon SHADES, senses, grounded examples,
--                     word-focused tafsīr synthesis) — UNIVERSAL, reused by every
--                     occurrence of the root; the anchor word carries the memory.
--    block_type ∈ context|sarf|irab|root|family|hook|lens|constellation|
--                 senses|examples|tafsir|scholarship
--    SYNTHESIS layer: lexicon lenses capture the SHADE each lexicographer adds
--    (trilingual), not raw entries; tafsīr blocks are word-focused synthesis, not
--    verse commentary. Everything render-ready (text_* + data_json); dumb UI.
------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_morph_display_blocks (
  id                 TEXT PRIMARY KEY,              -- 'MDB:occ:44:2:2:sarf' | 'MDB:root:بين:hook'
  scope_level        TEXT NOT NULL,                 -- 'occurrence' | 'ayah' | 'root' | 'lemma'
  scope_key          TEXT NOT NULL,                 -- word-hash | '44:2' | 'بين' | lemma
  -- Denormalized locators (nullable per tier) -------------------------------
  word_occ_ref       TEXT,                          -- qr_word_occurrences.id
  surah_no           INTEGER,
  ayah_no            INTEGER,
  word_index         INTEGER,
  ayah_key           TEXT,
  root_ar            TEXT,
  lemma_ar           TEXT,
  -- Block identity ----------------------------------------------------------
  block_type         TEXT NOT NULL,
  block_subtype      TEXT,                          -- lens: maqayis|mufradat|lane|sinai|five_lens
  display_order      INTEGER NOT NULL DEFAULT 0,
  -- Content (render-ready, trilingual) --------------------------------------
  title_ar           TEXT,
  title_en           TEXT,
  title_ur           TEXT,
  text_ar            TEXT,
  text_en            TEXT,                          -- RICH explanatory English
  text_ur            TEXT,
  data_json          JSON NOT NULL DEFAULT '{}',    -- structured payload (carries _en/_ar/_ur)
  -- Provenance --------------------------------------------------------------
  source_slug        TEXT,                          -- → qr_morph_display_sources.source_slug
  source_ref         TEXT,                          -- typed ref (e.g. SML 'QR:SML:44:2:2')
  source_page        TEXT,
  is_synthesis       INTEGER NOT NULL DEFAULT 0,    -- kmaps synthesis vs raw source
  register           TEXT,                          -- 'linguistic'|'tafsir'|'modern' (disjoint)
  -- QA ----------------------------------------------------------------------
  confidence         TEXT DEFAULT 'medium',
  status             TEXT NOT NULL DEFAULT 'live',
  meta_json          JSON,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  -- Extend-don't-duplicate: adding a word's occurrence never re-authors the
  -- root tier; re-running only fills missing (type, subtype) at each scope.
  UNIQUE(scope_level, scope_key, block_type, block_subtype)
);

------------------------------------------------------------------------------
-- 4. INDEXES for the read paths (grid + merged word view)
------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_morph_words_passage
  ON qr_morph_display_words(surah_no, ayah_no, word_index);
CREATE INDEX IF NOT EXISTS idx_morph_words_grid
  ON qr_morph_display_words(surah_no, is_promoted, word_group, display_order);
CREATE INDEX IF NOT EXISTS idx_morph_words_root
  ON qr_morph_display_words(root_ar);
CREATE INDEX IF NOT EXISTS idx_morph_blocks_scope
  ON qr_morph_display_blocks(scope_level, scope_key, display_order);
CREATE INDEX IF NOT EXISTS idx_morph_blocks_root
  ON qr_morph_display_blocks(root_ar, scope_level);
CREATE INDEX IF NOT EXISTS idx_morph_blocks_ayah
  ON qr_morph_display_blocks(ayah_key, scope_level);
