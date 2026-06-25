-- Surah 39 key verses — RAG-grounded synthesis (9, 22, 42, 71). Domain: QR.
-- Retrieved from tafsīr and synthesized, stored in the normalized provenance
-- tables (qr_evidence_items + qr_ss_scope_reading + reading_evidence_link).
--   9  : knower vs ignorant — qirāʾāt amman/aman + omitted khabar (Zamakhshari,
--        Ibn ʿĀshūr); al-qānit.
--   22 : the opened breast — nūr = luṭf (Zamakhshari) vs the ḥadīth of sharḥ
--        al-ṣadr; tafrīʿ + istifhām taqrīrī (Ibn ʿĀshūr).
--   42 : souls in sleep — the two tawaffī (death + sleep), likening sleepers
--        to the dead, cf. 6:60 (Zamakhshari); a mathal (Ibn ʿĀshūr).
--   71 : the throngs — zumar = scattered groups one after another, the word
--        that names the surah (Zamakhshari); tanfīdh al-qaḍāʾ (Ibn ʿĀshūr).
-- Idempotent (INSERT OR REPLACE).

INSERT OR REPLACE INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, is_disputed, source_ref, note_md) VALUES
('QR:EV:39:9:zamakhshari','tafsir','الكشاف','QR:TE:6fec6d7ad087a916df0d20c4','qiraat amman/aman; mubtada with omitted khabar; meaning of qanit','أمن هو قانت: قرئ بالتخفيف وبالتشديد. و(من) مبتدأ خبره محذوف تقديره (كغيره)، حُذف لدلالة ذكر الكافر قبله. والقانت: القائم بما يجب من الطاعة',1,'QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','{"dimension":"qiraat+hadhf"}'),
('QR:EV:39:9:ibnashur','tafsir','التحرير والتنوير','QR:TE:ed3fd76d4baede0e2f6cea58','Nafi/Ibn Kathir/Hamza read aman; hamza of istifham on relative man','قرأ نافع وابن كثير وحمزة (أمَن) بتخفيف الميم؛ و(من) مبتدأ والخبر محذوف دل عليه ذكر الكافر قبله',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"qiraat+nazm"}'),
('QR:EV:39:9:razi','tafsir','مفاتيح الغيب','QR:TE:08c98e9864dd7e02f24182a6','contrast with the heedless ingrate of v.8','المقابلة بين الجاحد (قل تمتع بكفرك) والقانت آناء الليل',0,'QR:WORK:RAZI:TAFSIR-AL-RA','{"dimension":"nazm"}'),
('QR:EV:39:22:zamakhshari','tafsir','الكشاف','QR:TE:d4ab921fefcca84d5d10c388','nur = lutf; the hadith of sharh al-sadr','نور الله: لطفه؛ وحديث: إذا دخل النور القلب انشرح وانفسح',1,'QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','{"dimension":"lutf+hadith"}'),
('QR:EV:39:22:ibnashur','tafsir','التحرير والتنوير','QR:TE:2a8926d7b94b7bf1228969d1','tafriʿ on v.20; istifham taqriri; omitted khabar','تفريع على آية الغرف؛ استفهام تقريري؛ (من) مبتدأ والخبر محذوف',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"nazm+irab"}'),
('QR:EV:39:22:tabari','tafsir','جامع البيان','QR:TE:e853ea5bf2348855e5b41282','whose heart God opened is upon basira/light','أفمن فسح الله قلبه لمعرفته فهو على بصيرة بتنوير الحق في قلبه',0,'QR:WORK:TABARI:AR-TAFSIR-AL','{"dimension":"maana"}'),
('QR:EV:39:42:zamakhshari','tafsir','الكشاف','QR:TE:3d6440e91fe13bea05cafb42','tawaffi = imata; sleep is a tawaffi (sleepers likened to the dead); cf 6:60','توفيها: إماتتها؛ والتي لم تمت في منامها: يتوفاها حين تنام تشبيها للنائمين بالموتى (ومنه يتوفاكم بالليل)',1,'QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','{"dimension":"tawaffi_al_nawm"}'),
('QR:EV:39:42:ibnashur','tafsir','التحرير والتنوير','QR:TE:cf5d40aec6828918cc75227c','can be a mathal for misguidance and guidance, arising from v.41','يصلح أن يكون مثلا لحال الضلال والهدى، نشأ عن (فمن اهتدى فلنفسه)',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"mathal"}'),
('QR:EV:39:71:zamakhshari','tafsir','الكشاف','QR:TE:033e1a3c808093daa1af5c59','zumar = scattered groups one after another (the surah-naming word)','الزمر: الأفواج المتفرقة بعضها في أثر بعض؛ (حتى احزألت زمر بعد زمر)',0,'QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','{"dimension":"lugha:zumar"}'),
('QR:EV:39:71:ibnashur','tafsir','التحرير والتنوير','QR:TE:3da6c6a11fbaa9d108a0dc1e','execution of the decree: deniers driven to Hell in throngs','هذا تنفيذ القضاء؛ سوق الذين كفروا إلى جهنم زمرا',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"nazm"}'),
('QR:EV:39:71:tabari','tafsir','جامع البيان','QR:TE:3bcc05ee430a816cc3bb8c09','the driving and the keepers rebuke','سيق الكافرون إلى جهنم جماعات وتوبيخ الخزنة: ألم يأتكم رسل منكم',0,'QR:WORK:TABARI:AR-TAFSIR-AL','{"dimension":"maana"}');

