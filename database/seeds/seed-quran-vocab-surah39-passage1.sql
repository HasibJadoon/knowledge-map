-- Qur'anic vocabulary backbone — Surah 39 (az-Zumar) Passage 1 (ayat 1-5).
-- Two-pass build:
--   Pass A (breadth): every content root in 39:1-5 registered as a backbone
--     card (core sense + Membean hook + first occurrence) + an AR learner card.
--   Pass B (depth): the passage keystone خلص (sincerity / exclusive devotion)
--     taken to full depth like زلف (see seed-quran-vocab-zulf.sql).
-- Function words / pronouns / relatives / demonstratives and the basics
-- بين، دون، كلّ are intentionally excluded. زلف is seeded separately.
-- Apply AL sections to km_arabic_linguistic, AR sections to km_arabic.

-- ============================== PASS A — breadth (AL) ==============================
INSERT OR REPLACE INTO ar_ling_root_vocab (root_norm, root_text, root_id, core_sense_en, core_sense_ar, membean_hook, status, first_surah, first_ayah) VALUES
('نزل','نزل','0d5ddad8b8e57c6cbe29034c20','sending down; revelation sent down in stages','الإنزال والتنزيل؛ نزول الوحي','Tanzil: the Book sent *down* — revelation descending stage by stage.','live',39,1),
('كتب','كتب','cb303790920fa750c588a8f5fd','writing; prescribing; a Book/decree','الكتابة والفرض؛ الكتاب','kitab = a written *writ* — what is inscribed, prescribed, decreed.','live',39,1),
('عزز','عزز','83c2254dbae68a1e8db2ca9a8e','might, honour, invincibility','العزّة والمنعة والغلبة','al-Aziz: prized *and* mighty — precious yet unconquerable.','live',39,1),
('حكم','حكم','06d23d1637d1e2fc08fe45af75','to judge/decide; wisdom','الحُكم والقضاء والحكمة','hukm = a wise *verdict* — to judge with wisdom (Hakim).','live',39,1),
('حقق','حقق','e1555949e69587d77b052af76e','truth, right, reality','الحقّ والثبوت واليقين','haqq = the *real right* — truth and what is rightly due.','live',39,2),
('عبد','عبد','f675ef2819fab25b618226b288','to worship and serve','العبادة والتذلّل لله','abd = a servant *bonded* to his Lord in worship.','live',39,2),
('خلص','خلص','8300320eef02592cb41a0e12aa','purity, sincerity, unmixedness','الخلوص والإخلاص؛ الخالص','khalis = *cleared/pure* — devotion with no admixture (ikhlas).','live',39,2),
('دين','دين','650223ede6bde90c16a7891165','religion, devotion; recompense/judgment','الدِّين: الطاعة والجزاء','din = both a way of *devotion* and the day of *reckoning*.','live',39,2),
('اخذ','اخذ','d7c3c4cd15d8d6dfb9e2b67cdd','to take, seize; ittakhadha to adopt','الأخذ؛ اتّخذ: جعله لنفسه','akhadha = to seize; ittakhadha = to take for oneself.','live',39,3),
('ولي','ولي','c5aa282e38ec9e7d5cfeecffcd','nearness, allegiance; protector, ally','الولاية والقُرب؛ الوليّ','wali = a near *ally/patron* standing close by.','live',39,3),
('قرب','قرب','152946d213248e3535e1d038e2','nearness; to draw/bring near','القُرب والدنوّ؛ قرّب','qaruba = *proximity*; qarraba = to bring near (cf. zulfa).','live',39,3),
('خلف','خلف','da4f0406725bf557903f55e89c','to come after; to differ; succeed','الخَلْف والخِلاف والخلافة','khalafa = follow behind; ikhtalafa = to *diverge/dispute*.','live',39,3),
('هدي','هدي','4bcb8ce3bfd2fe8fd24c6cbcb5','guidance; to guide','الهداية والدلالة','hada = to *guide* along the way (huda).','live',39,3),
('كذب','كذب','64f772debbe3e3b8a7dab69b68','lying, falsehood','الكذب وضدّ الصدق','kadhaba = to lie; kadhib = a liar, the false.','live',39,3),
('كفر','كفر','27e3ef17b3bf46ca34f6169128','to cover/deny; disbelief, ingratitude','الكفر والستر وجحود النعمة','kafara = to *cover over* truth — disbelief and ingratitude.','live',39,3),
('رود','رود','b2c4ce9523c016778a9289209f','to seek, will, intend','الإرادة والطلب','arada = to *will/intend* — what one is set upon.','live',39,4),
('ولد','ولد','283b3755323e18af8f5220026e','to beget; child, offspring','الولادة؛ الولد','walad = a child begotten — God takes no walad.','live',39,4),
('صفو','صفو','3ca4558775cf30c063c7bc29e4','purity; to choose the best','الصفاء؛ اصطفى: اختار','istafa = to pick the *choicest*, pure-select.','live',39,4),
('خلق','خلق','adfa6a6358caf76a0afdd77e9e','to create, originate, shape','الخَلْق والإيجاد','khalaqa = to *create/shape* out of nothing.','live',39,4),
('شيا','شيا','7008229c32a0f67ef1cd84965c','to will; a thing','المشيئة؛ الشيء','shaa = to *will* — whatever He wills comes to be.','live',39,4),
('سبح','سبح','36d22c448afaeac6ab4797a4f9','to glorify; declare transcendence','التسبيح والتنزيه','subhan = *far removed* — glory beyond every flaw.','live',39,4),
('وحد','وحد','281a0d5245b0da3946c75eb83d','oneness; to be one','الوحدانية والتفرّد','wahid = *one alone* — sheer uniqueness.','live',39,4),
('قهر','قهر','0921e8c717a9f9ea7e777f17d5','to dominate, subdue','القهر والغلبة','Qahhar = *conquering* — the irresistible Subduer.','live',39,4),
('سمو','سمو','eddeb71cc6ce1ab2c6c2075ff3','height; heaven; (naming/appointing)','العلوّ؛ السماء؛ التسمية','samaa = the *high* heaven; musamman = a *named/fixed* term.','live',39,5),
('ارض','ارض','030125bba686cd3ff6ad7f3d67','earth, land','الأرض واليابسة','ard = the *earth* (terra) spread beneath.','live',39,5),
('كور','كور','13fccde8e79e027e098f5011ef','to wind, coil, wrap','التكوير: اللفّ والإدارة','kawwara = to *coil/wind* — night wound over day.','live',39,5),
('ليل','ليل','d2ffc3637c0444b67ca44fa7c7','night','الليل والظلام','layl = *night* — when the world lies low in dark.','live',39,5),
('نهر','نهر','1d1de235ce5100a6462d5e54c6','daytime; (also river)','النهار؛ النهر','nahar = broad *daytime* light.','live',39,5),
('سخر','سخر','53ba914f68fd67c82fb7161575','to subject, make subservient','التسخير والإخضاع','sakhkhara = to *harness/subject* — sun and moon pressed to serve.','live',39,5),
('شمس','شمس','52a2f378bf1140b6d5387a5f19','the sun','الشمس','shams = the *sun*, a shimmering blaze.','live',39,5),
('قمر','قمر','338a8c4b9502e790ab4df09871','the moon','القمر','qamar = the *moon* in its phases.','live',39,5),
('جري','جري','9c4814c2326ec657cf8a8dd42d','to run, flow, course','الجريان والسير','jara = to *run/flow* — each orb runs its course.','live',39,5),
('اجل','اجل','f6dd2709110d8882ee9f156580','a fixed term, appointed time','الأجل: المدة المضروبة','ajal = an *appointed* term, a set deadline.','live',39,5),
('غفر','غفر','765f5439c429ab304615af0af0','to cover, forgive','المغفرة والستر','ghafara = to *cover over* sins — the oft-Forgiving (Ghaffar).','live',39,5);

