-- ============================================================
-- Migration: 2026-03-22 — Consolidated K-Maps Lifelong Schema
-- Replaces the 5 individual 2026-03-22_* migration files.
-- All data is preserved — no Quran or lexicon data deleted.
--
-- Sections:
--   A. New tables (km_surah_analysis, sp_passage_planner,
--                  km_audio_scenes, km_cross_corpus_links,
--                  ar_quran_surah_passage)
--   B. Column additions to existing tables
--      (wv_sources, wv_nodes, wv_people, ar_u_expressions,
--       wv_documents, ar_quran_surahs, ar_quran_ayah,
--       ar_container_units)
--   C. ar_container_unit_task rebuild — expand task_type CHECK,
--      add version_no + deleted_at (SQLite can't ALTER CHECK)
--   D. ar_quran_synonym_topic_words rebuild — add semantic_nuance,
--      Urdu gloss, ayah refs, lexicon link (preserves all data)
--   E. ar_quran_synonym_topics column additions
--   F. Canonical view: vw_ar_quran_ayah_text
--   G. Indexes & triggers
--
-- Run:
--   wrangler d1 execute knowledge-map-db \
--     --file=Database/migrations/2026-03-22_all.sql
-- ============================================================

PRAGMA foreign_keys = OFF;


-- ════════════════════════════════════════════════════════════
-- A. NEW TABLES
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- A1. km_surah_analysis
--     Surah-level structural / worldview / cross-corpus analysis.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS km_surah_analysis (
  surah                  INTEGER PRIMARY KEY,
  structure_json         JSON CHECK (structure_json          IS NULL OR json_valid(structure_json)),
  worldview_json         JSON CHECK (worldview_json          IS NULL OR json_valid(worldview_json)),
  parallels_json         JSON CHECK (parallels_json          IS NULL OR json_valid(parallels_json)),
  unique_concepts_json   JSON CHECK (unique_concepts_json    IS NULL OR json_valid(unique_concepts_json)),
  translation_delta_json JSON CHECK (translation_delta_json  IS NULL OR json_valid(translation_delta_json)),
  surah_podcast_doc_id   TEXT,
  surah_overview_doc_id  TEXT,
  status                 TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'reviewed', 'published'
  )),
  notes                  TEXT,
  deleted_at             TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (surah)                 REFERENCES ar_quran_surahs(surah) ON DELETE CASCADE,
  FOREIGN KEY (surah_podcast_doc_id)  REFERENCES wv_documents(id)       ON DELETE SET NULL,
  FOREIGN KEY (surah_overview_doc_id) REFERENCES wv_documents(id)       ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_km_surah_analysis_status
  ON km_surah_analysis(status);

CREATE TRIGGER IF NOT EXISTS trg_km_surah_analysis_updated_at
AFTER UPDATE ON km_surah_analysis
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE km_surah_analysis SET updated_at = datetime('now') WHERE surah = OLD.surah;
END;


-- ────────────────────────────────────────────────────────────
-- A2. sp_passage_planner
--     Weekly 3-passage learning tracker with children.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sp_passage_planner (
  id                   TEXT PRIMARY KEY,
  canonical_input      TEXT NOT NULL UNIQUE,
  workspace_id         TEXT NOT NULL,
  group_id             TEXT,
  user_id              INTEGER,

  week_start           TEXT NOT NULL,   -- ISO Monday: YYYY-MM-DD
  unit_id              TEXT NOT NULL,   -- FK ar_container_units
  container_id         TEXT,
  surah                INTEGER NOT NULL,
  ayah_from            INTEGER NOT NULL,
  ayah_to              INTEGER NOT NULL,
  display_ref          TEXT,            -- "12:1-7"

  with_children        INTEGER NOT NULL DEFAULT 1 CHECK (with_children IN (0, 1)),

  status               TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned', 'in_progress', 'tasks_done', 'complete', 'skipped'
  )),
  tasks_done           INTEGER NOT NULL DEFAULT 0,
  tasks_total          INTEGER NOT NULL DEFAULT 0,
  podcast_done         INTEGER NOT NULL DEFAULT 0 CHECK (podcast_done         IN (0, 1)),
  document_done        INTEGER NOT NULL DEFAULT 0 CHECK (document_done        IN (0, 1)),
  children_lesson_done INTEGER NOT NULL DEFAULT 0 CHECK (children_lesson_done IN (0, 1)),

  podcast_doc_id       TEXT,
  study_doc_id         TEXT,
  children_doc_id      TEXT,

  notes                TEXT,
  planner_json         JSON CHECK (planner_json IS NULL OR json_valid(planner_json)),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (workspace_id, week_start, unit_id),

  FOREIGN KEY (workspace_id)    REFERENCES workspaces(id)         ON DELETE CASCADE,
  FOREIGN KEY (group_id)        REFERENCES workspace_groups(id)   ON DELETE SET NULL,
  FOREIGN KEY (user_id)         REFERENCES users(id)              ON DELETE SET NULL,
  FOREIGN KEY (unit_id)         REFERENCES ar_container_units(id) ON DELETE CASCADE,
  FOREIGN KEY (container_id)    REFERENCES ar_containers(id)      ON DELETE SET NULL,
  FOREIGN KEY (surah)           REFERENCES ar_quran_surahs(surah) ON DELETE RESTRICT,
  FOREIGN KEY (podcast_doc_id)  REFERENCES wv_documents(id)       ON DELETE SET NULL,
  FOREIGN KEY (study_doc_id)    REFERENCES wv_documents(id)       ON DELETE SET NULL,
  FOREIGN KEY (children_doc_id) REFERENCES wv_documents(id)       ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sp_planner_workspace_week ON sp_passage_planner(workspace_id, week_start);
