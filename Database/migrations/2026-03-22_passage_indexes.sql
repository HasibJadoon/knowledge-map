-- ============================================================
-- Migration: 2026-03-22 — Add ayah_from / ayah_to indexes on ar_quran_surah_passage
--
-- Why:
--   The existing idx_ar_qsp_surah_range covers (surah, ayah_from, ayah_to)
--   for exact range lookups. These two new indexes additionally cover:
--     • "find all passages starting at or before ayah X"  → (surah, ayah_from)
--     • "find all passages ending at or after ayah X"     → (surah, ayah_to)
--   Both are needed for range-overlap queries, e.g.:
--     SELECT * FROM ar_quran_surah_passage
--     WHERE surah = 2 AND ayah_from <= 10 AND ayah_to >= 5;
--
-- Run:
--   wrangler d1 execute knowledgemap \
--     --file=Database/migrations/2026-03-22_passage_indexes.sql --remote
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ar_qsp_ayah_from
  ON ar_quran_surah_passage(surah, ayah_from);

CREATE INDEX IF NOT EXISTS idx_ar_qsp_ayah_to
  ON ar_quran_surah_passage(surah, ayah_to);
