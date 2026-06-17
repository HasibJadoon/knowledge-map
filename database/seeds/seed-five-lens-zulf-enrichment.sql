-- Five-Lens curated entry enrichment — root ز ل ف (re_kmaps_zlf_zumar_3)
-- ----------------------------------------------------------------------------
-- Brings the kmaps_five_lens entry to full parity with the reference leaf:
-- adds the meta (sense + pattern + Arabic surah name) and hero-figure blocks,
-- the intratextual balagha ledger and the cross-corpus occurrence families
-- (both on existing blocks' data_json), and the Iʿrāb provenance column.
-- Display-only lexicon content (AL domain); idempotent.
--
-- Apply: wrangler d1 execute km_arabic_linguistic --remote \
--   --config workers/ar-linguistics/wrangler.toml \
--   --file database/seeds/seed-five-lens-zulf-enrichment.sql

-- Iʿrāb provenance (third "Rooted In" column)
INSERT OR REPLACE INTO ar_ling_lexicon_root_entry_sources (id, root_entry_id, source_kind, source_slug) VALUES
 ('rs_kmaps_zlf_irab_1','re_kmaps_zlf_zumar_3','irab','qul_irab_muyassar'),
 ('rs_kmaps_zlf_irab_2','re_kmaps_zlf_zumar_3','irab','qul_jadwal_irab_quran'),
 ('rs_kmaps_zlf_irab_3','re_kmaps_zlf_zumar_3','irab','qul_irab_quran_daas'),
 ('rs_kmaps_zlf_irab_4','re_kmaps_zlf_zumar_3','irab','tibyan_ukbari_irab');

-- Meta (sense + pattern + Arabic surah name) and hero figure (root-image caption)
INSERT OR REPLACE INTO ar_ling_lexicon_blocks
 (id, source_slug, root_entry_id, root_norm, block_path, block_seq, depth, block_type, lang, text_html, data_json, origin) VALUES
 ('blk_kmaps_zlf_meta','kmaps_five_lens','re_kmaps_zlf_zumar_3','زلف','/meta',0,0,'meta','en',NULL,
   '{"sense":"nearness as elevated standing","pattern":"فُعْلَىٰ","surah_name_ar":"سورة الزُّمَر"}','kmaps_synthesis'),
 ('blk_kmaps_zlf_figure','kmaps_five_lens','re_kmaps_zlf_zumar_3','زلف','/figure',8,0,'figure','en',
   '<p><em>Ibn Fāris · Maqāyīs al-Lugha</em>: the root is <span dir="rtl" lang="ar">اندفاعٌ وتقدُّمٌ في قُرْبٍ</span> — a propelling-forward, an advance toward a thing by degrees. Whence <span dir="rtl" lang="ar">زُلَف الليل</span> (the night''s advancing watches) and <span dir="rtl" lang="ar">المُزْدَلِفة</span>.</p>',
   '{"label":"The Root Image · ز ل ف"}','kmaps_synthesis');

-- Balagha intratextual ledger (claimed vs. granted)
UPDATE ar_ling_lexicon_blocks SET data_json='{"lens":"balagha","sources":["ibn_atiyya","tabari","ibn_kathir"],"ledger":{"claimed":{"tier":"Claimed · مَزْعُومة","word":"زُلْفَىٰ","case":"accusative — object of the verb","role":"the idols'' alleged power to bring near","chips":["39:3","34:37"]},"granted":{"tier":"Granted · مُحقَّقة","word":"لَزُلْفَىٰ","case":"nominative — predicate of inna, with emphatic lām","role":"the rank truly held by Dāwūd & Sulaymān","chips":["38:25","38:40"]},"note":"Same word — the case tracks the truth. Idols cannot confer zulfā; the prophets possess it."}}'
 WHERE root_entry_id='re_kmaps_zlf_zumar_3' AND block_type='lens' AND title_ar='بلاغة';

-- Cross-corpus occurrence families (Arabic headings + glosses)
UPDATE ar_ling_lexicon_blocks SET data_json='{"refs":["34:37","38:25","38:40","11:114","26:90","50:31"],"families":[{"headingAr":"زُلْفَىٰ","gloss":"the فُعْلَىٰ noun — nearness / rank","refs":["34:37","38:25","38:40","39:3"]},{"headingAr":"زُلْفَة","gloss":"the فُعْلَة noun — a near portion / station (زُلَف الليل)","refs":["11:114","67:27"]},{"headingAr":"أُزْلِفَتْ","gloss":"Form IV verb — brought near (Paradise / the Fire)","refs":["26:64","26:90","50:31","81:13"]}]}'
 WHERE root_entry_id='re_kmaps_zlf_zumar_3' AND block_type='xref';

-- Range of meaning (semantic spectrum of the root)
INSERT OR REPLACE INTO ar_ling_lexicon_blocks
 (id, source_slug, root_entry_id, root_norm, block_path, block_seq, depth, block_type, lang, text_html, data_json, origin) VALUES
 ('blk_kmaps_zlf_meaning','kmaps_five_lens','re_kmaps_zlf_zumar_3','زلف','/meaning',9,0,'meaning','en',NULL,
  '{"senses":[{"ar":"قُرْبة","en":"nearness, closeness"},{"ar":"دَرَجة","en":"degree, gradation"},{"ar":"مَنزِلة","en":"rank, station"},{"ar":"حُظْوة","en":"favour, high standing"},{"ar":"زُلْفة","en":"a near portion — زُلَف الليل, the night''s watches"},{"ar":"مَراقٍ","en":"ascents — al-mazālif"}]}','kmaps_synthesis');

-- Derivation table (sarf: past / present / verbal-noun across the forms) and
-- the Membean-style memory hook (mnemonic + English anchors + retrieval cue)
INSERT OR REPLACE INTO ar_ling_lexicon_blocks
 (id, source_slug, root_entry_id, root_norm, block_path, block_seq, depth, block_type, lang, text_html, data_json, origin) VALUES
 ('blk_kmaps_zlf_derivation','kmaps_five_lens','re_kmaps_zlf_zumar_3','زلف','/derivation',10,0,'sarf','en',NULL,
  '{"note":"One root, four motions — the sense of drawing near runs through every form.","forms":[{"form":"I","wazn":"فَعَلَ","past":"زَلَفَ","present":"يَزْلِفُ","masdar":"زُلْفَة · زَلْف","gloss":"to draw near, advance"},{"form":"IV","wazn":"أَفْعَلَ","past":"أَزْلَفَ","present":"يُزْلِفُ","masdar":"إِزْلاف","gloss":"to bring (something) near — أُزْلِفَتِ الجنّة"},{"form":"V","wazn":"تَفَعَّلَ","past":"تَزَلَّفَ","present":"يَتَزَلَّفُ","masdar":"تَزَلُّف","gloss":"to seek nearness, ingratiate — مُتَزَلِّفِين"},{"form":"VIII","wazn":"اِفْتَعَلَ","past":"اِزْدَلَفَ","present":"يَزْدَلِفُ","masdar":"اِزْدِلاف","gloss":"to approach by degrees — المُزْدَلِفة"}],"keyword":{"word":"زُلْفَىٰ","pattern":"فُعْلَىٰ","kind":"اسم مصدر · ism maṣdar","gloss":"the noun of nearness-as-rank"}}','kmaps_synthesis'),
 ('blk_kmaps_zlf_retention','kmaps_five_lens','re_kmaps_zlf_zumar_3','زلف','/retention',11,0,'retention','en',NULL,
  '{"hook":"Hear <strong>zulfā</strong> in <em>zeal</em>ous: the root is a forward thrust — an eager advance into nearness. Picture a courtier stepping zealously toward the throne, <em>brought near into rank</em> — not merely standing close.","anchors":[{"en":"rapprochement","note":"a drawing-near"},{"en":"approximate","note":"to bring near"},{"en":"eminence","note":"nearness as standing"},{"en":"ingratiate","note":"to seek nearness — تَزَلُّف"},{"en":"precincts","note":"the near approaches — المُزْدَلِفة"}],"contrast":"Near ≠ zulfā. Mere proximity is qurb; zulfā is proximity that confers rank.","retrieval":"Meet أُزْلِفَتِ الجنّة (50:31) — feel the Garden brought near: the same root drawing two parties close."}','kmaps_synthesis');

-- Word constellation: unique derived words of the root, each with its range of
-- English meaning (words from the lemma family; glosses from the lexica).
INSERT OR REPLACE INTO ar_ling_lexicon_blocks
 (id, source_slug, root_entry_id, root_norm, block_path, block_seq, depth, block_type, lang, text_html, data_json, origin) VALUES
 ('blk_kmaps_zlf_constellation','kmaps_five_lens','re_kmaps_zlf_zumar_3','زلف','/constellation',12,0,'constellation','en',NULL,
  '{"nodes":[{"ar":"زُلْفَىٰ","en":"nearness; high standing; rank","isQuran":true},{"ar":"زُلْفَة","en":"a near station; a watch of the night","isQuran":true},{"ar":"أُزْلِفَتْ","en":"was brought near (Paradise / the Fire)","isQuran":true},{"ar":"زَلَفَ","en":"to draw near; to advance","isQuran":false},{"ar":"أَزْلَفَ","en":"to bring near; to gather","isQuran":false},{"ar":"تَزَلَّفَ","en":"to seek nearness; to ingratiate","isQuran":false},{"ar":"اِزْدَلَفَ","en":"to approach by degrees","isQuran":false},{"ar":"مَزْلَفَة","en":"a frontier town (desert–sown)","isQuran":false},{"ar":"زَلِيف","en":"advancing; going forward","isQuran":false},{"ar":"مُزْدَلِفة","en":"the place of drawing near","isQuran":false}]}','kmaps_synthesis');