CREATE INDEX IF NOT EXISTS idx_sp_planner_surah          ON sp_passage_planner(surah);
CREATE INDEX IF NOT EXISTS idx_sp_planner_status         ON sp_passage_planner(status);
CREATE INDEX IF NOT EXISTS idx_sp_planner_user_week      ON sp_passage_planner(user_id, week_start);

CREATE TRIGGER IF NOT EXISTS trg_sp_passage_planner_updated_at
AFTER UPDATE ON sp_passage_planner
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE sp_passage_planner SET updated_at = datetime('now') WHERE id = OLD.id;
END;


-- ────────────────────────────────────────────────────────────
-- A3. km_audio_scenes
--     Book → podcast → season → transcript → subtitle pipeline.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS km_audio_scenes (
  id               TEXT PRIMARY KEY,
  canonical_input  TEXT NOT NULL UNIQUE,
  workspace_id     TEXT NOT NULL,
  group_id         TEXT,
  user_id          INTEGER,

  source_id        TEXT NOT NULL,   -- FK wv_sources (the book / podcast / series)
  source_unit_id   TEXT,            -- FK wv_source_units (episode / segment)

  scene_number     INTEGER NOT NULL,
  season_number    INTEGER,
  episode_number   INTEGER,

  timestamp_start  TEXT,            -- HH:MM:SS.mmm
  timestamp_end    TEXT,
  transcript_ar    TEXT,            -- raw Arabic transcription
  subtitle_ar      TEXT,            -- cleaned subtitle Arabic
  translation_en   TEXT,            -- English translation
  transliteration  TEXT,            -- optional romanisation

  linguistic_notes TEXT,
  vocab_json       JSON CHECK (vocab_json   IS NULL OR json_valid(vocab_json)),
  grammar_json     JSON CHECK (grammar_json IS NULL OR json_valid(grammar_json)),

  status           TEXT NOT NULL DEFAULT 'raw' CHECK (status IN (
    'raw', 'transcribed', 'subtitled', 'translated', 'annotated', 'published'
  )),
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (source_unit_id, scene_number),

  FOREIGN KEY (workspace_id)   REFERENCES workspaces(id)      ON DELETE CASCADE,
  FOREIGN KEY (group_id)       REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id)        REFERENCES users(id)            ON DELETE SET NULL,
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id)       ON DELETE CASCADE,
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id)  ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_km_audio_scenes_source    ON km_audio_scenes(source_id);
CREATE INDEX IF NOT EXISTS idx_km_audio_scenes_unit      ON km_audio_scenes(source_unit_id, scene_number);
CREATE INDEX IF NOT EXISTS idx_km_audio_scenes_status    ON km_audio_scenes(status);
CREATE INDEX IF NOT EXISTS idx_km_audio_scenes_workspace ON km_audio_scenes(workspace_id, status);

CREATE TRIGGER IF NOT EXISTS trg_km_audio_scenes_updated_at
AFTER UPDATE ON km_audio_scenes
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE km_audio_scenes SET updated_at = datetime('now') WHERE id = OLD.id;
END;


