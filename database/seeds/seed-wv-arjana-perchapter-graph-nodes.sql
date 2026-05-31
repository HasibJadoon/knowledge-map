-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: per-chapter Era × Trope matrix + dual-register timeline graph nodes for
--       "Muslims in the Western Imagination" (Arjana 2015).
-- DB     : km_worldview
-- Why    : The matrix and timeline screens build entirely from wv_nodes scoped
--          to the viewed unit via /worldview/units/:id/annotations — rows are
--          trope nodes, columns are era nodes, and the column label is the era
--          node's data_json.short. Each chapter needs its OWN era + trope nodes.
-- Grounding: era-faithful — each chapter's eras + intensities are read from that
--          chapter's reading-session text, NOT cloned from the book summary.
--            • Ch.1 "The Muslim Monster" (pp. 8–18): theory/framing chapter
--              (Orientalism, monster theory, Foucault/Bourdieu, the gendered
--              double image). Tropes span the whole genealogy → all 5 eras,
--              dehumanization + alterity as master tropes, Orientalist
--              racialization/eroticisation, modern "Terror TV" civilization threat.
--            • Ch.2 "Medieval Muslim Monsters" (pp. 19–57): entirely the medieval
--              era → only the Medieval + (boundary) Renaissance eras, intensity
--              concentrated in Medieval; timeline runs 622 Rise of Islam → 1453
--              Fall of Constantinople.
-- Scope  : chapters that currently have reading text — ch1, ch2. (ch3-ch6 are
--          intentionally NOT built yet; they have no chapter text.) Idempotent.
-- ═══════════════════════════════════════════════════════════════════════════


-- ===================== Chapter 1 — whole-genealogy framing =====================

-- ── ch1: eras (full arc — the framing chapter spans the whole genealogy) ──
INSERT OR REPLACE INTO wv_nodes (id, node_type, title, summary, data_json) VALUES
 ('node-arjana-ch1-era-medieval','era','Medieval (8th-15th c.)','','{"slug":"ch1-era-medieval","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","era":"medieval","short":"Medieval","cluster":"arjana-eras","cluster_title":"Eras / Timeline","year_start":700,"year_end":1500,"order_index":1,"incidents":[{"year":622,"title":"Rise of Islam","kind":"spine"},{"year":800,"title":"First Muslim monsters in Christian texts","kind":"spine"}]}'),
 ('node-arjana-ch1-era-renaissance','era','Renaissance / Elizabethan','','{"slug":"ch1-era-renaissance","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","era":"renaissance","short":"Renaiss.","cluster":"arjana-eras","cluster_title":"Eras / Timeline","year_start":1450,"year_end":1650,"order_index":2,"incidents":[{"year":1453,"title":"Fall of Constantinople","kind":"spine"}]}'),
 ('node-arjana-ch1-era-americas','era','The Americas / colonial','','{"slug":"ch1-era-americas","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","era":"americas","short":"Americas","cluster":"arjana-eras","cluster_title":"Eras / Timeline","year_start":1492,"year_end":1800,"order_index":3,"incidents":[{"year":1492,"title":"Conquest of the Americas","kind":"spine"},{"year":1785,"title":"Barbary corsair panic","kind":"spine"}]}'),
 ('node-arjana-ch1-era-orientalist','era','Orientalism & Gothic (18th-19th c.)','','{"slug":"ch1-era-orientalist","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","era":"orientalist","short":"Orient.","cluster":"arjana-eras","cluster_title":"Eras / Timeline","year_start":1700,"year_end":1900,"order_index":4,"incidents":[{"year":1798,"title":"Napoleon in Egypt: Orientalism as discipline","kind":"spine"},{"year":1897,"title":"Dracula: the mobile Gothic monster","kind":"spine"}]}'),
 ('node-arjana-ch1-era-sept11','era','September 11 & after','','{"slug":"ch1-era-sept11","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","era":"sept11","short":"9/11 +","cluster":"arjana-eras","cluster_title":"Eras / Timeline","year_start":2001,"year_end":2010,"order_index":5,"incidents":[{"year":2001,"title":"September 11 attacks","kind":"modern"},{"year":2004,"title":"Abu Ghraib photographs","kind":"modern"},{"year":2006,"title":"Terror TV: the Islamic-threat market","kind":"modern"}]}');

