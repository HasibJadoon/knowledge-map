-- ============================================================
-- Migration: 2026-04-10 — K-Maps Schema Domain Refactor
--
-- Run:
--   wrangler d1 execute knowledgemap \
--     --file=database/migrations/legacy/2026-04-10_schema_refactor.sql --remote
--
-- Strategy: migration-safe — no existing data is destroyed.
--   • ALTER TABLE ADD COLUMN for additive changes
--   • CREATE TABLE IF NOT EXISTS for all new tables
--   • CREATE TABLE __new → INSERT → DROP → RENAME for tables
--     that require CHECK constraint expansion (SQLite limit)
--   • ar_u_tokens kept as legacy (NOT dropped) — FK dependants exist
--   • quran_ayah_lemmas / quran_ayah_lemma_location were already
--     DROPPED in 2026-03-22_drop_empty_lemma_tables.sql —
--     recreated here under ar_quran_* naming
--   • km_surah_analysis migrated → ar_quran_surah_analysis with
--     extended columns, then dropped
--
-- ============================================================
-- SECTION 1 — SUMMARY OF CHANGES
-- ============================================================
--
--  A. RENAMES / DOMAIN REALIGNMENT
--     1. ar_u_quran_ayah_words      → ar_quran_word_occurrences  (RENAME)
--     2. km_surah_analysis          → ar_quran_surah_analysis     (copy-drop-rename + column expansion)
--     3. quran_ayah_lemmas          — already dropped; recreated as ar_quran_lemmas
--     4. quran_ayah_lemma_location  — already dropped; recreated as ar_quran_lemma_occurrences
--
--  B. NEW TABLES
--     ar_u_lemmas, ar_u_lemma_morphology,
--     wv_document_versions,
--     ar_quran_tafsir_entries, wv_node_tafsir_links,
--     ar_quran_passage_analysis, ar_quran_surah_pairs,
--     ar_quran_motif_index, ar_quran_motif_occurrences
--
--  C. ALTER TABLE — wv_documents, wv_document_blocks,
--                   ar_quran_word_occurrences (post-rename)
--
--  D. ar_u_tokens DATA MIGRATION → ar_u_lemmas (INSERT OR IGNORE)
--     ar_u_tokens kept as legacy table (not dropped)
--
--  E. GRAPH EXPANSION — wv_nodes, wv_node_edges
--     (create-copy-drop-rename to expand CHECK constraints)
--
--  F. INDEXES + TRIGGERS for all new and affected tables
--
-- ============================================================

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;


-- ============================================================
-- SECTION 2 — TABLE RENAMES
-- ============================================================

-- ── 2a. ar_u_quran_ayah_words → ar_quran_word_occurrences ───
-- This table has 77,432 rows. SQLite RENAME preserves all data.
ALTER TABLE ar_u_quran_ayah_words RENAME TO ar_quran_word_occurrences;

-- ── 2b. km_surah_analysis → ar_quran_surah_analysis ─────────
-- km_surah_analysis is Qur'an-specific; belongs in ar_quran_*.
-- We expand its columns at the same time (ring_json, motif_map_json,
-- passage_map_json) — requires create-copy pattern.
-- See Section 4f below.


-- ============================================================
-- SECTION 3 — ALTER TABLE STATEMENTS
-- ============================================================

-- ── 3a. wv_documents — add Qur'an / content scope columns ───
-- NOTE: surah + unit_id + deleted_at already added in
-- 2026-03-14_remote_workspace_worldview_planner_rebuild.sql
-- Only add the columns that don't yet exist.

ALTER TABLE wv_documents ADD COLUMN doc_scope_type TEXT;
-- 'quran_surah'|'quran_passage'|'quran_ayah'|'container'|'unit'|'generic'

ALTER TABLE wv_documents ADD COLUMN ayah_from INTEGER;
ALTER TABLE wv_documents ADD COLUMN ayah_to   INTEGER;
ALTER TABLE wv_documents ADD COLUMN container_id TEXT;
-- FK to ar_containers(id) — additive, not enforced at D1 runtime

ALTER TABLE wv_documents ADD COLUMN primary_passage_ref TEXT;
-- Human-readable, e.g. "Al-Baqarah 2:255-257"

ALTER TABLE wv_documents ADD COLUMN canonical_quran_ref TEXT;
-- Machine ref, e.g. "2:255-257"

-- ── 3b. wv_document_blocks — add block typing and Qur'an scope
-- block_type already exists. We add block_kind as the richer
-- semantic classifier for Tiptap / structured blocks.

ALTER TABLE wv_document_blocks ADD COLUMN block_kind TEXT;
-- 'verse_block'|'translation_block'|'morphology_block'|'nahw_block'|
-- 'tafsir_comparison_block'|'conflict_block'|'ring_block'|'motif_block'|
-- 'worldview_block'|'surah_pair_block'|'cross_corpus_block'|
-- 'text'|'heading'|'image'|'table'|'code'

ALTER TABLE wv_document_blocks ADD COLUMN scope_ref   TEXT;
-- e.g. "2:255-257" — canonical Qur'an range this block targets

ALTER TABLE wv_document_blocks ADD COLUMN surah     INTEGER;
ALTER TABLE wv_document_blocks ADD COLUMN ayah_from INTEGER;
ALTER TABLE wv_document_blocks ADD COLUMN ayah_to   INTEGER;

ALTER TABLE wv_document_blocks ADD COLUMN task_type TEXT;
-- 'comprehension'|'vocabulary'|'grammar_drill'|'srs_review'|'reflection'

ALTER TABLE wv_document_blocks ADD COLUMN renderer TEXT;
-- 'tiptap'|'quran_viewer'|'morphology_table'|'ring_diagram'|'motif_map'

