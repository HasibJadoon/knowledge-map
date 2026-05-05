-- 0007_source_rag.sql
-- Extend ar_ling_source_chunks with Quran-ref columns for irab/lexicon chunks.
-- Create ar_ling_vector_records to track embeddings from qr_tafsir_entries,
-- qr_translations, and ar_ling_source_chunks — without duplicating their text.

-- ── 1. Quran-ref columns on existing chunk table ─────────────────────────────
-- Only irab / lexicon chunks will have these populated.
-- Tafsir + translation entries remain in km_quran and are NOT copied here.

ALTER TABLE ar_ling_source_chunks ADD COLUMN surah_no   INTEGER;
ALTER TABLE ar_ling_source_chunks ADD COLUMN ayah_start INTEGER;
ALTER TABLE ar_ling_source_chunks ADD COLUMN ayah_end   INTEGER;

CREATE INDEX IF NOT EXISTS idx_arl_sc_surah
  ON ar_ling_source_chunks(surah_no, ayah_start);

-- ── 2. Vector-record registry ────────────────────────────────────────────────
-- One row per Qdrant point. Covers rows from three source tables:
--   km_quran / qr_tafsir_entries    (target_db = 'km_quran')
--   km_quran / qr_translations      (target_db = 'km_quran')
--   km_arabic_linguistic / ar_ling_source_chunks
--
-- This is the ONLY place we store qdrant_id for tafsir + translation rows
-- (those tables have no qdrant_id column of their own).

CREATE TABLE IF NOT EXISTS ar_ling_vector_records (
  id                  TEXT PRIMARY KEY,
    -- format: "VEC:{target_table}:{target_id}"
  target_db           TEXT NOT NULL,
    -- "km_quran" | "km_arabic_linguistic"
  target_table        TEXT NOT NULL,
    -- "qr_tafsir_entries" | "qr_translations" | "ar_ling_source_chunks"
  target_id           TEXT NOT NULL,
    -- primary-key value in that table
  qdrant_id           TEXT NOT NULL,
    -- UUID used as the Qdrant point id
  qdrant_collection   TEXT NOT NULL DEFAULT 'km_source_chunks_v1',
  model_name          TEXT NOT NULL,
  embedding_profile   TEXT,
  surah_no            INTEGER,
  ayah_start          INTEGER,
  ayah_end            INTEGER,
  work_id             TEXT,
    -- e.g. "QR:WORK:TABARI:AR-TAFSIR-AL" (tafsir only)
  scholar_id          TEXT,
    -- e.g. "QR:SCH:TABARI" (tafsir only)
  chunk_kind          TEXT,
    -- mirrors ar_ling_source_chunks.chunk_kind or "tafsir" / "translation"
  source_slug         TEXT,
    -- human-readable slug matching config.py SOURCE_META keys
  text_hash           TEXT,
  embedded_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alvr_qdrant
  ON ar_ling_vector_records(qdrant_id);

CREATE INDEX IF NOT EXISTS idx_alvr_target
  ON ar_ling_vector_records(target_table, target_id);

CREATE INDEX IF NOT EXISTS idx_alvr_surah
  ON ar_ling_vector_records(surah_no, ayah_start);

CREATE INDEX IF NOT EXISTS idx_alvr_work
  ON ar_ling_vector_records(work_id);
