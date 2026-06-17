-- Surah 39 Passage 1 (verses 1-9) — ellipsis (ḥadhf) mapping. Domain: QR.
--
-- The elided elements were described inside the RAG syntheses but were NOT
-- mapped into the dedicated structural tables. This seed populates:
--   - qr_ss_ellipsis_event : one row per attested maḥdhūf, scoped to its clause,
--                            with the elided element, the rhetorical effect, and
--                            note_md citing the iʿrāb book(s) that attest it.
--   - qr_ss_occ_clause     : sets is_elliptical=1 and elided_element on the
--                            clauses that carry an ellipsis.
--
-- Every row is grounded in the real iʿrāb book wording retrieved from
-- qr_irab_book_entries (Muyassar, al-Jadwal, Daas, al-Tibyan/al-ʿUkbarī).
-- Idempotent (INSERT OR REPLACE / targeted UPDATE).

-- ── Ellipsis events ────────────────────────────────────────────────────────
INSERT OR REPLACE INTO qr_ss_ellipsis_event
  (id, sentence_id, scope_type, scope_id, ellipsis_type, lx_ellipsis_ref, elided_element, rhetorical_effect, note_md) VALUES
-- 39:1 — tanzīl: either mubtadaʾ for an omitted khabar, or khabar for an omitted mubtadaʾ.
('QR:EL:39:1:1','QR:SS:39:1:s1','clause','QR:CL:39:1:c1','hadhf_mubtada_aw_khabar','AL:balagha:hadhf:musnad',
 'المبتدأ أو الخبر — (تنزيلُ الكتابِ) خبرٌ لمبتدأ محذوف، أو الجارّ (من الله) متعلّق بخبرٍ محذوف',
 'يَبتدئ بالمسنَد إليه (تنزيل) فيُقدَّم على كلّ شيء؛ وحذف الطرف الآخر إيجازٌ يضع الكتاب في صدارة المشهد',
 '{"sources":["qul_irab_muyassar"],"book_text_ar":"تنزيل: مبتدأ ... والجار والمجرور متعلقان بمحذوف خبر؛ أو تنزيل: خبر لمبتدأ محذوف"}'),
-- 39:3 s1 — ألا لله الدين الخالص: fronted khabar omitted (lillāh attaches to it).
('QR:EL:39:3:1','QR:SS:39:3:s1','clause','QR:CLG:39:3:s1','hadhf_khabar_muqaddam','AL:balagha:hadhf:khabar',
 'الخبر المقدَّم — (لله) متعلّق بمحذوفٍ خبرٍ مقدَّم، و(الدين) مبتدأ مؤخَّر',
 'تقديمُ شبه الجملة يُفيد الاختصاص: الدينُ الخالصُ للهِ وحده لا لغيره',
 '{"sources":["qul_irab_muyassar","qul_jadwal_irab_quran"],"book_text_ar":"لله متعلقان بمحذوف خبر مقدم، والدين مبتدأ مؤخر"}'),
-- 39:3 s2 — والذين اتخذوا...: the khabar of the mubtadaʾ is omitted, estimated yaqūlūn.
('QR:EL:39:3:2','QR:SS:39:3:s2','clause','QR:CLG:39:3:s2','hadhf_khabar','AL:balagha:hadhf:khabar',
 'خبر المبتدأ (الذين اتخذوا) محذوف، تقديره: يقولون (ما نعبدهم إلا ليقربونا)',
 'حذف فعل القول وإقامة مقولهم مقامه: إيجازٌ يفضح دعواهم بلسانهم',
 '{"sources":["tibyan_ukbari_irab"],"book_text_ar":"(والذين اتخذوا): مبتدأ، والخبر محذوف؛ أي يقولون ما نعبدهم"}'),
-- 39:4 — سبحانه: nāʾib mafʿūl muṭlaq for an omitted governing verb (usabbiḥu).
('QR:EL:39:4:1','QR:SS:39:4:s2','clause','QR:CLG:39:4:s2','hadhf_amil','AL:balagha:hadhf:fiil',
 'الفعل العامل في المصدر — (سبحانه) نائب مفعول مطلق لفعلٍ محذوف، تقديره: أُسبِّحُ',
 'حذف العامل وإبقاء المصدر يدلّ على تنزيهٍ مطلق دائم لا يتقيّد بزمن فاعلٍ معيّن',
 '{"sources":["qul_irab_muyassar","qul_irab_quran_daas","qul_jadwal_irab_quran"],"book_text_ar":"سبحانه: نائب مفعول مطلق منصوب بفعل محذوف"}'),
-- 39:6 s3 — له الملك: fronted khabar omitted.
('QR:EL:39:6:1','QR:SS:39:6:s3','clause','QR:CLG:39:6:s3','hadhf_khabar_muqaddam','AL:balagha:hadhf:khabar',
 'الخبر المقدَّم — (له) متعلّق بمحذوفٍ خبرٍ مقدَّم، و(الملك) مبتدأ مؤخَّر',
 'تقديم (له) يُفيد قصرَ المُلك عليه سبحانه',
 '{"sources":["qul_irab_muyassar"],"book_text_ar":"له متعلقان بمحذوف خبر مقدم، والملك مبتدأ مؤخر"}'),
-- 39:6 s4 — لا إله إلا هو: khabar of lā an-nāfiya li-l-jins omitted.
('QR:EL:39:6:2','QR:SS:39:6:s4','clause','QR:CLG:39:6:s4','hadhf_khabar_la','AL:balagha:hadhf:khabar',
 'خبر (لا) النافية للجنس محذوف، و(هو) بدلٌ من الضمير المستتر في الخبر المحذوف',
 'حذف خبر (لا) جارٍ على الكثرة في كلمة التوحيد؛ إيجازٌ لا يحتمل اللبس',
 '{"sources":["qul_irab_muyassar","qul_irab_quran_daas"],"book_text_ar":"هو: بدل من الضمير المستكن في الخبر المحذوف"}'),
