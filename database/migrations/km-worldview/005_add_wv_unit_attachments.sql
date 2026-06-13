-- 005_add_wv_unit_attachments
-- Let every worldview section (wv_source_units row — chapter, section, etc.)
-- carry attached DOCUMENTS, CONTENT, and EPISODES for the reader / iOS app.
--
-- Ownership: worldview owns the section; the content domain (km_content / CM)
-- owns the documents, sources, media and publications. Following the project's
-- cross-domain contract, the link lives here in km_worldview and points at the
-- canonical CM record by typed reference (e.g. CM:doc-…, CM:asset-…), with a
-- few denormalised display fields so the reader can render a list without a
-- cross-database join. Hydrate full detail from CM via the backend gateway.
--
-- Apply:
--   wrangler d1 migrations apply km_worldview --remote --config workers/worldview/wrangler.toml
-- or:
--   wrangler d1 execute km_worldview --remote --config workers/worldview/wrangler.toml \
--     --file database/migrations/km-worldview/005_add_wv_unit_attachments.sql

CREATE TABLE IF NOT EXISTS wv_unit_attachments (
  id              TEXT PRIMARY KEY,
  source_unit_id  TEXT NOT NULL,                      -- the section this hangs off
  source_id       TEXT,                               -- denormalised parent source (fast source-level queries)
  attachment_type TEXT NOT NULL DEFAULT 'document',   -- document | content | episode
  target_ref      TEXT NOT NULL,                      -- typed cross-domain ref: CM:doc-…, CM:src-…, CM:asset-…, CM:pub-…
  target_kind     TEXT,                               -- cm_document | cm_source | cm_media_asset | cm_publication
  title           TEXT,                               -- denormalised display title
  subtitle        TEXT,
  summary         TEXT,
  thumbnail_url   TEXT,
  media_url       TEXT,                               -- playable/openable url (episodes, external content)
  duration_sec    REAL,                               -- episode/media length
  locator         TEXT,                               -- where in the section it belongs (page/anchor)
  link_role       TEXT NOT NULL DEFAULT 'related',    -- primary | supplementary | related | further_reading
  order_index     INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active',      -- active | hidden | archived
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_wv_unit_attachments_unit
  ON wv_unit_attachments (source_unit_id, attachment_type, order_index);
CREATE INDEX IF NOT EXISTS idx_wv_unit_attachments_source
  ON wv_unit_attachments (source_id, attachment_type);
CREATE INDEX IF NOT EXISTS idx_wv_unit_attachments_target
  ON wv_unit_attachments (target_ref);

-- Convenience views — one per attachment kind, ordered for display.
CREATE VIEW IF NOT EXISTS wv_unit_documents AS
  SELECT * FROM wv_unit_attachments
  WHERE attachment_type = 'document' AND status = 'active'
  ORDER BY source_unit_id, order_index;

CREATE VIEW IF NOT EXISTS wv_unit_content AS
  SELECT * FROM wv_unit_attachments
  WHERE attachment_type = 'content' AND status = 'active'
  ORDER BY source_unit_id, order_index;

CREATE VIEW IF NOT EXISTS wv_unit_episodes AS
  SELECT * FROM wv_unit_attachments
  WHERE attachment_type = 'episode' AND status = 'active'
  ORDER BY source_unit_id, order_index;
