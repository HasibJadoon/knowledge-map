-- Seed: Surah 39 study-module content for km_quran.
-- Domain: QR. Database: km_quran (binding DB_QR).
--
-- Holds the *authored* study content that is not mechanically derivable:
--   1. qr_study_questions    - the comprehension bank (24 rows, 8 passages).
--   2. qr_ss_* (39:1 only)   - the sentence-structure GOLD example mined from
--                              all five iʿrāb books with nuanced multiple
--                              readings (see docs/quran-ss-irab-mining.md).
--
-- The 56 study steps + 56 root tasks are deterministic pointers generated for
-- the 8 passages (7 steps each: reading/morphology/sentence_structure/
-- expressions/comprehension/passage_structure/scholarship); each task_json
-- carries `sources` (structured km_quran tables it resolves from) and
-- `mapped_from` (raw book tables those are mapped from) - never inline content.
--
-- Requires: migration 0004 (qr_study_questions) and seed-qr-surah39-passages.sql.

-- ─── Comprehension question bank ──────────────────────────────────────────────
DELETE FROM qr_study_questions WHERE surah=39;
INSERT INTO qr_study_questions (id, surah, passage_id, scope_ref, ayah_from, ayah_to, question_type, question_en, question_ar, answer_md, difficulty, sort_order, status) VALUES
('QR:Q:39:1:1',39,'QR:SP:39:1-9','QR:AS:39:1',1,9,'comprehension','Which two divine attributes open the surah (v.1), and why are they fitted to a demand for sincere worship?','بأي اسمين افتُتحت السورة؟','al-Aziz (the Mighty) and al-Hakim (the Wise): might guarantees the command can be enforced, wisdom that it is rightly placed.','standard',1,'draft'),
('QR:Q:39:1:2',39,'QR:SP:39:1-9','QR:AS:39:1',1,9,'analytical','How does the rhetorical question of v.9 define the surahs ideal worshipper?','هل يستوي الذين يعلمون والذين لا يعلمون؟','It fuses worship with knowledge: the night-standing qanit who knows is set above the heedless.','standard',2,'draft'),
('QR:Q:39:1:3',39,'QR:SP:39:1-9','QR:AS:39:1',1,9,'reflective','Where does your own worship become khalis (purely for God) rather than mixed with other motives?',NULL,'Open reflection on ikhlas.','standard',3,'draft'),
('QR:Q:39:2:1',39,'QR:SP:39:10-21','QR:AS:39:2',10,21,'comprehension','Why are the patient promised their reward without measure (v.10)?','بغير حساب','bi-ghayri hisab: the reward of sabr is uncounted, unlike deeds that are weighed.','standard',1,'draft'),
('QR:Q:39:2:2',39,'QR:SP:39:10-21','QR:AS:39:2',10,21,'analytical','What two destinies does the passage contrast, and by which images?',NULL,'Layered canopies of Fire (v.16) against lofty chambers above chambers with rivers (v.20).','standard',2,'draft'),
('QR:Q:39:2:3',39,'QR:SP:39:10-21','QR:AS:39:2',10,21,'reflective','v.18 praises those who follow the best of what they hear - how do you choose the better over the merely good?',NULL,'Reflection on discernment (ahsan al-qawl).','standard',3,'draft'),
('QR:Q:39:3:1',39,'QR:SP:39:22-31','QR:AS:39:3',22,31,'comprehension','What is the difference between a breast expanded to Islam and a hardened heart (v.22)?',NULL,'The first is upon light from its Lord; the second is sealed against remembrance.','standard',1,'draft'),
('QR:Q:39:3:2',39,'QR:SP:39:22-31','QR:AS:39:3',22,31,'analytical','How does the parable of the two slaves (v.29) argue for tawhid?','مثل العبد بين الشركاء','A slave owned by quarreling partners vs one belonging wholly to one master: divided service is conflict, sole ownership is peace.','advanced',2,'draft'),
('QR:Q:39:3:3',39,'QR:SP:39:22-31','QR:AS:39:3',22,31,'reflective','The Quran is called ahsan al-hadith (v.23) - what makes a text the best discourse for you?',NULL,'Reflection on the texts consistency and effect.','standard',3,'draft'),
('QR:Q:39:4:1',39,'QR:SP:39:32-41','QR:AS:39:4',32,41,'comprehension','Who is described as the most unjust in v.32?',NULL,'The one who lies against God and denies the truth when it comes.','standard',1,'draft'),
('QR:Q:39:4:2',39,'QR:SP:39:32-41','QR:AS:39:4',32,41,'analytical','What is the rhetorical force of Is God not sufficient for His servant? (v.36)?','أليس الله بكاف عبده','An istifham taqriri affirming total sufficiency, dissolving reliance on intercessors.','advanced',2,'draft'),
('QR:Q:39:4:3',39,'QR:SP:39:32-41','QR:AS:39:4',32,41,'reflective','v.41 says whoever is guided, it is for his own soul - how does this change your sense of responsibility?',NULL,'Reflection on accountability.','standard',3,'draft'),
('QR:Q:39:5:1',39,'QR:SP:39:42-52','QR:AS:39:5',42,52,'comprehension','How does sleep function as a sign of Gods power over the soul (v.42)?',NULL,'God takes souls at death and in sleep, keeping some and releasing others - sleep is a nightly rehearsal of death.','standard',1,'draft'),
('QR:Q:39:5:2',39,'QR:SP:39:42-52','QR:AS:39:5',42,52,'analytical','To whom does all intercession belong (vv.43-44), and what does this refute?','لله الشفاعة جميعا','To God alone - refuting intercessor-deities.','standard',2,'draft'),
('QR:Q:39:5:3',39,'QR:SP:39:42-52','QR:AS:39:5',42,52,'reflective','v.49: calling on God in distress then forgetting in ease - where do you see this in yourself?',NULL,'Reflection on consistency of gratitude.','standard',3,'draft'),
('QR:Q:39:6:1',39,'QR:SP:39:53-63','QR:AS:39:6',53,63,'comprehension','What condition does the promise that God forgives all sins (v.53) imply?','إن الله يغفر الذنوب جميعا','Turning back and submission before the punishment arrives - it addresses the repentant.','standard',1,'draft'),
('QR:Q:39:6:2',39,'QR:SP:39:53-63','QR:AS:39:6',53,63,'analytical','Why is v.53 called the most hopeful verse, and how do vv.54-55 qualify it?',NULL,'It forbids despair and opens total forgiveness, yet commands repentance before sudden punishment.','advanced',2,'draft'),
('QR:Q:39:6:3',39,'QR:SP:39:53-63','QR:AS:39:6',53,63,'reflective','What alas for my neglect (v.56) might you avoid by turning back now?',NULL,'Reflection on the regret-voices of vv.56-58.','standard',3,'draft'),
('QR:Q:39:7:1',39,'QR:SP:39:64-70','QR:AS:39:7',64,70,'comprehension','What does the question in v.64 expose about being told to worship others than God?','أفغير الله تأمروني أعبد','It brands such a demand as ignorance (jahl): shirk affronts true knowledge of God.','standard',1,'draft'),
('QR:Q:39:7:2',39,'QR:SP:39:64-70','QR:AS:39:7',64,70,'analytical','How does v.67 picture Gods majesty, and why is it theologically debated?',NULL,'The earth in His grasp and the heavens folded in His right hand - a locus of the tashbih/tanzih debate.','advanced',2,'draft'),
('QR:Q:39:7:3',39,'QR:SP:39:64-70','QR:AS:39:7',64,70,'reflective','How does picturing the Day of the trumpet (vv.68-70) reframe your present choices?',NULL,'Reflection on eschatological perspective.','standard',3,'draft'),
('QR:Q:39:8:1',39,'QR:SP:39:71-75','QR:AS:39:8',71,75,'comprehension','Why is the surah named al-Zumar, and what are the two throngs?','الزمر','From zumar (throngs): deniers driven to Hell and the god-fearing led to the Garden, each in crowds.','standard',1,'draft'),
('QR:Q:39:8:2',39,'QR:SP:39:71-75','QR:AS:39:8',71,75,'analytical','How do the greetings at the two gates differ (vv.71-73)?',NULL,'Hells keepers rebuke; the Gardens keepers greet with salamun alaykum, you have done well.','standard',2,'draft'),
('QR:Q:39:8:3',39,'QR:SP:39:71-75','QR:AS:39:8',71,75,'reflective','The surah ends on al-hamd lillahi rabb al-alamin (v.75) - how does ending in praise reframe the judgment?',NULL,'Reflection on praise resolving justice and mercy.','standard',3,'draft');