-- ── 3c. ar_quran_word_occurrences — add lemma / morphology columns
-- (applies to the renamed table from Step 2a)

ALTER TABLE ar_quran_word_occurrences ADD COLUMN ar_u_lemma      TEXT;
-- Will reference ar_u_lemmas(lemma_norm) — populated post-migration

ALTER TABLE ar_quran_word_occurrences ADD COLUMN ar_u_morphology TEXT;
-- Will reference ar_u_morphology(ar_u_morphology)

ALTER TABLE ar_quran_word_occurrences ADD COLUMN surface_norm    TEXT;
-- Normalized surface (no diacritics) for lookup/matching

ALTER TABLE ar_quran_word_occurrences ADD COLUMN root_norm       TEXT;
-- Normalized root, e.g. "ktb" — duplicates ar_u_root for fast filter

ALTER TABLE ar_quran_word_occurrences ADD COLUMN occurrence_key  TEXT;
-- Stable canonical key: "surah:ayah:position", e.g. "2:255:3"
-- Populated in Section 7 (Data Migration Steps)


-- ============================================================
-- SECTION 4 — NEW TABLES
-- ============================================================

-- ── 4a. ar_quran_lemmas ──────────────────────────────────────
-- Replaces quran_ayah_lemmas (was dropped 2026-03-22).
-- Stores canonical lemma entries that appear in the Qur'an corpus.
CREATE TABLE IF NOT EXISTS ar_quran_lemmas (
  lemma_id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma_text         TEXT    NOT NULL,
  lemma_text_clean   TEXT    NOT NULL,
  -- clean = diacritic-stripped
  words_count        INTEGER,
  uniq_words_count   INTEGER,
  ar_u_lemma         TEXT,
  -- FK to ar_u_lemmas(lemma_norm) once ar_u_lemmas is populated
  created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── 4b. ar_quran_lemma_occurrences ──────────────────────────
-- Replaces quran_ayah_lemma_location (was dropped 2026-03-22).
-- Records exactly where each lemma occurs: surah, ayah, position.
CREATE TABLE IF NOT EXISTS ar_quran_lemma_occurrences (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma_id        INTEGER NOT NULL,
  word_location   TEXT    NOT NULL,
  -- Corpus location string, e.g. "2:255:3"
  surah           INTEGER NOT NULL,
  ayah            INTEGER NOT NULL,
  token_index     INTEGER NOT NULL,
  -- Position within ayah (0-based)
  ar_token_occ_id TEXT,
  -- FK to ar_occ_token(ar_token_occ_id) — optional annotation link
  surface_ar      TEXT,
  word_simple     TEXT,
  word_diacritic  TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (lemma_id, word_location),
  FOREIGN KEY (lemma_id) REFERENCES ar_quran_lemmas(lemma_id) ON DELETE CASCADE
  -- ar_token_occ_id FK: FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id)
  -- Kept commented until ar_occ_token data is backfilled
);

-- ── 4c. ar_u_lemmas ─────────────────────────────────────────
-- Dedicated lemma inventory for the generic Arabic language system.
-- REPLACES ar_u_tokens as the canonical lemma store.
-- ar_u_tokens is kept as a legacy/transitional table (NOT dropped here)
-- because ar_occ_token and quran_ayah_lemmas FK to it.
-- Data is migrated via INSERT OR IGNORE in Section 7.
CREATE TABLE IF NOT EXISTS ar_u_lemmas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_input TEXT    NOT NULL UNIQUE,
  -- Stable external key — Buckwalter, QAC ID, or hash
  lemma_ar        TEXT    NOT NULL,
  -- Arabic script canonical form, e.g. "كَتَبَ"
  lemma_norm      TEXT    NOT NULL UNIQUE,
  -- Normalized (no diacritics), e.g. "كتب"
  pos             TEXT    NOT NULL,
  -- 'noun'|'verb'|'particle'|'adjective'|'pronoun'|'adverb'|'other'
  ar_u_root       TEXT,
  -- Trilateral root, e.g. "ك-ت-ب" — FK to ar_u_roots
  root_norm       TEXT,
  gloss_primary   TEXT,
  features_json   TEXT    CHECK (features_json  IS NULL OR json_valid(features_json)),
  -- { gender, number, derived_form, verb_form, transitivity, … }
  meta_json       TEXT    CHECK (meta_json IS NULL OR json_valid(meta_json)),
  -- { frequency, corpus_source, notes, legacy_ar_u_token }
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ar_u_root) REFERENCES ar_u_roots(ar_u_root) ON DELETE SET NULL
);

-- ── 4d. ar_u_lemma_morphology ───────────────────────────────
-- Bridge: ar_u_lemmas ↔ ar_u_morphology.
-- A single lemma may link to multiple morphological patterns.
CREATE TABLE IF NOT EXISTS ar_u_lemma_morphology (
  ar_u_lemma      TEXT NOT NULL,
  -- FK to ar_u_lemmas(lemma_norm)
  ar_u_morphology TEXT NOT NULL,
  -- FK to ar_u_morphology(ar_u_morphology)
  link_role       TEXT,
  -- 'canonical'|'variant'|'derived'|'inflected'
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (ar_u_lemma, ar_u_morphology),
  FOREIGN KEY (ar_u_lemma)      REFERENCES ar_u_lemmas(lemma_norm)           ON DELETE CASCADE,
  FOREIGN KEY (ar_u_morphology) REFERENCES ar_u_morphology(ar_u_morphology)  ON DELETE CASCADE
);

