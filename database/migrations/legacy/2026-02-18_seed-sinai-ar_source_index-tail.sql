PRAGMA foreign_keys = ON;

-- Sync latest tail rows for SRC:SINAI_KEY_TERMS English index into ar_source_index.
-- Includes:
--   000392 correction
--   000393 insertion
--   000394 insertion

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
  meta_json
)
SELECT
  payload.index_id,
  payload.ar_u_source,
  payload.term_raw,
  payload.term_norm,
  NULL AS term_ar,
  NULL AS term_ar_guess,
  (
    SELECT c.chunk_id
    FROM ar_source_chunks c
    WHERE c.ar_u_source = payload.ar_u_source
      AND (
        c.chunk_id = 'SRC:SINAI_KEY_TERMS:p:0801'
        OR c.page_no = 779
        OR c.locator = 'pdf_page:801'
      )
    ORDER BY
      CASE WHEN c.chunk_id = 'SRC:SINAI_KEY_TERMS:p:0801' THEN 0 ELSE 1 END,
      c.page_no ASC,
      c.chunk_id ASC
    LIMIT 1
  ) AS head_chunk_id,
  779 AS index_page_no,
  'pdf_page:801' AS index_locator,
  json('[]') AS page_refs_json,
  payload.variants_json,
  payload.meta_json
FROM (
  SELECT
    'SRC:SINAI_KEY_TERMS:idx:english:000392' AS index_id,
    'SRC:SINAI_KEY_TERMS' AS ar_u_source,
    'wrong (v.)' AS term_raw,
    'wrong (v.)' AS term_norm,
    json('["ẓalama"]') AS variants_json,
    json('{"entry_raw":"wrong (v.) | ẓalama","index_name":"english","order":392,"section_type":"entry"}') AS meta_json
  UNION ALL
  SELECT
    'SRC:SINAI_KEY_TERMS:idx:english:000393' AS index_id,
    'SRC:SINAI_KEY_TERMS' AS ar_u_source,
    'wrongdoing' AS term_raw,
    'wrongdoing' AS term_norm,
    json('["ẓulm","ẓalama"]') AS variants_json,
    json('{"entry_raw":"wrongdoing | ẓulm to be guilty of ~ | ẓalama","index_name":"english","order":393,"section_type":"entry"}') AS meta_json
  UNION ALL
  SELECT
    'SRC:SINAI_KEY_TERMS:idx:english:000394' AS index_id,
    'SRC:SINAI_KEY_TERMS' AS ar_u_source,
    'Zaqqūm: the tree of ~' AS term_raw,
    'zaqqūm: the tree of ~' AS term_norm,
    json('["shajarat al-zaqqūm"]') AS variants_json,
    json('{"entry_raw":"Zaqqūm: the tree of ~ | shajarat al-zaqqūm","index_name":"english","order":394,"section_type":"entry"}') AS meta_json
) AS payload
WHERE EXISTS (
  SELECT 1
  FROM ar_u_sources s
  WHERE s.ar_u_source = payload.ar_u_source
)
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
