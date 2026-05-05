-- 0010_lexicon_entry_embedding_tracking.sql
-- Tracking tables for Level 1 lexicon entry embeddings.
--
-- SQL remains canonical. Qdrant is a semantic index. These tables record which
-- canonical lexicon rows have been embedded into which collection/model.

CREATE TABLE IF NOT EXISTS ar_ling_lexicon_entry_embeddings (
  entry_id TEXT PRIMARY KEY,
  collection_name TEXT NOT NULL,
  qdrant_point_id TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding_text_hash TEXT NOT NULL,
  embedded_at TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_allee_collection
  ON ar_ling_lexicon_entry_embeddings(collection_name);

CREATE INDEX IF NOT EXISTS idx_allee_model
  ON ar_ling_lexicon_entry_embeddings(embedding_model);

CREATE INDEX IF NOT EXISTS idx_allee_status
  ON ar_ling_lexicon_entry_embeddings(status);

CREATE INDEX IF NOT EXISTS idx_allee_hash
  ON ar_ling_lexicon_entry_embeddings(embedding_text_hash);

CREATE TABLE IF NOT EXISTS ar_ling_embedding_jobs (
  job_id TEXT PRIMARY KEY,
  collection_name TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  total_expected INTEGER,
  total_embedded INTEGER,
  status TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_alej_collection
  ON ar_ling_embedding_jobs(collection_name);

CREATE INDEX IF NOT EXISTS idx_alej_status
  ON ar_ling_embedding_jobs(status);