-- ─── Sentence-structure GOLD example: 39:1 ────────────────────────────────────
-- تَنزِيلُ ٱلۡكِتَٰبِ مِنَ ٱللَّهِ ٱلۡعَزِيزِ ٱلۡحَكِيمِ
-- Mined from Jadwal, Daas, Tibyan(ʿUkbari), Muyassar + Zamakhshari/Abu Hayyan.
DELETE FROM qr_ss_syntax_relations  WHERE id LIKE 'QR:SYN:39:1:%';
DELETE FROM qr_ss_scope_reading     WHERE id LIKE 'QR:SR:39:1:%';
DELETE FROM qr_ss_scope_morph_link  WHERE id LIKE 'QR:SML:39:1:%';
DELETE FROM qr_ss_scope_member_map  WHERE id LIKE 'QR:SMM:39:1:%';
DELETE FROM qr_ss_occ_sentence      WHERE id = 'QR:SS:39:1:s1';

INSERT INTO qr_ss_occ_sentence (id, surah, ayah_from, ayah_to, word_start_index, word_end_index, sentence_kind, lx_sentence_kind_ref, discourse_role, note_md)
VALUES ('QR:SS:39:1:s1',39,1,1,1,6,'nominal','AL:nahw:jumla_ismiyya','opening_declaration','{"irab":"جملة اسمية ابتدائية لا محل لها من الإعراب","mined_from":["qul_jadwal_irab_quran","qul_irab_quran_daas","tibyan_ukbari_irab","qul_irab_muyassar"]}');

