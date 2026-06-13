-- Starter per-section attachments for Said Orientalism Ch.1 Section I.
-- These are sample rows (meta_json.sample = true) demonstrating the
-- documents / content / episodes UI; replace target_ref with real CM ids.
--   wrangler d1 execute km_worldview --remote --config workers/worldview/wrangler.toml \
--     --file database/seeds/orientalism/seed-wv-said-orientalism-ch1-s1-attachments.sql

INSERT OR REPLACE INTO wv_unit_attachments (id, source_unit_id, source_id, attachment_type, target_ref, target_kind, title, subtitle, summary, duration_sec, link_role, order_index, meta_json) VALUES
('wva-orient-s1-ep1','sru-said-orient-ch1-s1','src-said-orientalism-1978','episode','CM:asset-said-orientalism-lecture','cm_media_asset','Edward Said — On Orientalism','Media Education Foundation (1998)','Said explains, in his own voice, how knowing the Orient and ruling it became one act — the core of Section I.',2760,'primary',0,'{"sample":true}'),
('wva-orient-s1-ep2','sru-said-orient-ch1-s1','src-said-orientalism-1978','episode','CM:asset-power-knowledge-primer','cm_media_asset','Power/Knowledge in 10 minutes','Concept primer','A short audio primer on Foucault''s power/knowledge — the theoretical engine under Balfour and Cromer.',612,'supplementary',1,'{"sample":true}'),
('wva-orient-s1-doc1','sru-said-orient-ch1-s1','src-said-orientalism-1978','document','CM:doc-balfour-1910-speech','cm_document','Balfour''s 1910 Commons speech','Primary source · Hansard','The full text Said dissects: “We know the civilization of Egypt better than…”',NULL,'primary',0,'{"sample":true}'),
('wva-orient-s1-doc2','sru-said-orient-ch1-s1','src-said-orientalism-1978','document','CM:doc-cromer-subject-races','cm_document','Cromer, “The Government of Subject Races”','Primary source · Edinburgh Review (1908)','The administrator''s blueprint for rule by understanding “limitations.”',NULL,'further_reading',1,'{"sample":true}'),
('wva-orient-s1-con1','sru-said-orient-ch1-s1','src-said-orientalism-1978','content','CM:doc-section1-reading','cm_document','Section I — concept-by-concept reading','Study companion','The annotated walkthrough of Section I with the deeper-layers analysis.',NULL,'related',0,'{"sample":true}');
