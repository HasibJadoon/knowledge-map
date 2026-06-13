-- 006_add_wv_unit_blocks
-- Make worldview reading content fully NODE-BASED: every heading, subheading,
-- paragraph, quote, list and table in a section becomes its own row, nested
-- into a section/heading tree via parent_block_id — rather than living only as
-- a JSON blob in wv_source_units.meta_json.readingBlocks.
--
-- This makes sections and headings first-class addressable nodes (so content,
-- documents and episodes can attach to a specific heading), while the API can
-- still assemble the flat readingBlocks array for the reader from these rows.
--
-- Apply:
--   wrangler d1 execute km_worldview --remote --config workers/worldview/wrangler.toml \
--     --file database/migrations/km-worldview/006_add_wv_unit_blocks.sql

CREATE TABLE IF NOT EXISTS wv_unit_blocks (
  id              TEXT PRIMARY KEY,
  source_unit_id  TEXT NOT NULL,
  source_id       TEXT,
  parent_block_id TEXT,                              -- nesting: a block's owning heading / section node
  block_type      TEXT NOT NULL,                     -- heading|subheading|paragraph|quote|list|table|separator|callout|image|audio|link
  heading_level   INTEGER,                           -- 1..6 for heading / subheading
  order_index     INTEGER NOT NULL DEFAULT 0,        -- position within the unit (flat reading order)
  text            TEXT,                              -- prose text (inline emphasis markers preserved)
  cite            TEXT,
  href            TEXT,
  label           TEXT,
  src             TEXT,
  alt             TEXT,
  title           TEXT,
  ordered         INTEGER,                           -- list ordering flag (0/1)
  items_json      TEXT,                              -- list items: ["…","…"]
  table_json      TEXT,                              -- {"headerRow":[…],"rows":[[…],…]}
  anchor_slug     TEXT,                              -- stable slug for a heading / section node
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_unit_id)  REFERENCES wv_source_units(id),
  FOREIGN KEY (parent_block_id) REFERENCES wv_unit_blocks(id)
);

CREATE INDEX IF NOT EXISTS idx_wv_unit_blocks_unit   ON wv_unit_blocks (source_unit_id, order_index);
CREATE INDEX IF NOT EXISTS idx_wv_unit_blocks_parent ON wv_unit_blocks (parent_block_id, order_index);

-- Let an attachment optionally hang off a specific section/heading node
-- (not just the whole unit), so documents/content/episodes can be section-local.
ALTER TABLE wv_unit_attachments ADD COLUMN block_ref TEXT;
