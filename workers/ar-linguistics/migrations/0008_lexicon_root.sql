-- 0008_lexicon_root.sql
-- Add root_id and source_slug as direct columns on ar_ling_source_chunks.
-- heading_norm is already there — add a proper index on it for root-lookup queries.
--
-- Why source_slug as a column:
--   The existing meta_json stores it as JSON — querying LIKE '%slug%' is slow and fragile.
--   A direct column enables: WHERE source_slug = 'lane_quranic_research_perseus'
--
-- Why root_id:
--   Cross-references ar_ling_roots for the word-detail panel (root stats, meaning_core, etc.)

ALTER TABLE ar_ling_source_chunks ADD COLUMN root_id     TEXT;
ALTER TABLE ar_ling_source_chunks ADD COLUMN source_slug TEXT;

-- Fast lookup by Arabic root heading (the primary lexicon query path)
CREATE INDEX IF NOT EXISTS idx_arl_sc_heading
  ON ar_ling_source_chunks(heading_norm);

-- Fast lookup by source (filter to Lane vs Lisan etc.)
CREATE INDEX IF NOT EXISTS idx_arl_sc_slug
  ON ar_ling_source_chunks(source_slug);

-- Cross-reference from root_id
CREATE INDEX IF NOT EXISTS idx_arl_sc_root_id
  ON ar_ling_source_chunks(root_id);

-- Composite: root + source (lexicon panel — one source's entry for a root)
CREATE INDEX IF NOT EXISTS idx_arl_sc_root_source
  ON ar_ling_source_chunks(heading_norm, source_slug);