INSERT INTO qr_ss_scope_member_map (id, word_occurrence_id, scope_type, scope_id, member_role) VALUES
('QR:SMM:39:1:1','05105199fb4d4c990c832802df','sentence','QR:SS:39:1:s1','mubtada'),
('QR:SMM:39:1:2','691bbaba7cb0dc1c9f88a0776c','sentence','QR:SS:39:1:s1','mudaf_ilayh'),
('QR:SMM:39:1:3','d600c9237f4229cd9466b52d4f','sentence','QR:SS:39:1:s1','harf_jarr'),
('QR:SMM:39:1:4','9189f7d424a53ee5654cc26854','sentence','QR:SS:39:1:s1','ism_majrur_khabar'),
('QR:SMM:39:1:5','9fdfcfd8ecca437b7f66dc0081','sentence','QR:SS:39:1:s1','naat_or_badal'),
('QR:SMM:39:1:6','c1d913e3a6a613c86462751840','sentence','QR:SS:39:1:s1','naat_or_badal');

INSERT INTO qr_ss_scope_morph_link (id, scope_type, scope_id, lx_morph_ref, irab_position, irab_sign, syntactic_function, is_disputed, dispute_note, note_md) VALUES
('QR:SML:39:1:1','word','05105199fb4d4c990c832802df','AL:nahw:mubtada','rafa','damma','mubtada',1,'Jadwal records an alternative: khabar of an omitted mubtada (taqdir: hadha tanzil), with min Allah attached to the masdar','{"sources":["qul_jadwal_irab_quran","qul_irab_quran_daas","tibyan_ukbari_irab"]}'),
('QR:SML:39:1:2','word','691bbaba7cb0dc1c9f88a0776c','AL:nahw:mudaf_ilayh','jarr','kasra','mudaf_ilayh',0,NULL,'{"sources":["qul_irab_quran_daas"]}'),
('QR:SML:39:1:3','word','d600c9237f4229cd9466b52d4f','AL:nahw:harf_jarr',NULL,NULL,'harf_jarr',0,NULL,'{"sources":["qul_irab_muyassar","qul_irab_quran_daas"]}'),
('QR:SML:39:1:4','word','9189f7d424a53ee5654cc26854','AL:nahw:ism_majrur','jarr','kasra','majrur_bi_min; al-jar wa-l-majrur fi mahall raf khabar',0,NULL,'{"sources":["qul_irab_muyassar","qul_jadwal_irab_quran"]}'),
('QR:SML:39:1:5','word','9fdfcfd8ecca437b7f66dc0081','AL:nahw:naat','jarr','kasra','naat',1,'Daas reads al-Aziz as badal of the divine name; the jumhur read it as naat/sifa','{"sources":["qul_irab_quran_daas"]}'),
('QR:SML:39:1:6','word','c1d913e3a6a613c86462751840','AL:nahw:naat','jarr','kasra','naat',1,'Daas reads al-Hakim as badal; the jumhur read it as naat/sifa','{"sources":["qul_irab_quran_daas"]}');

