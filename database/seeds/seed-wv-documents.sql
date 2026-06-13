-- ─── Worldview document seed ──────────────────────────────────────────────────
-- Sample authored documents in the `worldview` app-domain, tagged to existing
-- wv_topics topic_keys so the Ionic "Worldview → Documents" tree renders the
-- sub-domain → topic → document grouping (instead of an empty state).
--
-- Target database: km_content  (cm_documents + cm_blocks)
-- Owner: replace core_user_ref with the target account before seeding another
--        environment; CORE:01KRVE8E5SPYGQZZJE8E4EZN9P is the primary user.
--
-- Apply:
--   wrangler d1 execute km_content --remote \
--     --config workers/content/wrangler.toml \
--     --file database/seeds/seed-wv-documents.sql
--
-- App-only fields (domain, topic_key) ride in cm_documents.meta_json, matching
-- the DocsApiService adapter. Re-runnable via INSERT OR IGNORE.

INSERT OR IGNORE INTO cm_documents
  (doc_id, core_user_ref, doc_type, title, language, word_count, reading_time_min, publication_state, tags_json, meta_json)
VALUES
 ('CM:01KSEEDWVISHQ0000000000001','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','Divine Love (ʿIshq) — reading notes','en',24,1,'draft','["rumi","love"]', json_object('domain','worldview','topic_key','rumi-ishq','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVFIRAQ000000000002','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','Separation from the Origin (Firāq)','en',21,1,'draft','["rumi"]', json_object('domain','worldview','topic_key','rumi-firaq','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVASLVASL00000000003','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','essay','Origin & Reunion (Aṣl–Waṣl)','en',38,1,'draft','["rumi","metaphysics"]', json_object('domain','worldview','topic_key','rumi-asl-vasl','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVNEYSOUL00000000004','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','The Reed (Ney) as the Soul','en',19,1,'draft','["rumi","symbol"]', json_object('domain','worldview','topic_key','rumi-ney-soul','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVMONSTER00000000005','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','article','The Muslim Monster trope','en',52,1,'draft','["arjana","imaginaire"]', json_object('domain','worldview','topic_key','arjana-muslim-monster','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVRACIAL000000000006','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','Racialization of Muslims','en',27,1,'draft','["arjana","race"]', json_object('domain','worldview','topic_key','arjana-racialization','parent_doc_id',NULL,'sort_order',0));

INSERT OR IGNORE INTO cm_blocks
  (block_id, doc_id, parent_block_id, block_type, seq_order, depth, content_text, attrs_json, annotations_json, meta_json)
VALUES
 ('BLK:seed-ishq-1','CM:01KSEEDWVISHQ0000000000001',NULL,'paragraph',0,0,'ʿIshq in Rumi is the magnetic pull of the divine: love as the engine of return, not merely an emotion but the cosmology of reunion.','{}','[]','{}'),
 ('BLK:seed-firaq-1','CM:01KSEEDWVFIRAQ000000000002',NULL,'paragraph',0,0,'Firāq names the wound of separation from the Origin — the ache the reed sings of, which only reunion (waṣl) can answer.','{}','[]','{}'),
 ('BLK:seed-aslvasl-1','CM:01KSEEDWVASLVASL00000000003',NULL,'paragraph',0,0,'Aṣl (origin) and waṣl (reunion) frame Rumi''s arc of descent and ascent: every soul is cut from the reed-bed and longs to be rejoined.','{}','[]','{}'),
 ('BLK:seed-ney-1','CM:01KSEEDWVNEYSOUL00000000004',NULL,'paragraph',0,0,'The ney (reed flute) is the soul emptied of self so the divine breath can sound through it; its song is the complaint of separation.','{}','[]','{}'),
 ('BLK:seed-monster-1','CM:01KSEEDWVMONSTER00000000005',NULL,'paragraph',0,0,'Arjana traces how the "Muslim monster" is manufactured in the Western imaginaire — a typology of dehumanization with real-bodies stakes.','{}','[]','{}'),
 ('BLK:seed-racial-1','CM:01KSEEDWVRACIAL000000000006',NULL,'paragraph',0,0,'Racialization converts religious difference into bodily, inheritable otherness, binding Islamophobia to the machinery of race.','{}','[]','{}');
