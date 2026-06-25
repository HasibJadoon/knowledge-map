-- Qur'anic vocabulary backbone — worked example: root ز ل ف (زلف).
-- End-to-end Membean-style card grounded in the Qur'an + Lisan al-Arab.
--   AL (km_arabic_linguistic): canonical content (senses, sarf, hooks,
--     illustration, constellation diagram, exercises, scholarship, Quran links).
--   AR (km_arabic): per-user/per-workspace learner state (deck + cards + progress).
-- Apply AL section to km_arabic_linguistic, AR section to km_arabic.
-- Root id: 0baf6c03467789372b03d035d5  |  Senses: S1 rank-nearness (39:3),
--   S2 brought-near (26:90), S3 night-portions (11:114), S4 near-at-hand (67:27).

-- ============================== AL (km_arabic_linguistic) ==============================

-- Lexicon entry (parent for senses) + core meaning on the root.
INSERT OR REPLACE INTO ar_ling_lexicon_entries (id, lemma_id, entry_text, definition_ar, definition_en, definition_source, root_id, source_id, entry_kind, status)
VALUES ('LEXE:زلف:main','LEM:LEX:زلف','زلف','أصلٌ يدلُّ على القُرْب والتقدُّم والمنزلة','Root sense: nearness, advancing forward, and elevated standing; yields zulfa / zulfaa (rank-nearness) and zulaf al-layl (portions of the night).','Lisan al-Arab','0baf6c03467789372b03d035d5','SRC:KETABONLINE:LISAN_AL_ARAB','root_summary','curated');

UPDATE ar_ling_roots SET meaning_core_en='nearness, advancing forward, and elevated standing/rank', meaning_core_ar='القُرب والتقدُّم والمنزلة', updated_at=datetime('now') WHERE id='0baf6c03467789372b03d035d5';

-- Four Qur'anic senses.
INSERT OR REPLACE INTO ar_ling_senses (id, lexicon_entry_id, sense_number, gloss_ar, gloss_en, context_note, qr_ref, note_md) VALUES
('SEN:زلف:1','LEXE:زلف:main',1,'القُرب والمنزلة والحُظوة، خاصةً عند الله','nearness as elevated rank/standing (especially before God), not mere physical proximity','زُلْفَىٰ','QR:39:3','Also 34:37, 38:25, 38:40.'),
('SEN:زلف:2','LEXE:زلف:main',2,'التقريب والإدناء؛ أُزلِفت الجنّة: قُرِّبت','to be brought near / to bring near (e.g., the Garden brought near to the righteous)','أُزْلِفَت','QR:26:90','Also 50:31, 81:13; 26:64 (the others brought near to the sea).'),
('SEN:زلف:3','LEXE:زلف:main',3,'زُلَف الليل: ساعاتُه وأقرابُه الأولى','portions / approaches of the night, its early hours','زُلَفًا مِنَ اللَّيْلِ','QR:11:114','Plural of zulfa.'),
('SEN:زلف:4','LEXE:زلف:main',4,'القُرب الحِسّي أو الزماني؛ زُلْفَة: قريبًا حاضرًا','nearness at hand (concrete spatial / temporal closeness)','زُلْفَة','QR:67:27','The punishment seen near at hand.');

INSERT OR REPLACE INTO ar_ling_sense_relations (id, from_sense_id, to_sense_id, relation_type, nuance_note) VALUES
('SR:زلف:4-1','SEN:زلف:4','SEN:زلف:1','sense_extension','Concrete nearness-at-hand (S4) is the base; rank-nearness before God (S1) is its elevated extension.'),
('SR:زلف:2-1','SEN:زلف:2','SEN:زلف:1','entails','Being brought near (S2) realizes the standing of nearness (S1).'),
('SR:زلف:3-4','SEN:زلف:3','SEN:زلف:4','related','Night-portions (S3) are the hours that draw near — temporal sense of proximity (S4).');

