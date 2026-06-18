-- Surah 39:3 — word-level source-rooted SYNTHESES (km_quran). Domain: QR.
-- ----------------------------------------------------------------------------
-- Built per the km_quran doctrine ("Reading owns evidence"): each key word of
-- 39:3 gets a synthesized reading (qr_ss_scope_reading, scope_type='word')
-- that INGESTS the sources — lexicon (ṣarf/dalāla), iʿrāb (naḥw), tafsīr
-- (maʿnā/balāgha) — and WEAVES them into one attributed analysis. The sources
-- are stored as qr_evidence_items with ontology, provenance, locator and
-- dispute status, and bound to the synthesis via reading_evidence_link.
-- Lexicon truth is AL-owned; cited here by typed cross-domain ref (AL:...).
-- Idempotent (INSERT OR REPLACE).

-- ── Evidence items (ingested sources, with provenance + dispute) ─────────────
INSERT OR REPLACE INTO qr_evidence_items (id, evidence_type, provenance, locator, content_text, content_text_ar, is_disputed, source_ref, note_md) VALUES
-- al-dīn (دين)
('QR:EVW:39:3:din:lex','lexicon','مقاييس اللغة (ابن فارس)','root:دين','d-y-n core sense: a kind of submission and lowliness; al-dīn = obedience','الدال والياء والنون أصلٌ واحد، وهو جنسٌ من الانقياد والذُّل، فالدِّين: الطاعة',0,'AL:LEXSRC:saaid_maqayis_al_lugha','{"lens":"dalala"}'),
('QR:EVW:39:3:din:irab','irab_book','الإعراب الميسر / الجدول','39:3','al-dīn = delayed mubtadaʾ, lillāh a fronted khabar (ikhtiṣāṣ); some make al-dīn mubtadaʾ outright','لله: متعلق بمحذوف خبر مقدم، والدين: مبتدأ مؤخر، والخالص نعت',1,'QR:WORK:QUL:MUYASSAR:IRAB','{"lens":"nahw","dispute":"khabar muqaddam vs plain mubtada"}'),
('QR:EVW:39:3:din:tafsir','tafsir','جامع البيان / التحرير والتنوير','QR:TE:39:3','al-dīn al-khāliṣ = obedience and worship made purely for God, free of shirk — the surahs thesis','الدين الخالص: الطاعة والعبادة الخالصة لله لا يشوبها شرك، وهو غرض السورة',0,'QR:WORK:TABARI:AR-TAFSIR-AL','{"lens":"maana"}'),
-- ittakhadhū (اخذ, VIII)
('QR:EVW:39:3:akhdh:lex','lexicon','مقاييس اللغة (ابن فارس)','root:اخذ','ʾ-kh-dh core sense: seizing/holding a thing and gathering it (opp. of giving)','الهمزة والخاء والذال أصل واحد، الأصل حَوْز الشيء وجمعه، وهو خلاف العطاء',0,'AL:LEXSRC:saaid_maqayis_al_lugha','{"lens":"dalala"}'),
('QR:EVW:39:3:akhdh:irab','irab_book','الإعراب الميسر','39:3','ittakhadhū (form VIII, iftaʿala) = perfect verb + wāw fāʿil; the clause is ṣilat al-mawṣūl','اتخذوا: فعل ماض والواو فاعل، والجملة صلة الموصول لا محل لها',0,'QR:WORK:QUL:MUYASSAR:IRAB','{"lens":"sarf+nahw","form":"VIII"}'),
-- li-yuqarribūnā (قرب, II)
('QR:EVW:39:3:qrb:lex','lexicon','مقاييس اللغة (ابن فارس)','root:قرب','q-r-b core sense: the opposite of farness; nearness, kinship, drawing near','القاف والراء والباء أصلٌ صحيحٌ يدلُّ على خلاف البُعد',0,'AL:LEXSRC:saaid_maqayis_al_lugha','{"lens":"dalala"}'),
('QR:EVW:39:3:qrb:tafsir','tafsir','الكشاف / التحرير والتنوير','QR:TE:39:3','form II yuqarribū (taqrīb) is causative/intensive: the idolaters claim the awliyāʾ bring them near to God','قرّب (تفعيل) للتعدية: زعموا أن أولياءهم يقرّبونهم إلى الله، واللام للتعليل',0,'QR:WORK:ZAMAKHSHARI:AL-KASHSHAF-','{"lens":"sarf+maana","form":"II"}'),
-- kādhib (كذب)
('QR:EVW:39:3:kdhb:lex','lexicon','مقاييس اللغة (ابن فارس)','root:كذب','k-dh-b core sense: the opposite of truthfulness; falling short of the full truth','الكاف والذال والباء أصلٌ صحيح يدلُّ على خلاف الصِّدق',0,'AL:LEXSRC:saaid_maqayis_al_lugha','{"lens":"dalala"}'),
-- kaffār (كفر)
('QR:EVW:39:3:kfr:lex','lexicon','مقاييس اللغة (ابن فارس)','root:كفر','k-f-r core sense: covering and concealment — kufr conceals/denies the truth and the favour','الكاف والفاء والراء أصلٌ صحيحٌ، وهو السَّتْر والتَّغطية',0,'AL:LEXSRC:saaid_maqayis_al_lugha','{"lens":"dalala"}'),
('QR:EVW:39:3:kfr:sarf','lexicon','الصرف','39:3','kaffār is ṣīghat mubālagha (faʿʿāl) — intensive: the persistent, abundant denier/ingrate','كفّار: صيغة مبالغة على وزن فعّال، للكثرة والإصرار على الكفر',0,'AL:LEXSRC:kmaps_sarf','{"lens":"sarf"}');