INSERT INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, paradigm_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md) VALUES
('QR:SR:39:1:r1','word','05105199fb4d4c990c832802df','qul_jadwal_irab_quran;qul_irab_quran_daas;tibyan_ukbari_irab','jumhur','irab','AL:irab:rafa_bi_ibtida','tanzil is the inchoative (mubtada), nominative; its predicate is the prepositional phrase min Allah. The reading of the majority of the iʿrāb books.','تنزيلُ: مبتدأ مرفوع، وخبره الجار والمجرور (مِنَ اللهِ)؛ وهو قول جمهور كتب الإعراب.',0,1,'{"books":["qul_jadwal_irab_quran","qul_irab_quran_daas","tibyan_ukbari_irab"]}'),
('QR:SR:39:1:r2','word','05105199fb4d4c990c832802df','qul_jadwal_irab_quran;QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-;QR:WORK:ABU_HAYYAN:AL-BAHR-AL-M','minority','irab','AL:irab:khabar_li_mahdhuf','tanzil is the predicate of an omitted inchoative (taqdir: hadha tanzil), and min Allah attaches to the verbal noun. Recorded by Jadwal as an alternative and discussed by Zamakhshari and Abu Hayyan.','تنزيلُ: خبر لمبتدأ محذوف تقديره (هذا)، و(مِنَ اللهِ) متعلّق بالمصدر تنزيل؛ ذكره الجدول وجهًا ثانيًا، وبحثه الزمخشري وأبو حيّان.',1,1,'{"books":["qul_jadwal_irab_quran"],"tafsir":["QR:WORK:ZAMAKHSHARI","QR:WORK:ABU_HAYYAN"]}'),
('QR:SR:39:1:r3','word','9fdfcfd8ecca437b7f66dc0081','jumhur','jumhur','irab','AL:irab:naat','al-Aziz al-Hakim are naʿt (adjectival qualifiers) of the divine name, genitive; the reading of the majority.','العزيزِ الحكيمِ: نعتان (صفتان) للفظ الجلالة، مجروران؛ وهو قول الجمهور.',0,1,'{}'),
('QR:SR:39:1:r4','word','9fdfcfd8ecca437b7f66dc0081','qul_irab_quran_daas','minority','irab','AL:irab:badal','al-Aziz al-Hakim are badal (substitution) for the divine name rather than naʿt; recorded by al-Daas.','العزيزِ الحكيمِ: بدلٌ من لفظ الجلالة لا نعتٌ؛ ذكره الدعّاس.',1,1,'{"books":["qul_irab_quran_daas"]}');

INSERT INTO qr_ss_syntax_relations (id, surah, ayah, head_word_id, dep_word_id, relation_label, lx_rel_type_ref, note_md) VALUES
('QR:SYN:39:1:1',39,1,'05105199fb4d4c990c832802df','691bbaba7cb0dc1c9f88a0776c','idafa_mudaf_ilayh','AL:nahw:idafa','{"head":"تنزيل","dep":"الكتاب"}'),
('QR:SYN:39:1:2',39,1,'05105199fb4d4c990c832802df','d600c9237f4229cd9466b52d4f','khabar_jar_majrur','AL:nahw:khabar','{"head":"تنزيل","dep":"من","note":"al-jar wa-l-majrur in mahall raf khabar"}'),
('QR:SYN:39:1:3',39,1,'d600c9237f4229cd9466b52d4f','9189f7d424a53ee5654cc26854','majrur_bi_harf','AL:nahw:jar_majrur','{"head":"من","dep":"الله"}'),
('QR:SYN:39:1:4',39,1,'9189f7d424a53ee5654cc26854','9fdfcfd8ecca437b7f66dc0081','naat_or_badal','AL:nahw:naat','{"head":"الله","dep":"العزيز","disputed":true}'),
('QR:SYN:39:1:5',39,1,'9189f7d424a53ee5654cc26854','c1d913e3a6a613c86462751840','naat_or_badal','AL:nahw:naat','{"head":"الله","dep":"الحكيم","disputed":true}');