-- Sarf: Form I and Form IV paradigms + conjugation templates.
INSERT OR REPLACE INTO ar_ling_form_paradigms (id, paradigm_name, paradigm_type, verb_form, root_type, paradigm_json, note_md) VALUES
('PAR:زلف:I','زَلَفَ (Form I)','verb','I','sound','{"past":"زَلَفَ","present":"يَزْلِفُ","masdar":["زَلْف","زُلْفَة","زُلْفَى"],"meaning":"to draw near, advance forward"}','Base form.'),
('PAR:زلف:IV','أَزْلَفَ (Form IV)','verb','IV','sound','{"past":"أَزْلَفَ","present":"يُزْلِفُ","masdar":"إِزْلَاف","passive_past":"أُزْلِفَ","meaning":"to bring near, cause to approach"}','Causative. Quran passive: أُزْلِفَتِ الجنّة (26:90, 50:31, 81:13).');

INSERT OR REPLACE INTO ar_ling_conjugation_templates (id, paradigm_id, person, tense, voice, template_form, note_md) VALUES
('CJ:زلف:I:past','PAR:زلف:I','3ms','past','active','زَلَفَ',NULL),
('CJ:زلف:I:pres','PAR:زلف:I','3ms','present','active','يَزْلِفُ',NULL),
('CJ:زلف:I:masdar','PAR:زلف:I','-','masdar','active','زُلْفَى',NULL),
('CJ:زلف:IV:past','PAR:زلف:IV','3ms','past','active','أَزْلَفَ',NULL),
('CJ:زلف:IV:pres','PAR:زلف:IV','3ms','present','active','يُزْلِفُ',NULL),
('CJ:زلف:IV:passive','PAR:زلف:IV','3fs','past','passive','أُزْلِفَتْ','As in أُزْلِفَتِ الجنّة.');

-- Scholarship gem (Lisan al-Arab).
INSERT OR REPLACE INTO ar_ling_root_scholarship (id, source_id, source_slug, root_id, root_norm, root_text, reading_kind, title_en, title_ar, body_md, status) VALUES
('SCH:زلف:lisan','SRC:KETABONLINE:LISAN_AL_ARAB','ketabonline_ibn_manzur_lisan_al_arab','0baf6c03467789372b03d035d5','زلف','زلف','lexical','Lisan al-Arab: root ز ل ف','لسان العرب: مادة ز ل ف','الزُّلْفَى: القُربة والمنزلة والدرجة؛ ومنه قوله تعالى: لِيُقَرِّبُونَا إِلَى اللَّهِ زُلْفَى. وزُلَفُ الليلِ: ساعاتُه وأقرابُه الأولى، الواحدة زُلْفَة. وأَزْلَفَ الشيءَ: قرَّبه؛ وأُزْلِفَتِ الجنّةُ: قُرِّبت. وازْدَلَفَ القومُ: اقتربوا، ومنه المُزْدَلِفة.','curated');

-- Quran occurrence links (root -> scope).
INSERT OR REPLACE INTO ar_ling_quran_links (id, al_entity_ref, al_entity_type, qr_scope_ref, link_type, note_md, confidence) VALUES
('QL:زلف:39:3','0baf6c03467789372b03d035d5','root','QR:39:3','attests','زُلْفَىٰ (S1)',1.0),
('QL:زلف:34:37','0baf6c03467789372b03d035d5','root','QR:34:37','attests','تُقَرِّبُكُمْ عِندَنَا زُلْفَىٰ (S1)',1.0),
('QL:زلف:38:25','0baf6c03467789372b03d035d5','root','QR:38:25','attests','Dawud — لَزُلْفَىٰ (S1)',1.0),
('QL:زلف:38:40','0baf6c03467789372b03d035d5','root','QR:38:40','attests','Sulayman — لَزُلْفَىٰ (S1)',1.0),
('QL:زلف:26:90','0baf6c03467789372b03d035d5','root','QR:26:90','attests','وَأُزْلِفَتِ الْجَنَّةُ لِلْمُتَّقِينَ (S2)',1.0),
('QL:زلف:50:31','0baf6c03467789372b03d035d5','root','QR:50:31','attests','وَأُزْلِفَتِ الْجَنَّةُ (S2)',1.0),
('QL:زلف:81:13','0baf6c03467789372b03d035d5','root','QR:81:13','attests','وَإِذَا الْجَنَّةُ أُزْلِفَتْ (S2)',1.0),
('QL:زلف:26:64','0baf6c03467789372b03d035d5','root','QR:26:64','attests','وَأَزْلَفْنَا ثَمَّ الْآخَرِينَ (S2)',1.0),
('QL:زلف:11:114','0baf6c03467789372b03d035d5','root','QR:11:114','attests','وَزُلَفًا مِّنَ اللَّيْلِ (S3)',1.0),
('QL:زلف:67:27','0baf6c03467789372b03d035d5','root','QR:67:27','attests','فَلَمَّا رَأَوْهُ زُلْفَةً (S4)',1.0);