-- Backfill core meaning onto the canonical root rows.
UPDATE ar_ling_roots SET
  meaning_core_en=(SELECT rv.core_sense_en FROM ar_ling_root_vocab rv WHERE rv.root_id=ar_ling_roots.id),
  meaning_core_ar=(SELECT rv.core_sense_ar FROM ar_ling_root_vocab rv WHERE rv.root_id=ar_ling_roots.id),
  updated_at=datetime('now')
WHERE id IN (SELECT root_id FROM ar_ling_root_vocab WHERE first_surah=39 AND first_ayah BETWEEN 1 AND 5 AND root_id IS NOT NULL);

-- ============================== PASS B — depth: خلص (AL) ==============================
INSERT OR REPLACE INTO ar_ling_lexicon_entries (id, lemma_id, entry_text, definition_ar, definition_en, definition_source, root_id, source_id, entry_kind, status) VALUES
('LEXE:خلص:main','LEM:LEX:خلص','خلص','أصلٌ يدلُّ على تصفية الشيء وتنقيته من الشوب','Root sense: to clear/purify something of all admixture; yields ikhlas (sincere, exclusive devotion), khalis (pure, unmixed) and mukhlas (chosen and purified by God).','Lisan al-Arab','8300320eef02592cb41a0e12aa','SRC:KETABONLINE:LISAN_AL_ARAB','root_summary','curated');

