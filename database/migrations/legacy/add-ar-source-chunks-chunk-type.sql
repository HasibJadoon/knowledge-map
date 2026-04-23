PRAGMA foreign_keys = ON;

-- chunk_type is now part of the base schema; keep this migration idempotent.

CREATE INDEX IF NOT EXISTS idx_chunks_source_type
  ON ar_source_chunks(ar_u_source, chunk_type);
