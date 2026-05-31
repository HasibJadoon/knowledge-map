-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: geographic map for "Muslims in the Western Imagination" (Arjana 2015).
-- DB     : km_worldview
-- Renders: km-worldview-map (GET /worldview/units/:id/map-features), which scopes
--          features by the owning source via wv_map_layers.meta_json.source_id, so
--          the map appears on any chapter page of this book.
-- Content: the westward spread of the Muslim-monster imaginaire across the five
--          eras — from the medieval Christian center outward to the post-9/11
--          War on Terror theatre. Places are grounded in the book + its timeline
--          (Constantinople 1453, New World 1492, Barbary corsairs, the Nile /
--          Mummy, Gothic London / Dracula 1897, 9-11 New York, Guantanamo, Abu
--          Ghraib). Per-point presentation is carried in meta_json.
-- Applied: live km_worldview on 2026-05-31. Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO wv_map_layers (id, slug, title, layer_type, description_md, meta_json)
VALUES ('wv-map-arjana-westward','arjana-westward-imaginaire','The Westward Muslim-Monster Imaginaire','imaginaire_geography',
  'Geographic spread of the Muslim-monster imaginaire across Arjana''s five eras, from the medieval Christian center outward to the post-9/11 War on Terror theatre.',
  '{"source_id":"src-arjana-muslims-western-imagination-2015"}');

INSERT OR REPLACE INTO wv_map_features (id, map_layer_id, feature_type, title, latitude, longitude, period_label, label, meta_json) VALUES
 ('wv-mf-arjana-center','wv-map-arjana-westward','point','Christian center',41.9,16.0,'medieval','Rome · Jerusalem','{"source_id":"src-arjana-muslims-western-imagination-2015","kind":"center","era":"medieval","order":0,"intensity":0,"dir":"up","sub":"Rome · Jerusalem"}'),
 ('wv-mf-arjana-andalus','wv-map-arjana-westward','point','al-Andalus',37.89,-4.78,'medieval','al-Andalus','{"source_id":"src-arjana-muslims-western-imagination-2015","kind":"stop","era":"medieval","order":1,"year":1100,"intensity":2,"dir":"down","sub":"Saracens & Moors"}'),
 ('wv-mf-arjana-constantinople','wv-map-arjana-westward','point','Constantinople',41.01,28.98,'renaissance','Constantinople','{"source_id":"src-arjana-muslims-western-imagination-2015","kind":"stop","era":"renaissance","order":2,"year":1453,"intensity":3,"dir":"right","sub":"The Turk · 1453"}'),
 ('wv-mf-arjana-americas','wv-map-arjana-westward','point','The Americas',18.0,-72.0,'americas','The Americas','{"source_id":"src-arjana-muslims-western-imagination-2015","kind":"stop","era":"americas","order":3,"year":1492,"intensity":3,"dir":"up","sub":"New World · New Cairo 1492"}'),
 ('wv-mf-arjana-barbary','wv-map-arjana-westward','point','Barbary Coast',36.75,3.06,'americas','Barbary Coast','{"source_id":"src-arjana-muslims-western-imagination-2015","kind":"stop","era":"americas","order":4,"year":1785,"intensity":2,"dir":"down","sub":"Corsair panic"}'),
 ('wv-mf-arjana-nile','wv-map-arjana-westward','point','Egypt & the Nile',30.04,31.24,'orientalist','Egypt & the Nile','{"source_id":"src-arjana-muslims-western-imagination-2015","kind":"stop","era":"orientalist","order":5,"year":1836,"intensity":3,"dir":"right","sub":"Orientalism · the Mummy"}'),
 ('wv-mf-arjana-london','wv-map-arjana-westward','point','London',51.51,-0.13,'orientalist','London','{"source_id":"src-arjana-muslims-western-imagination-2015","kind":"stop","era":"orientalist","order":6,"year":1897,"intensity":2,"dir":"up","sub":"Gothic · Dracula"}'),
 ('wv-mf-arjana-newyork','wv-map-arjana-westward','point','New York',40.71,-74.0,'sept11','New York','{"source_id":"src-arjana-muslims-western-imagination-2015","kind":"stop","era":"sept11","order":7,"year":2001,"intensity":3,"dir":"left","sub":"September 11, 2001"}'),
 ('wv-mf-arjana-guantanamo','wv-map-arjana-westward','point','Guantanamo',19.91,-75.1,'sept11','Guantánamo','{"source_id":"src-arjana-muslims-western-imagination-2015","kind":"stop","era":"sept11","order":8,"year":2002,"intensity":2,"dir":"down","sub":"Bare life · 2002"}'),
 ('wv-mf-arjana-abughraib','wv-map-arjana-westward','point','Abu Ghraib',33.29,44.06,'sept11','Abu Ghraib','{"source_id":"src-arjana-muslims-western-imagination-2015","kind":"stop","era":"sept11","order":9,"year":2004,"intensity":3,"dir":"down","sub":"War on Terror · 2004"}');
