-- Surah 39:67 (the folded heavens) — RAG-grounded analysis of the tashbīh/tanzīh
-- crux. Domain: QR (km_quran).
-- وما قَدَرُوا اللَّهَ حَقَّ قَدْرِهِ والأرْضُ جَمِيعًا قَبْضَتُهُ يَوْمَ القِيامَةِ والسَّماواتُ مَطْوِيّاتٌ بِيَمِينِهِ ...
--
-- Retrieved from tafsīr (RAG) and synthesized. The qabḍa/yamīn reading is the
-- classic locus of the divine-attributes debate; the three positions are stored
-- as qr_ss_scope_reading rows on the words قبضته / بيمينه, each pointing to the
-- crux in qr_interpretive_differences (QR:ID:39:67). Idempotent.

INSERT OR REPLACE INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, is_disputed, source_ref, note_md) VALUES
('QR:EV:39:67:zamakhshari','tafsir','الكشاف (الزمخشري)','QR:TE:da1075b0a6980db4bfb73516','Zamakhshari: takhyīl — portrayal of majesty, neither literal nor metaphor; qiraat qaddarū','وما قدروا الله حق قدره: ما عظموه حق تعظيمه، وقرئ بالتشديد. ونبههم على عظمته على طريقة التخييل: والأرض جميعا قبضته... والغرض تصوير عظمته والتوقيف على كنه جلاله، من غير ذهاب بالقبضة ولا باليمين إلى جهة حقيقة أو مجاز',1,'QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','{"dimension":"takhyil+qiraat"}'),
('QR:EV:39:67:ibnashur','tafsir','التحرير والتنوير (ابن عاشور)','QR:TE:56e15eef9708307cd9ba7769','Ibn Ashur: naẓm — transition to Gods eternal dominion; deniers lost by neglecting the signs','انتقل الكلام إلى عظمة ملك الله في العالم الأخروي الأبدي، وأن الذين كفروا بآيات ملكوت الدنيا قد خسروا بترك النظر',0,'QR:WORK:IBN_ASHUR:AR-TAFSEER-T','{"dimension":"nazm"}'),
('QR:EV:39:67:tabari','tafsir','جامع البيان (الطبري)','QR:TE:3bdc705f119159cfc847d164','Tabari: they did not magnify God as He deserves; tied to bal Allaha faʿbud','وما قدروا الله حق قدره: ما عظّموا الله حق تعظيمه؛ مرتبط بـ(بل الله فاعبد وكن من الشاكرين)',0,'QR:WORK:TABARI:AR-TAFSIR-AL','{"dimension":"maana"}'),
('QR:EV:39:67:razi','tafsir','مفاتيح الغيب (الرازي)','QR:TE:9aa7b2e3abbacb373243144c','Razi: links to the trumpet and judgment sequence that follows','يربط الآية بنفخ الصور وإشراق الأرض بنور ربها والقضاء بالحق',0,'QR:WORK:RAZI:TAFSIR-AL-RA','{"dimension":"nazm_thematic"}');

INSERT OR REPLACE INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md) VALUES
('QR:SR:39:67:q1','word','917bc6bf6595edc284d9d69fd1','QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','qiraat','AL:qiraat:variant','qadarū also read qaddarū (shadda)','وما قدروا: قرئ بالتشديد (قدّروا)',0,1,'{}'),
('QR:SR:39:67:t1','phrase','9f82a3ca951bd043d884709acc','ahl_al_sunna_salaf','theology','AL:aqida:ithbat','Affirm qabḍa and yamīn as they came, bilā kayf, with tafwīḍ','إثبات القبضة واليمين بلا كيف ولا تشبيه مع تفويض الكيفية',0,1,'{"crux":"QR:ID:39:67"}'),
('QR:SR:39:67:t2','phrase','9f82a3ca951bd043d884709acc','QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','theology','AL:balagha:takhyil','The whole image is takhyīl — portrayal of majesty; neither literal nor single metaphor','الصورة تخييل لتصوير العظمة، لا حقيقة ولا مجاز مفرد',1,1,'{"crux":"QR:ID:39:67"}'),
('QR:SR:39:67:t3','phrase','8b6bbbeadd4617eb3a3963b436','mutaakhkhirun','theology','AL:aqida:tawil','Figurative: qabḍa = possession/power, yamīn = might','تأويل: القبضة الملك والقدرة واليمين القوة',1,1,'{"crux":"QR:ID:39:67"}'),
('QR:SR:39:67:synth','sentence','QR:SS:39:67:s1','RAG:irab+tafsir','synthesis','AL:irab:synthesis','RAG synthesis: structure (Ibn Ashur, turn to eternal dominion), meaning (Tabari), qiraat (Zamakhshari qaddarū), and the tashbih/tanzih crux on qabḍa/yamīn — ithbāt bilā kayf (Salaf) vs takhyīl (Zamakhshari) vs taʾwīl (later theologians); sealed by tanzīh (subḥānahu wa-taʿālā ʿammā yushrikūn).','خلاصة 39:67: الانتقال إلى عظمة ملك الله الأخروي، وما عظّموه حق قدره، و(قدّروا) بالتشديد، والقطب في القبضة واليمين بين الإثبات بلا كيف والتخييل والتأويل، وختمها بالتنزيه.',0,0,'{"rag":true,"interpretive_difference":"QR:ID:39:67"}');

INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type) VALUES
('QR:SR:39:67:synth','QR:EV:39:67:zamakhshari','supports'),
('QR:SR:39:67:synth','QR:EV:39:67:ibnashur','supports'),
('QR:SR:39:67:synth','QR:EV:39:67:tabari','supports'),
('QR:SR:39:67:synth','QR:EV:39:67:razi','supports'),
('QR:SR:39:67:q1','QR:EV:39:67:zamakhshari','supports'),
('QR:SR:39:67:t2','QR:EV:39:67:zamakhshari','supports');