INSERT OR REPLACE INTO ar_ling_senses (id, lexicon_entry_id, sense_number, gloss_ar, gloss_en, context_note, qr_ref, note_md) VALUES
('SEN:خلص:1','LEXE:خلص:main',1,'الإخلاص: إفرادُ اللهِ بالعبادة وتصفيةُ الدِّين له','sincerity; exclusive, unmixed devotion of religion to God alone (mukhlis)','مُخْلِصًا / الخالص','QR:39:2','The sura thesis: 39:3, 7:29, 98:5, 40:14.'),
('SEN:خلص:2','LEXE:خلص:main',2,'خَلَصَ: انفرد واعتزل وصار خالصًا؛ خَلَصُوا نَجِيًّا','to withdraw apart / become free and clear (e.g., they drew aside to confer)','خَلَصُوا','QR:12:80','Form I; the brothers withdrew to confer privately.'),
('SEN:خلص:3','LEXE:خلص:main',3,'المُخلَص: من اصطفاه اللهُ وطهّره وأخلصه لنفسه','mukhlas (passive): the servants whom God has chosen and purified','الْمُخْلَصِينَ','QR:38:83','12:24, 15:40, 37:40, 37:74, 37:128.'),
('SEN:خلص:4','LEXE:خلص:main',4,'الخالص: الصافي غيرُ المشوب؛ الخالصة: المختصّة بـ','khalis(ah): pure and unmixed; reserved exclusively for','خَالِصًا / خَالِصَةً','QR:16:66','Pure milk (16:66); 7:32; 33:50.');

INSERT OR REPLACE INTO ar_ling_sense_relations (id, from_sense_id, to_sense_id, relation_type, nuance_note) VALUES
('SR:خلص:1-4','SEN:خلص:1','SEN:خلص:4','related','Sincerity (S1) is religion made khalis/pure (S4) for God alone.'),
('SR:خلص:3-1','SEN:خلص:3','SEN:خلص:1','related','The mukhlas (S3, chosen/purified) are those whom God made mukhlis (S1).'),
('SR:خلص:2-4','SEN:خلص:2','SEN:خلص:4','sense_extension','Concrete withdrawing-apart / becoming-clear (S2) underlies the abstract pure-and-unmixed (S4).');

INSERT OR REPLACE INTO ar_ling_form_paradigms (id, paradigm_name, paradigm_type, verb_form, root_type, paradigm_json, note_md) VALUES
('PAR:خلص:I','خَلَصَ (Form I)','verb','I','sound','{"past":"خَلَصَ","present":"يَخْلُصُ","masdar":["خُلُوص","خَلَاص"],"meaning":"to be/become pure; to withdraw apart"}','Base form.'),
('PAR:خلص:IV','أَخْلَصَ (Form IV)','verb','IV','sound','{"past":"أَخْلَصَ","present":"يُخْلِصُ","masdar":"إِخْلَاص","active_participle":"مُخْلِص","passive_participle":"مُخْلَص","meaning":"to make pure/sincere; devote exclusively"}','Yields mukhlis (sincere) vs mukhlas (made sincere/chosen).'),
('PAR:خلص:X','اِسْتَخْلَصَ (Form X)','verb','X','sound','{"past":"اِسْتَخْلَصَ","present":"يَسْتَخْلِصُ","masdar":"اِسْتِخْلَاص","meaning":"to select exclusively for oneself"}','As in 12:54 astakhlishu li-nafsi.');

