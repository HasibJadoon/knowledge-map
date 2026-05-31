-- ═══════════════════════════════════════════════════════════════════════════
-- Backfill: enrich worldview 'era' nodes with timeline data (year ranges +
--           dated incidents) for the dual-register timeline view.
-- DB     : km_worldview
-- Why    : wv_timeline_events is the canonical home, but reaching it on the
--          client needs a new worker endpoint + deploy. The era nodes are
--          already returned by /worldview/units/:id/annotations, so storing the
--          display data in data_json lets the mobile timeline render live with
--          no API change (same pattern as the cluster backfill). Idempotent.
-- Scope  : Muslims in the Western Imagination — Introduction (5 era nodes).
-- Applied: live km_worldview on 2026-05-31.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE wv_nodes SET data_json = json_set(json_set(json_set(json_set(data_json,
  '$.year_start', 700), '$.year_end', 1500), '$.order_index', 1),
  '$.incidents', json('[{"year":622,"title":"Rise of Islam","kind":"spine"},{"year":800,"title":"First Muslim monsters in Christian texts","kind":"spine"}]')),
  updated_at = datetime('now') WHERE id = 'node-arjana-era-medieval';

UPDATE wv_nodes SET data_json = json_set(json_set(json_set(json_set(data_json,
  '$.year_start', 1450), '$.year_end', 1650), '$.order_index', 2),
  '$.incidents', json('[{"year":1453,"title":"Fall of Constantinople","kind":"spine"}]')),
  updated_at = datetime('now') WHERE id = 'node-arjana-era-renaissance';

UPDATE wv_nodes SET data_json = json_set(json_set(json_set(json_set(data_json,
  '$.year_start', 1492), '$.year_end', 1800), '$.order_index', 3),
  '$.incidents', json('[{"year":1492,"title":"Conquest of the Americas","kind":"spine"},{"year":1785,"title":"Barbary corsair panic","kind":"spine"}]')),
  updated_at = datetime('now') WHERE id = 'node-arjana-era-americas';

UPDATE wv_nodes SET data_json = json_set(json_set(json_set(json_set(data_json,
  '$.year_start', 1700), '$.year_end', 1900), '$.order_index', 4),
  '$.incidents', json('[]')),
  updated_at = datetime('now') WHERE id = 'node-arjana-era-orientalist';

UPDATE wv_nodes SET data_json = json_set(json_set(json_set(json_set(data_json,
  '$.year_start', 2001), '$.year_end', 2010), '$.order_index', 5),
  '$.incidents', json('[{"year":2001,"title":"September 11 attacks","kind":"modern"},{"year":2001,"title":"Invasion of Afghanistan","kind":"modern"},{"year":2002,"title":"Guantanamo Bay opens","kind":"modern"},{"year":2003,"title":"Invasion of Iraq","kind":"modern"},{"year":2004,"title":"Abu Ghraib photographs","kind":"modern"},{"year":2004,"title":"Madrid bombings","kind":"modern"},{"year":2005,"title":"London 7/7 bombings","kind":"modern"},{"year":2009,"title":"Swiss minaret ban","kind":"modern"}]')),
  updated_at = datetime('now') WHERE id = 'node-arjana-era-sept11';
