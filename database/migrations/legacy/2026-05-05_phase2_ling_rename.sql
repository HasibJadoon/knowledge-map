-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  Phase 2 — Arabic Linguistic Module (LING) Rename
-- File   : database/migrations/legacy/2026-05-05_phase2_ling_rename.sql
-- Run    : wrangler d1 execute knowledgemap \
--            --file=database/migrations/legacy/2026-05-05_phase2_ling_rename.sql --remote
--
-- What this does:
--   1. Drops triggers on ar_u_* tables being renamed
--   2. Renames ar_u_* shared linguistic tables to ar_ling_* canonical names
--   3. Renames ar_source_* tables to ar_ling_source_* (they are LING-owned)
--   4. Creates compat views preserving ar_u_* and ar_source_* old names
--   5. Recreates triggers under ar_ling_* names
--   6. Rebuilds FTS table for evidence (content table name changed)
--
-- Tables that STAY in km_arabic (NOT renamed):
--   ar_grammar_units, ar_grammar_unit_items — AR curriculum packaging
--   ar_balagha        — AR pedagogy seed (will feed ar_ling_balagha_concepts)
--   ar_lessons, ar_lesson_*, ar_srs, ar_reviews, ar_occ_*, ar_notes, etc.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1 — DROP TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_ar_u_lemmas_updated_at;
DROP TRIGGER IF EXISTS trg_ar_u_lexicon_updated_at;
DROP TRIGGER IF EXISTS trg_ar_u_lexicon_evidence_updated_at;
DROP TRIGGER IF EXISTS trg_ar_srs_updated_at;       -- keep on ar_srs (not renaming ar_srs)

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2 — RENAME SHARED LINGUISTIC TABLES  (ar_u_* → ar_ling_*)
-- ─────────────────────────────────────────────────────────────────────────────

-- Root science
ALTER TABLE ar_u_roots              RENAME TO ar_ling_roots;

-- Lemma science
ALTER TABLE ar_u_lemmas             RENAME TO ar_ling_lemmas;
ALTER TABLE ar_u_lemma_morphology   RENAME TO ar_ling_lemma_morphology;

-- Morphology / Sarf
ALTER TABLE ar_u_morphology         RENAME TO ar_ling_morphology;

-- Lexicon / Semantics
ALTER TABLE ar_u_lexicon            RENAME TO ar_ling_lexicon_entries;
ALTER TABLE ar_u_lexicon_evidence   RENAME TO ar_ling_lexicon_evidence;
ALTER TABLE ar_u_lexicon_morphology RENAME TO ar_ling_lexicon_morphology;

-- Expressions
ALTER TABLE ar_u_expressions        RENAME TO ar_ling_expressions;

-- Nahw / Grammar concepts
ALTER TABLE ar_u_grammar            RENAME TO ar_ling_nahw_concepts;
ALTER TABLE ar_u_grammar_raw        RENAME TO ar_ling_nahw_concepts_raw;
ALTER TABLE ar_u_grammar_relations  RENAME TO ar_ling_nahw_relations;

-- Token / Sentence registries (shared linguistic units)
ALTER TABLE ar_u_tokens             RENAME TO ar_ling_tokens;
ALTER TABLE ar_u_sentences          RENAME TO ar_ling_sentences;

-- Source evidence tables (owned by LING, consumed by AR and QR)
ALTER TABLE ar_u_sources            RENAME TO ar_ling_sources;
ALTER TABLE ar_source_chunks        RENAME TO ar_ling_source_chunks;
ALTER TABLE ar_source_index         RENAME TO ar_ling_source_index;
ALTER TABLE ar_source_toc           RENAME TO ar_ling_source_toc;

