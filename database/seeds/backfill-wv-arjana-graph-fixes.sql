-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill: graph (wv_node_edges) corrections for the Arjana chapter-1 knowledge
--           graph, found during the cross-diagram data check.
-- DB     : km_worldview
-- Why    :
--   1. Era 'feeds_into' chain ran medieval→renaissance→orientalist→americas→
--      sept11, which contradicted BOTH the comparison-matrix axis order and the
--      timeline (medieval→renaissance→americas[1492]→orientalist[1700]→sept11).
--      Re-pointed to chronological order so all three diagrams agree.
--   2. 'Maurophilia' (node-arjana-maurophilia) was an orphan with no edges.
--      Wired into the Americas era ("American Indians read as Moors, their cities
--      as New Cairo") and to the Zofloya figure ("a Moor named Zofloya").
-- Applied: live km_worldview on 2026-05-31. Idempotent.
-- Note   : the base Arjana node/edge graph has no committed seed (it was authored
--          directly in D1); this patch documents the corrections so they survive.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Chronological era chain (matches wv_comparison_axes + wv_timeline_events order)
UPDATE wv_node_edges SET to_node_id='node-arjana-era-americas'      WHERE id='edge-arjana-intro-054';
UPDATE wv_node_edges SET from_node_id='node-arjana-era-americas', to_node_id='node-arjana-era-orientalist' WHERE id='edge-arjana-intro-055';
UPDATE wv_node_edges SET from_node_id='node-arjana-era-orientalist' WHERE id='edge-arjana-intro-056';

-- 2. De-orphan Maurophilia
INSERT OR IGNORE INTO wv_node_edges (id, from_node_id, to_node_id, relation_type, note, weight) VALUES
 ('edge-arjana-ch1-082','node-arjana-maurophilia','node-arjana-era-americas','operates_in','American Indians read as Moors, their cities as "New Cairo" — Maurophilia in the New World.',1.0),
 ('edge-arjana-ch1-083','node-arjana-zofloya','node-arjana-maurophilia','exemplifies','"a Moor named Zofloya" — a Gothic Moor figure expressing European fascination with the Moor.',1.0);
