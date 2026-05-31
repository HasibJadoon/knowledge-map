-- ═══════════════════════════════════════════════════════════════════════════
-- K-MAPS  km_worldview DB — Migration 003: Source-Unit Illustrations
-- File   : database/migrations/km-worldview/003_add_wv_source_unit_illustrations.sql
-- DB     : km_worldview   (binding: DB_WV in Workers)
-- Run    : wrangler d1 execute km_worldview --file=... --remote
--
-- Adds per-source-unit visual illustrations. A single wv_source_units chapter /
-- session / passage can own 1..N illustrations (analytical "concept cards"),
-- ordered by order_index. Each illustration is a COMPLETE, self-contained HTML
-- document (its own <style>, SVG, etc.) stored verbatim in html_content — the
-- worker serves it as-is. Author the HTML in the K-MAPS app dark palette
-- (apps/k-maps/src/scss/_tokens.scss): bg #080808, surfaces #0d0d0d/#141414,
-- gold #c9a84c / #e8c96a, text rgba(255,255,255,0.92). The remaining columns are
-- lightweight listing metadata (title / caption / order) for the reader's TOC.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wv_source_unit_illustrations (
  id              TEXT PRIMARY KEY,
  source_unit_id  TEXT NOT NULL,                       -- owner: 1 unit -> N illustrations
  source_id       TEXT,                                -- denormalized parent source (convenience)
  slug            TEXT,                                -- optional stable handle
  order_index     INTEGER NOT NULL DEFAULT 0,          -- 1..N ordering within the unit
  title           TEXT,                                -- label for TOC / tab (falls back to <title>/<h1>)
  caption         TEXT,                                -- short description for listings
  theme           TEXT NOT NULL DEFAULT 'dark',        -- dark | paper — informational; HTML carries its own CSS
  html_content    TEXT NOT NULL,                       -- full standalone HTML document, served verbatim
  meta_json       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (source_unit_id) REFERENCES wv_source_units(id),
  FOREIGN KEY (source_id)      REFERENCES wv_sources(id)
);

CREATE INDEX IF NOT EXISTS idx_wv_su_illus_unit
  ON wv_source_unit_illustrations(source_unit_id, order_index);
CREATE INDEX IF NOT EXISTS idx_wv_su_illus_source
  ON wv_source_unit_illustrations(source_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wv_su_illus_slug
  ON wv_source_unit_illustrations(slug) WHERE slug IS NOT NULL;
