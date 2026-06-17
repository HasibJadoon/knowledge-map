-- Surah 39 Passage 1 (verses 3-9) — RAG-grounded per-verse syntheses rooted in
-- ALL tafsīr and ALL iʿrāb books in D1. Domain: QR (km_quran).
--
-- This completes Passage 1: verses 1, 2 already have full-layer gold and verse 9
-- has its qirāʾāt reading + curated tafsīr (see seed-qr-surah39-1-fulllayers.sql,
-- seed-qr-surah39-2-fulllayers.sql, seed-qr-surah39-key-verses-rag.sql). Here we
-- add the connective verses 3-8 and bring every Passage 1 synthesis (3-9) to
-- parity by rooting it in EVERY source covering the verse.
--
-- Provenance uses the schema's normalized tables (not note_md):
--   - qr_evidence_items                 : 6 curated tafsīr snippets (real book
--                                         wording), source_ref -> canonical work.
--                                         The bulk QR:EVT (tafsīr) / QR:EVX
--                                         (iʿrāb) evidence rows are created by
--                                         seed-qr-surah39-evidence-allverses.sql.
--   - qr_ss_scope_reading (QR:SR:..:synth) : 6 RAG syntheses, scoped to the verse
--                                         sentence QR:SS:39:N:s1.
--   - qr_ss_scope_reading_evidence_link : binds each synthesis to its curated
--                                         tafsīr snippet AND to every tafsīr work
--                                         covering the verse AND to every linked
--                                         iʿrāb book entry for the verse's words.
--
-- Run AFTER seed-qr-surah39-evidence-allverses.sql (needs QR:EVT/QR:EVX rows and
-- the per-verse sentence scopes QR:SS:39:N:s1). Idempotent (INSERT OR REPLACE).

-- 1) Curated tafsīr evidence (real wording; each source's distinct dimension).
INSERT OR REPLACE INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, is_disputed, source_ref, note_md) VALUES
('QR:EV:39:3:ibnashur','tafsir','التحرير والتنوير','QR:TE:815d76a0c63dc7da8cf51a1a','Ibn Ashur: istiʾnaf grounding the surahs purpose — Gods exclusive right to worship; taʿlil of the command to pure worship','ألا لله الدين الخالص: استئناف للتخلص إلى استحقاقه تعالى الإفراد بالعبادة، وهو غرض السورة، وأفاد التعليل للأمر بالعبادة الخالصة لله',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"nazm:taʿlil+gharad_al_sura"}'),
('QR:EV:39:4:ibnashur','tafsir','التحرير والتنوير','QR:TE:195ea20206a746cee41f41e2','Ibn Ashur: iḥtijaj — the verse argues the mushrikun are liars in taking awliyaʾ and the intercession-claim; refutes the walad','موقع الاحتجاج على أن المشركين كاذبون كفارون في اتخاذهم أولياء من دون الله، وفي قولهم ما نعبدهم إلا ليقربونا',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"hujja:refute_walad"}'),
('QR:EV:39:5:zamakhshari','tafsir','الكشاف','QR:TE:3c4d8ba70ced141c3651e530','Zamakhshari: the creation signs prove He is One unshared, irresistible; takwir = winding/coiling like a turban','بخلق السماوات والأرض وتكوير الملوين وتسخير النيرين وجريهما لأجل مسمى... على أنه واحد لا يشارك قهار لا يغالب. والتكوير: اللف واللي، كار العمامة على رأسه وكوّرها',0,'QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','{"dimension":"tawhid_proof+lugha:takwir"}'),
('QR:EV:39:6:ibnashur','tafsir','التحرير والتنوير','QR:TE:4206399b70393e6395411617','Ibn Ashur: transition to the wondrous creation of humans — one nafs branching into a great number; the mate for procreation','انتقال إلى الاستدلال بخلق الناس وهو الخلق العجيب؛ نفس واحدة تشعب منها عدد عظيم، وخلق زوج آدم ليتقوم ناموس التناسل',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"khalq_al_insan"}'),
('QR:EV:39:7:ibnashur','tafsir','التحرير والتنوير','QR:TE:0e18721f42ceabb71fbcc26a','Ibn Ashur: their kufr does not harm God, only themselves; He is not pleased with kufr for His servants','إن تكفروا فإن الله غني عنكم؛ كفرهم إن أصروا لا يضر الله وإنما يضر أنفسهم، ولا يرضى لعباده الكفر',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"ghina_an_al_kufr"}'),
('QR:EV:39:8:ibnashur','tafsir','التحرير والتنوير','QR:TE:9c1999a72b3c72af7fe272f4','Ibn Ashur: a mithal for the mushrikuns vacillation between shirk and turning to God alone in distress','مثال لتقلب المشركين بين إشراكهم مع الله غيره في العبادة وبين إظهار الإنابة عند الضر',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"mathal:taqallub"}');