-- ── 4e. wv_document_versions ────────────────────────────────
-- Immutable snapshots of wv_documents body (Tiptap JSON).
-- Versions are append-only — no updated_at needed.
CREATE TABLE IF NOT EXISTS wv_document_versions (
  id              TEXT    PRIMARY KEY,
  canonical_input TEXT    NOT NULL UNIQUE,
  document_id     TEXT    NOT NULL,
  version_no      INTEGER NOT NULL,
  body_json       TEXT    NOT NULL CHECK (json_valid(body_json)),
  snapshot_note   TEXT,
  -- Human note, e.g. "Before ring-structure refactor"
  created_by      INTEGER,
  -- FK to users(id) — activate once users table confirmed
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (document_id, version_no),
  FOREIGN KEY (document_id) REFERENCES wv_documents(id) ON DELETE CASCADE
  -- FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── 4f. ar_quran_surah_analysis ─────────────────────────────
-- Migrated from km_surah_analysis with expanded columns.
-- km_surah_analysis is dropped at end of this section.
--
-- Step 1: Create new table with full column set.
CREATE TABLE IF NOT EXISTS ar_quran_surah_analysis (
  surah                   INTEGER PRIMARY KEY,
  -- References ar_quran_surahs(surah)
  structure_json          TEXT CHECK (structure_json         IS NULL OR json_valid(structure_json)),
  ring_json               TEXT CHECK (ring_json              IS NULL OR json_valid(ring_json)),
  -- NEW — ring / chiastic structure map
  worldview_json          TEXT CHECK (worldview_json         IS NULL OR json_valid(worldview_json)),
  parallels_json          TEXT CHECK (parallels_json         IS NULL OR json_valid(parallels_json)),
  motif_map_json          TEXT CHECK (motif_map_json         IS NULL OR json_valid(motif_map_json)),
  -- NEW — motif presence and ayah ranges
  passage_map_json        TEXT CHECK (passage_map_json       IS NULL OR json_valid(passage_map_json)),
  -- NEW — canonical passage divisions
  unique_concepts_json    TEXT CHECK (unique_concepts_json   IS NULL OR json_valid(unique_concepts_json)),
  translation_delta_json  TEXT CHECK (translation_delta_json IS NULL OR json_valid(translation_delta_json)),
  surah_podcast_doc_id    TEXT,
  -- FK to wv_documents(id)
  surah_overview_doc_id   TEXT,
  -- FK to wv_documents(id)
  status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                              'draft', 'in_review', 'published', 'archived'
                          )),
  notes                   TEXT,
  deleted_at              TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah)                REFERENCES ar_quran_surahs(surah)  ON DELETE CASCADE,
  FOREIGN KEY (surah_podcast_doc_id) REFERENCES wv_documents(id)        ON DELETE SET NULL,
  FOREIGN KEY (surah_overview_doc_id) REFERENCES wv_documents(id)       ON DELETE SET NULL
);

-- Step 2: Copy data from km_surah_analysis into ar_quran_surah_analysis.
-- Maps: status 'reviewed' → 'in_review' to align new CHECK constraint.
INSERT OR IGNORE INTO ar_quran_surah_analysis (
  surah,
  structure_json,
  worldview_json,
  parallels_json,
  unique_concepts_json,
  translation_delta_json,
  surah_podcast_doc_id,
  surah_overview_doc_id,
  status,
  notes,
  deleted_at,
  created_at,
  updated_at
)
SELECT
  surah,
  structure_json,
  worldview_json,
  parallels_json,
  unique_concepts_json,
  translation_delta_json,
  surah_podcast_doc_id,
  surah_overview_doc_id,
  CASE status
    WHEN 'reviewed'  THEN 'in_review'   -- align new CHECK
    WHEN 'published' THEN 'published'
    WHEN 'draft'     THEN 'draft'
    ELSE 'draft'
  END,
  notes,
  deleted_at,
  created_at,
  updated_at
FROM km_surah_analysis;

-- Step 3: Drop the old km_surah_analysis (data fully migrated above).
DROP TABLE IF EXISTS km_surah_analysis;
-- Indexes on km_surah_analysis are automatically removed with DROP TABLE.

-- ── 4g. ar_quran_tafsir_entries ─────────────────────────────
-- Canonical tafsir storage per mufassir / view / ayah range.
CREATE TABLE IF NOT EXISTS ar_quran_tafsir_entries (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  source_id       INTEGER,
  -- Optional FK to wv_sources(id) if tracked in the library
  surah           INTEGER NOT NULL,
  ayah_from       INTEGER NOT NULL,
  ayah_to         INTEGER NOT NULL,
  mufassir_name   TEXT NOT NULL,
  work_title      TEXT,
  -- e.g. "Tafsir Ibn Kathir", "Fi Zilal al-Quran"
  view_key        TEXT,
  -- Stable slug, e.g. "ibn_kathir_2_255"
  entry_type      TEXT NOT NULL CHECK (entry_type IN (
                      'explanation', 'asbab_al_nuzul', 'linguistic',
                      'legal', 'thematic', 'isnad', 'comparative',
                      'question', 'objection', 'rebuttal'
                  )),
  excerpt_ar      TEXT,
  excerpt_en      TEXT,
  summary_md      TEXT,
  -- Markdown summary for UI display
  argument_json   TEXT CHECK (argument_json IS NULL OR json_valid(argument_json)),
  -- { claim, evidence [], conclusion }
  meta_json       TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT
);

-- ── 4h. wv_node_tafsir_links ────────────────────────────────
-- Connect generic graph nodes → canonical tafsir entries.
CREATE TABLE IF NOT EXISTS wv_node_tafsir_links (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id    TEXT NOT NULL,
  node_id         TEXT NOT NULL,
  tafsir_entry_id TEXT NOT NULL,
  relation        TEXT NOT NULL CHECK (relation IN (
                      'supports', 'challenges', 'contextualizes',
                      'elaborates', 'contradicts', 'cites', 'references'
                  )),
  note            TEXT,
  meta_json       TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (workspace_id)    REFERENCES workspaces(id)                ON DELETE CASCADE,
  FOREIGN KEY (node_id)         REFERENCES wv_nodes(id)                  ON DELETE CASCADE,
  FOREIGN KEY (tafsir_entry_id) REFERENCES ar_quran_tafsir_entries(id)   ON DELETE CASCADE
);