-- ────────────────────────────────────────────────────────────
-- A4. km_cross_corpus_links
--     Torah / Tanakh / Gospel / Syriac ↔ Quran mapping.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS km_cross_corpus_links (
  id                     TEXT PRIMARY KEY,
  canonical_input        TEXT NOT NULL UNIQUE,
  workspace_id           TEXT NOT NULL,
  group_id               TEXT,
  user_id                INTEGER,

  -- Quran anchor
  quran_target_type      TEXT NOT NULL DEFAULT 'ayah' CHECK (quran_target_type IN (
    'ayah', 'surah', 'passage', 'unit'
  )),
  quran_target_id        TEXT NOT NULL,   -- "12:4" or unit_id
  quran_arabic           TEXT,

  -- External corpus
  corpus                 TEXT NOT NULL CHECK (corpus IN (
    'torah', 'tanakh', 'gospel_matthew', 'gospel_mark',
    'gospel_luke', 'gospel_john', 'pauline', 'revelation', 'nt_other',
    'syriac', 'dead_sea_scrolls', 'rabbinic_midrash', 'talmud',
    'patristic', 'septuagint', 'aramaic_targum', 'other'
  )),
  corpus_ref             TEXT NOT NULL,   -- "Genesis 37:5–11"
  corpus_text            TEXT,
  corpus_text_en         TEXT,

  -- Relationship type
  relation_type          TEXT NOT NULL CHECK (relation_type IN (
    'parallel_narrative', 'transformation', 'correction',
    'allusion', 'cognate_term', 'covenantal_echo',
    'eschatological_parallel', 'typological', 'genealogical',
    'polemical_response', 'shared_tradition', 'other'
  )),
  quranic_transformation TEXT,
  scholarly_note         TEXT,

  -- Graph linkage
  wv_node_id             TEXT,
  evidence_source_id     TEXT,

  confidence             TEXT NOT NULL DEFAULT 'medium' CHECK (confidence IN (
    'high', 'medium', 'low', 'speculative'
  )),
  deleted_at             TEXT,
  meta_json              JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (workspace_id)       REFERENCES workspaces(id)      ON DELETE CASCADE,
  FOREIGN KEY (group_id)           REFERENCES workspace_groups(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id)            REFERENCES users(id)            ON DELETE SET NULL,
  FOREIGN KEY (wv_node_id)         REFERENCES wv_nodes(id)         ON DELETE SET NULL,
  FOREIGN KEY (evidence_source_id) REFERENCES wv_sources(id)       ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_km_cross_corpus_quran     ON km_cross_corpus_links(quran_target_id);
CREATE INDEX IF NOT EXISTS idx_km_cross_corpus_corpus    ON km_cross_corpus_links(corpus, relation_type);
CREATE INDEX IF NOT EXISTS idx_km_cross_corpus_node      ON km_cross_corpus_links(wv_node_id);
CREATE INDEX IF NOT EXISTS idx_km_cross_corpus_workspace ON km_cross_corpus_links(workspace_id);

CREATE TRIGGER IF NOT EXISTS trg_km_cross_corpus_links_updated_at
AFTER UPDATE ON km_cross_corpus_links
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE km_cross_corpus_links SET updated_at = datetime('now') WHERE id = OLD.id;
END;


-- ────────────────────────────────────────────────────────────
-- A5. ar_quran_surah_passage
--     Independent passage structure store — populated when a
--     passage_structure task is approved. Queryable by surah+range
--     without joining ar_container_unit_task.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ar_quran_surah_passage (
  id               TEXT    PRIMARY KEY,
  canonical_input  TEXT    NOT NULL UNIQUE,

  -- Quran coordinates
  surah            INTEGER NOT NULL,
  ayah_from        INTEGER NOT NULL,
  ayah_to          INTEGER NOT NULL,
  scope_ref        TEXT,              -- display ref: "12:1–7"

  -- Back-links to source task (optional — data survives task deletion)
  unit_id          TEXT,              -- FK ar_container_units
  task_id          TEXT,              -- FK ar_container_unit_task

  -- Core content
  passage_title    TEXT,
  sections_json    JSON NOT NULL DEFAULT '[]' CHECK (json_valid(sections_json)),

  -- Extracted flags for fast filtering (denormalised from sections_json)
  has_chiasm       INTEGER NOT NULL DEFAULT 0 CHECK (has_chiasm   IN (0, 1)),
  has_timeline     INTEGER NOT NULL DEFAULT 0 CHECK (has_timeline IN (0, 1)),
  has_clusters     INTEGER NOT NULL DEFAULT 0 CHECK (has_clusters IN (0, 1)),
  has_keyvalue     INTEGER NOT NULL DEFAULT 0 CHECK (has_keyvalue IN (0, 1)),
  section_count    INTEGER NOT NULL DEFAULT 0,

  -- Schema version of the task_json that produced this row
  schema_version   INTEGER NOT NULL DEFAULT 2,

  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'archived'
  )),

  deleted_at       TEXT,
  meta_json        JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (surah, ayah_from, ayah_to),

  FOREIGN KEY (surah)    REFERENCES ar_quran_surahs(surah)          ON DELETE RESTRICT,
  FOREIGN KEY (unit_id)  REFERENCES ar_container_units(id)          ON DELETE SET NULL,
  FOREIGN KEY (task_id)  REFERENCES ar_container_unit_task(task_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ar_qsp_surah       ON ar_quran_surah_passage(surah);
CREATE INDEX IF NOT EXISTS idx_ar_qsp_surah_range ON ar_quran_surah_passage(surah, ayah_from, ayah_to);
CREATE INDEX IF NOT EXISTS idx_ar_qsp_status      ON ar_quran_surah_passage(status);
CREATE INDEX IF NOT EXISTS idx_ar_qsp_unit        ON ar_quran_surah_passage(unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_qsp_task        ON ar_quran_surah_passage(task_id);
CREATE INDEX IF NOT EXISTS idx_ar_qsp_chiasm      ON ar_quran_surah_passage(has_chiasm)   WHERE has_chiasm   = 1;
CREATE INDEX IF NOT EXISTS idx_ar_qsp_timeline    ON ar_quran_surah_passage(has_timeline) WHERE has_timeline = 1;

CREATE TRIGGER IF NOT EXISTS trg_ar_quran_surah_passage_updated_at
AFTER UPDATE ON ar_quran_surah_passage
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_surah_passage SET updated_at = datetime('now') WHERE id = OLD.id;
END;


-- ════════════════════════════════════════════════════════════
-- B. COLUMN ADDITIONS TO EXISTING TABLES
--    All use ALTER TABLE ... ADD COLUMN (additive — no data lost)
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- B1. wv_sources — domain, language, era tagging
-- ────────────────────────────────────────────────────────────
ALTER TABLE wv_sources ADD COLUMN source_domain TEXT CHECK (source_domain IN (
  'quran', 'arabic_book', 'arabic_podcast', 'audio_series',
  'classical_text', 'kalam_text', 'scriptural_torah', 'scriptural_nt',
  'rabbinic', 'patristic', 'historical_text', 'academic',
  'western_philosophy', 'western_psychology', 'other'
));
ALTER TABLE wv_sources ADD COLUMN source_language TEXT CHECK (source_language IN (
  'ar', 'en', 'he', 'el', 'syc', 'la', 'fr', 'de', 'other'
));
ALTER TABLE wv_sources ADD COLUMN era_ce TEXT;

-- ────────────────────────────────────────────────────────────
-- B2. wv_nodes — domain, era, geographic context
-- ────────────────────────────────────────────────────────────
ALTER TABLE wv_nodes ADD COLUMN domain TEXT CHECK (domain IN (
  'quran', 'arabic', 'classical_theology', 'jewish_wv',
  'christian_wv', 'history', 'western_philosophy', 'other'
));
ALTER TABLE wv_nodes ADD COLUMN era_start          TEXT;
ALTER TABLE wv_nodes ADD COLUMN era_end            TEXT;
ALTER TABLE wv_nodes ADD COLUMN geographic_context TEXT;
ALTER TABLE wv_nodes ADD COLUMN deleted_at         TEXT;

-- ────────────────────────────────────────────────────────────
-- B3. wv_people — full scholarly profile
-- ────────────────────────────────────────────────────────────
ALTER TABLE wv_people ADD COLUMN scholarly_domain TEXT CHECK (scholarly_domain IN (
  'quran', 'arabic', 'kalam', 'fiqh', 'hadith', 'tasawwuf',
  'jewish_theology', 'christian_theology', 'philosophy',
  'history', 'linguistics', 'other'
));
ALTER TABLE wv_people ADD COLUMN school             TEXT;
ALTER TABLE wv_people ADD COLUMN km_priority        TEXT CHECK (km_priority IN ('primary', 'secondary', 'reference'));
ALTER TABLE wv_people ADD COLUMN primary_works_json JSON CHECK (primary_works_json IS NULL OR json_valid(primary_works_json));
ALTER TABLE wv_people ADD COLUMN era_ce             TEXT;
ALTER TABLE wv_people ADD COLUMN born_ce            TEXT;
ALTER TABLE wv_people ADD COLUMN died_ce            TEXT;
ALTER TABLE wv_people ADD COLUMN origin             TEXT;
ALTER TABLE wv_people ADD COLUMN core_claim         TEXT;
ALTER TABLE wv_people ADD COLUMN deleted_at         TEXT;

-- ────────────────────────────────────────────────────────────
-- B4. ar_u_expressions — expression taxonomy & domain
-- ────────────────────────────────────────────────────────────
ALTER TABLE ar_u_expressions ADD COLUMN expression_type TEXT CHECK (expression_type IN (
  'verbal_idiom', 'collocation', 'formulaic_phrase',
  'hapax_legomenon', 'quranic_formula', 'divine_declaration',
  'superlative_idafa', 'conditional_formula', 'near_synonym_cluster', 'other'
));
ALTER TABLE ar_u_expressions ADD COLUMN domain TEXT DEFAULT 'quran' CHECK (domain IN (
  'quran', 'classical_arabic', 'modern_arabic', 'other'
));

-- ────────────────────────────────────────────────────────────
-- B5. wv_documents — production tracking
-- ────────────────────────────────────────────────────────────
ALTER TABLE wv_documents ADD COLUMN production_type TEXT CHECK (production_type IN (
  'podcast_script', 'surah_podcast', 'children_lesson',
  'surah_overview', 'audio_transcript', 'cross_corpus_analysis',
  'passage_study', 'other'
));
ALTER TABLE wv_documents ADD COLUMN target_audience TEXT CHECK (target_audience IN ('adult', 'child', 'mixed'));
ALTER TABLE wv_documents ADD COLUMN is_published    INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0, 1));
ALTER TABLE wv_documents ADD COLUMN published_at    TEXT;
ALTER TABLE wv_documents ADD COLUMN surah           INTEGER;
ALTER TABLE wv_documents ADD COLUMN unit_id         TEXT;
ALTER TABLE wv_documents ADD COLUMN domain          TEXT CHECK (domain IN (
  'quran', 'arabic', 'classical_theology', 'jewish_wv',
  'christian_wv', 'history', 'other'
));
ALTER TABLE wv_documents ADD COLUMN deleted_at TEXT;

