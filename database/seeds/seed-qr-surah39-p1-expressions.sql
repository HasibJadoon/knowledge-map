-- Surah 39 Passage 1 — Expressions module (close audit gap B). Domain: QR.
-- (1) qr_ss_occ_phrase: QR-owned grammatical expression units (iḍāfa, jar-majrūr,
--     naʿt) for verses 3-9, incl. famous expressions (ẓulumāt thalāth, ānāʾ
--     al-layl, ūlū al-albāb).
-- (2) qr_ss_scope_nuance (nuance_type='near_synonym'): wires AL near-synonym sets
--     into QR via the typed AL: reference (bridge = km_arabic_linguistic
--     ar_ling_quran_links, qr_scope_ref=39:N): dīn/Religion (3), takwīr/coil (5),
--     kull/Whole (8), ānāʾ/Time (9).
-- The Expressions study task (UT:C:QURAN:39:1-9:EXP:400) is set 'live' with these
-- sources + the AL bridge. Idempotent.

INSERT OR REPLACE INTO qr_ss_occ_phrase (id, clause_id, phrase_order, surah, ayah, word_start_index, word_end_index, phrase_type, lx_phrase_type_ref, phrase_function, head_word_id, note_md)
SELECT x.id, x.clause_id, x.po, 39, x.ayah, x.ws, x.we, x.ptype, x.lxt, x.pfunc,
       (SELECT id FROM qr_word_occurrences WHERE surah=39 AND ayah=x.ayah AND word_index=x.ws), x.note
FROM (
  SELECT 'QR:PH:39:3:1' id,'QR:CLG:39:3:s1' clause_id,1 po,3 ayah,3 ws,4 we,'naat_compound' ptype,'AL:nahw:naat' lxt,'mubtada' pfunc,'{"text":"الدين الخالص","expression":true}' note
  UNION ALL SELECT 'QR:PH:39:3:2','QR:CLG:39:3:s2',2,3,7,8,'jar_majrur','AL:nahw:jar_majrur','mutaalliq','{"text":"من دونه"}'
  UNION ALL SELECT 'QR:PH:39:6:1','QR:CLG:39:6:s2',1,6,24,25,'naat_phrase','AL:nahw:naat','majrur','{"text":"ظلمات ثلاث"}'
) x;
INSERT OR REPLACE INTO qr_ss_occ_phrase (id, clause_id, phrase_order, surah, ayah, word_start_index, word_end_index, phrase_type, lx_phrase_type_ref, phrase_function, head_word_id, note_md)
SELECT x.id, x.clause_id, x.po, 39, x.ayah, x.ws, x.we, x.ptype, x.lxt, x.pfunc,
       (SELECT id FROM qr_word_occurrences WHERE surah=39 AND ayah=x.ayah AND word_index=x.ws), x.note
FROM (
  SELECT 'QR:PH:39:9:1' id,'QR:CLG:39:9:s1' clause_id,1 po,9 ayah,4 ws,5 we,'idafa' ptype,'AL:nahw:idafa' lxt,'zarf_zaman' pfunc,'{"text":"آناء الليل","expression":true}' note
  UNION ALL SELECT 'QR:PH:39:9:2','QR:CLG:39:9:s1',2,9,11,12,'idafa','AL:nahw:idafa','maful_bihi','{"text":"رحمة ربه"}'
  UNION ALL SELECT 'QR:PH:39:9:3','QR:CLG:39:9:s3',1,9,23,24,'idafa','AL:nahw:idafa','fail','{"text":"أولو الألباب","expression":true}'
) x;

INSERT OR REPLACE INTO qr_ss_scope_nuance (id, scope_type, scope_id, nuance_type, lx_nuance_type_ref, nuance_text, nuance_text_ar, note_md) VALUES
('QR:NSY:39:3:1','sentence','QR:SS:39:3:s1','near_synonym','AL:NSM:RELIGION:RELIGION','din (in al-din al-khalis) from the RELIGION near-synonym set; distinct from milla (creed community) and shirʿa (law).','دِين: من حقل الترادف؛ يقابل الملّة والشِّرعة','{"al_entity_ref":"NSM:RELIGION:RELIGION","bridge":"ar_ling_quran_links","qr_scope_ref":"39:3"}'),
('QR:NSY:39:5:1','sentence','QR:SS:39:5:s2','near_synonym','AL:NSM:TO:TO_COIL_ENWRAP','yukawwir from the coil/enwrap field (cf. tawa in 39:67 matwiyyat).','يُكوِّر: من حقل الطيّ/التكوير','{"al_entity_ref":"NSM:TO:TO_COIL_ENWRAP","bridge":"ar_ling_quran_links","qr_scope_ref":"39:5"}'),
('QR:NSY:39:8:1','sentence','QR:SS:39:8:s1','near_synonym','AL:NSM:WHOLE:WHOLE_ENTIRE_ALL','the totality/whole field attested here (kull and kin).','حقل الكُلّ/الجميع','{"al_entity_ref":"NSM:WHOLE:WHOLE_ENTIRE_ALL","bridge":"ar_ling_quran_links","qr_scope_ref":"39:8"}'),
('QR:NSY:39:9:1','sentence','QR:SS:39:9:s1','near_synonym','AL:NSM:TIME:TIME','anaʾ (al-layl) from the TIME set; distinct from saʿa, hin, waqt; the successive watches of the night.','آناء الليل: من حقل الزمن؛ يقابل ساعة وحين ووقت','{"al_entity_ref":"NSM:TIME:TIME","bridge":"ar_ling_quran_links","qr_scope_ref":"39:9"}');

UPDATE qr_surah_study_tasks
SET task_json='{"task_key":"expressions","unit_id":"U:C:QURAN:39:1-9","surah":39,"ayah_from":1,"ayah_to":9,"sources":["qr_ss_occ_phrase","qr_ss_scope_balagha_link","qr_ss_scope_nuance"],"nuance_filter":"near_synonym","mapped_from":["AL:ar_ling_near_synonym_sets","AL:ar_ling_expressions"],"bridge":"AL.ar_ling_quran_links","resolve":"by_ayah_range","availability":"live"}'
WHERE id='UT:C:QURAN:39:1-9:EXP:400';