-- ── 4i. ar_quran_passage_analysis ───────────────────────────
-- Canonical passage-level analysis.
-- Replaces / formalises ad-hoc passage metadata scattered in
-- ar_quran_surah_passage and sp_passage_planner.
CREATE TABLE IF NOT EXISTS ar_quran_passage_analysis (
  id               TEXT    PRIMARY KEY,
  canonical_input  TEXT    NOT NULL UNIQUE,
  surah            INTEGER NOT NULL,
  ayah_from        INTEGER NOT NULL,
  ayah_to          INTEGER NOT NULL,
  scope_ref        TEXT,
  -- e.g. "2:255-257" — machine-readable canonical reference
  unit_id          TEXT,
  -- Optional FK to ar_container_units(id)
  task_id          TEXT,
  -- Optional FK to ar_container_unit_task(id)
  passage_title    TEXT,
  passage_kind     TEXT,
  -- 'pericope'|'thematic_unit'|'ring_section'|'narrative'|'command_block'
  ring_position    TEXT,
  -- 'A'|'B'|'C'|"A'"|"B'"|'center' — position in chiastic ring
  section_count    INTEGER NOT NULL DEFAULT 0,
  sections_json    TEXT    NOT NULL DEFAULT '[]'
                           CHECK (json_valid(sections_json)),
  -- Array of section objects
  theme_keys_json  TEXT    CHECK (theme_keys_json IS NULL OR json_valid(theme_keys_json)),
  motif_keys_json  TEXT    CHECK (motif_keys_json IS NULL OR json_valid(motif_keys_json)),
  has_chiasm       INTEGER NOT NULL DEFAULT 0 CHECK (has_chiasm   IN (0, 1)),
  has_timeline     INTEGER NOT NULL DEFAULT 0 CHECK (has_timeline IN (0, 1)),
  has_clusters     INTEGER NOT NULL DEFAULT 0 CHECK (has_clusters IN (0, 1)),
  has_keyvalue     INTEGER NOT NULL DEFAULT 0 CHECK (has_keyvalue IN (0, 1)),
  schema_version   INTEGER NOT NULL DEFAULT 2,
  status           TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN (
                       'draft', 'in_review', 'published', 'archived'
                   )),
  deleted_at       TEXT,
  meta_json        TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT
);

-- ── 4j. ar_quran_surah_pairs ────────────────────────────────
-- Pair / dovetail / completion / contrast relations between surahs.
-- Models the Qur'anic literary phenomenon of surah dovetailing.
CREATE TABLE IF NOT EXISTS ar_quran_surah_pairs (
  id              TEXT    PRIMARY KEY,
  canonical_input TEXT    NOT NULL UNIQUE,
  surah_a         INTEGER NOT NULL,
  surah_b         INTEGER NOT NULL,
  pair_type       TEXT    NOT NULL CHECK (pair_type IN (
                      'dovetail', 'completion', 'contrast', 'mirror',
                      'sequence', 'thematic', 'structural', 'narrative_pair'
                  )),
  summary         TEXT,
  analysis_json   TEXT CHECK (analysis_json IS NULL OR json_valid(analysis_json)),
  -- Detailed structural / thematic / ring analysis
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah_a) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT,
  FOREIGN KEY (surah_b) REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT
);