INSERT OR REPLACE INTO ar_ling_conjugation_templates (id, paradigm_id, person, tense, voice, template_form, note_md) VALUES
('CJ:خلص:I:past','PAR:خلص:I','3ms','past','active','خَلَصَ',NULL),
('CJ:خلص:I:pres','PAR:خلص:I','3ms','present','active','يَخْلُصُ',NULL),
('CJ:خلص:IV:past','PAR:خلص:IV','3ms','past','active','أَخْلَصَ',NULL),
('CJ:خلص:IV:pres','PAR:خلص:IV','3ms','present','active','يُخْلِصُ',NULL),
('CJ:خلص:IV:ap','PAR:خلص:IV','-','participle','active','مُخْلِص','one who is sincere'),
('CJ:خلص:IV:pp','PAR:خلص:IV','-','participle','passive','مُخْلَص','one made sincere/chosen'),
('CJ:خلص:X:past','PAR:خلص:X','3ms','past','active','اِسْتَخْلَصَ',NULL);

INSERT OR REPLACE INTO ar_ling_root_scholarship (id, source_id, source_slug, root_id, root_norm, root_text, reading_kind, title_en, title_ar, body_md, status) VALUES
('SCH:خلص:lisan','SRC:KETABONLINE:LISAN_AL_ARAB','ketabonline_ibn_manzur_lisan_al_arab','8300320eef02592cb41a0e12aa','خلص','خلص','lexical','Lisan al-Arab: root خ ل ص','لسان العرب: مادة خ ل ص','خَلَصَ الشيءُ خُلوصًا: صار خالصًا صافيًا لم يَشُبْه شيء. وأَخْلَصَ لله دينَه: ترك الرياء وأفرده له. والمُخْلَص: الذي أخلصه اللهُ واصطفاه. والخالص من الألوان: كلُّ لونٍ صافٍ. واسْتَخْلَصَه لنفسه: استخصّه. وضدُّ الإخلاص الشِّركُ والرياء.','curated');

INSERT OR REPLACE INTO ar_ling_quran_links (id, al_entity_ref, al_entity_type, qr_scope_ref, link_type, note_md, confidence) VALUES
('QL:خلص:39:2','8300320eef02592cb41a0e12aa','root','QR:39:2','attests','مُخْلِصًا لَّهُ الدِّينَ (S1)',1.0),
('QL:خلص:39:3','8300320eef02592cb41a0e12aa','root','QR:39:3','attests','لِلَّهِ الدِّينُ الْخَالِصُ (S1/S4)',1.0),
('QL:خلص:7:29','8300320eef02592cb41a0e12aa','root','QR:7:29','attests','مُخْلِصِينَ لَهُ الدِّينَ (S1)',1.0),
('QL:خلص:98:5','8300320eef02592cb41a0e12aa','root','QR:98:5','attests','مُخْلِصِينَ لَهُ الدِّينَ (S1)',1.0),
('QL:خلص:40:14','8300320eef02592cb41a0e12aa','root','QR:40:14','attests','مُخْلِصِينَ لَهُ الدِّينَ (S1)',1.0),
('QL:خلص:38:83','8300320eef02592cb41a0e12aa','root','QR:38:83','attests','عِبَادَكَ مِنْهُمُ الْمُخْلَصِينَ (S3)',1.0),
('QL:خلص:15:40','8300320eef02592cb41a0e12aa','root','QR:15:40','attests','الْمُخْلَصِينَ (S3)',1.0),
('QL:خلص:37:40','8300320eef02592cb41a0e12aa','root','QR:37:40','attests','عِبَادَ اللَّهِ الْمُخْلَصِينَ (S3)',1.0),
('QL:خلص:16:66','8300320eef02592cb41a0e12aa','root','QR:16:66','attests','لَّبَنًا خَالِصًا (S4)',1.0),
('QL:خلص:7:32','8300320eef02592cb41a0e12aa','root','QR:7:32','attests','خَالِصَةً يَوْمَ الْقِيَامَةِ (S4)',1.0),
('QL:خلص:12:80','8300320eef02592cb41a0e12aa','root','QR:12:80','attests','خَلَصُوا نَجِيًّا (S2)',1.0),
('QL:خلص:12:54','8300320eef02592cb41a0e12aa','root','QR:12:54','attests','أَسْتَخْلِصْهُ لِنَفْسِي (Form X)',1.0);