-- ────────────────────────────────────────────────────────────
-- B6. ar_quran_surahs — revelation metadata
-- ────────────────────────────────────────────────────────────
ALTER TABLE ar_quran_surahs ADD COLUMN revelation_place TEXT CHECK (
  revelation_place IS NULL OR revelation_place IN ('meccan', 'medinan', 'both')
);
ALTER TABLE ar_quran_surahs ADD COLUMN revelation_order    INTEGER;
ALTER TABLE ar_quran_surahs ADD COLUMN juz_start           INTEGER;
ALTER TABLE ar_quran_surahs ADD COLUMN juz_end             INTEGER;
ALTER TABLE ar_quran_surahs ADD COLUMN name_transliteration TEXT;  -- e.g. "Al-Yusuf"
ALTER TABLE ar_quran_surahs ADD COLUMN theme_summary        TEXT;   -- brief EN summary

-- ────────────────────────────────────────────────────────────
-- B7. ar_quran_ayah — canonical text columns
--
--   EXISTING (do not remove):
--     text               — Uthmani WITH diacritics + U+06DD embedded  ← RAW, never display
--     text_simple        — simple script, no diacritics, no mark       ← canonical clean display
--     text_normalized    — used for search (origin unclear)
--     text_diacritics    — redundant with text (kept for back-compat)
--     text_non_diacritics— no diacritics (use text_simple instead)
--     text_no_diacritics — DEPRECATED duplicate of text_non_diacritics
--     verse_mark         — isolated U+06DD mark for display
--     verse_full         — Uthmani + diacritics + mark
--
--   NEW (added here):
--     text_uthmani_clean — Uthmani + diacritics, NO verse mark         ← canonical diacritic display
--     text_bare          — stripped bare: no diacritics, no marks,
--                          no tatweel, alef/ya normalized               ← search / FTS / matching
--
--   POST-MIGRATION WORKER task (run via Worker, not SQL):
--     text_uthmani_clean: strip /[\u06DD\u06DE][\u0660-\u0669]*/g from `text`
--     text_bare:          from text_simple → strip U+0640 (tatweel),
--                         normalize alef variants → ا, ya → ي,
--                         remove diacritics U+0610-U+061A, U+064B-U+065F
-- ────────────────────────────────────────────────────────────
ALTER TABLE ar_quran_ayah ADD COLUMN text_uthmani_clean TEXT;
ALTER TABLE ar_quran_ayah ADD COLUMN text_bare          TEXT;

