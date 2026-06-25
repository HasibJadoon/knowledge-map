-- Surah 39:2 — full multi-layer sentence structure (gold), rooted in the iʿrāb
-- books (Daas word-by-word, Muyassar, Jadwal) and tafsīr. Domain: QR (km_quran).
--
-- Demonstrates the 1:M verse→sentence model: 39:2 is TWO jumlas, so it has two
-- qr_ss_occ_sentence rows (not one container):
--   s1  إنّا أنزلنا إليك الكتاب بالحق   — nominal, emphatic (inna); khabar = the
--                                         verbal sub-clause (أنزلنا ...).
--   s2  فاعبد الله مخلصا له الدين        — imperative, branched by the fāʾ.
-- Layers: 3 clauses, 10 member maps, 10 per-word morph links, 4 readings (2
-- disputed: bi-l-ḥaqq, al-dīn) + synthesis, 2 balāgha, 3 curated evidence items.
-- Idempotent (INSERT OR REPLACE / deterministic ids).

-- Two sentences (1 verse : M sentences).
INSERT OR REPLACE INTO qr_ss_occ_sentence (id, surah, ayah_from, ayah_to, word_start_index, word_end_index, sentence_kind, lx_sentence_kind_ref, discourse_role, note_md) VALUES
('QR:SS:39:2:s1',39,2,2,1,5,'nominal','AL:nahw:jumla_ismiyya','tawkid_tanzil','{"text":"إنّا أنزلنا إليك الكتاب بالحق","kind":"جملة اسمية مؤكدة بإنّ، خبرها جملة (أنزلنا) الفعلية","verse_sentence":"1 of 2","gold":true}'),
('QR:SS:39:2:s2',39,2,2,6,10,'imperative','AL:nahw:jumla_filiyya','command_ikhlas','{"text":"فاعبد الله مخلصا له الدين","kind":"جملة فعلية أمرية استئنافية مفرّعة بالفاء، لا محل لها","verse_sentence":"2 of 2","gold":true}');

-- Clauses: main nominal (inna) + verbal khabar sub-clause (s1); imperative (s2).
INSERT OR REPLACE INTO qr_ss_occ_clause (id, sentence_id, parent_clause_id, clause_order, surah, ayah_from, ayah_to, word_start_index, word_end_index, clause_type, lx_clause_type_ref, clause_function, governing_particle, is_elliptical, note_md) VALUES
('QR:CL:39:2:c1','QR:SS:39:2:s1',NULL,1,39,2,2,1,5,'main','AL:nahw:jumla_ismiyya','tawkidiyya','إنّ',0,'{"text":"إنّا أنزلنا إليك الكتاب بالحق"}'),
('QR:CL:39:2:c1k','QR:SS:39:2:s1','QR:CL:39:2:c1',2,39,2,2,2,5,'subordinate','AL:nahw:jumla_filiyya','khabar_inna','إنّ',0,'{"text":"أنزلنا إليك الكتاب بالحق","mahal":"في محل رفع خبر إنّ"}'),
('QR:CL:39:2:c2','QR:SS:39:2:s2',NULL,1,39,2,2,6,10,'main','AL:nahw:jumla_filiyya','istinafiyya_mufarraa','الفاء',0,'{"text":"فاعبد الله مخلصا له الدين","note":"الفاء فاء الفصيحة"}');

