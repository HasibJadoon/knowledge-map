-- Surah 39:1 — full multi-layer sentence structure, rooted in ALL five iʿrāb
-- books and ALL eight tafsīr works, with a synthesis. Domain: QR (km_quran).
--
-- Builds the deep SS layers on top of the 39:1 gold in seed-qr-surah39-study.sql
-- (which holds the sentence, member map, morph links, readings r1-r4, syntax):
--   - clause (qr_ss_occ_clause)              : 1 main nominal clause
--   - phrases (qr_ss_occ_phrase)             : iḍāfa / jar-majrūr / naʿt
--   - balāgha (qr_ss_scope_balagha_link)     : sigha+taqdim, murāʿāt al-naẓīr
--   - reading r5 + synthesis (qr_ss_scope_reading)
--   - constituency tree (qr_ss_tree/_node/_edge)
--
-- Iʿrāb books cited (ayah_key 39:1): Jadwal, Daas, Tibyan(ʿUkbari), Darwīsh,
-- Muyassar. Tafsīr entries cited: Ṭabarī, Zamakhsharī, Rāzī, Ibn ʿAṭiyya,
-- Ibn Kathīr, Abū Ḥayyān, Ālūsī, Ibn ʿĀshūr.
-- Idempotent: keyed by QR:CL/PH/BAL/TR/TN/TE:39:1 and QR:SR:39:1:r5/synth.

DELETE FROM qr_ss_tree_edge WHERE tree_id='QR:TR:39:1';
DELETE FROM qr_ss_tree_node WHERE tree_id='QR:TR:39:1';
DELETE FROM qr_ss_tree WHERE id='QR:TR:39:1';
DELETE FROM qr_ss_scope_balagha_link WHERE id LIKE 'QR:BAL:39:1:%';
DELETE FROM qr_ss_occ_phrase WHERE id LIKE 'QR:PH:39:1:%';
DELETE FROM qr_ss_occ_clause WHERE id LIKE 'QR:CL:39:1:%';
DELETE FROM qr_ss_scope_reading WHERE id IN ('QR:SR:39:1:r5','QR:SR:39:1:synth');

-- Clause.
INSERT INTO qr_ss_occ_clause (id, sentence_id, parent_clause_id, clause_order, surah, ayah_from, ayah_to, word_start_index, word_end_index, clause_type, lx_clause_type_ref, clause_function, lx_clause_func_ref, governing_particle, is_elliptical, note_md)
VALUES ('QR:CL:39:1:c1','QR:SS:39:1:s1',NULL,1,39,1,1,1,6,'main','AL:nahw:jumla_ismiyya','ibtidaiyya','AL:nahw:istinaf',NULL,0,'{"irab":"جملة اسمية ابتدائية لا محل لها من الإعراب"}');

-- Phrases.
INSERT INTO qr_ss_occ_phrase (id, clause_id, phrase_order, surah, ayah, word_start_index, word_end_index, phrase_type, lx_phrase_type_ref, phrase_function, lx_phrase_func_ref, head_word_id, note_md) VALUES
('QR:PH:39:1:1','QR:CL:39:1:c1',1,39,1,1,2,'idafa','AL:nahw:idafa','mubtada','AL:nahw:mubtada','05105199fb4d4c990c832802df','{"text":"تنزيل الكتاب"}'),
('QR:PH:39:1:2','QR:CL:39:1:c1',2,39,1,3,4,'jar_majrur','AL:nahw:jar_majrur','khabar','AL:nahw:khabar','d600c9237f4229cd9466b52d4f','{"text":"من الله"}'),
('QR:PH:39:1:3','QR:CL:39:1:c1',3,39,1,5,6,'naat_compound','AL:nahw:naat','sifa','AL:nahw:naat','9fdfcfd8ecca437b7f66dc0081','{"text":"العزيز الحكيم","note":"naat per jumhur; badal per Daas"}');

