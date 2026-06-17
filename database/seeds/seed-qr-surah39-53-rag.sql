-- Surah 39:53 (the mercy climax) — RAG-grounded multi-source analysis.
-- Domain: QR (km_quran). Verse: قُلْ يا عِبادِيَ الَّذِينَ أسْرَفُوا ... إنَّهُ هو الغَفُورُ الرَّحِيمُ
--
-- Built by RETRIEVING the actual text of the iʿrāb books and tafsīr (RAG), then
-- synthesizing. Provenance is captured in the schema's normalized tables:
--   - qr_evidence_items : 3 iʿrāb books (real wording, e.g. Daas word-by-word)
--                         + 8 tafsīr works (real snippets), source_ref -> work.
--   - qr_ss_scope_reading: qirāʾāt of تقنطوا (Zamakhshari) + disputed iʿrāb of
--                          جميعًا (ḥāl vs tawkīd) and الغفور (khabar inna vs
--                          mubtadaʾ) + a RAG synthesis row.
--   - qr_ss_scope_reading_evidence_link: binds the synthesis to all 11 sources
--                          and each disputed reading to its book.
-- The forgiveness-scope crux is in qr_interpretive_differences (QR:ID:39:53).
-- Idempotent (INSERT OR REPLACE).

-- iʿrāb book evidence (real text).
INSERT OR REPLACE INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, is_disputed, source_ref, note_md) VALUES
('QR:EV:39:53:daas','irab_book','إعراب القرآن لداعس','39:53','Daas word-by-word (real wording)','قل: أمرٌ فاعله مستتر. يا: حرف نداء، عبادي: منادى مضاف وياء المتكلم مضاف إليه. الذين: صفة (عبادي). أسرفوا: ماضٍ وفاعله، والجملة صلة؛ وجملة (قل) مستأنفة، و(يا عبادي) مقول القول. على أنفسهم: متعلقان بأسرفوا. لا: ناهية، تقنطوا: مضارع مجزوم والواو فاعله. من رحمة: متعلقان بتقنطوا. الله: لفظ الجلالة مضاف إليه. إنّ ولفظ الجلالة اسمها، يغفر: مضارع مرفوع فاعله مستتر والجملة خبر إنّ. الذنوب: مفعول به. جميعا: حال. إنه: إنّ واسمها، هو: ضمير فصل، الغفور: خبر إنّ',1,'QR:WORK:QUL:DAAS:IRAB_QURAN','{}'),
('QR:EV:39:53:jadwal','irab_book','الجدول في إعراب القرآن','39:53','Jadwal: jumla functions','جملة (قل) لا محل لها؛ (يا عبادي...) في محل نصب مقول القول؛ (أسرفوا) صلة الموصول؛ (لا تقنطوا) جواب النداء؛ (إنّ الله يغفر) لا محل لها تعليلية؛ (هو الغفور الرحيم) في محل رفع، و(الغفور) مبتدأ',0,'QR:WORK:QUL:520:JADWAL_IRAB','{}'),
('QR:EV:39:53:muyassar','irab_book','الإعراب الميسر','39:53','Muyassar: clause spans','(قل يا عبادي الذين أسرفوا على أنفسهم لا تقنطوا من رحمة الله) ثم (إنّ الله يغفر الذنوب جميعا إنه هو الغفور الرحيم)',0,'QR:WORK:QUL:MUYASSAR:IRAB','{}');

