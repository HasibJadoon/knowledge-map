-- Backfill: normalize the stored readingBlocks JSON of Said Orientalism
-- Ch.1 Section I into node rows (wv_unit_blocks), entirely DB-side via json_each,
-- then build the section/heading tree via parent_block_id. Re-runnable.
--   wrangler d1 execute km_worldview --remote --config workers/worldview/wrangler.toml \
--     --file database/seeds/orientalism/backfill-wv-unit-blocks-ch1-s1.sql

DELETE FROM wv_unit_blocks WHERE source_unit_id='sru-said-orient-ch1-s1';

INSERT INTO wv_unit_blocks (id, source_unit_id, source_id, block_type, heading_level, order_index, text, cite, ordered, items_json, table_json)
SELECT
  'wub-orient-s1-' || printf('%03d', je.key),
  'sru-said-orient-ch1-s1',
  'src-said-orientalism-1978',
  json_extract(je.value,'$.type'),
  json_extract(je.value,'$.level'),
  je.key,
  json_extract(je.value,'$.text'),
  json_extract(je.value,'$.cite'),
  json_extract(je.value,'$.ordered'),
  json_extract(je.value,'$.items'),
  CASE WHEN json_extract(je.value,'$.type')='table'
       THEN json_object('headerRow', json_extract(je.value,'$.headerRow'), 'rows', json_extract(je.value,'$.rows'))
       END
FROM wv_source_units u, json_each(json_extract(u.meta_json,'$.readingBlocks')) je
WHERE u.id='sru-said-orient-ch1-s1';

-- Nest content under its owning heading.
UPDATE wv_unit_blocks AS b
SET parent_block_id = (
  SELECT h.id FROM wv_unit_blocks h
  WHERE h.source_unit_id = b.source_unit_id
    AND h.block_type IN ('heading','subheading')
    AND h.order_index < b.order_index
  ORDER BY h.order_index DESC LIMIT 1)
WHERE b.source_unit_id='sru-said-orient-ch1-s1'
  AND b.block_type NOT IN ('heading','subheading');

-- Nest headings under the nearest higher-rank heading.
UPDATE wv_unit_blocks AS b
SET parent_block_id = (
  SELECT h.id FROM wv_unit_blocks h
  WHERE h.source_unit_id = b.source_unit_id
    AND h.block_type IN ('heading','subheading')
    AND h.order_index < b.order_index
    AND COALESCE(h.heading_level,1) < COALESCE(b.heading_level,1)
  ORDER BY h.order_index DESC LIMIT 1)
WHERE b.source_unit_id='sru-said-orient-ch1-s1'
  AND b.block_type IN ('heading','subheading');
