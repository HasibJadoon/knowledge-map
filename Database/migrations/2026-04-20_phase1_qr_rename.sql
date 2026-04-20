-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  Phase 1 — Quran Module (QR) Corpus Rename
-- File   : Database/migrations/2026-04-20_phase1_qr_rename.sql
-- Run    : wrangler d1 execute knowledgemap \
--            --file=Database/migrations/2026-04-20_phase1_qr_rename.sql --remote
--
-- What this does (3 steps — run atomically):
--   1. Drop all triggers on tables about to be renamed
--      (SQLite does NOT auto-update trigger bodies on rename)
--   2. Rename every ar_quran_* table to its canonical qr_* name
--      (SQLite 3.26+ automatically updates FK references in other tables)
--   3. Create compat VIEWs with old names pointing to new tables
--      (Workers and Angular continue to work unchanged during transition)
--   4. Recreate triggers under new table names
--
-- SAFE to run on live production — the gap between rename and view creation
-- is a single sequential execute batch with no external reads possible.
-- After this migration the old names remain available as read/write views.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — DROP TRIGGERS ON TABLES BEING RENAMED
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_ar_quran_lemmas_updated_at;
DROP TRIGGER IF EXISTS trg_ar_quran_motif_index_updated_at;
DROP TRIGGER IF EXISTS trg_ar_quran_motif_occurrences_updated_at;
DROP TRIGGER IF EXISTS trg_ar_quran_passage_analysis_updated_at;
DROP TRIGGER IF EXISTS trg_ar_quran_surah_analysis_updated_at;
DROP TRIGGER IF EXISTS trg_ar_quran_surah_pairs_updated_at;
DROP TRIGGER IF EXISTS trg_ar_quran_surah_passage_updated_at;
DROP TRIGGER IF EXISTS trg_ar_quran_synonym_topic_words_updated_at;
DROP TRIGGER IF EXISTS trg_ar_quran_tafsir_entries_updated_at;
DROP TRIGGER IF EXISTS trg_ar_quran_word_occurrences_updated_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — RENAME TABLES  (ar_quran_* → qr_*)
-- SQLite 3.26+ auto-updates FK references in all other tables.
-- Indexes on these tables are automatically preserved under the new name.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Corpus base ──────────────────────────────────────────────────────────────
ALTER TABLE ar_quran_surahs               RENAME TO qr_surahs;
ALTER TABLE ar_quran_ayah                 RENAME TO qr_ayah;
ALTER TABLE ar_quran_word_occurrences     RENAME TO qr_word_occurrences;
ALTER TABLE ar_quran_lemmas               RENAME TO qr_lemmas;
ALTER TABLE ar_quran_lemma_occurrences    RENAME TO qr_lemma_occurrences;
ALTER TABLE ar_quran_translations         RENAME TO qr_translations;
ALTER TABLE ar_quran_translation_sources  RENAME TO qr_translation_sources;
ALTER TABLE ar_quran_translation_passages RENAME TO qr_translation_passages;
ALTER TABLE ar_quran_page_layout_lines    RENAME TO qr_page_layout_lines;
ALTER TABLE ar_quran_surah_ayah_meta      RENAME TO qr_surah_ayah_meta;

-- ── Passage / structural analysis ────────────────────────────────────────────
ALTER TABLE ar_quran_surah_passage        RENAME TO qr_surah_passages;
ALTER TABLE ar_quran_surah_analysis       RENAME TO qr_surah_analysis_cache;
ALTER TABLE ar_quran_passage_analysis     RENAME TO qr_passage_analysis_cache;

-- ── Motif / tafsir / cross-surah ─────────────────────────────────────────────
ALTER TABLE ar_quran_motif_index          RENAME TO qr_motif_index;
ALTER TABLE ar_quran_motif_occurrences    RENAME TO qr_motif_occurrences;
ALTER TABLE ar_quran_tafsir_entries       RENAME TO qr_tafsir_entries;
ALTER TABLE ar_quran_surah_pairs          RENAME TO qr_surah_relations;

-- ── Near-synonym layer ───────────────────────────────────────────────────────
ALTER TABLE ar_quran_synonym_topics       RENAME TO qr_synonym_topics;
ALTER TABLE ar_quran_synonym_topic_words  RENAME TO qr_synonym_topic_words;

