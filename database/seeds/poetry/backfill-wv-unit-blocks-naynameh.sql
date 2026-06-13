-- Backfill the Naynameh poem nodes (wv_unit_blocks) from the stored couplet
-- readingBlocks, lossless: each couplet's full JSON (hemistichs + translation
-- layers) is kept in meta_json so the API can return it verbatim. Re-runnable.
--   wrangler d1 execute km_worldview --remote --config workers/worldview/wrangler.toml \
--     --file database/seeds/poetry/backfill-wv-unit-blocks-naynameh.sql

DELETE FROM wv_unit_blocks WHERE source_unit_id='sru-rumi-masnavi-naynameh';

INSERT INTO wv_unit_blocks (id, source_unit_id, source_id, block_type, order_index, text, meta_json)
SELECT
  'wub-naynameh-' || printf('%03d', je.key),
  'sru-rumi-masnavi-naynameh',
  'src-rumi-masnavi-1273',
  json_extract(je.value,'$.type'),
  je.key,
  json_extract(je.value,'$.hemistichs[0]'),
  je.value
FROM wv_source_units u, json_each(json_extract(u.meta_json,'$.readingBlocks')) je
WHERE u.id='sru-rumi-masnavi-naynameh';