-- Per-word iʿrāb (rooted in Daas).
INSERT OR REPLACE INTO qr_ss_scope_morph_link (id, scope_type, scope_id, lx_morph_ref, irab_position, irab_sign, syntactic_function, is_disputed, dispute_note, note_md) VALUES
('QR:SML:39:2:1','word','31c591b8ed71d4ccca274a54e0','AL:nahw:inna_wa_ismuha','nasb',NULL,'إنّ حرف توكيد ونصب + (نا) اسمها في محل نصب',0,NULL,'{"book":"qul_irab_quran_daas"}'),
('QR:SML:39:2:2','word','74a5417b51814c06c1faf8382f','AL:nahw:fiil_madi','rafa_mahalli',NULL,'فعل ماضٍ مبني والفاعل (نا)؛ والجملة في محل رفع خبر إنّ',0,NULL,'{"book":"qul_irab_quran_daas"}'),
('QR:SML:39:2:3','word','54716fd4067cc9b796c03c5bc1','AL:nahw:jar_majrur','jarr',NULL,'جار ومجرور متعلق بـ(أنزلنا)',0,NULL,'{"book":"qul_irab_quran_daas"}'),
('QR:SML:39:2:4','word','da06e7da5a173d2cd74aef63b5','AL:nahw:maful_bihi','nasb','fatha','مفعول به منصوب',0,NULL,'{"book":"qul_irab_quran_daas"}'),
('QR:SML:39:2:5','word','d84e15ff6e444fdb40dac1dd1b','AL:nahw:jar_majrur','jarr',NULL,'جار ومجرور',1,'الدعّاس: متعلق بأنزلنا؛ وقيل حال','{"book":"qul_irab_quran_daas"}'),
('QR:SML:39:2:6','word','03fd1855a169e6974e314d2c53','AL:nahw:fiil_amr','jazm_mahalli',NULL,'الفاء فصيحة + فعل أمر مبني والفاعل مستتر تقديره أنت',0,NULL,'{}'),
('QR:SML:39:2:7','word','2b76840b1b81243e0c4fb4fe18','AL:nahw:maful_bihi','nasb','fatha','لفظ الجلالة مفعول به منصوب',0,NULL,'{"book":"qul_irab_quran_daas"}'),
('QR:SML:39:2:8','word','712505b4f9ce9fc177a6647aa3','AL:nahw:hal','nasb','fatha','حال منصوب من فاعل (اعبد)',0,NULL,'{"book":"qul_irab_quran_daas"}'),
('QR:SML:39:2:9','word','69a3e78ce4c223c2c90d0d3244','AL:nahw:jar_majrur','jarr',NULL,'جار ومجرور متعلق بـ(مخلصا)',0,NULL,'{"book":"qul_irab_quran_daas"}'),
('QR:SML:39:2:10','word','aceaac3eefa264d69057d533b2','AL:nahw:maful_bihi','nasb','fatha','مفعول به لاسم الفاعل (مخلصا) منصوب',1,'وقيل منصوب على نزع الخافض','{"book":"qul_irab_quran_daas"}');

-- Member maps split across the two sentences.
INSERT OR REPLACE INTO qr_ss_scope_member_map (id, word_occurrence_id, scope_type, scope_id, member_role) VALUES
('QR:SMM:39:2:1','31c591b8ed71d4ccca274a54e0','sentence','QR:SS:39:2:s1','inna_wa_ismuha'),
('QR:SMM:39:2:2','74a5417b51814c06c1faf8382f','sentence','QR:SS:39:2:s1','khabar_inna_fiil'),
('QR:SMM:39:2:3','54716fd4067cc9b796c03c5bc1','sentence','QR:SS:39:2:s1','jar_majrur'),
('QR:SMM:39:2:4','da06e7da5a173d2cd74aef63b5','sentence','QR:SS:39:2:s1','maful_bihi'),
('QR:SMM:39:2:5','d84e15ff6e444fdb40dac1dd1b','sentence','QR:SS:39:2:s1','jar_majrur_hal'),
('QR:SMM:39:2:6','03fd1855a169e6974e314d2c53','sentence','QR:SS:39:2:s2','fiil_amr'),
('QR:SMM:39:2:7','2b76840b1b81243e0c4fb4fe18','sentence','QR:SS:39:2:s2','maful_bihi'),
('QR:SMM:39:2:8','712505b4f9ce9fc177a6647aa3','sentence','QR:SS:39:2:s2','hal'),
('QR:SMM:39:2:9','69a3e78ce4c223c2c90d0d3244','sentence','QR:SS:39:2:s2','jar_majrur'),
('QR:SMM:39:2:10','aceaac3eefa264d69057d533b2','sentence','QR:SS:39:2:s2','maful_bihi');

