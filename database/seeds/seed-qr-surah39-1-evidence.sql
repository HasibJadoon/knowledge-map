-- Surah 39:1 — normalized source provenance + nuances, per the schema model.
-- Domain: QR (km_quran).
--
-- The schema captures sources NOT in note_md JSON but in dedicated tables:
--   - qr_evidence_items                 : one row per source quote, with
--                                         source_ref -> canonical work entity
--                                         (qr_irab_sources / qr_scholar_works)
--                                         and content_text_ar = the actual text.
--   - qr_ss_scope_reading_evidence_link : reading <-> evidence (support_type
--                                         supports|contests), so each grammatical
--                                         reading is backed by its books.
--   - qr_ss_scope_nuance                : discourse-force / balāgha nuances
--                                         (the dedicated nuance table).
--
-- This replaces the ad-hoc citations previously kept in reading note_md.
-- Idempotent (INSERT OR REPLACE keyed by deterministic ids).

-- Evidence items: 5 iʿrāb books + 8 tafsīr works.
INSERT OR REPLACE INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, is_disputed, source_ref, note_md) VALUES
('QR:EV:39:1:jadwal','irab_book','الجدول في إعراب القرآن','39:1','Jadwal: tanzil = mubtadaʾ marfuʿ, predicate min Allah; also allows khabar of omitted mubtadaʾ','تنزيلُ: مبتدأ مرفوع وخبره الجار والمجرور (من الله)؛ ويجوز أن يكون خبرًا لمبتدأ محذوف',0,'QR:WORK:QUL:520:JADWAL_IRAB','{"slug":"qul_jadwal_irab_quran"}'),
('QR:EV:39:1:daas','irab_book','إعراب القرآن لداعس','39:1','Daas: tanzil mubtadaʾ, al-kitab muḍāf ilayh, al-Aziz al-Hakim = badal of the divine name','تنزيل: مبتدأ، الكتاب: مضاف إليه، العزيز الحكيم: بدل من لفظ الجلالة',1,'QR:WORK:QUL:DAAS:IRAB_QURAN','{"slug":"qul_irab_quran_daas","distinctive":"badal"}'),
('QR:EV:39:1:tibyan','irab_book','التبيان في إعراب القرآن (العكبري)','39:1','Tibyan: treats تنزيل الكتاب (the iḍāfa) as the mubtadaʾ','تنزيل الكتاب: مبتدأ',0,'QR:WORK:TIBYAN:UKBARI:IRAB','{"slug":"tibyan_ukbari_irab"}'),
('QR:EV:39:1:darwish','irab_book','إعراب القرآن الكريم وبيانه (درويش)','39:1','Darwish: tanzil = mubtadaʾ (concise)','تنزيل: مبتدأ',0,'QR:WORK:QUL:DARWISH:IRAB','{"slug":"qul_irab_darwish"}'),
('QR:EV:39:1:muyassar','irab_book','الإعراب الميسر','39:1','Muyassar: min Allah = jar-majrūr in mahall rafʿ khabar','(من الله): جار ومجرور في محل رفع خبر',0,'QR:WORK:QUL:MUYASSAR:IRAB','{"slug":"qul_irab_muyassar"}'),
('QR:EV:39:1:zamakhshari','tafsir','الكشاف','QR:TE:3e5712d7c83777c395e4a310','Zamakhshari: three faces — mubtadaʾ+ẓarf; khabar of omitted mubtadaʾ; khabar baʿd khabar','قرئ بالرفع على أنه مبتدأ أخبر عنه بالظرف، أو خبر مبتدإ محذوف والجار صلة التنزيل، أو غير صلة فهو خبر بعد خبر (هذا الكتاب من فلان)',1,'QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','{}'),
('QR:EV:39:1:abuhayyan','tafsir','البحر المحيط','QR:TE:d44f2d33f76034758cae444e','Abu Hayyan: weighs the grammatical options of the opening','بسط الأوجه الإعرابية لفاتحة السورة',0,'QR:WORK:ABU_HAYYAN:AL-BAHR-AL-M','{}'),
('QR:EV:39:1:ibnashur','tafsir','التحرير والتنوير','QR:TE:83c511f2ca0e4216af55485e','Ibn Ashur: balāgha — maṣdar sense (not mafʿūl); opening glorifies the Qurʾān','فاتحة أنيقة في التنويه بالقرآن، وتنزيل مصدر مراد به معناه المصدري لا معنى المفعول',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"balagha"}'),
('QR:EV:39:1:tabari','tafsir','جامع البيان','QR:TE:7741d6d25ce13b076bd308c8','Tabari: meaning — this Book is a sending-down from God','تأويل: هذا الكتاب تنزيل من الله العزيز الحكيم',0,'QR:WORK:TABARI:AR-TAFSIR-AL','{"dimension":"meaning"}'),
('QR:EV:39:1:razi','tafsir','مفاتيح الغيب','QR:TE:9bf443c5eae54a4a5c347f43','Razi: thematic framing of the surah opening','تمهيد فاتحة السورة والتنويه بالكتاب',0,'QR:WORK:RAZI:TAFSIR-AL-RA','{"dimension":"thematic"}'),
('QR:EV:39:1:ibnkathir','tafsir','تفسير القرآن العظيم','QR:TE:809ab1189b585b792d256761','Ibn Kathir: Makki; narrations on the surah','السورة مكية، مع رواياتٍ في سياقها',0,'QR:WORK:IBN_KATHIR:AR-TAFSIR-IB','{"dimension":"hadith"}'),
('QR:EV:39:1:ibnatiyya','tafsir','المحرر الوجيز','QR:TE:8006f4bbd295b97641996ce8','Ibn Atiyya: Makki by ijmāʿ except three āyāt (re: Waḥshī)','مكية بإجماع غير ثلاث آيات نزلت في شأن وحشي',0,'QR:WORK:IBN_ATIYYA:AL-MUHARRAR-','{"dimension":"asbab"}'),
('QR:EV:39:1:alusi','tafsir','روح المعاني','QR:TE:e2bff1ad94a0780745f0bd47','Alusi: the surah is also named al-Ghuraf; transmission reports','تسمى سورة الغرف، وفيها روايات نزولها بمكة',0,'QR:WORK:ALUSI:TAFSIR-AL-AL','{"dimension":"naming"}');