-- 39:7 s4 — وزر أخرى: omitted manʿūt (nafsin ukhrā).
('QR:EL:39:7:1','QR:SS:39:7:s4','clause','QR:CLG:39:7:s4','hadhf_manut','AL:balagha:hadhf:mawsuf',
 'المنعوت محذوف — (أخرى) صفة على حذف الموصوف، أي: نفسٍ أخرى',
 'إيجازٌ بحذف الموصوف لظهوره؛ تعميمُ القاعدة على كلّ نفس',
 '{"sources":["qul_irab_muyassar","qul_jadwal_irab_quran"],"book_text_ar":"أخرى: مضاف إليه على حذف منعوت، أي: نفس أخرى"}'),
-- 39:7 s5 — إلى ربكم مرجعكم: fronted khabar omitted.
('QR:EL:39:7:2','QR:SS:39:7:s5','clause','QR:CLG:39:7:s5','hadhf_khabar_muqaddam','AL:balagha:hadhf:khabar',
 'الخبر المقدَّم — (إلى ربّكم) متعلّق بمحذوفٍ خبرٍ مقدَّم، و(مرجعكم) مبتدأ مؤخَّر',
 'تقديم (إلى ربّكم) يُفيد قصرَ المرجِع إليه وحده',
 '{"sources":["qul_irab_quran_daas","qul_jadwal_irab_quran"],"book_text_ar":"إلى ربكم: متعلقان بخبر مقدم محذوف"}'),
-- 39:8 s3 — تمتع بكفرك قليلا: omitted maṣdar/mawṣūf described by qalīlan.
('QR:EL:39:8:1','QR:SS:39:8:s3','clause','QR:CLG:39:8:s3','hadhf_mawsuf','AL:balagha:hadhf:mawsuf',
 'المصدر الموصوف محذوف — (قليلًا) صفةٌ لمصدرٍ محذوف، أي: تمتُّعًا قليلًا',
 'حذف المصدر وإبقاء صفته يُصغّر متعة الكفر ويُختَم بالوعيد',
 '{"sources":["qul_irab_quran_daas"],"book_text_ar":"قليلا: صفة لمصدر محذوف"}'),
-- 39:8 s4 — إنك من أصحاب النار: khabar inna omitted.
('QR:EL:39:8:2','QR:SS:39:8:s4','clause','QR:CLG:39:8:s4','hadhf_khabar_inna','AL:balagha:hadhf:khabar',
 'خبر (إنّ) محذوف — (من أصحاب) متعلّق بمحذوفٍ خبرِ إنّ، أي: إنّك كائنٌ من أصحاب النار',
 'الجارّ يسدّ مسدّ الخبر فيُوجَز الوعيد ويُقطَع به',
 '{"sources":["qul_irab_muyassar"],"book_text_ar":"من أصحاب: جار ومجرور متعلقان بمحذوف خبر إن"}'),
-- 39:9 s1 — أمَّن هو قانت...: THE canonical ḥadhf — the khabar / the ʿadl-partner of am omitted.
('QR:EL:39:9:1','QR:SS:39:9:s1','clause','QR:CLG:39:9:s1','hadhf_khabar','AL:balagha:hadhf:khabar',
 'خبر المبتدأ (مَن) محذوف، وكذلك مُعادِل (أم)؛ تقديره: كمَن هو عاصٍ / كغيره / آلكافرُ خيرٌ أم الذي هو قانت',
 'حذف طرف المقابلة يستدعي السامعَ ليُكمله بنفسه؛ إيجازٌ بليغ يُعظِّم شأن القانت بترك المقارَن',
 '{"sources":["qul_jadwal_irab_quran","qul_irab_muyassar","qul_irab_quran_daas"],"book_text_ar":"(من) موصول في محلّ رفع مبتدأ خبره محذوف تقديره كمن هو عاص؛ ومعادل أم محذوف تقديره آلكافر خير أم الذي هو قانت"}');

-- ── Flag the carrying clauses ──────────────────────────────────────────────
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='المبتدأ أو الخبر (تنزيل خبر لمبتدأ محذوف أو الجار متعلق بخبر محذوف)' WHERE id='QR:CL:39:1:c1';
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='الخبر المقدَّم (لله ... الدين مبتدأ مؤخر)' WHERE id='QR:CLG:39:3:s1';
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='خبر المبتدأ، تقديره: يقولون ما نعبدهم' WHERE id='QR:CLG:39:3:s2';
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='الفعل العامل في المصدر (أُسبِّح)' WHERE id='QR:CLG:39:4:s2';
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='الخبر المقدَّم (له ... الملك مبتدأ مؤخر)' WHERE id='QR:CLG:39:6:s3';
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='خبر (لا) النافية للجنس' WHERE id='QR:CLG:39:6:s4';
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='المنعوت (نفسٍ أخرى)' WHERE id='QR:CLG:39:7:s4';
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='الخبر المقدَّم (إلى ربكم ... مرجعكم مبتدأ مؤخر)' WHERE id='QR:CLG:39:7:s5';
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='المصدر الموصوف (تمتُّعًا قليلًا)' WHERE id='QR:CLG:39:8:s3';
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='خبر (إنّ) (إنك ... من أصحاب النار)' WHERE id='QR:CLG:39:8:s4';
UPDATE qr_ss_occ_clause SET is_elliptical=1, elided_element='خبر المبتدأ ومعادل أم، تقديره: كمن هو عاصٍ / آلكافر خير أم الذي هو قانت' WHERE id='QR:CLG:39:9:s1';
