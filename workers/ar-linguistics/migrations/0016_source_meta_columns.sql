-- ─── 0016_source_meta_columns.sql ────────────────────────────────────────────
-- Move lexicon source metadata out of TS constants and into D1.
--
-- Before this migration: ar_ling_sources held only the bibliographic basics
-- (title_ar / title_en / author_name / period_label). The worker route files
-- (lexicon.ts, lexicon_v2.ts, lexicon_lane.ts, lexicon_mufradat.ts,
-- lexicon_lisan.ts) duplicated this metadata in five hardcoded
-- Record<slug, {…}> constants AND added route-specific fields the table
-- didn't capture: slug (TS-style identifier matching the URL path),
-- origin (lane / ketabonline / thahabi / saaid / qomra — the publisher
-- pipeline), bilingual (Lane-only flag), source_order (catalogue ordering),
-- and parser hints (footnote_source / quran_block_shape).
--
-- This migration adds those columns so a single SourcesRepo can replace all
-- five TS constants with one D1 read. Columns are nullable so existing rows
-- and any future scholarship/non-lexicon source rows are not forced to fill
-- them. 0017 (UPDATE statements) seeds the values from the retired TS data.

ALTER TABLE ar_ling_sources ADD COLUMN slug              TEXT;
ALTER TABLE ar_ling_sources ADD COLUMN origin            TEXT;
ALTER TABLE ar_ling_sources ADD COLUMN bilingual         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ar_ling_sources ADD COLUMN footnote_source   TEXT;
ALTER TABLE ar_ling_sources ADD COLUMN quran_block_shape TEXT;
ALTER TABLE ar_ling_sources ADD COLUMN source_order      INTEGER;

-- Slug must be unique across active sources so SourcesRepo.bySlug() is a
-- single-row lookup. Index allows future bulk-by-slug queries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ar_ling_sources_slug
  ON ar_ling_sources(slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ar_ling_sources_origin
  ON ar_ling_sources(origin);

CREATE INDEX IF NOT EXISTS idx_ar_ling_sources_source_order
  ON ar_ling_sources(source_order) WHERE source_order IS NOT NULL;