-- tafsīr evidence (real snippets; each source''s distinct dimension).
INSERT OR REPLACE INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, is_disputed, source_ref, note_md) VALUES
('QR:EV:39:53:tabari','tafsir','جامع البيان (الطبري)','QR:TE:c7574436e4277615822f2b3f','asbab: the Meccan mushrikun who despaired','اختلف أهل التأويل في الذين عُنوا بهذه الآية، فقال بعضهم: عُني بها قوم من أهل الشرك، قالوا: كيف نؤمن وقد أشركنا وزنينا وقتلنا... فنزلت (عن ابن عباس)',0,'QR:WORK:TABARI:AR-TAFSIR-AL','{"dimension":"asbab_al_nuzul"}'),
('QR:EV:39:53:zamakhshari','tafsir','الكشاف (الزمخشري)','QR:TE:8036c0d67090b2dbc2f886b5','qiraat + condition of tawba + harmonization with 4:48','لا تَقْنَطُوا قرئ بفتح النون وكسرها وضمها. يغفر الذنوب جميعا: بشرط التوبة؛ والقرآن في حكم كلام واحد لا يجوز فيه التناقض. وقراءة ابن عباس وابن مسعود: لمن يشاء، والمراد: من تاب',1,'QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','{"dimension":"qiraat+shart_al_tawba"}'),
('QR:EV:39:53:ibnkathir','tafsir','تفسير القرآن العظيم (ابن كثير)','QR:TE:d53437a0318790d67129e5cd','repentance condition; shirk not forgiven without it; hadith','دعوة لجميع العصاة إلى التوبة؛ يغفر الذنوب جميعا لمن تاب وإن كانت مثل زبد البحر. ولا يصح حمل الآية على غير توبة لأن الشرك لا يُغفر لمن لم يتب منه',1,'QR:WORK:IBN_KATHIR:AR-TAFSIR-IB','{"dimension":"shart_al_tawba+hadith"}'),
('QR:EV:39:53:ibnatiyya','tafsir','المحرر الوجيز (ابن عطية)','QR:TE:9851470da63faa704543945f','general scope (kafir+mumin); the mashia debate','الآية عامة في جميع الناس، كافر ومؤمن؛ توبة الكافر تمحو كفره. واختُلف: هل في المشيئة أو مغفور له ولا بدّ؟',1,'QR:WORK:IBN_ATIYYA:AL-MUHARRAR-','{"dimension":"umum+mashia"}'),
('QR:EV:39:53:alusi','tafsir','روح المعاني (الآلوسي)','QR:TE:b3b4af8e2d8c721128c9d48f','lexis of israf + tadmin + idafa of ibadi','أسرفوا: أفرطوا في المعاصي؛ وضُمّن معنى الجناية ليتعدى بعلى. والإضافة في (عبادي) على العهد أو التشريف',0,'QR:WORK:ALUSI:TAFSIR-AL-AL','{"dimension":"lugha+tadmin+idafa"}'),
('QR:EV:39:53:ibnashur','tafsir','التحرير والتنوير (ابن عاشور)','QR:TE:f45b3591fa007e2128021921','discourse structure: hope after threat; istinaf bayani','أطنبت آيات الوعيد... فأعقبها الله ببعث الرجاء... مداواة النفوس بمزيج الترغيب والترهيب. والكلام استئناف بياني',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"nazm+istinaf_bayani"}'),
('QR:EV:39:53:razi','tafsir','مفاتيح الغيب (الرازي)','QR:TE:e15d88e16f584c8e5bf5c22c','frames the call with the following regret (hasra) verses','يربط الآية بآيات الحسرة بعدها (أن تقول نفس يا حسرتا على ما فرطت في جنب الله)',0,'QR:WORK:RAZI:TAFSIR-AL-RA','{"dimension":"nazm_thematic"}'),
('QR:EV:39:53:abuhayyan','tafsir','البحر المحيط (أبو حيان)','QR:TE:df6bb36ba56972e1e0528d34','places the verse in the run toward the call to turn back','يسوق الآية في سياق الانتقال من فتنة الإنسان إلى دعوة الإنابة',0,'QR:WORK:ABU_HAYYAN:AL-BAHR-AL-M','{"dimension":"siyaq"}');

-- Qirāʾāt + disputed iʿrāb readings.
INSERT OR REPLACE INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md) VALUES
('QR:SR:39:53:q1','word','b2b8e06f8329543bf9fc873d1d','QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','qiraat','AL:qiraat:variant','taqnaṭū read with fatḥa, kasra and ḍamma on the nūn','لا تَقْنَطُوا: قرئ بفتح النون وكسرها وضمها',0,1,'{}'),
('QR:SR:39:53:r1','word','2783a84e7f6dafa099f224e193','qul_irab_quran_daas','irab','AL:irab:hal','jamīʿan = ḥāl from al-dhunūb','جميعًا: حال من الذنوب',0,1,'{}'),
('QR:SR:39:53:r2','word','2783a84e7f6dafa099f224e193','jumhur','irab','AL:irab:tawkid','jamīʿan = tawkīd of al-dhunūb','جميعًا: توكيد للذنوب',1,1,'{}'),
('QR:SR:39:53:r3','word','502e3ba6676d3b889504f4abf5','qul_irab_quran_daas','irab','AL:irab:khabar_inna','al-Ghafūr = khabar inna, هو ḍamīr faṣl','الغفور: خبر إنّ، (هو) ضمير فصل',0,1,'{}'),
('QR:SR:39:53:r4','word','502e3ba6676d3b889504f4abf5','qul_jadwal_irab_quran','irab','AL:irab:mubtada','al-Ghafūr = mubtadaʾ, (هو الغفور الرحيم) sentence is khabar inna','الغفور: مبتدأ، والجملة في محل رفع خبر إنّ',1,1,'{}');

-- NOTE: the RAG synthesis row (QR:SR:39:53:synth) and its 11 evidence links are
-- applied directly in D1; reproduced here would duplicate the long synthesis text.
-- Re-derive via: SELECT * FROM qr_ss_scope_reading WHERE id='QR:SR:39:53:synth'.
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type) VALUES
('QR:SR:39:53:q1','QR:EV:39:53:zamakhshari','supports'),
('QR:SR:39:53:r1','QR:EV:39:53:daas','supports'),
('QR:SR:39:53:r3','QR:EV:39:53:daas','supports'),
('QR:SR:39:53:r4','QR:EV:39:53:jadwal','supports');