INSERT OR REPLACE INTO ar_ling_vocab_memory_hooks (id, root_norm, sense_id, scope_type, hook_kind, hook_md, anchor_word, source_ref, status) VALUES
('HOOK:خلص:root','خلص',NULL,'root','sound','khalis sounds like *cleanse / clear*: to clear a thing of every admixture — sincerity is devotion cleared of all but God.','cleanse',NULL,'live'),
('HOOK:خلص:s1','خلص','SEN:خلص:1','sense','meaning','mukhlis: religion run through a filter until only God remains — pure-poured devotion, the opposite of shirk.','filter','QR:39:2','live'),
('HOOK:خلص:s3','خلص','SEN:خلص:3','sense','meaning','mukhlas carries the passive a: not self-purified but *purified by God* — the chosen, drawn out like refined gold.','refined',NULL,'live');

INSERT OR REPLACE INTO ar_ling_vocab_illustrations (id, root_norm, sense_id, scope_type, media_kind, illustration_key, title, caption_md, palette, status) VALUES
('ILL:خلص:pure-pour','خلص','SEN:خلص:4','root','svg','khalis-pure-pour','Pure pour: milk clear of blood and dung','Pure milk pressed out from between refuse and blood (16:66) — khalis is the clear, unmixed essence; ikhlas pours devotion to God with nothing else mixed in.','clear-silver','live');

INSERT OR REPLACE INTO ar_ling_vocab_diagrams (id, root_norm, diagram_kind, diagram_key, title, spec_json, renderer_key, status) VALUES
('DIAG:خلص:constellation','خلص','constellation','khalis-constellation','خلص constellation: purity and exclusive devotion','{"center":"خلص — to clear/purify of admixture","senses":[{"id":"S1","label":"مُخْلِص sincerity","ref":"39:2"},{"id":"S2","label":"خَلَصُوا withdrew apart","ref":"12:80"},{"id":"S3","label":"مُخْلَص chosen/purified","ref":"38:83"},{"id":"S4","label":"خَالِص pure/unmixed","ref":"16:66"}],"near_synonyms":["صفو (اصطفى)","طُهْر","نقاء","صِدْق"],"antonyms":["شِرْك","رِياء","خَلْط/شَوْب"]}','constellation-v1','live');

UPDATE ar_ling_root_vocab SET diagram_key='khalis-constellation', illustration_key='khalis-pure-pour', updated_at=datetime('now') WHERE root_norm='خلص';

INSERT OR REPLACE INTO ar_ling_vocab_exercises (id, root_norm, sense_id, scope_type, exercise_kind, prompt_md, options_json, answer_key, qr_ref, difficulty, source_ref, status) VALUES
('EX:خلص:def1','خلص','SEN:خلص:1','sense','def_mcq','In 39:2 (فَاعْبُدِ اللَّهَ مُخْلِصًا لَّهُ الدِّينَ), what does مُخْلِصًا mean?','["fearing Him","devoting religion purely/exclusively to Him","obeying in public","seeking reward"]','devoting religion purely/exclusively to Him','QR:39:2',2,NULL,'live'),
('EX:خلص:cloze1','خلص','SEN:خلص:4','sense','cloze','Fill the blank (39:3): أَلَا لِلَّهِ الدِّينُ الْ____','["خَالِصُ","خَاشِعُ","خَالِدُ","حَاكِمُ"]','خَالِصُ','QR:39:3',2,NULL,'live'),
('EX:خلص:syn1','خلص','SEN:خلص:4','sense','synonym','Closest synonym of خَالِص (as of milk in 16:66)?','["مَشُوب","صافٍ نقيّ","حُلْو","كثير"]','صافٍ نقيّ','QR:16:66',2,NULL,'live'),
('EX:خلص:ant1','خلص','SEN:خلص:1','sense','antonym','What is the theological opposite of الإخلاص (exclusive devotion)?','["الصبر","الشِّرك والرياء","التوكّل","الزهد"]','الشِّرك والرياء',NULL,2,NULL,'live'),
('EX:خلص:sarf1','خلص','SEN:خلص:3','sense','sarf','الْمُخْلَصِينَ (38:83) is the passive participle of which verb form?','["Form I خَلَصَ","Form IV أَخْلَصَ","Form II خَلَّصَ","Form X اِسْتَخْلَصَ"]','Form IV أَخْلَصَ','QR:38:83',3,NULL,'live'),
('EX:خلص:spell1','خلص','SEN:خلص:2','sense','spelling','Write the verb in 12:80 meaning they withdrew apart (فَلَمَّا اسْتَيْأَسُوا مِنْهُ ____ نَجِيًّا):','["خَلَصُوا"]','خَلَصُوا','QR:12:80',3,NULL,'live');