-- Reading <-> evidence links (supports / contests).
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type) VALUES
('QR:SR:39:1:r1','QR:EV:39:1:jadwal','supports'),
('QR:SR:39:1:r1','QR:EV:39:1:tibyan','supports'),
('QR:SR:39:1:r1','QR:EV:39:1:darwish','supports'),
('QR:SR:39:1:r1','QR:EV:39:1:muyassar','supports'),
('QR:SR:39:1:r1','QR:EV:39:1:zamakhshari','supports'),
('QR:SR:39:1:r2','QR:EV:39:1:zamakhshari','supports'),
('QR:SR:39:1:r2','QR:EV:39:1:abuhayyan','supports'),
('QR:SR:39:1:r2','QR:EV:39:1:jadwal','supports'),
('QR:SR:39:1:r5','QR:EV:39:1:zamakhshari','supports'),
('QR:SR:39:1:r4','QR:EV:39:1:daas','supports'),
('QR:SR:39:1:r3','QR:EV:39:1:daas','contests'),
('QR:SR:39:1:synth','QR:EV:39:1:ibnashur','supports'),
('QR:SR:39:1:synth','QR:EV:39:1:tabari','supports'),
('QR:SR:39:1:synth','QR:EV:39:1:razi','supports'),
('QR:SR:39:1:synth','QR:EV:39:1:ibnkathir','supports'),
('QR:SR:39:1:synth','QR:EV:39:1:ibnatiyya','supports'),
('QR:SR:39:1:synth','QR:EV:39:1:alusi','supports');

-- Nuances (dedicated table).
INSERT OR REPLACE INTO qr_ss_scope_nuance (id, scope_type, scope_id, nuance_type, lx_nuance_type_ref, nuance_text, nuance_text_ar, note_md) VALUES
('QR:SSN:39:1:1','sentence','QR:SS:39:1:s1','discourse_force','AL:balagha:taqdim','Opening declaration that foregrounds the Book before any command, establishing the authority on which the surah builds its demand for pure worship.','تصديرٌ بذكر الكتاب قبل الأمر، تأسيسًا لسلطان النص الذي تبني عليه السورة دعوة الإخلاص.','{"source_ref":"QR:EV:39:1:ibnashur"}'),
('QR:SSN:39:1:2','phrase','QR:PH:39:1:3','attribute_pairing','AL:balagha:muraat_al_nazir','Pairing al-ʿAzīz (might) with al-Ḥakīm (wisdom) joins power that can enforce the command with wisdom that places it rightly.','اقترانُ العزيز بالحكيم: قوةٌ تُنفِذ الأمر وحكمةٌ تضعه في موضعه.','{}'),
('QR:SSN:39:1:3','word','05105199fb4d4c990c832802df','morpho_semantic','AL:balagha:ikhtiyar_al_sigha','The form-II verbal noun tanzīl connotes gradual, emphatic sending-down rather than a single act (inzāl).','إيثار (تنزيل) على (إنزال) لإفادة التدريج والتكثير.','{"source_ref":"QR:EV:39:1:ibnashur"}');
