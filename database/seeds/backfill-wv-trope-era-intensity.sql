-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill: enrich worldview 'trope' nodes with an era_intensity map (0-3) for
--           the Era x Trope matrix heatmap.
-- DB     : km_worldview
-- Why    : Same rationale as the cluster + timeline backfills — the trope nodes
--          already flow through /worldview/units/:id/annotations, so storing
--          the per-era intensities in data_json lets the matrix render live with
--          no API change. Idempotent.
-- Grounding: Medieval column is chapter-grounded against Ch.2 (Medieval Muslim
--          Monsters); Renaissance against Ch.3 (Turkish Monsters, partial, to p.67).
--          Americas / Orientalist / Sept11 columns remain an interpretive reading
--          of the Introduction/Ch.1 framing, pending extraction of Ch.4-6.
-- Scope  : Muslims in the Western Imagination (Arjana 2015) — 7 trope nodes.
-- Applied: live km_worldview on 2026-05-31.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":3,"renaissance":3,"americas":2,"orientalist":2,"sept11":2}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-religion';
-- Medieval dehumanization scored 3: Ch.2 (Medieval Muslim Monsters) is built on
-- cynocephalie (dog-headed men), giants, and Black Saracen monsters.
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":3,"renaissance":2,"americas":3,"orientalist":2,"sept11":3}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-dehumanization';
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":2,"renaissance":2,"americas":2,"orientalist":3,"sept11":3}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-alterity';
-- Medieval race scored 3 ("a medieval kind of racialization"; the Black Saracen,
-- a Muslim-Ethiopian-Jewish hybrid, Ch.2) and Renaissance 2 (the Black Turk, Ch.3 p.67).
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":3,"renaissance":2,"americas":3,"orientalist":3,"sept11":2}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-race';
-- Medieval ("lustful Mahomet" polemic) and 9/11+ (Abu Ghraib) are this trope's own
-- documented anchors per its node summary; scored 2 and 3 rather than 1.
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":2,"renaissance":2,"americas":1,"orientalist":3,"sept11":3}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-sexualization';
-- Renaissance gender scored 2: Ch.3 sodomy/effeminacy polemic ("18 out of 20
-- Ottoman sultans ... used [boys] as women").
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":1,"renaissance":2,"americas":1,"orientalist":2,"sept11":3}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-gender';
UPDATE wv_nodes SET data_json = json_set(data_json, '$.era_intensity', json('{"medieval":1,"renaissance":2,"americas":2,"orientalist":2,"sept11":3}')), updated_at = datetime('now') WHERE id = 'node-arjana-trope-civilization';
