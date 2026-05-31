-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill: enrich worldview 'trope' nodes with an era_intensity map (0-3) for
--           the Era x Trope matrix heatmap.
-- DB     : km_worldview
-- Why    : Same rationale as the cluster + timeline backfills — the trope nodes
--          already flow through /worldview/units/:id/annotations, so storing
--          the per-era intensities in data_json lets the matrix render live with
--          no API change. Values are an interpretive reading of the Introduction
--          (religion + dehumanization run hottest); adjust freely. Idempotent.
-- Scope  : Muslims in the Western Imagination — Introduction (8 trope nodes).
-- Applied: live km_worldview on 2026-05-31.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":3,"renaissance":3,"americas":2,"orientalist":2,"sept11":2}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-religion';
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":2,"renaissance":2,"americas":3,"orientalist":2,"sept11":3}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-dehumanization';
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":2,"renaissance":2,"americas":2,"orientalist":3,"sept11":3}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-alterity';
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":1,"renaissance":1,"americas":3,"orientalist":3,"sept11":2}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-race';
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":1,"renaissance":2,"americas":1,"orientalist":3,"sept11":1}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-sexualization';
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":1,"renaissance":2,"americas":1,"orientalist":3,"sept11":1}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-sexuality';
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":1,"renaissance":1,"americas":1,"orientalist":2,"sept11":3}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-gender';
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":1,"renaissance":2,"americas":2,"orientalist":2,"sept11":3}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-civilization';