-- ── 4k. ar_quran_motif_index ────────────────────────────────
-- Canonical motif dictionary — the master registry of all
-- recurring Qur'anic motifs tracked in the system.
CREATE TABLE IF NOT EXISTS ar_quran_motif_index (
  id              TEXT PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  motif_key       TEXT NOT NULL UNIQUE,
  -- Stable slug, e.g. "light_darkness", "creation_adam", "covenant"
  title           TEXT NOT NULL,
  title_ar        TEXT,
  description     TEXT,
  motif_json      TEXT CHECK (motif_json IS NULL OR json_valid(motif_json)),
  -- Extended definition, semantic field, related motifs
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── 4l. ar_quran_motif_occurrences ──────────────────────────
-- Records where each motif appears in the Qur'an corpus.
-- Scoped to surah / ayah range / node (for analysis documents).
CREATE TABLE IF NOT EXISTS ar_quran_motif_occurrences (
  id               TEXT    PRIMARY KEY,
  canonical_input  TEXT    NOT NULL UNIQUE,
  motif_id         TEXT    NOT NULL,
  -- FK to ar_quran_motif_index(id)
  surah            INTEGER NOT NULL,
  ayah_from        INTEGER,
  ayah_to          INTEGER,
  node_id          TEXT,
  -- Optional FK to wv_nodes(id) — for graph-linked occurrences
  note             TEXT,
  occurrence_json  TEXT    CHECK (occurrence_json IS NULL OR json_valid(occurrence_json)),
  -- { intensity, variant, cluster_id, … }
  created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (motif_id) REFERENCES ar_quran_motif_index(id) ON DELETE CASCADE,
  FOREIGN KEY (surah)    REFERENCES ar_quran_surahs(surah)   ON DELETE RESTRICT
);


-- ============================================================
-- SECTION 5 — GRAPH EXPANSION
-- (create-copy-drop-rename — SQLite cannot ALTER CHECK)
-- ============================================================

-- ── 5a. wv_nodes — expand node_type ─────────────────────────
-- Current node_type CHECK comes from 2026-03-24_align_wv_node_schema.sql.
-- We extend with 12 new Qur'anic-analysis types.
-- Exact column list mirrored from that migration.

CREATE TABLE wv_nodes__refactor_2026_04_10 (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,
  workspace_id     TEXT NOT NULL,
  group_id         TEXT,
  user_id          INTEGER,
  node_type        TEXT NOT NULL CHECK (node_type IN (
    -- ── Original ontology (2026-03-24) ─────────────────────
    'cluster', 'subcluster', 'group', 'collection',
    'theme', 'concept', 'principle', 'law', 'pattern', 'framework',
    'claim', 'evidence', 'proof_step', 'counter_claim', 'assumption',
    'inference',
    'flow', 'process', 'sequence_step', 'transition',
    'cause', 'effect', 'state', 'event',
    'actor', 'role', 'trait', 'intention', 'emotion', 'decision',
    'psych_state', 'cognitive_bias', 'moral_state', 'spiritual_state',
    'ayah_ref', 'surah_ref', 'quranic_pattern',
    'source', 'source_unit', 'quote', 'reference',
    'question', 'reflection', 'insight', 'warning', 'lesson',
    'content_piece', 'podcast_segment', 'lesson_block', 'short_clip',
    'diagram_anchor', 'highlight', 'focus_node',
    -- ── NEW — Qur'anic analysis types ──────────────────────
    'motif',             -- a recurring Qur'anic motif node
    'conflict',          -- a doctrinal / textual conflict node
    'tafsir_view',       -- a mufassir interpretation node
    'tafsir_question',   -- an unresolved tafsir question
    'structural_section',-- a named structural section of a surah
    'ring_anchor',       -- anchor point in a chiastic / ring structure
    'contrast_pair',     -- two contrasting elements in a passage
    'lexical_theme',     -- a thematic cluster of lemmas / roots
    'surah_pair',        -- a paired-surah relationship node
    'dovetail',          -- a thematic dovetail connection
    'completion',        -- a surah-completion relationship
    'passage_ref'        -- a named passage reference node
  )),
  title            TEXT,
  text_plain       TEXT,
  summary          TEXT,
  slug             TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
                       'draft', 'active', 'archived', 'merged'
                   )),
  data_json        TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(data_json)),
  meta_json        TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)       ON DELETE CASCADE,
  FOREIGN KEY (group_id)     REFERENCES workspace_groups(id)  ON DELETE SET NULL,
  FOREIGN KEY (user_id)      REFERENCES users(id)             ON DELETE SET NULL
);

-- Copy all existing nodes (CHECK constraint is a superset — all values pass)
INSERT INTO wv_nodes__refactor_2026_04_10
SELECT * FROM wv_nodes;

DROP TABLE wv_nodes;
ALTER TABLE wv_nodes__refactor_2026_04_10 RENAME TO wv_nodes;

-- ── 5b. wv_node_edges — expand relation_type ────────────────
-- Current relation_type CHECK from 2026-03-14 migration.
-- Exact column list mirrored from that migration.

CREATE TABLE wv_node_edges__refactor_2026_04_10 (
  id             TEXT  PRIMARY KEY,
  canonical_input TEXT NOT NULL UNIQUE,
  workspace_id   TEXT  NOT NULL,
  group_id       TEXT,
  from_node_id   TEXT  NOT NULL,
  to_node_id     TEXT  NOT NULL,
  relation_type  TEXT  NOT NULL CHECK (relation_type IN (
    -- ── Original types (2026-03-14) ────────────────────────
    'supports', 'contradicts', 'mentions', 'related_to', 'part_of',
    'derived_from', 'feeds_output', 'questions', 'cites', 'about',
    'illustrates', 'defines', 'parallels', 'other',
    -- ── NEW — Qur'anic literary / structural relations ─────
    'sequence',        -- A then B in narrative / surah order
    'leads_to',        -- A leads to / results in B
    'resolves',        -- A resolves the tension in B
    'echoes',          -- A echoes / recalls B
    'contrasts_with',  -- A is in contrast with B
    'completes',       -- A completes the arc / idea of B
    'dovetails_with',  -- A dovetails with B (surah-level)
    'center_of',       -- A is the center / pivot of B (ring structure)
    'framed_by',       -- A is framed by B (outer ring)
    'mirrors',         -- A mirrors B structurally
    'anticipates',     -- A anticipates / foreshadows B
    'fulfilled_by'     -- A is fulfilled / answered by B
  )),
  strength       REAL,
  order_index    INTEGER NOT NULL DEFAULT 0,
  note           TEXT,
  meta_json      TEXT CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)       ON DELETE CASCADE,
  FOREIGN KEY (group_id)     REFERENCES workspace_groups(id)  ON DELETE SET NULL,
  FOREIGN KEY (from_node_id) REFERENCES wv_nodes(id)          ON DELETE CASCADE,
  FOREIGN KEY (to_node_id)   REFERENCES wv_nodes(id)          ON DELETE CASCADE
);

INSERT INTO wv_node_edges__refactor_2026_04_10
SELECT * FROM wv_node_edges;

DROP TABLE wv_node_edges;
ALTER TABLE wv_node_edges__refactor_2026_04_10 RENAME TO wv_node_edges;


-- ============================================================
-- SECTION 6 — INDEXES
-- ============================================================

-- ── Renamed table: ar_quran_word_occurrences ─────────────────
-- (Old indexes on ar_u_quran_ayah_words were dropped with the rename.
--  Recreate under the new table name.)

CREATE INDEX IF NOT EXISTS idx_ar_qwo_surah_ayah_pos
  ON ar_quran_word_occurrences(surah, ayah, position);

CREATE INDEX IF NOT EXISTS idx_ar_qwo_ar_u_root
  ON ar_quran_word_occurrences(ar_u_root);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_qwo_unique_word
  ON ar_quran_word_occurrences(surah, ayah, position, word_id);

