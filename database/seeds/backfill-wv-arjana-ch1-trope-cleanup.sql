-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill: declutter the Chapter 1 Era × Trope matrix.
-- DB     : km_worldview
-- Why    : Ch.1 carried 3 legacy chapter-specific trope nodes (toxic masculinity,
--          infantilization, miscegenation) with no era_intensity. After seeding
--          the standard 7-trope book matrix for ch1 (seed-wv-arjana-perchapter-
--          graph-nodes.sql) these showed as 3 empty rows. They are real Ch.1
--          graph concepts (6 wv_node_edges: muslim-monster embodies …, dracula
--          embodies miscegenation, etc.), so rather than delete them and orphan
--          those edges, reclassify node_type trope → concept. They drop out of
--          the matrix (which keys off node_type='trope') while staying in the
--          chapter graph with their edges intact. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE wv_nodes SET node_type='concept', updated_at=datetime('now')
WHERE id IN (
  'node-arjana-toxic-masculinity',
  'node-arjana-infantilization',
  'node-arjana-miscegenation'
);
