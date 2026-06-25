-- Surah 39 Passage 1 (verses 3-9) — 1:M sentence structure (the verse:many-
-- sentences rule). Domain: QR (km_quran). Splits each long verse into its
-- jumlas (sentences) + a main clause each, and reassigns member maps to the
-- correct sentence by word-index range. Verses 1-2 are gold already.
-- Run AFTER the reconcile/word-link seeds. Idempotent.

INSERT OR REPLACE INTO qr_ss_occ_sentence (id, surah, ayah_from, ayah_to, word_start_index, word_end_index, sentence_kind, lx_sentence_kind_ref, discourse_role, note_md) VALUES
('QR:SS:39:3:s1',39,3,3,1,4,'nominal','AL:nahw:jumla_ismiyya','tawhid_assertion','{"text":"ألا لله الدين الخالص"}'),
('QR:SS:39:3:s2',39,3,3,5,16,'nominal','AL:nahw:jumla_ismiyya','mushrikun_claim','{"text":"والذين اتخذوا من دونه أولياء ما نعبدهم إلا ليقربونا إلى الله زلفى"}'),
('QR:SS:39:3:s3',39,3,3,17,25,'verbal','AL:nahw:jumla_filiyya','divine_judgment','{"text":"إن الله يحكم بينهم فيما هم فيه يختلفون"}'),
('QR:SS:39:3:s4',39,3,3,26,33,'verbal','AL:nahw:jumla_filiyya','guidance_denied','{"text":"إن الله لا يهدي من هو كاذب كفار"}'),
('QR:SS:39:4:s1',39,4,4,1,11,'conditional','AL:nahw:jumla_shartiyya','refutation_walad','{"text":"لو أراد الله أن يتخذ ولدا لاصطفى مما يخلق ما يشاء"}'),
('QR:SS:39:4:s2',39,4,4,12,12,'exclamatory','AL:nahw:jumla_ismiyya','tasbih','{"text":"سبحانه"}'),
('QR:SS:39:4:s3',39,4,4,13,16,'nominal','AL:nahw:jumla_ismiyya','tawhid','{"text":"هو الله الواحد القهار"}'),
('QR:SS:39:5:s1',39,5,5,1,4,'verbal','AL:nahw:jumla_filiyya','creation_sign','{"text":"خلق السماوات والأرض بالحق"}'),
('QR:SS:39:5:s2',39,5,5,5,12,'verbal','AL:nahw:jumla_filiyya','day_night','{"text":"يكور الليل على النهار ويكور النهار على الليل"}'),
('QR:SS:39:5:s3',39,5,5,13,15,'verbal','AL:nahw:jumla_filiyya','sun_moon','{"text":"وسخر الشمس والقمر"}'),
('QR:SS:39:5:s4',39,5,5,16,19,'nominal','AL:nahw:jumla_ismiyya','each_runs_term','{"text":"كل يجري لأجل مسمى"}'),
('QR:SS:39:5:s5',39,5,5,20,23,'nominal','AL:nahw:jumla_ismiyya','divine_names','{"text":"ألا هو العزيز الغفار"}'),
('QR:SS:39:6:s1',39,6,6,1,14,'verbal','AL:nahw:jumla_filiyya','creation_man','{"text":"خلقكم من نفس واحدة ثم جعل منها زوجها وأنزل لكم من الأنعام ثمانية أزواج"}'),
('QR:SS:39:6:s2',39,6,6,15,25,'verbal','AL:nahw:jumla_filiyya','creation_wombs','{"text":"يخلقكم في بطون أمهاتكم خلقا من بعد خلق في ظلمات ثلاث"}'),
('QR:SS:39:6:s3',39,6,6,26,30,'nominal','AL:nahw:jumla_ismiyya','that_is_God','{"text":"ذلكم الله ربكم له الملك"}'),
('QR:SS:39:6:s4',39,6,6,31,34,'nominal','AL:nahw:jumla_ismiyya','la_ilaha','{"text":"لا إله إلا هو"}'),
('QR:SS:39:6:s5',39,6,6,35,36,'interrogative','AL:nahw:jumla_filiyya','how_turned','{"text":"فأنى تصرفون"}'),
('QR:SS:39:7:s1',39,7,7,1,6,'conditional','AL:nahw:jumla_shartiyya','if_disbelieve','{"text":"إن تكفروا فإن الله غني عنكم"}'),
('QR:SS:39:7:s2',39,7,7,7,10,'verbal','AL:nahw:jumla_filiyya','not_pleased_kufr','{"text":"ولا يرضى لعباده الكفر"}'),
('QR:SS:39:7:s3',39,7,7,11,14,'conditional','AL:nahw:jumla_shartiyya','if_grateful','{"text":"وإن تشكروا يرضه لكم"}'),
('QR:SS:39:7:s4',39,7,7,15,19,'verbal','AL:nahw:jumla_filiyya','no_bearer','{"text":"ولا تزر وازرة وزر أخرى"}'),
('QR:SS:39:7:s5',39,7,7,20,27,'nominal','AL:nahw:jumla_ismiyya','return_to_Lord','{"text":"ثم إلى ربكم مرجعكم فينبئكم بما كنتم تعملون"}'),
('QR:SS:39:7:s6',39,7,7,28,31,'verbal','AL:nahw:jumla_filiyya','knower_of_breasts','{"text":"إنه عليم بذات الصدور"}'),
('QR:SS:39:8:s1',39,8,8,1,8,'conditional','AL:nahw:jumla_shartiyya','distress_calls','{"text":"وإذا مس الإنسان ضر دعا ربه منيبا إليه"}'),
('QR:SS:39:8:s2',39,8,8,9,26,'conditional','AL:nahw:jumla_shartiyya','favor_forgets','{"text":"ثم إذا خوله نعمة منه نسي ما كان يدعو إليه من قبل وجعل لله أندادا ليضل عن سبيله"}'),
('QR:SS:39:8:s3',39,8,8,27,30,'imperative','AL:nahw:jumla_filiyya','enjoy_kufr','{"text":"قل تمتع بكفرك قليلا"}'),
('QR:SS:39:8:s4',39,8,8,31,34,'verbal','AL:nahw:jumla_filiyya','companion_of_fire','{"text":"إنك من أصحاب النار"}'),
('QR:SS:39:9:s1',39,9,9,1,12,'interrogative','AL:nahw:jumla_ismiyya','the_qanit','{"text":"أمن هو قانت آناء الليل ساجدا وقائما يحذر الآخرة ويرجو رحمة ربه"}'),
('QR:SS:39:9:s2',39,9,9,13,20,'imperative','AL:nahw:jumla_filiyya','knower_vs_ignorant','{"text":"قل هل يستوي الذين يعلمون والذين لا يعلمون"}'),
('QR:SS:39:9:s3',39,9,9,21,24,'verbal','AL:nahw:jumla_filiyya','only_ulul_albab','{"text":"إنما يتذكر أولو الألباب"}');

INSERT OR REPLACE INTO qr_ss_occ_clause (id, sentence_id, parent_clause_id, clause_order, surah, ayah_from, ayah_to, word_start_index, word_end_index, clause_type, lx_clause_type_ref, clause_function, governing_particle, is_elliptical, note_md)
SELECT 'QR:CLG:'||substr(s.id,7), s.id, NULL, 1, s.surah, s.ayah_from, s.ayah_to, s.word_start_index, s.word_end_index,
  'main', s.lx_sentence_kind_ref, s.discourse_role, NULL, 0, '{"generated":true}'
FROM qr_ss_occ_sentence s WHERE s.id LIKE 'QR:SS:39:%' AND s.ayah_from BETWEEN 3 AND 9;

-- Reassign member maps to the correct sentence by word-index range (per verse).
-- (CASE-by-range UPDATEs were applied directly in D1; see the verse ranges in
-- the sentence rows above. Re-derive with the same ranges if reapplying.)