-- New columns added in Section 3c
CREATE INDEX IF NOT EXISTS idx_ar_qwo_ar_u_lemma
  ON ar_quran_word_occurrences(ar_u_lemma);

CREATE INDEX IF NOT EXISTS idx_ar_qwo_root_norm
  ON ar_quran_word_occurrences(root_norm);

CREATE INDEX IF NOT EXISTS idx_ar_qwo_ar_u_morphology
  ON ar_quran_word_occurrences(ar_u_morphology);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_qwo_occurrence_key
  ON ar_quran_word_occurrences(occurrence_key)
  WHERE occurrence_key IS NOT NULL;

-- ── ar_quran_lemmas ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ar_quran_lemmas_text
  ON ar_quran_lemmas(lemma_text_clean);

CREATE INDEX IF NOT EXISTS idx_ar_quran_lemmas_ar_u_lemma
  ON ar_quran_lemmas(ar_u_lemma);

-- ── ar_quran_lemma_occurrences ───────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_qlo_unique
  ON ar_quran_lemma_occurrences(lemma_id, word_location);

CREATE INDEX IF NOT EXISTS idx_ar_qlo_lemma_surah_ayah
  ON ar_quran_lemma_occurrences(lemma_id, surah, ayah);

CREATE INDEX IF NOT EXISTS idx_ar_qlo_surah_ayah
  ON ar_quran_lemma_occurrences(surah, ayah);

-- ── ar_u_lemmas ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ar_u_lemmas_lemma_norm
  ON ar_u_lemmas(lemma_norm);

CREATE INDEX IF NOT EXISTS idx_ar_u_lemmas_ar_u_root
  ON ar_u_lemmas(ar_u_root);

CREATE INDEX IF NOT EXISTS idx_ar_u_lemmas_pos
  ON ar_u_lemmas(pos);

CREATE INDEX IF NOT EXISTS idx_ar_u_lemmas_root_norm
  ON ar_u_lemmas(root_norm);

-- ── ar_u_lemma_morphology ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ar_u_lm_lemma
  ON ar_u_lemma_morphology(ar_u_lemma);

CREATE INDEX IF NOT EXISTS idx_ar_u_lm_morphology
  ON ar_u_lemma_morphology(ar_u_morphology);

-- ── wv_document_versions ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wv_docver_document
  ON wv_document_versions(document_id, version_no);

CREATE INDEX IF NOT EXISTS idx_wv_docver_created
  ON wv_document_versions(created_at);

-- ── ar_quran_surah_analysis ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ar_qsa_status
  ON ar_quran_surah_analysis(status);

