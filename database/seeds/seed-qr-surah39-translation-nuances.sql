-- Surah 39 Passage 1 — translation nuances for the key verses, stored in the
-- dedicated nuance table (qr_ss_scope_nuance, nuance_type='translation_nuance').
-- Captures where the Arabic carries a nuance lost or varied in translation
-- (sigha, hasr, tadmin, hadhf), so it surfaces when translating key verses.
-- Domain: QR (km_quran). Idempotent.

INSERT OR REPLACE INTO qr_ss_scope_nuance (id, scope_type, scope_id, nuance_type, lx_nuance_type_ref, nuance_text, nuance_text_ar, note_md) VALUES
('QR:TN:39:1:1','word','05105199fb4d4c990c832802df','translation_nuance','AL:translation:sigha','tanzil is a form-II masdar connoting gradual, emphatic sending-down; plain "revelation" loses the gradualness.','تنزيل: مصدر للتدريج والتكثير','{"verse":"39:1","term":"تنزيل"}'),
('QR:TN:39:3:1','sentence','QR:SS:39:3:s1','translation_nuance','AL:translation:hasr','al-din al-khalis = devotion rendered purely/exclusively to God, not merely "the pure religion".','الدين الخالص: العبادة الخالصة لله وحده','{"verse":"39:3","term":"الدين الخالص"}'),
('QR:TN:39:3:2','sentence','QR:SS:39:3:s1','translation_nuance','AL:translation:tadmin','zulfa intensifies nearness; translators vary in rendering "to bring us nearer to God".','زلفى: تأكيد القربة','{"verse":"39:3","term":"زلفى"}'),
('QR:TN:39:9:1','sentence','QR:SS:39:9:s1','translation_nuance','AL:translation:hadhf','amman: an elided comparison; the second term is omitted in Arabic and must be supplied when translating.','أمّن: حذف الطرف الثاني من المقابلة','{"verse":"39:9","term":"أمّن"}'),
('QR:TN:39:9:2','word','e037cf0c58cbe9ec19692f9d08','translation_nuance','AL:translation:dilala','qanit = devoutly obedient, standing through the night (qunut); not mere "obedient".','قانت: دوام الطاعة والقيام','{"verse":"39:9","term":"قانت"}'),
('QR:TN:39:9:3','sentence','QR:SS:39:9:s1','translation_nuance','AL:translation:hadhf_al_maful','yaʿlamun is left absolute (no object); translators differ whether to supply "who know [the truth]".','يعلمون: حذف مفعوله ليعمّ','{"verse":"39:9","term":"يعلمون"}');
