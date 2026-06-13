-- ─── Worldview document seed (km_content) ─────────────────────────────────────
-- Sample authored documents in the `worldview` app-domain, tagged to existing
-- wv_topics topic_keys so the Ionic worldview docs tree renders the
-- sub-domain → topic → document grouping with real, openable content.
--
-- Target database: km_content  (cm_documents + cm_blocks)
-- Companion: database/seeds/seed-wv-topics.sql adds the Said/Orientalism topics
--            this file references (km_worldview).
-- Owner: replace core_user_ref before seeding another environment;
--        CORE:01KRVE8E5SPYGQZZJE8E4EZN9P is the primary user.
--
-- Apply:
--   wrangler d1 execute km_content --remote \
--     --config workers/content/wrangler.toml \
--     --file database/seeds/seed-wv-documents.sql
--
-- NOTE: the editor recomposes paragraph text from cm_blocks.annotations_json
-- (verbatim Tiptap inline nodes), NOT content_text — content_text is only the
-- plain-text projection for FTS/LIKE search. Both are populated below so the
-- documents are searchable AND open with their content. Re-runnable.

INSERT OR IGNORE INTO cm_documents
  (doc_id, core_user_ref, doc_type, title, language, word_count, reading_time_min, publication_state, tags_json, meta_json)
