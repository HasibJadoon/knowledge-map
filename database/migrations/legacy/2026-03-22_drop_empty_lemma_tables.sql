-- ============================================================
-- Migration: 2026-03-22 — Drop empty legacy lemma tables
--
-- Tables dropped:
--   quran_ayah_lemma_location  — 0 rows, non-ar_ prefix, redundant
--   quran_ayah_lemmas          — 0 rows, non-ar_ prefix, redundant
--
-- Why safe to drop:
--   Both tables have 0 rows (confirmed via production D1 query).
--   All word/lemma/root data is fully covered by ar_u_quran_ayah_words
--   which has 77,432 rows with inline `lemma`, `root`, and `ar_u_root`
--   FK to the canonical ar_u_roots table.
--
-- Replacement query pattern (no separate table needed):
--   -- All ayahs containing a root:
--   SELECT DISTINCT surah, ayah
--   FROM ar_u_quran_ayah_words
--   WHERE ar_u_root = 'علم';
--
--   -- All words for an ayah with their lemmas:
--   SELECT position, text, simple, lemma, root, ar_u_root
--   FROM ar_u_quran_ayah_words
--   WHERE surah = 12 AND ayah = 4
--   ORDER BY position;
--
-- Run:
--   wrangler d1 execute knowledgemap \
--     --file=database/migrations/legacy/2026-03-22_drop_empty_lemma_tables.sql --remote
-- ============================================================

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS quran_ayah_lemma_location;
DROP TABLE IF EXISTS quran_ayah_lemmas;

PRAGMA foreign_keys = ON;