-- Balāgha (rooted in Ibn ʿĀshūr).
INSERT INTO qr_ss_scope_balagha_link (id, scope_type, scope_id, lx_balagha_ref, balagha_category, rhetorical_effect, note_md) VALUES
('QR:BAL:39:1:1','sentence','QR:SS:39:1:s1','AL:balagha:ikhtiyar_al_sigha','ilm_al_maani','The form-II maṣdar tanzīl connotes a gradual, weighty sending-down (vs inzāl); fronted as mubtadaʾ it foregrounds the Book for taʿẓīm.','{"device":"اختيار الصيغة + التقديم","tafsir":[{"work":"QR:WORK:IBN_ASHUR","entry":"QR:TE:83c511f2ca0e4216af55485e","quote_ar":"فاتحة أنيقة في التنويه بالقرآن... تنزيل مصدر مراد به معناه المصدري لا معنى المفعول"}]}'),
('QR:BAL:39:1:2','phrase','QR:PH:39:1:3','AL:balagha:muraat_al_nazir','badi','Pairing al-ʿAzīz (might) with al-Ḥakīm (wisdom) couples power with wisdom, grounding the coming demand for exclusive worship.','{"device":"مراعاة النظير / التناسب"}');

-- Zamakhshari''s third grammatical face.
INSERT INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, paradigm_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md) VALUES
('QR:SR:39:1:r5','word','05105199fb4d4c990c832802df','QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','minority','irab','AL:irab:khabar_baad_khabar',
 'Zamakhshari allows a third face: min Allah is a second predicate (khabar baʿd khabar) of tanzil, as one says "this letter is from so-and-so".',
 'وجهٌ ثالثٌ عند الزمخشري: (مِنَ اللهِ) خبرٌ بعد خبرٍ للتنزيل، كقولك: هذا الكتابُ من فلانٍ.',1,1,
 '{"tafsir":[{"work":"QR:WORK:ZAMAKHSHARI","entry":"QR:TE:3e5712d7c83777c395e4a310","quote_ar":"أو غير صلة... فهو على هذا خبر بعد خبر"}]}');

-- Synthesis across all 5 iʿrāb books + all 8 tafsīr works.
INSERT INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, paradigm_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md) VALUES
('QR:SR:39:1:synth','sentence','QR:SS:39:1:s1','synthesis:5-irab-books+8-tafsirs','synthesis','synthesis','AL:irab:synthesis',
 'Synthesis across all iʿrāb books and tafsīr. The verse opens by glorifying the Book (Ibn ʿĀshūr). تنزيل is a form-II maṣdar in its verbal-noun sense (Ibn ʿĀshūr). The majority — Jadwal, Daas, Tibyan, Darwīsh, and Zamakhshari''s first face — read تنزيل as mubtadaʾ with من الله as predicate (Muyassar confirms the jar-majrūr khabar); Zamakhshari adds two faces (khabar of omitted mubtadaʾ; or second predicate), with Abū Ḥayyān. العزيز الحكيم are naʿt for the jumhūr, badal for al-Daas. In meaning (Ṭabarī, Rāzī) the Book is sent from God who pairs might and wisdom, grounding the demand for pure worship; the surah is Makkan by consensus (Ibn ʿAṭiyya, Ibn Kathīr, Ālūsī), also named Sūrat al-Ghuraf.',
 'خلاصةٌ جامعةٌ: افتُتحت السورة بالتنويه بالقرآن (ابن عاشور)، و(تنزيل) مصدرٌ على بابه. والجمهور (الجدول والدعّاس والتبيان والدرويش والوجه الأول للزمخشري) على أنه مبتدأ خبره (من الله) ويؤيده الميسّر، وزاد الزمخشري وجهين ووافقه أبو حيّان. و(العزيز الحكيم) نعتان عند الجمهور وبدلٌ عند الدعّاس. والمعنى (الطبري والرازي): كتابٌ منزَّلٌ من الله الجامع بين العزة والحكمة. والسورة مكية بالإجماع (ابن عطية وابن كثير والآلوسي) وتسمى سورة الغرف.',
 0,0,
 '{"synthesis":true,"irab_books":["qul_jadwal_irab_quran","qul_irab_quran_daas","tibyan_ukbari_irab","qul_irab_darwish","qul_irab_muyassar"],"tafsir_entries":{"zamakhshari":"QR:TE:3e5712d7c83777c395e4a310","abu_hayyan":"QR:TE:d44f2d33f76034758cae444e","ibn_ashur":"QR:TE:83c511f2ca0e4216af55485e","tabari":"QR:TE:7741d6d25ce13b076bd308c8","razi":"QR:TE:9bf443c5eae54a4a5c347f43","ibn_kathir":"QR:TE:809ab1189b585b792d256761","ibn_atiyya":"QR:TE:8006f4bbd295b97641996ce8","alusi":"QR:TE:e2bff1ad94a0780745f0bd47"},"by_source":{"qul_jadwal_irab_quran":"primary iʿrāb + omitted-mubtadaʾ alternative + sentence lā maḥalla lahā","qul_irab_quran_daas":"word-by-word; UNIQUELY badal for العزيز الحكيم","tibyan_ukbari_irab":"treats تنزيل الكتاب as the mubtadaʾ unit","qul_irab_darwish":"concise mubtadaʾ (corroborates)","qul_irab_muyassar":"foregrounds من الله as jar-majrūr khabar","QR:WORK:ZAMAKHSHARI":"three grammatical faces of تنزيل","QR:WORK:ABU_HAYYAN":"weighs/concurs the options","QR:WORK:IBN_ASHUR":"balāgha: maṣdar + tanwīh","QR:WORK:TABARI":"meaning: Book sent from God","QR:WORK:RAZI":"thematic framing of the opening","QR:WORK:IBN_KATHIR":"ḥadīth context (ʿĀʾisha; Makkī)","QR:WORK:IBN_ATIYYA":"Makkī by ijmāʿ except 3 āyāt","QR:WORK:ALUSI":"surah names (al-Ghuraf) + transmission"}}');