-- Memory hooks (root + senses).
INSERT OR REPLACE INTO ar_ling_vocab_memory_hooks (id, root_norm, sense_id, scope_type, hook_kind, hook_md, anchor_word, source_ref, status) VALUES
('HOOK:زلف:root','زلف',NULL,'root','sound','Hear zulfaa in *zeal*ous: an eager advance into nearness — a courtier brought near into rank, not merely standing close.','zealous',NULL,'live'),
('HOOK:زلف:s1','زلف','SEN:زلف:1','sense','meaning','A courtier ushered to the front row before the throne — zulfaa is rank-nearness, the privileged step toward the King, not plain proximity.','zealous','QR:39:3','live'),
('HOOK:زلف:s3','زلف','SEN:زلف:3','sense','meaning','Zulaf of the night = the night drawing its folds near — the early hours that step toward dawn, when prayer is due.','folds','QR:11:114','live');

-- Illustration + constellation diagram.
INSERT OR REPLACE INTO ar_ling_vocab_illustrations (id, root_norm, sense_id, scope_type, media_kind, illustration_key, title, caption_md, palette, status) VALUES
('ILL:زلف:ascent-courtier','زلف','SEN:زلف:1','root','svg','ascent-courtier','Ascent / courtier brought near','A figure ascending steps toward a throne, each step a darajah — zulfaa as elevated standing, the advance into rank.','royal-indigo','live');

INSERT OR REPLACE INTO ar_ling_vocab_diagrams (id, root_norm, diagram_kind, diagram_key, title, spec_json, renderer_key, status) VALUES
('DIAG:زلف:constellation','زلف','constellation','zulf-constellation','زلف constellation: nearness as rank','{"center":"زلف — nearness/advance/rank","senses":[{"id":"S1","label":"زُلْفَىٰ rank-nearness","ref":"39:3"},{"id":"S2","label":"أُزْلِفَت brought-near","ref":"26:90"},{"id":"S3","label":"زُلَف الليل night-portions","ref":"11:114"},{"id":"S4","label":"زُلْفَة near-at-hand","ref":"67:27"}],"near_synonyms":["قُرْب","دَرَجَة","مَنْزِلَة","حُظْوَة"],"antonyms":["بُعْد","قَصْوَى"]}','constellation-v1','live');

UPDATE ar_ling_root_vocab SET diagram_key='zulf-constellation', updated_at=datetime('now') WHERE root_norm='زلف';