-- ────────────────────────────────────────────────────────────
-- B8. ar_container_units — surah fast lookup
-- ────────────────────────────────────────────────────────────
ALTER TABLE ar_container_units ADD COLUMN surah     INTEGER;
ALTER TABLE ar_container_units ADD COLUMN surah_ref TEXT;  -- "12:1-7"

CREATE INDEX IF NOT EXISTS idx_ar_container_units_surah
  ON ar_container_units(surah, ayah_from, ayah_to)
  WHERE surah IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- B9. ar_quran_synonym_topics — source tracking + rich metadata
-- ────────────────────────────────────────────────────────────
ALTER TABLE ar_quran_synonym_topics ADD COLUMN source_id       TEXT;
ALTER TABLE ar_quran_synonym_topics ADD COLUMN page_no         INTEGER;
ALTER TABLE ar_quran_synonym_topics ADD COLUMN description_en  TEXT;
ALTER TABLE ar_quran_synonym_topics ADD COLUMN description_ur  TEXT;
ALTER TABLE ar_quran_synonym_topics ADD COLUMN cross_refs_json JSON CHECK (
  cross_refs_json IS NULL OR json_valid(cross_refs_json)
);
ALTER TABLE ar_quran_synonym_topics ADD COLUMN word_count   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ar_quran_synonym_topics ADD COLUMN surahs_json  JSON CHECK (
  surahs_json IS NULL OR json_valid(surahs_json)
);
ALTER TABLE ar_quran_synonym_topics ADD COLUMN deleted_at TEXT;