-- ── Synthesized word readings (ingested sources woven into one analysis) ──────
INSERT OR REPLACE INTO qr_ss_scope_reading (id, scope_type, scope_id, scholar_ref, reading_type, lx_reading_type_ref, reading_text, reading_text_ar, is_minority, is_contested, note_md) VALUES
('QR:SRW:39:3:3:synth','word','941934c7cbcabb38f69ddeb78b','synthesis:lex+irab+tafsir','synthesis','AL:morph:synthesis',
 'al-dīn (دِين, root د-ي-ن "submission/obedience", Ibn Fāris): the noun the surah is built around. Naḥw: delayed mubtadaʾ with the fronted khabar lillāh — the fronting yields exclusivity/qaṣr (religion is for God alone), though some read al-dīn as a plain mubtadaʾ. Maʿnā (Ṭabarī, Ibn ʿĀshūr): al-dīn al-khāliṣ is obedience and worship purified of all shirk — the verses thesis, set against the intercessors who follow.',
 'الدِّينُ من (دين): الانقيادُ والطاعةُ (ابن فارس). نحوًا: مبتدأ مؤخر، و(لله) خبرٌ مقدَّم يفيد الاختصاص (القصر: الدين لله وحده)، وقيل (الدين) مبتدأ. ومعنًى (الطبري، ابن عاشور): الدين الخالص هو الطاعة والعبادة المُصفّاة من الشرك، وهو غرض الآية في مقابلة المشركين.',
 0,1,'{"lenses":["sarf","dalala","nahw","balagha","maana"]}'),
('QR:SRW:39:3:6:synth','word','f67f0f3c2c3d8a3b6f4f987475','synthesis:lex+irab+tafsir','synthesis','AL:morph:synthesis',
 'ittakhadhū (اتَّخَذُوا, form VIII iftaʿala of root ʾ-kh-dh "to seize/hold", Ibn Fāris): the augmented form adds the sense of adopting/taking-for-oneself — they took rivals as awliyāʾ. Naḥw: perfect verb, wāw is fāʿil, and the clause is the ṣila of alladhīna. The taking is deliberate appropriation, which the verse then answers.',
 'اتَّخَذُوا من (أخذ): الحَوْزُ والتناول (ابن فارس)، وصيغةُ الافتعال تُفيد الاتّخاذ لأنفسهم؛ اتّخذوا أولياءَ من دون الله. نحوًا: ماضٍ والواو فاعل، والجملة صلة الموصول لا محل لها. وهو اتّخاذٌ متعمَّدٌ يُبطله سياق الآية.',
 0,0,'{"lenses":["sarf","dalala","nahw"]}'),
('QR:SRW:39:3:13:synth','word','55fb4fddc96ee8fda91f34750e','synthesis:lex+irab+tafsir','synthesis','AL:morph:synthesis',
 'li-yuqarribūnā (لِيُقَرِّبُونَا, form II qarraba of root q-r-b "nearness, opp. of farness", Ibn Fāris): form II (taḍʿīf) is causative — "to bring near". The lām is taʿlīl (purpose). Maʿnā (Zamakhsharī, Ibn ʿĀshūr): the idolaters cited motive — the awliyāʾ "bring us near to God" — quoted then refuted. Pairs with the following zulfā as doubled nearness.',
 'لِيُقَرِّبُونَا من (قرب): خلافُ البُعد (ابن فارس)، وصيغةُ التفعيل للتعدية (التقريب)، واللام للتعليل. ومعنًى (الزمخشري، ابن عاشور): حكايةُ عِلّتهم المزعومة: يقرّبوننا إلى الله؛ تُحكى ثم تُردّ. ويقترن بـ(زلفى) بعده توكيدًا للقرب.',
 0,0,'{"lenses":["sarf","dalala","nahw","maana"],"pairs_with":"53b28a79e473231be9a1324509"}'),