-- ============================== AR — learner deck (km_arabic) ==============================
-- 34 breadth root cards (deck DECK:WS1:S39:P1, user demo).
INSERT OR REPLACE INTO ar_qr_vocab_cards (id, workspace_id, core_user_ref, deck_id, vocab_scope, vocab_ref, root_norm, al_root_ref, introduced_surah, introduced_ayah, card_state, mastery_state) VALUES
('CARD:WS1:demo:root:نزل',1,'CORE:user:demo','DECK:WS1:S39:P1','root','نزل','نزل','AL:0d5ddad8b8e57c6cbe29034c20',39,1,'new','new'),
('CARD:WS1:demo:root:كتب',1,'CORE:user:demo','DECK:WS1:S39:P1','root','كتب','كتب','AL:cb303790920fa750c588a8f5fd',39,1,'new','new'),
('CARD:WS1:demo:root:عزز',1,'CORE:user:demo','DECK:WS1:S39:P1','root','عزز','عزز','AL:83c2254dbae68a1e8db2ca9a8e',39,1,'new','new'),
('CARD:WS1:demo:root:حكم',1,'CORE:user:demo','DECK:WS1:S39:P1','root','حكم','حكم','AL:06d23d1637d1e2fc08fe45af75',39,1,'new','new'),
('CARD:WS1:demo:root:حقق',1,'CORE:user:demo','DECK:WS1:S39:P1','root','حقق','حقق','AL:e1555949e69587d77b052af76e',39,2,'new','new'),
('CARD:WS1:demo:root:عبد',1,'CORE:user:demo','DECK:WS1:S39:P1','root','عبد','عبد','AL:f675ef2819fab25b618226b288',39,2,'new','new'),
('CARD:WS1:demo:root:خلص',1,'CORE:user:demo','DECK:WS1:S39:P1','root','خلص','خلص','AL:8300320eef02592cb41a0e12aa',39,2,'new','new'),
('CARD:WS1:demo:root:دين',1,'CORE:user:demo','DECK:WS1:S39:P1','root','دين','دين','AL:650223ede6bde90c16a7891165',39,2,'new','new'),
('CARD:WS1:demo:root:اخذ',1,'CORE:user:demo','DECK:WS1:S39:P1','root','اخذ','اخذ','AL:d7c3c4cd15d8d6dfb9e2b67cdd',39,3,'new','new'),
('CARD:WS1:demo:root:ولي',1,'CORE:user:demo','DECK:WS1:S39:P1','root','ولي','ولي','AL:c5aa282e38ec9e7d5cfeecffcd',39,3,'new','new'),
('CARD:WS1:demo:root:قرب',1,'CORE:user:demo','DECK:WS1:S39:P1','root','قرب','قرب','AL:152946d213248e3535e1d038e2',39,3,'new','new'),
('CARD:WS1:demo:root:خلف',1,'CORE:user:demo','DECK:WS1:S39:P1','root','خلف','خلف','AL:da4f0406725bf557903f55e89c',39,3,'new','new'),
('CARD:WS1:demo:root:هدي',1,'CORE:user:demo','DECK:WS1:S39:P1','root','هدي','هدي','AL:4bcb8ce3bfd2fe8fd24c6cbcb5',39,3,'new','new'),
('CARD:WS1:demo:root:كذب',1,'CORE:user:demo','DECK:WS1:S39:P1','root','كذب','كذب','AL:64f772debbe3e3b8a7dab69b68',39,3,'new','new'),
('CARD:WS1:demo:root:كفر',1,'CORE:user:demo','DECK:WS1:S39:P1','root','كفر','كفر','AL:27e3ef17b3bf46ca34f6169128',39,3,'new','new'),
('CARD:WS1:demo:root:رود',1,'CORE:user:demo','DECK:WS1:S39:P1','root','رود','رود','AL:b2c4ce9523c016778a9289209f',39,4,'new','new'),
('CARD:WS1:demo:root:ولد',1,'CORE:user:demo','DECK:WS1:S39:P1','root','ولد','ولد','AL:283b3755323e18af8f5220026e',39,4,'new','new'),
('CARD:WS1:demo:root:صفو',1,'CORE:user:demo','DECK:WS1:S39:P1','root','صفو','صفو','AL:3ca4558775cf30c063c7bc29e4',39,4,'new','new'),
('CARD:WS1:demo:root:خلق',1,'CORE:user:demo','DECK:WS1:S39:P1','root','خلق','خلق','AL:adfa6a6358caf76a0afdd77e9e',39,4,'new','new'),
('CARD:WS1:demo:root:شيا',1,'CORE:user:demo','DECK:WS1:S39:P1','root','شيا','شيا','AL:7008229c32a0f67ef1cd84965c',39,4,'new','new'),
('CARD:WS1:demo:root:سبح',1,'CORE:user:demo','DECK:WS1:S39:P1','root','سبح','سبح','AL:36d22c448afaeac6ab4797a4f9',39,4,'new','new'),
('CARD:WS1:demo:root:وحد',1,'CORE:user:demo','DECK:WS1:S39:P1','root','وحد','وحد','AL:281a0d5245b0da3946c75eb83d',39,4,'new','new'),
('CARD:WS1:demo:root:قهر',1,'CORE:user:demo','DECK:WS1:S39:P1','root','قهر','قهر','AL:0921e8c717a9f9ea7e777f17d5',39,4,'new','new'),
('CARD:WS1:demo:root:سمو',1,'CORE:user:demo','DECK:WS1:S39:P1','root','سمو','سمو','AL:eddeb71cc6ce1ab2c6c2075ff3',39,5,'new','new'),
('CARD:WS1:demo:root:ارض',1,'CORE:user:demo','DECK:WS1:S39:P1','root','ارض','ارض','AL:030125bba686cd3ff6ad7f3d67',39,5,'new','new'),
('CARD:WS1:demo:root:كور',1,'CORE:user:demo','DECK:WS1:S39:P1','root','كور','كور','AL:13fccde8e79e027e098f5011ef',39,5,'new','new'),
('CARD:WS1:demo:root:ليل',1,'CORE:user:demo','DECK:WS1:S39:P1','root','ليل','ليل','AL:d2ffc3637c0444b67ca44fa7c7',39,5,'new','new'),
('CARD:WS1:demo:root:نهر',1,'CORE:user:demo','DECK:WS1:S39:P1','root','نهر','نهر','AL:1d1de235ce5100a6462d5e54c6',39,5,'new','new'),
('CARD:WS1:demo:root:سخر',1,'CORE:user:demo','DECK:WS1:S39:P1','root','سخر','سخر','AL:53ba914f68fd67c82fb7161575',39,5,'new','new'),
('CARD:WS1:demo:root:شمس',1,'CORE:user:demo','DECK:WS1:S39:P1','root','شمس','شمس','AL:52a2f378bf1140b6d5387a5f19',39,5,'new','new'),
('CARD:WS1:demo:root:قمر',1,'CORE:user:demo','DECK:WS1:S39:P1','root','قمر','قمر','AL:338a8c4b9502e790ab4df09871',39,5,'new','new'),
('CARD:WS1:demo:root:جري',1,'CORE:user:demo','DECK:WS1:S39:P1','root','جري','جري','AL:9c4814c2326ec657cf8a8dd42d',39,5,'new','new'),
('CARD:WS1:demo:root:اجل',1,'CORE:user:demo','DECK:WS1:S39:P1','root','اجل','اجل','AL:f6dd2709110d8882ee9f156580',39,5,'new','new'),
('CARD:WS1:demo:root:غفر',1,'CORE:user:demo','DECK:WS1:S39:P1','root','غفر','غفر','AL:765f5439c429ab304615af0af0',39,5,'new','new');