VALUES
 ('CM:01KSEEDWVISHQ0000000000001','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','Divine Love (ʿIshq) — reading notes','en',24,1,'draft','["rumi","love"]', json_object('domain','worldview','topic_key','rumi-ishq','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVFIRAQ000000000002','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','Separation from the Origin (Firāq)','en',21,1,'draft','["rumi"]', json_object('domain','worldview','topic_key','rumi-firaq','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVASLVASL00000000003','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','essay','Origin & Reunion (Aṣl–Waṣl)','en',38,1,'draft','["rumi","metaphysics"]', json_object('domain','worldview','topic_key','rumi-asl-vasl','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVNEYSOUL00000000004','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','The Reed (Ney) as the Soul','en',19,1,'draft','["rumi","symbol"]', json_object('domain','worldview','topic_key','rumi-ney-soul','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVMONSTER00000000005','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','article','The Muslim Monster trope','en',52,1,'draft','["arjana","imaginaire"]', json_object('domain','worldview','topic_key','arjana-muslim-monster','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVRACIAL000000000006','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','Racialization of Muslims','en',27,1,'draft','["arjana","race"]', json_object('domain','worldview','topic_key','arjana-racialization','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVSAIDDISCOURSE00001','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','essay','Orientalism as a discourse of power','en',46,1,'draft','["said","orientalism"]', json_object('domain','worldview','topic_key','said-orientalism-discourse','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVSAIDGEOGRAPHY0002','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','Imaginative geography: inventing the Orient','en',33,1,'draft','["said","orientalism"]', json_object('domain','worldview','topic_key','said-imaginative-geography','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVSAIDLATENT0000003','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','Latent and manifest Orientalism','en',29,1,'draft','["said","orientalism"]', json_object('domain','worldview','topic_key','said-latent-manifest','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVSAIDKNOWPOWER004','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','article','Knowledge in the service of empire','en',41,1,'draft','["said","orientalism","power"]', json_object('domain','worldview','topic_key','said-knowledge-power','parent_doc_id',NULL,'sort_order',0)),
 ('CM:01KSEEDWVSAIDREPOTHER0005','CORE:01KRVE8E5SPYGQZZJE8E4EZN9P','note','Representation and the silent Other','en',31,1,'draft','["said","orientalism"]', json_object('domain','worldview','topic_key','said-representation-other','parent_doc_id',NULL,'sort_order',0));

INSERT OR IGNORE INTO cm_blocks
  (block_id, doc_id, parent_block_id, block_type, seq_order, depth, content_text, attrs_json, annotations_json, meta_json)
VALUES
 ('BLK:seed-ishq-1','CM:01KSEEDWVISHQ0000000000001',NULL,'paragraph',0,0,'ʿIshq in Rumi is the magnetic pull of the divine: love as the engine of return, not merely an emotion but the cosmology of reunion.','{}', json_array(json_object('type','text','text','ʿIshq in Rumi is the magnetic pull of the divine: love as the engine of return, not merely an emotion but the cosmology of reunion.')),'{}'),
 ('BLK:seed-firaq-1','CM:01KSEEDWVFIRAQ000000000002',NULL,'paragraph',0,0,'Firāq names the wound of separation from the Origin — the ache the reed sings of, which only reunion (waṣl) can answer.','{}', json_array(json_object('type','text','text','Firāq names the wound of separation from the Origin — the ache the reed sings of, which only reunion (waṣl) can answer.')),'{}'),
 ('BLK:seed-aslvasl-1','CM:01KSEEDWVASLVASL00000000003',NULL,'paragraph',0,0,'Aṣl (origin) and waṣl (reunion) frame Rumi''s arc of descent and ascent: every soul is cut from the reed-bed and longs to be rejoined.','{}', json_array(json_object('type','text','text','Aṣl (origin) and waṣl (reunion) frame Rumi''s arc of descent and ascent: every soul is cut from the reed-bed and longs to be rejoined.')),'{}'),
 ('BLK:seed-ney-1','CM:01KSEEDWVNEYSOUL00000000004',NULL,'paragraph',0,0,'The ney (reed flute) is the soul emptied of self so the divine breath can sound through it; its song is the complaint of separation.','{}', json_array(json_object('type','text','text','The ney (reed flute) is the soul emptied of self so the divine breath can sound through it; its song is the complaint of separation.')),'{}'),
 ('BLK:seed-monster-1','CM:01KSEEDWVMONSTER00000000005',NULL,'paragraph',0,0,'Arjana traces how the "Muslim monster" is manufactured in the Western imaginaire — a typology of dehumanization with real-bodies stakes.','{}', json_array(json_object('type','text','text','Arjana traces how the "Muslim monster" is manufactured in the Western imaginaire — a typology of dehumanization with real-bodies stakes.')),'{}'),
 ('BLK:seed-racial-1','CM:01KSEEDWVRACIAL000000000006',NULL,'paragraph',0,0,'Racialization converts religious difference into bodily, inheritable otherness, binding Islamophobia to the machinery of race.','{}', json_array(json_object('type','text','text','Racialization converts religious difference into bodily, inheritable otherness, binding Islamophobia to the machinery of race.')),'{}'),
 ('BLK:seed-said-discourse-1','CM:01KSEEDWVSAIDDISCOURSE00001',NULL,'paragraph',0,0,'For Said, Orientalism is less a body of truths about the East than a Western style for dominating, restructuring, and holding authority over the Orient.','{}', json_array(json_object('type','text','text','For Said, Orientalism is less a body of truths about the East than a Western style for dominating, restructuring, and holding authority over the Orient.')),'{}'),
 ('BLK:seed-said-geography-1','CM:01KSEEDWVSAIDGEOGRAPHY0002',NULL,'paragraph',0,0,'The Orient is not a fact of nature but an idea with a history — an imaginative geography that draws a line between a familiar Occident and a strange East.','{}', json_array(json_object('type','text','text','The Orient is not a fact of nature but an idea with a history — an imaginative geography that draws a line between a familiar Occident and a strange East.')),'{}'),
 ('BLK:seed-said-latent-1','CM:01KSEEDWVSAIDLATENT0000003',NULL,'paragraph',0,0,'Manifest Orientalism is what is stated about the Orient; latent Orientalism is the deep, almost unconscious certainty that the East is fixed, backward, and knowable.','{}', json_array(json_object('type','text','text','Manifest Orientalism is what is stated about the Orient; latent Orientalism is the deep, almost unconscious certainty that the East is fixed, backward, and knowable.')),'{}'),
 ('BLK:seed-said-knowpower-1','CM:01KSEEDWVSAIDKNOWPOWER004',NULL,'paragraph',0,0,'To know the Orient was to govern it: scholarship, philology, and travel writing furnished the categories that administration and empire then put to work.','{}', json_array(json_object('type','text','text','To know the Orient was to govern it: scholarship, philology, and travel writing furnished the categories that administration and empire then put to work.')),'{}'),
 ('BLK:seed-said-repother-1','CM:01KSEEDWVSAIDREPOTHER0005',NULL,'paragraph',0,0,'Represented rather than representing itself, the Orient is made to be Europe''s silent Other — spoken for, classified, and contained.','{}', json_array(json_object('type','text','text','Represented rather than representing itself, the Orient is made to be Europe''s silent Other — spoken for, classified, and contained.')),'{}');