-- Evidence (curated, per book) + readings (2 disputed) + synthesis + balāgha + links.
INSERT OR REPLACE INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, is_disputed, source_ref, note_md) VALUES
('QR:EV:39:2:daas','irab_book','إعراب القرآن لداعس','39:2','Daas word-by-word iʿrāb of 39:2','إنّ واسمها، وجملة (أنزلنا) خبر إنّ؛ إليك: متعلق؛ الكتاب: مفعول به؛ بالحق: متعلق بأنزلنا؛ فاعبد: أمر وفاعله مستتر؛ الله: مفعول به؛ مخلصا: حال؛ له: متعلق؛ الدين: مفعول به لاسم الفاعل (مخلصا)',1,'QR:WORK:QUL:DAAS:IRAB_QURAN','{"slug":"qul_irab_quran_daas"}'),
('QR:EV:39:2:muyassar','irab_book','الإعراب الميسر','39:2','Muyassar: clause-level structure','(إنّا أنزلنا إليك الكتاب بالحق) جملة مؤكدة بإنّ؛ (فاعبد الله مخلصا له الدين) جملة أمرية بإخلاص العبادة',0,'QR:WORK:QUL:MUYASSAR:IRAB','{"slug":"qul_irab_muyassar"}'),
('QR:EV:39:2:jadwal','irab_book','الجدول في إعراب القرآن','39:2','Jadwal: the fā and the maʿmūl of mukhlisan','الفاء فاء الفصيحة والجملة استئنافية لا محل لها؛ و(الدين) مفعول به لاسم الفاعل (مخلصا)',0,'QR:WORK:QUL:520:JADWAL_IRAB','{"slug":"qul_jadwal_irab_quran"}');

INSERT OR REPLACE INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md) VALUES
('QR:SR:39:2:r1','word','d84e15ff6e444fdb40dac1dd1b','qul_irab_quran_daas','irab','AL:irab:taalluq','bi-l-ḥaqq attaches to anzalna','بالحقِّ: متعلق بـ(أنزلنا)',0,1,'{"book":"qul_irab_quran_daas"}'),
('QR:SR:39:2:r2','word','d84e15ff6e444fdb40dac1dd1b','jumhur','irab','AL:irab:hal','bi-l-ḥaqq is a ḥāl','بالحقِّ: حال من الكتاب أو من الفاعل',1,1,'{}'),
('QR:SR:39:2:r3','word','aceaac3eefa264d69057d533b2','qul_irab_quran_daas;qul_jadwal_irab_quran','irab','AL:irab:maful_ism_fail','al-dīn is the object of the active participle mukhlisan','الدينَ: مفعول به لاسم الفاعل (مخلصًا)',0,1,'{"books":["qul_irab_quran_daas","qul_jadwal_irab_quran"]}'),
('QR:SR:39:2:r4','word','aceaac3eefa264d69057d533b2','jumhur','irab','AL:irab:naz_al_khafid','al-dīn manṣūb by removal of the preposition','الدينَ: منصوب على نزع الخافض (مخلصًا له في الدين)',1,1,'{}'),
('QR:SR:39:2:synth','sentence','QR:SS:39:2:s1','synthesis:irab-books+tafsir','synthesis','AL:irab:synthesis','Synthesis: 39:2 is two jumlas (emphatic inna assertion + fāʾ-branched imperative); books agree on the skeleton, differ on bi-l-ḥaqq (taʿalluq vs ḥāl) and al-dīn (object of the participle vs nazʿ al-khāfiḍ); tafsīr reads it as the founding command of ikhlāṣ.','خلاصة 39:2: جملتان؛ اتفقت الكتب على الهيكل واختلفت في (بالحق) و(الدين)؛ والتفسير تأسيس الأمر بالإخلاص.',0,0,'{"synthesis":true,"sentences":["QR:SS:39:2:s1","QR:SS:39:2:s2"]}');

INSERT OR REPLACE INTO qr_ss_scope_balagha_link (id, scope_type, scope_id, lx_balagha_ref, balagha_category, rhetorical_effect, note_md) VALUES
('QR:BAL:39:2:1','sentence','QR:SS:39:2:s2','AL:balagha:tafri','ilm_al_maani','The fāʾ al-faṣīḥa branches the command on its premise: since We sent the Book in truth, therefore worship God.','{"device":"فاء الفصيحة / تفريع الأمر على الإنزال"}'),
('QR:BAL:39:2:2','word','712505b4f9ce9fc177a6647aa3','AL:balagha:qasr','badi','mukhlisan lahu al-dīn foregrounds exclusivity (ikhlāṣ).','{"device":"تقييد بالحال لإفادة القصر"}');

INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type) VALUES
('QR:SR:39:2:r1','QR:EV:39:2:daas','supports'),
('QR:SR:39:2:r3','QR:EV:39:2:daas','supports'),
('QR:SR:39:2:r3','QR:EV:39:2:jadwal','supports'),
('QR:SR:39:2:synth','QR:EV:39:2:daas','supports'),
('QR:SR:39:2:synth','QR:EV:39:2:muyassar','supports'),
('QR:SR:39:2:synth','QR:EV:39:2:jadwal','supports');