-- خلص depth sense cards.
INSERT OR REPLACE INTO ar_qr_vocab_cards (id, workspace_id, core_user_ref, deck_id, vocab_scope, vocab_ref, root_norm, al_root_ref, introduced_surah, introduced_ayah, introduced_word_ref, card_state, mastery_state) VALUES
('CARD:WS1:demo:sense:SEN:خلص:1',1,'CORE:user:demo','DECK:WS1:S39:P1','sense','SEN:خلص:1','خلص','AL:8300320eef02592cb41a0e12aa',39,2,'QR:39:2:w8','new','new'),
('CARD:WS1:demo:sense:SEN:خلص:2',1,'CORE:user:demo','DECK:WS1:S39:P1','sense','SEN:خلص:2','خلص','AL:8300320eef02592cb41a0e12aa',12,80,'QR:12:80','new','new'),
('CARD:WS1:demo:sense:SEN:خلص:3',1,'CORE:user:demo','DECK:WS1:S39:P1','sense','SEN:خلص:3','خلص','AL:8300320eef02592cb41a0e12aa',38,83,'QR:38:83','new','new'),
('CARD:WS1:demo:sense:SEN:خلص:4',1,'CORE:user:demo','DECK:WS1:S39:P1','sense','SEN:خلص:4','خلص','AL:8300320eef02592cb41a0e12aa',16,66,'QR:16:66','new','new');