-- 2) RAG syntheses for the connective verses 3-8 (verse sentence scope).
INSERT OR REPLACE INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md) VALUES
('QR:SR:39:3:synth','sentence','QR:SS:39:3:s1','RAG:irab+tafsir','synthesis','AL:irab:synthesis','RAG synthesis 39:3: "alā lillāhi al-dīn al-khāliṣ" is an istiʾnāf grounding the surahs purpose — Gods exclusive right to worship — and gives the taʿlīl for the command to pure devotion (Ibn ʿĀshūr). The mushrikūn who take awliyāʾ are quoted ("we worship them only to bring us nearer to God in nearness"), then answered in two inna-sentences: God judges between them in their differences, and does not guide a persistent liar-disbeliever.','خلاصة 39:3: (ألا لله الدين الخالص) استئناف لبيان غرض السورة وتعليلٌ للأمر بالإخلاص (ابن عاشور)؛ ثم حكاية قول المشركين (ما نعبدهم إلا ليقربونا)، وجوابه بجملتي (إنّ): الله يحكم بينهم، ولا يهدي كاذبًا كفارًا.',0,0,'{"rag":true}'),
('QR:SR:39:4:synth','sentence','QR:SS:39:4:s1','RAG:irab+tafsir','synthesis','AL:irab:synthesis','RAG synthesis 39:4: a conditional refutation (iḥtijāj, Ibn ʿĀshūr) — had God willed a child He would have chosen from what He creates; but He is exalted above that (subḥānahu), the One, the Subduer. It exposes the mushrikūns lie in their awliyāʾ/intercession claim.','خلاصة 39:4: احتجاج شرطي (ابن عاشور): لو أراد ولدًا لاصطفى مما يخلق، لكنه منزَّه (سبحانه) الواحد القهار؛ وفيه إبطال دعوى المشركين.',0,0,'{"rag":true}'),
('QR:SR:39:5:synth','sentence','QR:SS:39:5:s1','RAG:irab+tafsir','synthesis','AL:irab:synthesis','RAG synthesis 39:5: the creation signs (heavens and earth in truth, the coiling [takwīr] of night over day, the subjected sun and moon each running to a fixed term) prove He is One unshared, irresistible (Zamakhshari: wāḥid lā yushārak, qahhār lā yughālab); takwīr = winding like a turban. Sealed: He is the Mighty, the Oft-Forgiving.','خلاصة 39:5: آيات الخلق (السماوات والأرض، تكوير الليل والنهار، تسخير النيرين وجريهما لأجل مسمى) دليلٌ على أنه واحد لا يشارك قهار لا يغالب (الزمخشري)؛ والتكوير اللف كالعمامة؛ وختم: العزيز الغفار.',0,0,'{"rag":true}'),
('QR:SR:39:6:synth','sentence','QR:SS:39:6:s1','RAG:irab+tafsir','synthesis','AL:irab:synthesis','RAG synthesis 39:6: the wondrous creation of humans (Ibn ʿĀshūr) — from one soul, then its mate, and eight pairs of cattle; He creates you in your mothers wombs, creation after creation, in three darknesses. That is God your Lord; His is the dominion; no god but He — so how are you turned away?','خلاصة 39:6: الخلق العجيب للإنسان (ابن عاشور): من نفس واحدة ثم زوجها وثمانية أزواج؛ يخلقكم في بطون الأمهات خلقًا من بعد خلق في ظلمات ثلاث؛ ذلكم الله ربكم له الملك لا إله إلا هو فأنى تصرفون.',0,0,'{"rag":true}'),
('QR:SR:39:7:synth','sentence','QR:SS:39:7:s1','RAG:irab+tafsir','synthesis','AL:irab:synthesis','RAG synthesis 39:7: if you disbelieve, God is rich without you — your kufr harms only you (Ibn ʿĀshūr); He is not pleased with kufr for His servants but is pleased with gratitude; no bearer bears anothers burden; then to your Lord is your return, and He is Knower of what is in the breasts.','خلاصة 39:7: إن تكفروا فالله غني عنكم وإنما يضر كفركم أنفسكم (ابن عاشور)؛ ولا يرضى لعباده الكفر ويرضى الشكر؛ ولا تزر وازرة وزر أخرى؛ ثم المرجع إليه وهو عليم بذات الصدور.',0,0,'{"rag":true}'),
('QR:SR:39:8:synth','sentence','QR:SS:39:8:s1','RAG:irab+tafsir','synthesis','AL:irab:synthesis','RAG synthesis 39:8: a mithāl for the mushrikūns vacillation (Ibn ʿĀshūr) — in distress man calls his Lord turning to Him, then when favored forgets and sets up rivals to God to mislead; say: enjoy your disbelief a little — you are of the companions of the Fire.','خلاصة 39:8: مثالٌ لتقلب المشركين (ابن عاشور): يدعو ربه منيبًا عند الضر، فإذا خُوِّل نعمةً نسي وجعل لله أندادًا ليُضل؛ قل تمتع بكفرك قليلًا إنك من أصحاب النار.',0,0,'{"rag":true}');

