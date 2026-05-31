-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill: stamp each worldview node with its cluster (community) slug + title
-- DB     : km_worldview
-- Why    : Cluster membership lives only in wv_cluster_members. The reader graph
--          loads nodes via /worldview/units/:id/annotations, which returns
--          wv_nodes.data_json but not cluster joins. Copying the cluster slug
--          into data_json lets the client render cluster-colored "constellation"
--          territories with no API change. Idempotent (json_set overwrites).
--
-- Scope  : 'arjana-%' clusters (Muslims in the Western Imagination, Introduction).
--          Re-run safe; widen the LIKE filter to backfill other corpora.
-- Applied: live km_worldview on 2026-05-31 (45 nodes).
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE wv_nodes
SET data_json = json_set(
      json_set(
        COALESCE(data_json, '{}'),
        '$.cluster',
        (SELECT c.slug FROM wv_cluster_members m JOIN wv_clusters c ON c.id = m.cluster_id
          WHERE m.entity_id = wv_nodes.id AND m.entity_type = 'node' AND c.slug LIKE 'arjana-%' LIMIT 1)
      ),
      '$.cluster_title',
      (SELECT c.title FROM wv_cluster_members m JOIN wv_clusters c ON c.id = m.cluster_id
        WHERE m.entity_id = wv_nodes.id AND m.entity_type = 'node' AND c.slug LIKE 'arjana-%' LIMIT 1)
    ),
    updated_at = datetime('now')
WHERE id IN (
  SELECT m.entity_id FROM wv_cluster_members m JOIN wv_clusters c ON c.id = m.cluster_id
  WHERE c.slug LIKE 'arjana-%' AND m.entity_type = 'node'
);
