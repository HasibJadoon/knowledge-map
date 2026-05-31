-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: canonical timeline + comparison for Arjana Introduction (promotes the
-- data_json-backed timeline/matrix views into first-class wv_timeline_events and
-- wv_comparisons/axes/rows/cells). Idempotent. Applied live 2026-05-31.
-- ═══════════════════════════════════════════════════════════════════════════

-- Canonical Era × Trope comparison

INSERT OR REPLACE INTO wv_comparisons (id,slug,title,comparison_type,description_md,meta_json) VALUES
  ('wv-cmp-arjana-era-trope','arjana-era-trope','Era × Trope — Muslims in the Western Imagination','matrix','Intensity (0–3) of each trope across the five eras.',json('{"source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-intro"}'));

INSERT OR REPLACE INTO wv_comparison_axes (id,comparison_id,axis_label,axis_description,sort_order) VALUES
  ('wv-cax-arjana-medieval','wv-cmp-arjana-era-trope','Medieval','Medieval (8th–15th c.)',1),
  ('wv-cax-arjana-renaissance','wv-cmp-arjana-era-trope','Renaissance','Renaissance / Elizabethan',2),
  ('wv-cax-arjana-americas','wv-cmp-arjana-era-trope','Americas','The Americas / colonial',3),
  ('wv-cax-arjana-orientalist','wv-cmp-arjana-era-trope','Orientalism','Orientalism & Gothic (18th–19th c.)',4),
  ('wv-cax-arjana-sept11','wv-cmp-arjana-era-trope','9/11 +','September 11 & after',5);

INSERT OR REPLACE INTO wv_comparison_rows (id,comparison_id,entity_type,entity_id,row_label,sort_order) VALUES
  ('wv-crow-arjana-religion','wv-cmp-arjana-era-trope','node','node-arjana-trope-religion','Religion as threat',1),
  ('wv-crow-arjana-dehumanization','wv-cmp-arjana-era-trope','node','node-arjana-trope-dehumanization','Dehumanization',2),
  ('wv-crow-arjana-alterity','wv-cmp-arjana-era-trope','node','node-arjana-trope-alterity','Alterity / permanent foreigner',3),
  ('wv-crow-arjana-race','wv-cmp-arjana-era-trope','node','node-arjana-trope-race','Race / racialization',4),
  ('wv-crow-arjana-sexualization','wv-cmp-arjana-era-trope','node','node-arjana-trope-sexualization','Sexualization',5),
  ('wv-crow-arjana-sexuality','wv-cmp-arjana-era-trope','node','node-arjana-trope-sexuality','Sexuality',6),
  ('wv-crow-arjana-gender','wv-cmp-arjana-era-trope','node','node-arjana-trope-gender','Gender',7),
  ('wv-crow-arjana-civilization','wv-cmp-arjana-era-trope','node','node-arjana-trope-civilization','Threat to civilization / modernity',8);

