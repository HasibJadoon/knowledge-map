-- Migration: 2026-04-17_pipeline_columns.sql
-- Purpose: Add embedding-pipeline tracking columns to ar_source_chunks
-- Run:     wrangler d1 execute knowledgemap --file=database/migrations/legacy/2026-04-17_pipeline_columns.sql --remote

ALTER TABLE ar_source_chunks ADD COLUMN is_embedded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ar_source_chunks ADD COLUMN qdrant_id   TEXT;
ALTER TABLE ar_source_chunks ADD COLUMN chunk_kind  TEXT;
  -- chunk_kind values:
  --   'discourse_link' | 'rhetoric' | 'lexical' | 'syntax'
  --   'grammar'        | 'semantic' | 'theology' | 'other'

-- Indexes for pipeline queries
CREATE INDEX IF NOT EXISTS idx_asc_embedded ON ar_source_chunks(is_embedded);
CREATE INDEX IF NOT EXISTS idx_asc_kind     ON ar_source_chunks(ar_u_source, chunk_kind);

-- One-time backfill: classify pre-existing chunks by their chunk_type
UPDATE ar_source_chunks SET chunk_kind = 'grammar'  WHERE chunk_type = 'grammar'    AND chunk_kind IS NULL;
UPDATE ar_source_chunks SET chunk_kind = 'lexical'  WHERE chunk_type = 'lexicon'    AND chunk_kind IS NULL;
UPDATE ar_source_chunks SET chunk_kind = 'other'    WHERE chunk_type = 'literature' AND chunk_kind IS NULL;
UPDATE ar_source_chunks SET chunk_kind = 'other'    WHERE chunk_type = 'reference'  AND chunk_kind IS NULL;
-- Remaining NULLs will be set per-run during ingest