UPDATE ar_qr_vocab_progress SET roots_total=35, updated_at=datetime('now') WHERE id='PROG:WS1:demo:S39:P1';

-- ============== Canonical cross-references (no duplication) — AL ==============
-- Near-synonyms reuse the EXISTING ar_ling_near_synonym_sets. زَلَفَ is already a
-- member of NS:TO:TO_BE_NEAR_TO_MAKE_IT_CLOSE and زُلَف of NS:TIME:TIME; قَرُبَ of
-- NS:TO:TO_BE_NEAR_TO_MAKE_IT_CLOSE and NS:TO:TO_ATTAIN_STATUS. خلص was missing,
-- so it is added to the existing PURE and DEVOTION sets here.
INSERT OR REPLACE INTO ar_ling_near_synonym_members (id, set_id, lemma_id, nuance_note, arabic_display, arabic_bare, basic_gloss, source_status, confidence) VALUES
('NSM:خلص:pure','NS:PURE:PURE','2904ce798b75136a8803425053','khalis: purity as unmixedness of substance/colour; in the Quran pure milk (16:66) and what is reserved exclusively','خَالِص','خالص','pure, clear, unmixed','manual','needs_review'),
('NSM:خلص:devotion','NS:TO:TO_HAVE_COMPLETE_DEVOTION','18219546dc14e3d88e2c70d025','akhlasa al-din: to devote religion exclusively to God; ikhlas as the opposite of shirk and riyaa','أَخْلَصَ','اخلص','to devote/purify religion for God alone','manual','needs_review');

-- Card pointers to the canonical near-synonym sets + Mir verbal idiom
-- (ar_ling_expressions AREX:VI:6D9734851E670643 = akhlasa li-llahi al-din, covers 39:2).
-- Sinai key-terms: source src_sinai_2023_keyterms is registered but has no rows yet,
-- so sinai_key_term is left null (not fabricated) pending ingestion.
UPDATE ar_ling_root_vocab SET membean_anchors_json='{"near_synonym_sets":[{"id":"NS:TO:TO_BE_NEAR_TO_MAKE_IT_CLOSE","sense":"S1"},{"id":"NS:TIME:TIME","sense":"S3"}],"sinai_key_term":null}' WHERE root_norm='زلف';
UPDATE ar_ling_root_vocab SET membean_anchors_json='{"near_synonym_sets":[{"id":"NS:TO:TO_BE_NEAR_TO_MAKE_IT_CLOSE"},{"id":"NS:TO:TO_ATTAIN_STATUS"}]}' WHERE root_norm='قرب';
UPDATE ar_ling_root_vocab SET membean_anchors_json='{"near_synonym_sets":["NS:PURE:PURE","NS:TO:TO_HAVE_COMPLETE_DEVOTION"],"verbal_idioms":[{"id":"AREX:VI:6D9734851E670643","gloss":"akhlasa li-llahi al-din (39:2, 7:29, 40:65, 98:5)"}],"sinai_key_term":null}' WHERE root_norm='خلص';