-- ── ch1: tropes — emphasis read from the framing chapter ──
INSERT OR REPLACE INTO wv_nodes (id, node_type, title, summary, data_json) VALUES
 ('node-arjana-ch1-trope-dehumanization','trope','Dehumanization','','{"slug":"ch1-trope-dehumanization","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":3,"renaissance":2,"americas":2,"orientalist":3,"sept11":3}}'),
 ('node-arjana-ch1-trope-alterity','trope','Alterity / permanent foreigner','The Muslim as intrinsically Other, a permanent foreigner who cannot belong.','{"slug":"ch1-trope-alterity","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":3,"renaissance":2,"americas":2,"orientalist":3,"sept11":3}}'),
 ('node-arjana-ch1-trope-race','trope','Race / racialization','','{"slug":"ch1-trope-race","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":2,"renaissance":1,"americas":2,"orientalist":3,"sept11":2}}'),
 ('node-arjana-ch1-trope-sexualization','trope','Sexualization','Sexual fantasy running from Muhammad''s supposed energy to Dracula''s necrophilia to Abu Ghraib.','{"slug":"ch1-trope-sexualization","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":1,"renaissance":2,"americas":1,"orientalist":3,"sept11":2}}'),
 ('node-arjana-ch1-trope-gender','trope','Gender','','{"slug":"ch1-trope-gender","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":1,"renaissance":1,"americas":1,"orientalist":2,"sept11":3}}'),
 ('node-arjana-ch1-trope-religion','trope','Religion as threat','','{"slug":"ch1-trope-religion","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":2,"renaissance":2,"americas":2,"orientalist":2,"sept11":3}}'),
 ('node-arjana-ch1-trope-civilization','trope','Threat to civilization / modernity','Muslims framed as interruptions to normative humanity, civilization, and modernity.','{"slug":"ch1-trope-civilization","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch1","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":1,"renaissance":1,"americas":1,"orientalist":2,"sept11":3}}');


-- ===================== Chapter 2 — medieval era only =====================

-- Remove any non-medieval era nodes from an earlier book-level clone of ch2.
DELETE FROM wv_nodes WHERE id IN (
  'node-arjana-ch2-era-americas',
  'node-arjana-ch2-era-orientalist',
  'node-arjana-ch2-era-sept11'
);

-- ── ch2: eras — only the medieval era + the Renaissance boundary it closes on ──
INSERT OR REPLACE INTO wv_nodes (id, node_type, title, summary, data_json) VALUES
 ('node-arjana-ch2-era-medieval','era','Medieval (8th-15th c.)','','{"slug":"ch2-era-medieval","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch2","era":"medieval","short":"Medieval","cluster":"arjana-eras","cluster_title":"Eras / Timeline","year_start":700,"year_end":1500,"order_index":1,"incidents":[{"year":622,"title":"Rise of Islam","kind":"spine"},{"year":730,"title":"First Christian polemics cast Islam as heresy","kind":"spine"},{"year":1100,"title":"Guibert of Nogent: the death-of-Muhammad polemic","kind":"spine"},{"year":1187,"title":"Saladin praised as a generous Saracen","kind":"spine"}]}'),
 ('node-arjana-ch2-era-renaissance','era','Renaissance / Elizabethan','','{"slug":"ch2-era-renaissance","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch2","era":"renaissance","short":"Renaiss.","cluster":"arjana-eras","cluster_title":"Eras / Timeline","year_start":1450,"year_end":1650,"order_index":2,"incidents":[{"year":1453,"title":"Fall of Constantinople: the Turk shifts the cast of monsters","kind":"spine"}]}');

-- ── ch2: tropes — intensity concentrated in the medieval column ──
INSERT OR REPLACE INTO wv_nodes (id, node_type, title, summary, data_json) VALUES
 ('node-arjana-ch2-trope-religion','trope','Religion as threat','','{"slug":"ch2-trope-religion","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch2","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":3,"renaissance":1}}'),
 ('node-arjana-ch2-trope-dehumanization','trope','Dehumanization','','{"slug":"ch2-trope-dehumanization","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch2","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":3,"renaissance":1}}'),
 ('node-arjana-ch2-trope-alterity','trope','Alterity / permanent foreigner','The Muslim as intrinsically Other, a permanent foreigner who cannot belong.','{"slug":"ch2-trope-alterity","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch2","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":3,"renaissance":1}}'),
 ('node-arjana-ch2-trope-race','trope','Race / racialization','','{"slug":"ch2-trope-race","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch2","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":3,"renaissance":1}}'),
 ('node-arjana-ch2-trope-sexualization','trope','Sexualization','Sexual fantasy running from Muhammad''s supposed energy to Dracula''s necrophilia to Abu Ghraib.','{"slug":"ch2-trope-sexualization","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch2","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":3,"renaissance":0}}'),
 ('node-arjana-ch2-trope-gender','trope','Gender','','{"slug":"ch2-trope-gender","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch2","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":2,"renaissance":0}}'),
 ('node-arjana-ch2-trope-civilization','trope','Threat to civilization / modernity','Muslims framed as interruptions to normative humanity, civilization, and modernity.','{"slug":"ch2-trope-civilization","source_id":"src-arjana-muslims-western-imagination-2015","source_unit_id":"sru-arjana-mwi-ch2","cluster":"arjana-tropes","cluster_title":"Tropes & Anxieties","era_intensity":{"medieval":1,"renaissance":0}}');
