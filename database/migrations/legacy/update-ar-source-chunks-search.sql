PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=TRUE;

-- Add normalized search + optional structured payload columns.
-- text_search/content_json are now part of the base schema.

-- Backfill normalized search text from existing raw text.
UPDATE ar_source_chunks
SET text_search = lower(trim(
  replace(replace(replace(replace(replace(replace(replace(replace(
    COALESCE(text, ''),
    char(10), ' '),
    char(13), ' '),
    char(173), '-'),
    '‐', '-'),
    '‑', '-'),
    '–', '-'),
    '—', '-'),
    '−', '-')
))
WHERE text_search IS NULL OR length(trim(text_search)) = 0;

CREATE INDEX IF NOT EXISTS idx_chunks_source_page
  ON ar_source_chunks(ar_u_source, page_no);

CREATE INDEX IF NOT EXISTS idx_chunks_source_heading
  ON ar_source_chunks(ar_u_source, heading_norm);

CREATE INDEX IF NOT EXISTS idx_chunks_source_type
  ON ar_source_chunks(ar_u_source, chunk_type);

DROP TABLE IF EXISTS ar_source_chunks_fts;
CREATE VIRTUAL TABLE ar_source_chunks_fts USING fts5(
  chunk_id UNINDEXED,
  source_code,
  heading_norm,
  text_search
);

INSERT INTO ar_source_chunks_fts(chunk_id, source_code, heading_norm, text_search)
SELECT
  c.chunk_id,
  s.source_code,
  COALESCE(c.heading_norm, ''),
  COALESCE(c.text_search, c.text)
FROM ar_source_chunks c
JOIN ar_u_sources s ON s.ar_u_source = c.ar_u_source;

PRAGMA foreign_keys=ON;