-- ════════════════════════════════════════════════════════════
-- C. ar_container_unit_task REBUILD
--    Expand task_type CHECK (SQLite cannot ALTER a CHECK constraint).
--    Add version_no + deleted_at. ALL existing rows are preserved.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ar_container_unit_task_v2 (
  task_id        TEXT PRIMARY KEY,
  unit_id        TEXT NOT NULL,
  parent_task_id TEXT,

  task_type      TEXT NOT NULL CHECK (task_type IN (
    -- Core Quran passage tasks
    'reading', 'sentence_structure', 'morphology',
    'grammar_concepts', 'expressions', 'comprehension', 'passage_structure',
    -- Quranic linguistics & meaning
    'worldview', 'translation_semantics', 'near_synonyms', 'surah_analysis',
    -- Cross-domain
    'cross_corpus',
    -- Children-specific
    'children_lesson'
  )),

  task_name      TEXT NOT NULL,
  task_json      JSON NOT NULL CHECK (json_valid(task_json)),

  status         TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ai_generated', 'review', 'approved', 'published', 'archived'
  )),

  version_no     INTEGER NOT NULL DEFAULT 1,
  deleted_at     TEXT,

  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE (unit_id, task_type),
  FOREIGN KEY (unit_id) REFERENCES ar_container_units(id) ON DELETE CASCADE
);

-- Copy all existing rows — status values mapped to new enum
INSERT OR IGNORE INTO ar_container_unit_task_v2 (
  task_id, unit_id, parent_task_id, task_type, task_name, task_json,
  status, version_no, deleted_at, created_at, updated_at
)
SELECT
  task_id, unit_id, NULL, task_type, task_name, task_json,
  CASE status
    WHEN 'draft'        THEN 'draft'
    WHEN 'ai_generated' THEN 'ai_generated'
    WHEN 'review'       THEN 'review'
    WHEN 'approved'     THEN 'approved'
    WHEN 'published'    THEN 'published'
    WHEN 'archived'     THEN 'archived'
    ELSE 'draft'
  END,
  1,          -- version_no default
  NULL,       -- deleted_at: start clean (no soft-deleted rows in old table)
  created_at,
  updated_at
FROM ar_container_unit_task;

DROP TABLE ar_container_unit_task;
ALTER TABLE ar_container_unit_task_v2 RENAME TO ar_container_unit_task;

CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_unit
  ON ar_container_unit_task(unit_id);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_parent
  ON ar_container_unit_task(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_type
  ON ar_container_unit_task(task_type);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_status
  ON ar_container_unit_task(status);
CREATE INDEX IF NOT EXISTS idx_ar_container_unit_task_active
  ON ar_container_unit_task(unit_id, task_type)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_ar_container_unit_task_updated_at
AFTER UPDATE ON ar_container_unit_task
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_container_unit_task SET updated_at = datetime('now') WHERE task_id = OLD.task_id;
END;


-- ════════════════════════════════════════════════════════════
-- D. ar_quran_synonym_topic_words REBUILD
--    Add semantic_nuance (THE key field), Urdu gloss, ayah refs,
--    lexicon link, morphological pattern. All data preserved.
--
--    Source: Mutaradifaat al-Qur'an (المترادفات القرآنية)
--    URL: https://qurandev.github.io/synonyms/
-- ════════════════════════════════════════════════════════════

CREATE TABLE ar_quran_synonym_topic_words_v2 (
  topic_id           TEXT NOT NULL,
  word_norm          TEXT NOT NULL,   -- normalised Arabic (no diacritics)

  -- Arabic forms
  word_ar            TEXT,            -- with diacritics
  word_ar_pattern    TEXT,            -- morphological pattern (مَفعَل etc.)

  -- Root
  root_norm          TEXT,
  root_ar            TEXT,

  -- Multilingual glosses
  word_en            TEXT,            -- English gloss
  word_ur            TEXT,            -- Urdu meaning (from source book)

  -- THE KEY FIELD: what makes THIS word unique vs its near-synonyms
  -- e.g. "سَكَنَ = settlement after migration from elsewhere"
  semantic_nuance_en TEXT,
  semantic_nuance_ur TEXT,

  -- Quranic evidence: [{surah, ayah, text_ar, note}]
  ayah_refs_json     JSON CHECK (ayah_refs_json IS NULL OR json_valid(ayah_refs_json)),

  -- Link to canonical lexicon entry (optional)
  ar_u_lexicon       TEXT,            -- FK ar_u_lexicon

  -- Source tracking within book
  source_id          TEXT,            -- FK ar_u_sources
  page_no            INTEGER,

  order_index        INTEGER NOT NULL DEFAULT 0,

  meta_json          JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT,

  PRIMARY KEY (topic_id, word_norm),
  FOREIGN KEY (topic_id)     REFERENCES ar_quran_synonym_topics(topic_id) ON DELETE CASCADE,
  FOREIGN KEY (ar_u_lexicon) REFERENCES ar_u_lexicon(ar_u_lexicon)        ON DELETE SET NULL
);

-- Copy existing data — new columns default to NULL
INSERT OR IGNORE INTO ar_quran_synonym_topic_words_v2 (
  topic_id, word_norm, word_ar, word_en,
  root_norm, root_ar, order_index, meta_json,
  created_at, updated_at
)
SELECT
  topic_id, word_norm, word_ar, word_en,
  root_norm, root_ar, order_index, meta_json,
  created_at, updated_at
FROM ar_quran_synonym_topic_words;

DROP TABLE ar_quran_synonym_topic_words;
ALTER TABLE ar_quran_synonym_topic_words_v2 RENAME TO ar_quran_synonym_topic_words;

CREATE INDEX IF NOT EXISTS idx_syn_topic_words_word
  ON ar_quran_synonym_topic_words(word_norm);
CREATE INDEX IF NOT EXISTS idx_syn_topic_words_topic_order
  ON ar_quran_synonym_topic_words(topic_id, order_index);
CREATE INDEX IF NOT EXISTS idx_syn_topic_words_root
  ON ar_quran_synonym_topic_words(root_norm);
CREATE INDEX IF NOT EXISTS idx_syn_topic_words_lexicon
  ON ar_quran_synonym_topic_words(ar_u_lexicon);

CREATE TRIGGER trg_ar_quran_synonym_topic_words_updated_at
AFTER UPDATE ON ar_quran_synonym_topic_words
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_quran_synonym_topic_words
  SET updated_at = datetime('now')
  WHERE topic_id = OLD.topic_id AND word_norm = OLD.word_norm;
END;


-- ════════════════════════════════════════════════════════════
-- E. INDEXES ON NEWLY ADDED COLUMNS
-- ════════════════════════════════════════════════════════════

-- wv_sources
CREATE INDEX IF NOT EXISTS idx_wv_sources_domain     ON wv_sources(source_domain);
CREATE INDEX IF NOT EXISTS idx_wv_sources_language   ON wv_sources(source_language);

-- wv_nodes
CREATE INDEX IF NOT EXISTS idx_wv_nodes_domain       ON wv_nodes(domain);
CREATE INDEX IF NOT EXISTS idx_wv_nodes_era          ON wv_nodes(era_start, era_end);

-- wv_people
CREATE INDEX IF NOT EXISTS idx_wv_people_domain_school ON wv_people(scholarly_domain, school);
CREATE INDEX IF NOT EXISTS idx_wv_people_priority      ON wv_people(km_priority);

-- wv_documents
CREATE INDEX IF NOT EXISTS idx_wv_documents_surah      ON wv_documents(surah);
CREATE INDEX IF NOT EXISTS idx_wv_documents_unit       ON wv_documents(unit_id);
CREATE INDEX IF NOT EXISTS idx_wv_documents_production ON wv_documents(production_type, is_published);
CREATE INDEX IF NOT EXISTS idx_wv_documents_domain     ON wv_documents(domain);

-- ar_u_expressions
CREATE INDEX IF NOT EXISTS idx_ar_u_expressions_type   ON ar_u_expressions(expression_type);
CREATE INDEX IF NOT EXISTS idx_ar_u_expressions_domain ON ar_u_expressions(domain);

-- ar_quran_ayah new columns
CREATE INDEX IF NOT EXISTS idx_ar_quran_ayah_text_bare
  ON ar_quran_ayah(text_bare)
  WHERE text_bare IS NOT NULL;

-- ar_quran_synonym_topics new columns
CREATE INDEX IF NOT EXISTS idx_syn_topics_source  ON ar_quran_synonym_topics(source_id);
CREATE INDEX IF NOT EXISTS idx_syn_topics_page    ON ar_quran_synonym_topics(source_id, page_no);


-- ════════════════════════════════════════════════════════════
-- F. CANONICAL TEXT VIEW
--
--  Column            | Use
--  ------------------|------------------------------------------
--  display_diacritic | Uthmani + harakat, NO verse mark ← USE THIS
--  display_clean     | simple script, no harakat, no mark
--  search_normalized | for FTS / matching
--  mark              | verse-end circle (display separately)
--  raw_uthmani       | has U+06DD embedded — NEVER display directly
-- ════════════════════════════════════════════════════════════
CREATE VIEW IF NOT EXISTS vw_ar_quran_ayah_text AS
SELECT
  surah,
  ayah,
  surah_ayah,

  -- CANONICAL DISPLAY COLUMNS (use in UI / Workers)
  text_uthmani_clean   AS display_diacritic,   -- Uthmani + harakat, no mark
  text_simple          AS display_clean,        -- simple script, no harakat, no mark
  text_bare            AS search_normalized,    -- for FTS / matching

  -- Verse mark (display separately, never embedded)
  verse_mark           AS mark,

  -- Raw source columns (do not use for display)
  text                 AS raw_uthmani,          -- Uthmani + mark EMBEDDED
  text_normalized      AS raw_normalized,

  -- DEPRECATED (kept for backward compat — use display_clean instead)
  text_no_diacritics   AS deprecated_no_diacritics,

  -- Metadata
  page, juz, hizb, ruku,
  word_count, char_count,
  first_word, last_word
FROM ar_quran_ayah;


PRAGMA foreign_keys = ON;

-- ════════════════════════════════════════════════════════════
-- POST-MIGRATION WORKER TASK (run separately via Worker):
--
-- Populate text_uthmani_clean and text_bare for all 6236 ayahs.
--
-- 1. text_uthmani_clean:
--    Strip U+06DD, U+06DE and trailing Arabic-Indic digits from `text`
--    Pattern: /[\u06DD\u06DE][\u0660-\u0669]*/g → ''
--
-- 2. text_bare:
--    Start from text_simple (already no diacritics, no marks)
--    Strip tatweel U+0640
--    Normalize: all alef variants → ا, alef maqsura/ya → ي
--    Remove any residual diacritics: U+0610-U+061A, U+064B-U+065F
--
-- Verify after Worker run:
--   SELECT COUNT(*) FROM ar_quran_ayah WHERE text_uthmani_clean IS NULL;
--   → should return 0
-- ════════════════════════════════════════════════════════════