-- Exercise bank (varied retrieval).
INSERT OR REPLACE INTO ar_ling_vocab_exercises (id, root_norm, sense_id, scope_type, exercise_kind, prompt_md, options_json, answer_key, qr_ref, difficulty, source_ref, status) VALUES
('EX:زلف:def1','زلف','SEN:زلف:1','sense','def_mcq','In 39:3 (لِيُقَرِّبُونَا إِلَى اللَّهِ زُلْفَىٰ), what does زُلْفَىٰ mean?','["mere physical closeness","nearness as elevated rank/standing","intercession on the Day","ritual worship"]','nearness as elevated rank/standing','QR:39:3',2,NULL,'live'),
('EX:زلف:cloze1','زلف','SEN:زلف:3','sense','cloze','Fill the blank (11:114): وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَ____ مِّنَ اللَّيْلِ','["زُلَفًا","زُخْرُفًا","زُمَرًا","زَلَلًا"]','زُلَفًا','QR:11:114',3,NULL,'live'),
('EX:زلف:syn1','زلف','SEN:زلف:1','sense','synonym','Closest sense-synonym of زُلْفَىٰ?','["بُعْد","قُرْبَة ومَنْزِلَة","عَداوة","غَفْلة"]','قُرْبَة ومَنْزِلَة',NULL,2,NULL,'live'),
('EX:زلف:ant1','زلف','SEN:زلف:1','sense','antonym','Which word is the opposite of زُلْفَىٰ (nearness/rank)?','["قُرْب","دَرَجة","بُعْد","حُظْوة"]','بُعْد',NULL,2,NULL,'live'),
('EX:زلف:sarf1','زلف','SEN:زلف:2','sense','sarf','أُزْلِفَتِ الْجَنَّةُ (26:90) is the passive of which verb form?','["Form I زَلَفَ","Form IV أَزْلَفَ","Form VIII اِزْدَلَفَ","Form V تَزَلَّفَ"]','Form IV أَزْلَفَ','QR:26:90',3,NULL,'live'),
('EX:زلف:spell1','زلف','SEN:زلف:4','sense','spelling','Write the word in 67:27 meaning near at hand (فَلَمَّا رَأَوْهُ ____):','["زُلْفَة"]','زُلْفَة','QR:67:27',2,NULL,'live');

-- ================================== AR (km_arabic) ==================================

INSERT OR REPLACE INTO ar_qr_vocab_decks (id, workspace_id, surah, passage_id, passage_ref, title, note_md) VALUES
('DECK:WS1:S39:P1',1,39,'S39:P1','QR:39:1-39:5','Az-Zumar — Passage 1 (39:1-5)','First ruku of Surah az-Zumar; introduces زلف (زُلْفَىٰ) at 39:3.');

INSERT OR REPLACE INTO ar_qr_vocab_cards (id, workspace_id, core_user_ref, deck_id, vocab_scope, vocab_ref, root_norm, al_root_ref, introduced_surah, introduced_ayah, introduced_word_ref, card_state, mastery_state) VALUES
('CARD:WS1:demo:root:زلف',1,'CORE:user:demo','DECK:WS1:S39:P1','root','زلف','زلف','AL:0baf6c03467789372b03d035d5',39,3,'QR:39:3:w8','new','new'),
('CARD:WS1:demo:sense:SEN:زلف:1',1,'CORE:user:demo','DECK:WS1:S39:P1','sense','SEN:زلف:1','زلف','AL:0baf6c03467789372b03d035d5',39,3,'QR:39:3:w8','new','new'),
('CARD:WS1:demo:sense:SEN:زلف:2',1,'CORE:user:demo','DECK:WS1:S39:P1','sense','SEN:زلف:2','زلف','AL:0baf6c03467789372b03d035d5',26,90,'QR:26:90','new','new'),
('CARD:WS1:demo:sense:SEN:زلف:3',1,'CORE:user:demo','DECK:WS1:S39:P1','sense','SEN:زلف:3','زلف','AL:0baf6c03467789372b03d035d5',11,114,'QR:11:114','new','new'),
('CARD:WS1:demo:sense:SEN:زلف:4',1,'CORE:user:demo','DECK:WS1:S39:P1','sense','SEN:زلف:4','زلف','AL:0baf6c03467789372b03d035d5',67,27,'QR:67:27','new','new');

INSERT OR REPLACE INTO ar_qr_vocab_progress (id, workspace_id, core_user_ref, surah, passage_id, passage_ref, roots_total, roots_growing, roots_well_learned, last_studied_at) VALUES
('PROG:WS1:demo:S39:P1',1,'CORE:user:demo',39,'S39:P1','QR:39:1-39:5',1,0,0,NULL);