-- 3) Bind each synthesis (3-8) to its curated tafsīr snippet.
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type) VALUES
('QR:SR:39:3:synth','QR:EV:39:3:ibnashur','supports'),
('QR:SR:39:4:synth','QR:EV:39:4:ibnashur','supports'),
('QR:SR:39:5:synth','QR:EV:39:5:zamakhshari','supports'),
('QR:SR:39:6:synth','QR:EV:39:6:ibnashur','supports'),
('QR:SR:39:7:synth','QR:EV:39:7:ibnashur','supports'),
('QR:SR:39:8:synth','QR:EV:39:8:ibnashur','supports');

-- 4) Root every Passage 1 synthesis (1-9) in ALL tafsīr works covering the verse.
--    Per-verse INSERT...SELECT (D1 caps compound SELECT at ~5 branches, so a
--    7-way UNION / VALUES row-source is not portable here). Verses 1-2 carry
--    their own dedicated iʿrāb reading rows (full-layer gold), so the bulk
--    QR:EVX iʿrāb links below are thin there; the tafsīr links still apply.
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT 'QR:SR:39:1:synth', 'QR:EVT:39:'||t.id, 'supports' FROM qr_tafsir_entries t
WHERE t.surah=39 AND t.ayah_from<=1 AND t.ayah_to>=1 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT 'QR:SR:39:2:synth', 'QR:EVT:39:'||t.id, 'supports' FROM qr_tafsir_entries t
WHERE t.surah=39 AND t.ayah_from<=2 AND t.ayah_to>=2 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT 'QR:SR:39:3:synth', 'QR:EVT:39:'||t.id, 'supports' FROM qr_tafsir_entries t
WHERE t.surah=39 AND t.ayah_from<=3 AND t.ayah_to>=3 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT 'QR:SR:39:4:synth', 'QR:EVT:39:'||t.id, 'supports' FROM qr_tafsir_entries t
WHERE t.surah=39 AND t.ayah_from<=4 AND t.ayah_to>=4 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT 'QR:SR:39:5:synth', 'QR:EVT:39:'||t.id, 'supports' FROM qr_tafsir_entries t
WHERE t.surah=39 AND t.ayah_from<=5 AND t.ayah_to>=5 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT 'QR:SR:39:6:synth', 'QR:EVT:39:'||t.id, 'supports' FROM qr_tafsir_entries t
WHERE t.surah=39 AND t.ayah_from<=6 AND t.ayah_to>=6 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT 'QR:SR:39:7:synth', 'QR:EVT:39:'||t.id, 'supports' FROM qr_tafsir_entries t
WHERE t.surah=39 AND t.ayah_from<=7 AND t.ayah_to>=7 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT 'QR:SR:39:8:synth', 'QR:EVT:39:'||t.id, 'supports' FROM qr_tafsir_entries t
WHERE t.surah=39 AND t.ayah_from<=8 AND t.ayah_to>=8 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT 'QR:SR:39:9:synth', 'QR:EVT:39:'||t.id, 'supports' FROM qr_tafsir_entries t
WHERE t.surah=39 AND t.ayah_from<=9 AND t.ayah_to>=9 AND t.content_ar IS NOT NULL AND TRIM(t.content_ar)<>'';

-- 5) Root every Passage 1 synthesis (1-9) in ALL linked iʿrāb book entries for
--    the verse's words (QR:EVX evidence joins back to the word occurrence).
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type)
SELECT 'QR:SR:39:'||w.ayah||':synth', ev.id, 'supports'
FROM qr_evidence_items ev
JOIN qr_word_occurrences w ON w.id = json_extract(ev.note_md,'$.word_occurrence_id')
WHERE ev.id LIKE 'QR:EVX:39:%' AND w.surah=39 AND w.ayah BETWEEN 1 AND 9;