INSERT OR REPLACE INTO wv_comparison_cells (id,comparison_id,row_id,axis_id,cell_text,stance,meta_json) VALUES
  ('wv-ccell-religion-medieval','wv-cmp-arjana-era-trope','wv-crow-arjana-religion','wv-cax-arjana-medieval','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-religion-renaissance','wv-cmp-arjana-era-trope','wv-crow-arjana-religion','wv-cax-arjana-renaissance','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-religion-americas','wv-cmp-arjana-era-trope','wv-crow-arjana-religion','wv-cax-arjana-americas','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-religion-orientalist','wv-cmp-arjana-era-trope','wv-crow-arjana-religion','wv-cax-arjana-orientalist','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-religion-sept11','wv-cmp-arjana-era-trope','wv-crow-arjana-religion','wv-cax-arjana-sept11','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-dehumanization-medieval','wv-cmp-arjana-era-trope','wv-crow-arjana-dehumanization','wv-cax-arjana-medieval','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-dehumanization-renaissance','wv-cmp-arjana-era-trope','wv-crow-arjana-dehumanization','wv-cax-arjana-renaissance','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-dehumanization-americas','wv-cmp-arjana-era-trope','wv-crow-arjana-dehumanization','wv-cax-arjana-americas','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-dehumanization-orientalist','wv-cmp-arjana-era-trope','wv-crow-arjana-dehumanization','wv-cax-arjana-orientalist','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-dehumanization-sept11','wv-cmp-arjana-era-trope','wv-crow-arjana-dehumanization','wv-cax-arjana-sept11','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-alterity-medieval','wv-cmp-arjana-era-trope','wv-crow-arjana-alterity','wv-cax-arjana-medieval','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-alterity-renaissance','wv-cmp-arjana-era-trope','wv-crow-arjana-alterity','wv-cax-arjana-renaissance','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-alterity-americas','wv-cmp-arjana-era-trope','wv-crow-arjana-alterity','wv-cax-arjana-americas','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-alterity-orientalist','wv-cmp-arjana-era-trope','wv-crow-arjana-alterity','wv-cax-arjana-orientalist','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-alterity-sept11','wv-cmp-arjana-era-trope','wv-crow-arjana-alterity','wv-cax-arjana-sept11','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-race-medieval','wv-cmp-arjana-era-trope','wv-crow-arjana-race','wv-cax-arjana-medieval','1','intensity-1',json('{"intensity":1}')),
  ('wv-ccell-race-renaissance','wv-cmp-arjana-era-trope','wv-crow-arjana-race','wv-cax-arjana-renaissance','1','intensity-1',json('{"intensity":1}')),
  ('wv-ccell-race-americas','wv-cmp-arjana-era-trope','wv-crow-arjana-race','wv-cax-arjana-americas','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-race-orientalist','wv-cmp-arjana-era-trope','wv-crow-arjana-race','wv-cax-arjana-orientalist','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-race-sept11','wv-cmp-arjana-era-trope','wv-crow-arjana-race','wv-cax-arjana-sept11','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-sexualization-medieval','wv-cmp-arjana-era-trope','wv-crow-arjana-sexualization','wv-cax-arjana-medieval','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-sexualization-renaissance','wv-cmp-arjana-era-trope','wv-crow-arjana-sexualization','wv-cax-arjana-renaissance','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-sexualization-americas','wv-cmp-arjana-era-trope','wv-crow-arjana-sexualization','wv-cax-arjana-americas','1','intensity-1',json('{"intensity":1}')),
  ('wv-ccell-sexualization-orientalist','wv-cmp-arjana-era-trope','wv-crow-arjana-sexualization','wv-cax-arjana-orientalist','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-sexualization-sept11','wv-cmp-arjana-era-trope','wv-crow-arjana-sexualization','wv-cax-arjana-sept11','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-sexuality-medieval','wv-cmp-arjana-era-trope','wv-crow-arjana-sexuality','wv-cax-arjana-medieval','1','intensity-1',json('{"intensity":1}')),
  ('wv-ccell-sexuality-renaissance','wv-cmp-arjana-era-trope','wv-crow-arjana-sexuality','wv-cax-arjana-renaissance','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-sexuality-americas','wv-cmp-arjana-era-trope','wv-crow-arjana-sexuality','wv-cax-arjana-americas','1','intensity-1',json('{"intensity":1}')),
  ('wv-ccell-sexuality-orientalist','wv-cmp-arjana-era-trope','wv-crow-arjana-sexuality','wv-cax-arjana-orientalist','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-sexuality-sept11','wv-cmp-arjana-era-trope','wv-crow-arjana-sexuality','wv-cax-arjana-sept11','1','intensity-1',json('{"intensity":1}')),
  ('wv-ccell-gender-medieval','wv-cmp-arjana-era-trope','wv-crow-arjana-gender','wv-cax-arjana-medieval','1','intensity-1',json('{"intensity":1}')),
  ('wv-ccell-gender-renaissance','wv-cmp-arjana-era-trope','wv-crow-arjana-gender','wv-cax-arjana-renaissance','1','intensity-1',json('{"intensity":1}')),
  ('wv-ccell-gender-americas','wv-cmp-arjana-era-trope','wv-crow-arjana-gender','wv-cax-arjana-americas','1','intensity-1',json('{"intensity":1}')),
  ('wv-ccell-gender-orientalist','wv-cmp-arjana-era-trope','wv-crow-arjana-gender','wv-cax-arjana-orientalist','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-gender-sept11','wv-cmp-arjana-era-trope','wv-crow-arjana-gender','wv-cax-arjana-sept11','3','intensity-3',json('{"intensity":3}')),
  ('wv-ccell-civilization-medieval','wv-cmp-arjana-era-trope','wv-crow-arjana-civilization','wv-cax-arjana-medieval','1','intensity-1',json('{"intensity":1}')),
  ('wv-ccell-civilization-renaissance','wv-cmp-arjana-era-trope','wv-crow-arjana-civilization','wv-cax-arjana-renaissance','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-civilization-americas','wv-cmp-arjana-era-trope','wv-crow-arjana-civilization','wv-cax-arjana-americas','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-civilization-orientalist','wv-cmp-arjana-era-trope','wv-crow-arjana-civilization','wv-cax-arjana-orientalist','2','intensity-2',json('{"intensity":2}')),
  ('wv-ccell-civilization-sept11','wv-cmp-arjana-era-trope','wv-crow-arjana-civilization','wv-cax-arjana-sept11','3','intensity-3',json('{"intensity":3}'));