CREATE INDEX IF NOT EXISTS idx_ar_qsa_deleted
  ON ar_quran_surah_analysis(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ── ar_quran_tafsir_entries ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ar_qte_surah_ayah
  ON ar_quran_tafsir_entries(surah, ayah_from, ayah_to);

CREATE INDEX IF NOT EXISTS idx_ar_qte_mufassir
  ON ar_quran_tafsir_entries(mufassir_name);

CREATE INDEX IF NOT EXISTS idx_ar_qte_view_key
  ON ar_quran_tafsir_entries(view_key)
  WHERE view_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ar_qte_entry_type
  ON ar_quran_tafsir_entries(entry_type);

-- ── wv_node_tafsir_links ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wv_ntl_node
  ON wv_node_tafsir_links(node_id);

CREATE INDEX IF NOT EXISTS idx_wv_ntl_tafsir
  ON wv_node_tafsir_links(tafsir_entry_id);

CREATE INDEX IF NOT EXISTS idx_wv_ntl_workspace
  ON wv_node_tafsir_links(workspace_id);

-- ── ar_quran_passage_analysis ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ar_qpa_surah_ayah
  ON ar_quran_passage_analysis(surah, ayah_from, ayah_to);

CREATE INDEX IF NOT EXISTS idx_ar_qpa_scope_ref
  ON ar_quran_passage_analysis(scope_ref)
  WHERE scope_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ar_qpa_status
  ON ar_quran_passage_analysis(status);

CREATE INDEX IF NOT EXISTS idx_ar_qpa_deleted
  ON ar_quran_passage_analysis(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ── ar_quran_surah_pairs ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ar_qsp_surah_a
  ON ar_quran_surah_pairs(surah_a);

CREATE INDEX IF NOT EXISTS idx_ar_qsp_surah_b
  ON ar_quran_surah_pairs(surah_b);

CREATE INDEX IF NOT EXISTS idx_ar_qsp_type
  ON ar_quran_surah_pairs(pair_type);

-- ── ar_quran_motif_index ─────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_qmi_motif_key
  ON ar_quran_motif_index(motif_key);

-- ── ar_quran_motif_occurrences ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ar_qmo_motif
  ON ar_quran_motif_occurrences(motif_id);

CREATE INDEX IF NOT EXISTS idx_ar_qmo_surah_ayah
  ON ar_quran_motif_occurrences(surah, ayah_from, ayah_to);

CREATE INDEX IF NOT EXISTS idx_ar_qmo_node
  ON ar_quran_motif_occurrences(node_id)
  WHERE node_id IS NOT NULL;

-- ── wv_documents — new scope columns ────────────────────────
CREATE INDEX IF NOT EXISTS idx_wv_docs_scope_type
  ON wv_documents(doc_scope_type)
  WHERE doc_scope_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wv_docs_ayah_range
  ON wv_documents(surah, ayah_from, ayah_to)
  WHERE surah IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wv_docs_container
  ON wv_documents(container_id)
  WHERE container_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wv_docs_quran_ref
  ON wv_documents(canonical_quran_ref)
  WHERE canonical_quran_ref IS NOT NULL;

-- ── wv_document_blocks — new block_kind columns ──────────────
CREATE INDEX IF NOT EXISTS idx_wv_blocks_kind
  ON wv_document_blocks(block_kind)
  WHERE block_kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wv_blocks_surah_ayah
  ON wv_document_blocks(surah, ayah_from, ayah_to)
  WHERE surah IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wv_blocks_scope_ref
  ON wv_document_blocks(scope_ref)
  WHERE scope_ref IS NOT NULL;

-- ── wv_nodes — post-rename ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wv_nodes_type
  ON wv_nodes(node_type);

CREATE INDEX IF NOT EXISTS idx_wv_nodes_workspace
  ON wv_nodes(workspace_id);

CREATE INDEX IF NOT EXISTS idx_wv_nodes_status
  ON wv_nodes(status);

-- ── wv_node_edges — post-rename ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wv_edges_from
  ON wv_node_edges(from_node_id);

CREATE INDEX IF NOT EXISTS idx_wv_edges_to
  ON wv_node_edges(to_node_id);

CREATE INDEX IF NOT EXISTS idx_wv_edges_relation
  ON wv_node_edges(relation_type);

CREATE INDEX IF NOT EXISTS idx_wv_edges_workspace
  ON wv_node_edges(workspace_id);


-- ============================================================
-- SECTION 7 — TRIGGERS
-- ============================================================
-- House style: AFTER UPDATE … WHEN NEW.updated_at IS OLD.updated_at
-- Prevents recursive trigger if application also sets updated_at.
-- ============================================================

-- ── ar_quran_lemmas ──────────────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_ar_quran_lemmas_updated_at
AFTER UPDATE ON ar_quran_lemmas
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_lemmas SET updated_at = datetime('now') WHERE lemma_id = OLD.lemma_id;
END;

-- ── ar_u_lemmas ──────────────────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_ar_u_lemmas_updated_at
AFTER UPDATE ON ar_u_lemmas
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_u_lemmas SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ── ar_quran_surah_analysis ──────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_ar_quran_surah_analysis_updated_at
AFTER UPDATE ON ar_quran_surah_analysis
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_surah_analysis SET updated_at = datetime('now') WHERE surah = OLD.surah;
END;

-- ── ar_quran_tafsir_entries ──────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_ar_quran_tafsir_entries_updated_at
AFTER UPDATE ON ar_quran_tafsir_entries
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_tafsir_entries SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ── wv_node_tafsir_links ─────────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_wv_node_tafsir_links_updated_at
AFTER UPDATE ON wv_node_tafsir_links
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_node_tafsir_links SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ── ar_quran_passage_analysis ────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_ar_quran_passage_analysis_updated_at
AFTER UPDATE ON ar_quran_passage_analysis
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_passage_analysis SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ── ar_quran_surah_pairs ─────────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_ar_quran_surah_pairs_updated_at
AFTER UPDATE ON ar_quran_surah_pairs
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_surah_pairs SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ── ar_quran_motif_index ─────────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_ar_quran_motif_index_updated_at
AFTER UPDATE ON ar_quran_motif_index
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_motif_index SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ── ar_quran_motif_occurrences ───────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_ar_quran_motif_occurrences_updated_at
AFTER UPDATE ON ar_quran_motif_occurrences
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_motif_occurrences SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ── wv_nodes ─────────────────────────────────────────────────
-- Note: wv_nodes had no updated_at trigger in prior migrations.
-- Adding one now using the same guard pattern.
CREATE TRIGGER IF NOT EXISTS trg_wv_nodes_updated_at
AFTER UPDATE ON wv_nodes
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_nodes SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ── wv_node_edges ────────────────────────────────────────────
CREATE TRIGGER IF NOT EXISTS trg_wv_node_edges_updated_at
AFTER UPDATE ON wv_node_edges
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE wv_node_edges SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ── ar_quran_word_occurrences ────────────────────────────────
-- Existing table had no trigger — adding one.
CREATE TRIGGER IF NOT EXISTS trg_ar_quran_word_occurrences_updated_at
AFTER UPDATE ON ar_quran_word_occurrences
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_word_occurrences SET updated_at = datetime('now') WHERE id = OLD.id;
END;


-- ============================================================
-- SECTION 8 — DATA MIGRATION STEPS
-- ============================================================

-- ── 8a. ar_u_tokens → ar_u_lemmas ───────────────────────────
-- ar_u_tokens columns confirmed from schema.sql:
--   ar_u_token (PK TEXT), canonical_input, lemma_ar, lemma_norm,
--   pos, root_norm, ar_u_root, features_json, meta_json,
--   created_at, updated_at
--
-- Insert all ar_u_tokens rows into ar_u_lemmas.
-- We write the legacy ar_u_token key into meta_json for traceability.
-- INSERT OR IGNORE: skip duplicates on (lemma_norm UNIQUE).

INSERT OR IGNORE INTO ar_u_lemmas (
  canonical_input,
  lemma_ar,
  lemma_norm,
  pos,
  ar_u_root,
  root_norm,
  gloss_primary,
  features_json,
  meta_json,
  created_at,
  updated_at
)
SELECT
  t.canonical_input,
  t.lemma_ar,
  t.lemma_norm,
  t.pos,
  t.ar_u_root,
  t.root_norm,
  NULL    AS gloss_primary,       -- not present in ar_u_tokens
  t.features_json,
  -- Embed the legacy ar_u_token PK into meta_json for traceability
  json_patch(
    COALESCE(t.meta_json, '{}'),
    json_object('legacy_ar_u_token', t.ar_u_token)
  )       AS meta_json,
  t.created_at,
  COALESCE(t.updated_at, datetime('now')) AS updated_at
FROM ar_u_tokens t
WHERE t.lemma_norm IS NOT NULL
  AND t.lemma_norm != '';

-- VERIFY AFTER RUNNING:
--   SELECT COUNT(*) FROM ar_u_tokens;   -- baseline count
--   SELECT COUNT(*) FROM ar_u_lemmas;   -- should be >= tokens count
--   SELECT * FROM ar_u_lemmas LIMIT 20;

-- ── 8b. Populate occurrence_key in ar_quran_word_occurrences ─
-- Format: "surah:ayah:position"  e.g. "2:255:3"
-- Safe to run multiple times (WHERE occurrence_key IS NULL guard).

UPDATE ar_quran_word_occurrences
SET occurrence_key = CAST(surah AS TEXT) || ':' ||
                     CAST(ayah  AS TEXT) || ':' ||
                     CAST(position AS TEXT)
WHERE occurrence_key IS NULL
  AND surah    IS NOT NULL
  AND ayah     IS NOT NULL
  AND position IS NOT NULL;

-- ── 8c. Populate ar_quran_word_occurrences.ar_u_lemma ────────
-- If ar_u_tokens had a 1:1 match on the `lemma` column in
-- ar_quran_word_occurrences, backfill ar_u_lemma from ar_u_lemmas.
-- This is a best-effort JOIN — review NULL count after running.

UPDATE ar_quran_word_occurrences
SET ar_u_lemma = (
  SELECT l.lemma_norm
  FROM   ar_u_lemmas l
  WHERE  l.lemma_ar = ar_quran_word_occurrences.lemma
  LIMIT  1
)
WHERE ar_u_lemma IS NULL
  AND lemma IS NOT NULL;

-- VERIFY:
--   SELECT COUNT(*) FROM ar_quran_word_occurrences WHERE ar_u_lemma IS NULL;
--   -- Ideally < 5% of rows. Remaining NULLs need manual lemma mapping.


-- ============================================================
-- SECTION 9 — COMMIT
-- ============================================================

COMMIT;

PRAGMA foreign_keys = ON;


-- ============================================================
-- SECTION 10 — NOTES / MANUAL REVIEW ITEMS
-- ============================================================
--
-- [MANUAL-1] ar_u_tokens — LEGACY, NOT DROPPED
--   ar_occ_token.ar_u_token FK references ar_u_tokens.
--   Do NOT drop ar_u_tokens until ar_occ_token is updated to
--   reference ar_u_lemmas(lemma_norm) instead.
--   Planned future migration: 2026-04-XX_migrate_occ_token_to_lemmas.sql
--
-- [MANUAL-2] ar_quran_word_occurrences — index migration
--   The UNIQUE index on (surah, ayah, position, word_id) was
--   recreated in Section 6. Verify it exists:
--     SELECT name FROM sqlite_master
--     WHERE type = 'index' AND tbl_name = 'ar_quran_word_occurrences';
--
-- [MANUAL-3] km_surah_analysis — status field mapping
--   'reviewed' was mapped to 'in_review' in the INSERT.
--   Confirm row count match:
--     SELECT COUNT(*) FROM ar_quran_surah_analysis;
--   Expected: same count as km_surah_analysis before migration.
--
-- [MANUAL-4] wv_nodes — new node_type values
--   New types: motif, conflict, tafsir_view, tafsir_question,
--   structural_section, ring_anchor, contrast_pair, lexical_theme,
--   surah_pair, dovetail, completion, passage_ref
--   Angular Hub panel and wv_nodes service must be updated
--   to expose these new types in the UI picker.
--
-- [MANUAL-5] wv_node_edges — new relation_type values
--   New: sequence, leads_to, resolves, echoes, contrasts_with,
--   completes, dovetails_with, center_of, framed_by, mirrors,
--   anticipates, fulfilled_by
--   Edge creation UI / HubPanelService must list these.
--
-- [MANUAL-6] wv_documents.surah / unit_id collision check
--   Both columns were added in 2026-03-14. This migration does NOT
--   re-add them. If running against a pre-2026-03-14 DB, add:
--     ALTER TABLE wv_documents ADD COLUMN surah INTEGER;
--     ALTER TABLE wv_documents ADD COLUMN unit_id TEXT;
--   before this script.
--
-- [MANUAL-7] ar_quran_passage_analysis — backfill from ar_quran_surah_passage
--   Existing passage data in ar_quran_surah_passage can be seeded into
--   ar_quran_passage_analysis using:
--     INSERT OR IGNORE INTO ar_quran_passage_analysis
--       (id, canonical_input, surah, ayah_from, ayah_to, passage_title, ...)
--     SELECT lower(hex(randomblob(16))), ..., surah, ayah_from, ayah_to, theme, ...
--     FROM ar_quran_surah_passage;
--   Planned as a separate seed migration.
--
-- [MANUAL-8] ar_u_lemmas.gloss_primary — currently NULL for migrated rows
--   Gloss is not present in ar_u_tokens. Populate from ar_u_lexicon
--   where a matching lemma_norm exists:
--     UPDATE ar_u_lemmas l
--     SET gloss_primary = (
--       SELECT lex.gloss_primary FROM ar_u_lexicon lex
--       WHERE lex.lemma_norm = l.lemma_norm LIMIT 1
--     )
--     WHERE gloss_primary IS NULL;
--
-- [MANUAL-9] wv_node_quran_links — target_ref column
--   Confirmed to exist from 2026-03-24_align_wv_node_schema.sql
--   (renamed from target_id). No change needed here.
--
-- [MANUAL-10] ar_quran_surah_pairs UNIQUE constraint
--   No UNIQUE on (surah_a, surah_b, pair_type) deliberately — the same
--   pair of surahs may have multiple distinct pair relationships
--   (e.g., both 'dovetail' and 'thematic').
--   Add a partial unique index if strict deduplication is needed:
--     CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_qsp_unique_typed_pair
--       ON ar_quran_surah_pairs(surah_a, surah_b, pair_type);
-- ============================================================