INSERT OR REPLACE INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, paradigm_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md) VALUES
('QR:SR:39:9:q1','sentence','QR:SS:39:9:s1','QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-;QR:WORK:IBN_ASHUR:AR-TAFSEER-T',NULL,'qiraat','AL:qiraat:variant','amman (am+man) vs aman (hamza istifham on relative man — Nafiʿ, Ibn Kathir, Hamza)','أمَّن و أمَن (قراءة نافع وابن كثير وحمزة)',0,1,'{}'),
('QR:SR:39:9:synth','sentence','QR:SS:39:9:s1','RAG:tafsir','synthesis','synthesis','AL:irab:synthesis','RAG synthesis 39:9: heedless ingrate (v.8) vs the devout qanit; qiraat amman/aman; man mubtada with omitted khabar (ka-ghayrih); al-qanit = one persevering in obedience; closes with hal yastawi alladhina yaʿlamun.','خلاصة 39:9: مقابلة الجاحد بالقانت؛ أمّن/أمَن؛ (من) مبتدأ خبره محذوف؛ والقانت القائم بالطاعة؛ وتختم بـ(هل يستوي الذين يعلمون).',0,0,'{"rag":true}'),
('QR:SR:39:22:r1','sentence','QR:SS:39:22:s1','QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-',NULL,'tafsir','AL:tafsir:nuance','nur Allah = lutf (Zamakhshari) vs the hadith of sharh al-sadr','نور الله: لطفه؛ ويقابله حديث انشراح الصدر',1,1,'{}'),
('QR:SR:39:22:synth','sentence','QR:SS:39:22:s1','RAG:tafsir','synthesis','synthesis','AL:irab:synthesis','RAG synthesis 39:22: opened breast (upon light) vs hardened heart; tafriʿ on v.20, istifham taqriri, man mubtada with omitted khabar; nur = lutf + the hadith of sharh al-sadr.','خلاصة 39:22: شرح الصدر مقابل القسوة؛ تفريع واستفهام تقريري؛ (من) مبتدأ خبره محذوف؛ والنور لطف وحديث الانشراح.',0,0,'{"rag":true}'),
('QR:SR:39:42:r1','sentence','QR:SS:39:42:s1','QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-',NULL,'tafsir','AL:tafsir:nuance','Two takings: at death and in sleep, likening sleepers to the dead (cf. 6:60)','توفّيان: الموت والنوم، تشبيهًا للنائمين بالموتى',0,1,'{}'),
('QR:SR:39:42:synth','sentence','QR:SS:39:42:s1','RAG:tafsir','synthesis','synthesis','AL:irab:synthesis','RAG synthesis 39:42: God takes souls at death and in sleep; keeps the one decreed death, releases the other to a term; a mathal for guidance/misguidance; a sign for those who reflect.','خلاصة 39:42: يتوفى الأنفس في الموت والنوم؛ يمسك ويرسل؛ مثل للهدى والضلال؛ آية لقوم يتفكرون.',0,0,'{"rag":true}'),
('QR:SR:39:71:r1','sentence','QR:SS:39:71:s1','QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-',NULL,'lugha','AL:lugha:maana','zumar = scattered groups one after another — the word that names the surah','الزُّمَر: الأفواج المتفرقة، وهو اسم السورة',0,0,'{}'),
('QR:SR:39:71:synth','sentence','QR:SS:39:71:s1','RAG:tafsir','synthesis','synthesis','AL:irab:synthesis','RAG synthesis 39:71: deniers driven to Hell in throngs (the surah-naming scene); zumar = scattered groups; tanfidh al-qadaʾ; gates opened, keepers rebuke, the admission; paralleled by v.73.','خلاصة 39:71: سوق الكافرين زمرا؛ الزمر الأفواج المتفرقة؛ تنفيذ القضاء؛ توبيخ الخزنة؛ ويقابله سوق المتقين (73).',0,0,'{"rag":true}');

INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type) VALUES
('QR:SR:39:9:synth','QR:EV:39:9:zamakhshari','supports'),('QR:SR:39:9:synth','QR:EV:39:9:ibnashur','supports'),('QR:SR:39:9:synth','QR:EV:39:9:razi','supports'),
('QR:SR:39:9:q1','QR:EV:39:9:zamakhshari','supports'),('QR:SR:39:9:q1','QR:EV:39:9:ibnashur','supports'),
('QR:SR:39:22:synth','QR:EV:39:22:zamakhshari','supports'),('QR:SR:39:22:synth','QR:EV:39:22:ibnashur','supports'),('QR:SR:39:22:synth','QR:EV:39:22:tabari','supports'),
('QR:SR:39:22:r1','QR:EV:39:22:zamakhshari','supports'),
('QR:SR:39:42:synth','QR:EV:39:42:zamakhshari','supports'),('QR:SR:39:42:synth','QR:EV:39:42:ibnashur','supports'),('QR:SR:39:42:r1','QR:EV:39:42:zamakhshari','supports'),
('QR:SR:39:71:synth','QR:EV:39:71:zamakhshari','supports'),('QR:SR:39:71:synth','QR:EV:39:71:ibnashur','supports'),('QR:SR:39:71:synth','QR:EV:39:71:tabari','supports'),('QR:SR:39:71:r1','QR:EV:39:71:zamakhshari','supports');
