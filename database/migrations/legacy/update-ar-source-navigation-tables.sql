PRAGMA foreign_keys=ON;

--------------------------------------------------------------------------------
-- Split mixed chunk scopes into dedicated navigation tables:
--   - ar_source_chunks => page chunks only
--   - ar_source_toc    => table of contents
--   - ar_source_index  => index terms + page refs
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ar_source_toc (
  toc_id         TEXT PRIMARY KEY,
  ar_u_source    TEXT NOT NULL,
  depth          INTEGER NOT NULL,
  index_path     TEXT NOT NULL,
  title_raw      TEXT NOT NULL,
  title_norm     TEXT NOT NULL,
  page_no        INTEGER,
  locator        TEXT,
  pdf_page_index INTEGER,
  meta_json      JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,
  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source)
);

CREATE TABLE IF NOT EXISTS ar_source_index (
  index_id       TEXT PRIMARY KEY,
  ar_u_source    TEXT NOT NULL,
  term_raw       TEXT NOT NULL,
  term_norm      TEXT NOT NULL,
  term_ar        TEXT,
  term_ar_guess  TEXT,
  head_chunk_id  TEXT,
  index_page_no  INTEGER,
  index_locator  TEXT,
  page_refs_json JSON NOT NULL CHECK (json_valid(page_refs_json)),
  variants_json  JSON CHECK (variants_json IS NULL OR json_valid(variants_json)),
  meta_json      JSON CHECK (meta_json IS NULL OR json_valid(meta_json)),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT,
  FOREIGN KEY (ar_u_source) REFERENCES ar_u_sources(ar_u_source),
  FOREIGN KEY (head_chunk_id) REFERENCES ar_source_chunks(chunk_id)
);

CREATE INDEX IF NOT EXISTS idx_ar_source_toc_source_depth
  ON ar_source_toc(ar_u_source, depth);
CREATE INDEX IF NOT EXISTS idx_ar_source_toc_source_page
  ON ar_source_toc(ar_u_source, page_no);

CREATE INDEX IF NOT EXISTS idx_ar_source_index_source_norm
  ON ar_source_index(ar_u_source, term_norm);
CREATE INDEX IF NOT EXISTS idx_ar_source_index_source_page
  ON ar_source_index(ar_u_source, index_page_no);

-- Backfill TOC rows from scope-tagged chunks.
INSERT INTO ar_source_toc (
  toc_id,
  ar_u_source,
  depth,
  index_path,
  title_raw,
  title_norm,
  page_no,
  locator,
  pdf_page_index,
  meta_json,
  created_at,
  updated_at
)
SELECT
  c.chunk_id AS toc_id,
  c.ar_u_source,
  COALESCE(CAST(json_extract(c.meta_json, '$.depth') AS INTEGER), 1) AS depth,
  COALESCE(
    NULLIF(trim(CAST(json_extract(c.meta_json, '$.index_path') AS TEXT)), ''),
    c.chunk_id
  ) AS index_path,
  COALESCE(NULLIF(trim(c.heading_raw), ''), NULLIF(trim(c.text), ''), c.chunk_id) AS title_raw,
  COALESCE(
    NULLIF(trim(c.heading_norm), ''),
    lower(trim(COALESCE(c.heading_raw, c.text, c.chunk_id)))
  ) AS title_norm,
  c.page_no,
  c.locator,
  COALESCE(
    CAST(json_extract(c.meta_json, '$.pdf_page_index') AS INTEGER),
    CASE
      WHEN c.locator LIKE 'pdf_page:%' THEN CAST(substr(c.locator, 10) AS INTEGER)
      ELSE NULL
    END
  ) AS pdf_page_index,
  c.meta_json,
  COALESCE(NULLIF(trim(c.created_at), ''), datetime('now')) AS created_at,
  NULLIF(trim(c.updated_at), '') AS updated_at
FROM ar_source_chunks c
WHERE COALESCE(json_extract(c.content_json, '$.chunk_scope'), 'page') = 'toc'
ON CONFLICT(toc_id) DO UPDATE SET
  ar_u_source = excluded.ar_u_source,
  depth = excluded.depth,
  index_path = excluded.index_path,
  title_raw = excluded.title_raw,
  title_norm = excluded.title_norm,
  page_no = excluded.page_no,
  locator = excluded.locator,
  pdf_page_index = excluded.pdf_page_index,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

-- Backfill index rows from scope-tagged term chunks.
INSERT INTO ar_source_index (
  index_id,
  ar_u_source,
  term_raw,
  term_norm,
  term_ar,
  term_ar_guess,
  head_chunk_id,
  index_page_no,
  index_locator,
  page_refs_json,
  variants_json,
  meta_json,
  created_at,
  updated_at
)
SELECT
  c.chunk_id AS index_id,
  c.ar_u_source,
  COALESCE(NULLIF(trim(c.heading_raw), ''), c.chunk_id) AS term_raw,
  COALESCE(NULLIF(trim(c.heading_norm), ''), lower(trim(COALESCE(c.heading_raw, c.chunk_id)))) AS term_norm,
  NULLIF(trim(CAST(json_extract(c.meta_json, '$.term_ar') AS TEXT)), '') AS term_ar,
  NULLIF(trim(CAST(json_extract(c.meta_json, '$.term_ar_guess') AS TEXT)), '') AS term_ar_guess,
  CASE
    WHEN json_extract(c.content_json, '$.parent_chunk_id') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM ar_source_chunks p
        WHERE p.chunk_id = json_extract(c.content_json, '$.parent_chunk_id')
      )
    THEN CAST(json_extract(c.content_json, '$.parent_chunk_id') AS TEXT)
    ELSE NULL
  END AS head_chunk_id,
  c.page_no AS index_page_no,
  c.locator AS index_locator,
  CASE
    WHEN c.page_no IS NULL THEN json('[]')
    ELSE json_array(
      json_object(
        'from', c.page_no,
        'to', c.page_no,
        'is_main', 1,
        'note', NULL
      )
    )
  END AS page_refs_json,
  NULL AS variants_json,
  c.meta_json,
  COALESCE(NULLIF(trim(c.created_at), ''), datetime('now')) AS created_at,
  NULLIF(trim(c.updated_at), '') AS updated_at
FROM ar_source_chunks c
WHERE COALESCE(json_extract(c.content_json, '$.chunk_scope'), 'page') = 'term'
ON CONFLICT(index_id) DO UPDATE SET
  ar_u_source = excluded.ar_u_source,
  term_raw = excluded.term_raw,
  term_norm = excluded.term_norm,
  term_ar = excluded.term_ar,
  term_ar_guess = excluded.term_ar_guess,
  head_chunk_id = excluded.head_chunk_id,
  index_page_no = excluded.index_page_no,
  index_locator = excluded.index_locator,
  page_refs_json = excluded.page_refs_json,
  variants_json = excluded.variants_json,
  meta_json = excluded.meta_json,
  updated_at = datetime('now');

-- Keep only page chunks in the primary content table.
DELETE FROM ar_source_chunks
WHERE COALESCE(json_extract(content_json, '$.chunk_scope'), 'page') <> 'page';

-- Rebuild chunk FTS from page rows only.
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