-- Constituency tree.
INSERT INTO qr_ss_tree (id, sentence_id, tree_type, note_md) VALUES ('QR:TR:39:1','QR:SS:39:1:s1','constituency','{"note":"mubtada (idafa) + khabar (jar-majrur); naat under the majrur"}');
INSERT INTO qr_ss_tree_node (id, tree_id, parent_node_id, node_label, scope_type, scope_id, depth, node_order) VALUES
('QR:TN:39:1:0','QR:TR:39:1',NULL,'S — jumla ismiyya','sentence','QR:SS:39:1:s1',0,0),
('QR:TN:39:1:1','QR:TR:39:1','QR:TN:39:1:0','Mubtadaʾ [تنزيل الكتاب]','phrase','QR:PH:39:1:1',1,1),
('QR:TN:39:1:2','QR:TR:39:1','QR:TN:39:1:0','Khabar [من الله]','phrase','QR:PH:39:1:2',1,2),
('QR:TN:39:1:3','QR:TR:39:1','QR:TN:39:1:1','Muḍāf: تنزيل','word','05105199fb4d4c990c832802df',2,1),
('QR:TN:39:1:4','QR:TR:39:1','QR:TN:39:1:1','Muḍāf ilayh: الكتاب','word','691bbaba7cb0dc1c9f88a0776c',2,2),
('QR:TN:39:1:5','QR:TR:39:1','QR:TN:39:1:2','Ḥarf jarr: من','word','d600c9237f4229cd9466b52d4f',2,1),
('QR:TN:39:1:6','QR:TR:39:1','QR:TN:39:1:2','Majrūr: الله','word','9189f7d424a53ee5654cc26854',2,2),
('QR:TN:39:1:7','QR:TR:39:1','QR:TN:39:1:6','Naʿt: العزيز','word','9fdfcfd8ecca437b7f66dc0081',3,1),
('QR:TN:39:1:8','QR:TR:39:1','QR:TN:39:1:6','Naʿt: الحكيم','word','c1d913e3a6a613c86462751840',3,2);
INSERT INTO qr_ss_tree_edge (id, tree_id, parent_node_id, child_node_id, edge_label) VALUES
('QR:TE:39:1:1','QR:TR:39:1','QR:TN:39:1:0','QR:TN:39:1:1','mubtada'),
('QR:TE:39:1:2','QR:TR:39:1','QR:TN:39:1:0','QR:TN:39:1:2','khabar'),
('QR:TE:39:1:3','QR:TR:39:1','QR:TN:39:1:1','QR:TN:39:1:3','mudaf'),
('QR:TE:39:1:4','QR:TR:39:1','QR:TN:39:1:1','QR:TN:39:1:4','mudaf_ilayh'),
('QR:TE:39:1:5','QR:TR:39:1','QR:TN:39:1:2','QR:TN:39:1:5','harf_jarr'),
('QR:TE:39:1:6','QR:TR:39:1','QR:TN:39:1:2','QR:TN:39:1:6','majrur'),
('QR:TE:39:1:7','QR:TR:39:1','QR:TN:39:1:6','QR:TN:39:1:7','naat'),
('QR:TE:39:1:8','QR:TR:39:1','QR:TN:39:1:6','QR:TN:39:1:8','naat');