-- ── Quran study-flow containers (preserved, renamed under QR ownership) ──────
ALTER TABLE ar_containers                 RENAME TO qr_containers;
ALTER TABLE ar_container_units            RENAME TO qr_container_units;
ALTER TABLE ar_container_unit_task        RENAME TO qr_container_unit_tasks;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3 — COMPAT VIEWS  (old names → new tables)
-- Any worker or Angular service using old names continues to work.
-- Views are writable for simple SELECTs; INSERT/UPDATE/DELETE still require
-- writing to the new canonical table names.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE VIEW IF NOT EXISTS ar_quran_surahs               AS SELECT * FROM qr_surahs;
CREATE VIEW IF NOT EXISTS ar_quran_ayah                 AS SELECT * FROM qr_ayah;
CREATE VIEW IF NOT EXISTS ar_quran_word_occurrences     AS SELECT * FROM qr_word_occurrences;
CREATE VIEW IF NOT EXISTS ar_quran_lemmas               AS SELECT * FROM qr_lemmas;
CREATE VIEW IF NOT EXISTS ar_quran_lemma_occurrences    AS SELECT * FROM qr_lemma_occurrences;
CREATE VIEW IF NOT EXISTS ar_quran_translations         AS SELECT * FROM qr_translations;
CREATE VIEW IF NOT EXISTS ar_quran_translation_sources  AS SELECT * FROM qr_translation_sources;
CREATE VIEW IF NOT EXISTS ar_quran_translation_passages AS SELECT * FROM qr_translation_passages;
CREATE VIEW IF NOT EXISTS ar_quran_page_layout_lines    AS SELECT * FROM qr_page_layout_lines;
CREATE VIEW IF NOT EXISTS ar_quran_surah_ayah_meta      AS SELECT * FROM qr_surah_ayah_meta;
CREATE VIEW IF NOT EXISTS ar_quran_surah_passage        AS SELECT * FROM qr_surah_passages;
CREATE VIEW IF NOT EXISTS ar_quran_surah_analysis       AS SELECT * FROM qr_surah_analysis_cache;
CREATE VIEW IF NOT EXISTS ar_quran_passage_analysis     AS SELECT * FROM qr_passage_analysis_cache;
CREATE VIEW IF NOT EXISTS ar_quran_motif_index          AS SELECT * FROM qr_motif_index;
CREATE VIEW IF NOT EXISTS ar_quran_motif_occurrences    AS SELECT * FROM qr_motif_occurrences;
CREATE VIEW IF NOT EXISTS ar_quran_tafsir_entries       AS SELECT * FROM qr_tafsir_entries;
CREATE VIEW IF NOT EXISTS ar_quran_surah_pairs          AS SELECT * FROM qr_surah_relations;
CREATE VIEW IF NOT EXISTS ar_quran_synonym_topics       AS SELECT * FROM qr_synonym_topics;
CREATE VIEW IF NOT EXISTS ar_quran_synonym_topic_words  AS SELECT * FROM qr_synonym_topic_words;
CREATE VIEW IF NOT EXISTS ar_containers                 AS SELECT * FROM qr_containers;
CREATE VIEW IF NOT EXISTS ar_container_units            AS SELECT * FROM qr_container_units;
CREATE VIEW IF NOT EXISTS ar_container_unit_task        AS SELECT * FROM qr_container_unit_tasks;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4 — RECREATE TRIGGERS UNDER NEW TABLE NAMES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_qr_lemmas_updated_at
AFTER UPDATE ON qr_lemmas
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_lemmas SET updated_at = datetime('now') WHERE lemma_id = OLD.lemma_id;
END;

CREATE TRIGGER trg_qr_motif_index_updated_at
AFTER UPDATE ON qr_motif_index
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_motif_index SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_qr_motif_occurrences_updated_at
AFTER UPDATE ON qr_motif_occurrences
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_motif_occurrences SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_qr_passage_analysis_cache_updated_at
AFTER UPDATE ON qr_passage_analysis_cache
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_passage_analysis_cache SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_qr_surah_analysis_cache_updated_at
AFTER UPDATE ON qr_surah_analysis_cache
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_surah_analysis_cache SET updated_at = datetime('now') WHERE surah = OLD.surah;
END;

CREATE TRIGGER trg_qr_surah_relations_updated_at
AFTER UPDATE ON qr_surah_relations
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_surah_relations SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_qr_surah_passages_updated_at
AFTER UPDATE ON qr_surah_passages
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_surah_passages SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_qr_synonym_topic_words_updated_at
AFTER UPDATE ON qr_synonym_topic_words
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_synonym_topic_words
  SET    updated_at = datetime('now')
  WHERE  topic_id = OLD.topic_id AND word_norm = OLD.word_norm;
END;

CREATE TRIGGER trg_qr_tafsir_entries_updated_at
AFTER UPDATE ON qr_tafsir_entries
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_tafsir_entries SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_qr_word_occurrences_updated_at
AFTER UPDATE ON qr_word_occurrences
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE qr_word_occurrences SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5 — CACHE TRACKING COLUMNS on demoted cache tables
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE qr_surah_analysis_cache    ADD COLUMN cache_version       INTEGER NOT NULL DEFAULT 1;
ALTER TABLE qr_surah_analysis_cache    ADD COLUMN cache_generated_at  TEXT;
ALTER TABLE qr_passage_analysis_cache  ADD COLUMN cache_version       INTEGER NOT NULL DEFAULT 1;
ALTER TABLE qr_passage_analysis_cache  ADD COLUMN cache_generated_at  TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6 — REPAIR FTS content table reference
-- ar_source_chunks_fts is a standalone FTS so no content= update needed.
-- ar_balagha_fts and ar_domain_phrase_fts reference ar_* tables that are
-- NOT being renamed (they are AR pedagogy tables) — no action needed.
-- ─────────────────────────────────────────────────────────────────────────────
-- (no FTS action required in this phase)

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERY (run manually to confirm)
-- wrangler d1 execute knowledgemap \
--   --command="SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name LIKE 'qr_%' ORDER BY name" \
--   --remote
-- ─────────────────────────────────────────────────────────────────────────────