-- Token–lexicon link (belongs with LING since both endpoints are LING)
ALTER TABLE ar_token_lexicon_link   RENAME TO ar_ling_token_lexicon_link;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3 — COMPAT VIEWS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE VIEW IF NOT EXISTS ar_u_roots              AS SELECT * FROM ar_ling_roots;
CREATE VIEW IF NOT EXISTS ar_u_lemmas             AS SELECT * FROM ar_ling_lemmas;
CREATE VIEW IF NOT EXISTS ar_u_lemma_morphology   AS SELECT * FROM ar_ling_lemma_morphology;
CREATE VIEW IF NOT EXISTS ar_u_morphology         AS SELECT * FROM ar_ling_morphology;
CREATE VIEW IF NOT EXISTS ar_u_lexicon            AS SELECT * FROM ar_ling_lexicon_entries;
CREATE VIEW IF NOT EXISTS ar_u_lexicon_evidence   AS SELECT * FROM ar_ling_lexicon_evidence;
CREATE VIEW IF NOT EXISTS ar_u_lexicon_morphology AS SELECT * FROM ar_ling_lexicon_morphology;
CREATE VIEW IF NOT EXISTS ar_u_expressions        AS SELECT * FROM ar_ling_expressions;
CREATE VIEW IF NOT EXISTS ar_u_grammar            AS SELECT * FROM ar_ling_nahw_concepts;
CREATE VIEW IF NOT EXISTS ar_u_grammar_raw        AS SELECT * FROM ar_ling_nahw_concepts_raw;
CREATE VIEW IF NOT EXISTS ar_u_grammar_relations  AS SELECT * FROM ar_ling_nahw_relations;
CREATE VIEW IF NOT EXISTS ar_u_tokens             AS SELECT * FROM ar_ling_tokens;
CREATE VIEW IF NOT EXISTS ar_u_sentences          AS SELECT * FROM ar_ling_sentences;
CREATE VIEW IF NOT EXISTS ar_u_sources            AS SELECT * FROM ar_ling_sources;
CREATE VIEW IF NOT EXISTS ar_source_chunks        AS SELECT * FROM ar_ling_source_chunks;
CREATE VIEW IF NOT EXISTS ar_source_index         AS SELECT * FROM ar_ling_source_index;
CREATE VIEW IF NOT EXISTS ar_source_toc           AS SELECT * FROM ar_ling_source_toc;
CREATE VIEW IF NOT EXISTS ar_token_lexicon_link   AS SELECT * FROM ar_ling_token_lexicon_link;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4 — RECREATE TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER trg_ar_ling_lemmas_updated_at
AFTER UPDATE ON ar_ling_lemmas
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_ling_lemmas SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ar_ling_lexicon_entries_updated_at
AFTER UPDATE ON ar_ling_lexicon_entries
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_ling_lexicon_entries
  SET    updated_at = datetime('now')
  WHERE  ar_u_lexicon = NEW.ar_u_lexicon;
END;

CREATE TRIGGER trg_ar_ling_lexicon_evidence_updated_at
AFTER UPDATE ON ar_ling_lexicon_evidence
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE ar_ling_lexicon_evidence
  SET    updated_at = datetime('now')
  WHERE  ar_u_lexicon = NEW.ar_u_lexicon AND evidence_id = NEW.evidence_id;
END;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5 — REBUILD FTS TABLE for lexicon evidence
-- The standalone FTS ar_u_lexicon_evidence_fts had no content= so the
-- rename doesn't break it.  Create a new canonical FTS alongside.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_lexicon_evidence_fts USING fts5(
  ar_u_lexicon  UNINDEXED,
  evidence_id   UNINDEXED,
  chunk_id      UNINDEXED,
  source_code,
  extract_text,
  note_md
);
-- Old ar_u_lexicon_evidence_fts is kept as alias until workers migrate.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6 — REBUILD ar_source_chunks_fts for new table name
-- (standalone FTS — just create canonical alias)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE VIRTUAL TABLE IF NOT EXISTS ar_ling_source_chunks_fts USING fts5(
  chunk_id      UNINDEXED,
  source_code,
  heading_norm,
  text_search
);

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- wrangler d1 execute knowledgemap \
--   --command="SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name LIKE 'ar_ling_%' ORDER BY name" \
--   --remote
-- ─────────────────────────────────────────────────────────────────────────────