('QR:SRW:39:3:16:synth','word','53b28a79e473231be9a1324509','synthesis:five-lens+irab+tafsir','synthesis','AL:morph:synthesis',
 'zulfā (زُلْفَىٰ, root z-l-f, pattern fuʿlā): ism maṣdar of the qurbā/bushrā/ḥusnā family, mamnūʿ min al-ṣarf. Dalāla (Ibn Fāris, al-Rāghib): a thrust/advance into nearness — hence rank and station (manzila/ḥuẓwa), not bare qurb. Naḥw: manṣūb — Sībawayh (via Ibn ʿAṭiyya) reads ḥāl ("drawing near"), or a cognate maṣdar reinforcing yuqarribūnā (disputed). Balāgha: stacked with yuqarribūnā as tawkīd; the false zulfā here vs the granted zulfā of the prophets (38:25,40). Full Five-Lens: AL re_kmaps_zlf_zumar_3.',
 'زُلْفَىٰ (زلف، فُعْلَىٰ): اسم مصدرٍ من باب قُربى/بُشرى/حُسنى، ممنوعٌ من الصرف. دلالةً (ابن فارس، الراغب): اندفاعٌ وتقدُّمٌ في قُرب، فهي القُربةُ ذاتُ المنزلةِ والحُظوة لا مجردُ القُرب. نحوًا: منصوبٌ، قرأه سيبويه (عن ابن عطية) حالًا، أو مصدرًا مؤكِّدًا لـ(يقرّبونا) — وفيه خلاف. بلاغةً: تأكيدٌ بتكرار القرب؛ وزلفى المشركين مزعومة بخلاف زلفى الأنبياء (٣٨:٢٥، ٤٠). والعدسات الخمس: AL re_kmaps_zlf_zumar_3.',
 0,1,'{"lenses":["sarf","dalala","nahw","balagha","tarjama"],"five_lens":"re_kmaps_zlf_zumar_3"}'),
('QR:SRW:39:3:32:synth','word','7eaf59b8529ad4c7d9b29af3d9','synthesis:lex+irab','synthesis','AL:morph:synthesis',
 'kādhib (كَاذِبٌ, ism fāʿil of root k-dh-b "opposite of truthfulness", Ibn Fāris): the active participle — "one who lies". Naḥw: khabar of the inner mubtadaʾ huwa (man huwa kādhibun kaffār). It names the disposition God does not guide.',
 'كاذبٌ: اسمُ فاعلٍ من (كذب) خلافِ الصدق (ابن فارس). نحوًا: خبرُ المبتدأ (هو) في (مَن هو كاذبٌ كفّار). يصف الحالَ التي لا يهدي اللهُ صاحبَها.',
 0,0,'{"lenses":["sarf","dalala","nahw"]}'),
('QR:SRW:39:3:33:synth','word','42054ab47a4f987face8a0e1bf','synthesis:lex+sarf','synthesis','AL:morph:synthesis',
 'kaffār (كَفَّارٌ, ṣīghat mubālagha faʿʿāl of root k-f-r "covering/concealment", Ibn Fāris): the intensive — the persistent, abundant denier/ingrate who covers over truth and favour. Naḥw: second khabar after kādhib, escalating from the lie to entrenched ingratitude.',
 'كفّارٌ: صيغةُ مبالغةٍ (فعّال) من (كفر) السَّترِ والتغطية (ابن فارس)؛ المُصِرُّ المُكثِرُ من الكفر، الساترُ للحقِّ والنعمة. نحوًا: خبرٌ ثانٍ بعد (كاذب)، ترقٍّ من الكذب إلى الجحود الراسخ.',
 0,0,'{"lenses":["sarf","dalala","nahw","balagha:mubalagha"]}');

-- ── Bind each synthesis to its ingested evidence ─────────────────────────────
INSERT OR REPLACE INTO qr_ss_scope_reading_evidence_link (reading_id, evidence_id, support_type) VALUES
('QR:SRW:39:3:3:synth','QR:EVW:39:3:din:lex','supports'),
('QR:SRW:39:3:3:synth','QR:EVW:39:3:din:irab','supports'),
('QR:SRW:39:3:3:synth','QR:EVW:39:3:din:tafsir','supports'),
('QR:SRW:39:3:6:synth','QR:EVW:39:3:akhdh:lex','supports'),
('QR:SRW:39:3:6:synth','QR:EVW:39:3:akhdh:irab','supports'),
('QR:SRW:39:3:13:synth','QR:EVW:39:3:qrb:lex','supports'),
('QR:SRW:39:3:13:synth','QR:EVW:39:3:qrb:tafsir','supports'),
('QR:SRW:39:3:16:synth','QR:EVW:39:3:qrb:lex','supports'),
('QR:SRW:39:3:32:synth','QR:EVW:39:3:kdhb:lex','supports'),
('QR:SRW:39:3:33:synth','QR:EVW:39:3:kfr:lex','supports'),
('QR:SRW:39:3:33:synth','QR:EVW:39:3:kfr:sarf','supports');
