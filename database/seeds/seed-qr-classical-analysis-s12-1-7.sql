-- K-MAPS SEED — Classical Quranic Grammar + Rhetoric — S12:1-7
-- Tables: qr_ss_scope_nuance, qr_ss_scope_balagha_link,
--         qr_ss_scope_grammar_link, qr_ss_ellipsis_event

-- K-MAPS SEED — qr_ss_scope_nuance — S12:1-7 (grammar + rhetoric)
INSERT OR IGNORE INTO qr_ss_scope_nuance
  (id, scope_type, scope_id, nuance_type, nuance_text, nuance_text_ar)
VALUES
  ('9451a394f043622cf81b2eb0a2', 'sentence', '7df8942d8a7c1df2fbbb002601', 'discourse_force', 'Opening declaration: Book identity asserted before narrative begins.', 'افتتاح إثباتي: تقرير هوية النص قبل الانطلاق في القصص.'),
  ('e38c0f063a4d7c2151ca4ac302', 'sentence', '5cd709aa4b41046f9212f8d2d6', 'emphasis', 'إِنَّ + subject-pronoun compression (إنّا) doubles the assertive force; لَعَلَّ suspension softens the goal clause.', 'توكيد بإنّ مع ضمير المتكلمين، ولعلّ تعليق لطيف يُبقي الباب مفتوحًا.'),
  ('007b200bce8e9d4abe1356c862', 'sentence', 'cf9b66f1cf1c896a36dce6ddd5', 'contrast_release', 'نَحْنُ fronted for specialisation (exclusion of other narrators); وإن-clause releases tension: prior ignorance vs. revealed knowledge.', 'تقديم نحن للاختصاص وإبعاد المصادر البشرية، ثم التضاد مع الجهل السابق.'),
  ('e9b8d1e0bbf2eb6aba8a3b31aa', 'sentence', 'd6912d9293a1aaa10b4d96c72d', 'discourse_force', 'إِذْ opens a cinematic scene shift; inner إِنّي-clause is embedded testimony increasing authenticity.', 'إذ تحويل مشهدي، وإني توكيد شهادي يُعمّق المصداقية.'),
  ('13c8cfcd809c048eef5d9e8e2c', 'sentence', '21e37a87c8d8e9ff8716f925b7', 'register_shift', 'Shifts from divine narration (v.1-3) to intimate parental speech; النهي (imperative-negative) is the rhetorical peak.', 'تحوّل من الخطاب الإلهي إلى المحبة الأبوية الحانية، والنهي هو الذروة البلاغية.'),
  ('52c70012c1d7c12e7f2d19b516', 'sentence', '908162b206cf5e3e790aee8380', 'emphasis', 'وَكَذَٰلِكَ comparison-connector exports the pattern of divine favour from past prophets forward; triple promise chain (يجتبي+يعلم+يُتمّ) crescendos.', 'وكذلك ربط مقاربي يستورد نمط الاختيار الإلهي، وسلسلة الوعد الثلاثية تتصاعد.'),
  ('4f5d9ade943c6c84b3b9a4b7b0', 'sentence', 'cc4cfa22a227cacc59a408a042', 'compression', 'لَقَدْ oath-emphatic collapses the whole story to a thesis. آيَات للسائلين positions the reader as an active seeker, not a passive hearer.', 'لقد: توكيد قسمي يضغط القصة كلها في خلاصة، وآيات للسائلين تحوّل القارئ من مستمع إلى طالب.'),
  ('a1095d520bfd54e831c0553734', 'clause', '6532d3977d731885712ffa6788', 'emphasis', 'Muqaṭṭaʿāt as an attention-arrest device: hearers stop and listen before any predication.', 'الحروف المقطعة كأداة جذب: تُوقف المتلقي قبل أي إسناد.'),
  ('10aab04fcb1a64d4775460783e', 'clause', 'c4573928c281336de78ae18f01', 'suspension', 'لَعَلَّ leaves the realisation of understanding deliberately open — a gentle hope rather than a command.', 'لعلّ تعليق ناعم: يُبقي الفهم أملًا لا إلزامًا.'),
  ('79ee365ba82186b8d2f372252b', 'clause', '054fb459b1f2a7695ab67db3d6', 'contrast_release', 'وَإِن (concessive): prior unawareness → present knowledge. Intensified by lam-ta''kid inside the clause.', 'وإن استدراكي: جهل سابق مقابل علم لاحق، مع لام التوكيد داخله.'),
  ('da1febc8eddadd2234148369b9', 'clause', 'b7c2df601a2a63decd73f244d6', 'discourse_force', 'Fa-sababiyya: chains the prohibition to its consequence with causal immediacy.', 'فاء السببية: تربط النهي بعاقبته الآنية.'),
  ('48f55ccb632ba42a89cf069d7b', 'clause', '31683b0049fe6929e7053585ce', 'emphasis', 'إِنَّ + khabar-jar grounds the warning in a universal principle (not just sibling jealousy).', 'إنّ + خبر جار: يُرسّخ التحذير في قانون كوني لا في مجرد غيرة الإخوة.'),
  ('7fbc56c638f0735b026b7eb863', 'clause', 'b507943d5babb00218ef7db757', 'emphasis', 'وكذلك: analogical connector imports Abrahamic-lineage promise pattern into Yusuf''s destiny.', 'وكذلك: يستورد نمط الوعد الإبراهيمي ويُسقطه على مسار يوسف.'),
  ('9893656813c21d6c797425ac09', 'clause', '04957c2943fb8810615d417556', 'discourse_force', 'Closing إنّ-clause anchors the triple promise in divine attributes: ʿAlīm (knows the plan) + Ḥakīm (executes it wisely).', 'إنّ الختامية: تُسند سلسلة الوعد إلى العلم المحيط والحكمة المتقنة.'),
  ('986bbbe19e6cac9850c66ff72f', 'clause', 'bdfcb61c9d587dd7356230d617', 'compression', 'لَقَدْ oath-emphatic compresses the entire story arc into a single thesis before it is narrated.', 'لقد: ضغط كامل مسار القصة في خلاصة إثباتية قبل سردها.');

-- K-MAPS SEED — qr_ss_scope_balagha_link — S12:1-7
INSERT OR IGNORE INTO qr_ss_scope_balagha_link
  (id, scope_type, scope_id, lx_balagha_ref, balagha_category, note_md, rhetorical_effect)
VALUES
  ('6fded2524d0764902902403308', 'sentence', '7df8942d8a7c1df2fbbb002601', NULL, 'mani', 'إيجاز بالحذف — الخبر مكثّف في الإضافة (آيات الكتاب) دون وصف زائد', 'Iḍāfa-compression: predicate packed into genitive compound.'),
  ('9034882a4b345f23695de0dda1', 'clause', '6532d3977d731885712ffa6788', NULL, 'badi', 'براعة استهلال — الحروف المقطعة تأسيس للإعجاز', 'Muqaṭṭaʿāt: supreme opening device establishing inimitability.'),
  ('3e5382938d24494def050ab7b7', 'sentence', '5cd709aa4b41046f9212f8d2d6', NULL, 'mani', 'أسلوب إنشائي رجائي: لعلّ يُفيد الترجّي والتوقع', 'Tarjī (hope-mode): لعلّ frames understanding as hoped-for not commanded.'),
  ('9c8e3c857e736092d275476c8e', 'sentence', 'cf9b66f1cf1c896a36dce6ddd5', NULL, 'bayan', 'التفات من الغيبة إلى التكلم: الانتقال من تلك إلى نحن يعمّق الحضور الإلهي', 'Iltifāt: 3rd-person reference (v.1) → 1st-person plural (v.3), divine presence intensified.'),
  ('46477f0412bfd53abf1dd69079', 'clause', 'c833e45750fecdd497ccca0fbf', NULL, 'mani', 'تقديم المسند إليه (نحن) على المسند الفعلي يُفيد الاختصاص والحصر', 'Taqdīm: fronted subject nḥn restricts narration exclusively to the divine speaker.'),
  ('a81bcaf3d42764d0a974e1fade', 'clause', 'c833e45750fecdd497ccca0fbf', NULL, 'bayan', 'أحسن القصص — صيغة التفضيل دون تعيين مفضَّل عليه: تفضيل مطلق', 'Afʿal al-tafḍīl without explicit referent = absolute superlative excellence.'),
  ('413aff08c726ec87f06ebbda3f', 'sentence', 'd6912d9293a1aaa10b4d96c72d', NULL, 'bayan', 'التشبيه الضمني في ساجدين: هيئة السجود ترمز لانقياد كامل وولاية تامة', 'Implicit simile via ḥāl: prostration = complete subjugation + divine-granted authority.'),
  ('377e75444e7b9de505b5e3b002', 'clause', '29fad36678537d9f50dfa9c5f1', NULL, 'mani', 'النهي للحماية لا للتحريم — أسلوب إنشائي طلبي يُفيد الشفقة الأبوية', 'Nahy used as protective advice (not prohibition): fatherly compassion, not legal interdiction.'),
  ('34d7ae7f5b162b268138d0a989', 'clause', 'b7c2df601a2a63decd73f244d6', NULL, 'badi', 'التوكيد بالمفعول المطلق: فيكيدوا لك كيدًا — تضعيف الدلالة بالمصدر', 'Mafʿūl muṭlaq for emphasis: كيدًا doubles the root كيد, intensifying the threat.'),
  ('571e85fe13884830f597caa5ba', 'sentence', '21e37a87c8d8e9ff8716f925b7', NULL, 'bayan', 'الاستعارة المكنية: الشيطان عدو يُسقَط عليه وصف العداوة الصريحة المبينة', 'Makniyya: شيطان cast as a named, declared enemy — personifying abstract evil.'),
  ('ae678cd429a108c744a0a93229', 'clause', 'b507943d5babb00218ef7db757', NULL, 'bayan', 'التشبيه بكذلك: الكاف أداة تشبيه + ذلك إشارة للنمط الإلهي المعهود', 'Tashbīh via كذلك: imports known pattern of divine selection as the comparatum.'),
  ('ddd2d307168f770de39666bca2', 'clause', 'f38028384613da943a380589c5', NULL, 'mani', 'الإيجاز بالفعل المضارع: يجتبيك تُحمّل معنى الاستمرار والتجدد', 'Ḍarbiyya (iterative aspect of imperfect): يجتبيك = ongoing/future choosing, not a one-time act.'),
  ('ef85defb1144bec452d1620f3a', 'sentence', '908162b206cf5e3e790aee8380', NULL, 'badi', 'طباق معنوي ضمني: جهل (غافلين في v.3) × علم (يعلمك التأويل في v.6)', 'Implied antithesis across verses: prior ignorance (v.3) ↔ granted interpretive knowledge (v.6).'),
  ('07219dbb095e5771797195f589', 'sentence', 'cc4cfa22a227cacc59a408a042', NULL, 'mani', 'الإيجاز بالحذف: لقد كان في يوسف وإخوته — المسند إليه يتضمن كل القصة المحذوفة', 'Ījāz: the entire untold story is compressed into the deictic فِي يُوسُفَ وَإِخْوَتِهِ.'),
  ('337141ca74fd68e5fa0d82bfa1', 'clause', '2157b2fc8f51c959e98111058d', NULL, 'mani', 'الحصر بالإضافة: آيات للسائلين — يخصّ الانتفاع بالعِبَر بفئة الطالبين', 'Qasr by lām-destination: signs exclusively available to those who seek (السائلين).');

-- K-MAPS SEED — qr_ss_scope_grammar_link — S12:1-7
INSERT OR IGNORE INTO qr_ss_scope_grammar_link
  (id, scope_type, scope_id, lx_grammar_ref, application_note)
VALUES
  ('db30f4f0748ca9797539ffb401', 'sentence', '7df8942d8a7c1df2fbbb002601', 'LX:GRAM_MUBTADA_KHABAR', 'Nominal sentence: مبتدأ (تلك) + خبر مركب إضافي (آيات الكتاب)'),
  ('19008d3e155b9d3f02bf3ca160', 'clause', '6532d3977d731885712ffa6788', 'LX:GRAM_ISTINAF', 'Ibtidā''ī: الر is an independent marker clause, not an isnād constituent'),
  ('90eda1b39882c712e22ec9490b', 'clause', '89663f1e6bc5a328668df89b5a', 'LX:GRAM_INNA_SISTERS', 'إنّ: ḥarf tawkīd wa-naṣb — takes accusative ism and nominative/verbal khabar'),
  ('667166d306a6ec171eca0c3b62', 'clause', 'c4573928c281336de78ae18f01', 'LX:GRAM_LAQALLA', 'لعلّ: ḥarf tarjī, operates as inna-sister with accusative ism (كم) and verbal khabar'),
  ('fd7aaea8151f123eb3417bb751', 'clause', 'c833e45750fecdd497ccca0fbf', 'LX:GRAM_TAWKID_DAMIR', 'نحن before the verb = ḍamīr faṣl/tawkīd functioning as subject reinforcement and restriction'),
  ('33a2e2a2ab4de780f0373c999c', 'clause', 'ee4569dccd8be4a4d34279859c', 'LX:GRAM_MA_MAWSUL', 'ما موصولة: relative pronoun requiring a ṣila clause; بما أوحينا = by means of what We revealed'),
  ('bf0fb9454e0baf1f7e2f99dc5d', 'clause', '0493c597169a242602658796c0', 'LX:GRAM_IDHA_ZARFIYYA', 'إذ: ẓarf zamān mabnī ʿalā l-sukūn, governs the following قال clause'),
  ('0a5575a225e589839cac27f758', 'clause', '65f5fde7360d506897a14e32dd', 'LX:GRAM_INNA_SISTERS', 'إنّي: contracted form, subject (yūsuf) accusative, khabar = جملة فعلية (رأيت)'),
  ('9e43f6504247d45c6ba6408d50', 'clause', 'b592e23965a3496f72094cbef6', 'LX:GRAM_HAL', 'ساجدين: ḥāl mansūb, describing the state of the pronouns at the time of the vision'),
  ('6fac5699d4b9f8cf3b44c057b4', 'clause', '29fad36678537d9f50dfa9c5f1', 'LX:GRAM_NAHY', 'لا + مضارع مجزوم: نهي — particle of prohibition + jussive imperfect تَقْصُصْ'),
  ('86123188350ec8297262cb8938', 'clause', 'b7c2df601a2a63decd73f244d6', 'LX:GRAM_FA_SABABIYYA', 'فاء السببية + منصوب: فيكيدوا — fa of causality followed by subjunctive يكيدوا'),
  ('5b169033bdbeb130b0359dbc51', 'clause', '31683b0049fe6929e7053585ce', 'LX:GRAM_INNA_SISTERS', 'إنّ الشيطان: tawkīd clause grounding the prohibition in universal principle'),
  ('a3a984e451a2e70e07d74e106d', 'clause', 'b507943d5babb00218ef7db757', 'LX:GRAM_ATF_NASAQ', 'Coordinated verbal chain via واو العطف: يجتبيك ويعلمك ويُتمّ — all present indicative'),
  ('3e912cfcceb1413dfbb9dd47c5', 'clause', '929413ef2c0bd0974b69be978f', 'LX:GRAM_KAMA_TASHBIH', 'كما: masdariyya-ẓarfiyya acting as comparative particle governing the verbal clause'),
  ('898c9486f82bb78e7b8c21fe68', 'clause', '4a6c729b1a20e93d74daaf7b4b', 'LX:GRAM_LAQAD', 'لقد: لام الابتداء + قد للتوكيد والتحقيق — doubly assertive past-event emphasis'),
  ('1b73e47989e763d60631adf078', 'clause', '4119b977b32ebc9c9bf0fdcc43', 'LX:GRAM_JAR_MAJRUR', 'في يوسف: jar-majrūr as khabar-muqaddam (fronted predicate) for specialisation of topic');

-- K-MAPS SEED — qr_ss_ellipsis_event — S12:1-7
INSERT OR IGNORE INTO qr_ss_ellipsis_event
  (id, sentence_id, scope_type, scope_id, ellipsis_type, elided_element, rhetorical_effect)
VALUES
  ('91be5e5238823e33df719d984c', 'cf9b66f1cf1c896a36dce6ddd5', 'clause', 'ee4569dccd8be4a4d34279859c', 'elided_subject', 'يوسف ﷺ', 'Subject of كُنْتَ (2nd person singular) is elided inside the إن-clause; listener must supply النبي.'),
  ('4496fd86e1b6d7b7d083818702', 'cc4cfa22a227cacc59a408a042', 'clause', 'bdfcb61c9d587dd7356230d617', 'elided_predicate', 'القصة كلها / كل أحداثها', 'The entire story arc is the implied topic of the thesis — ellipsis of the narrative content the كان carries.'),
  ('d554fe431ef2ee3eb4340f5528', '908162b206cf5e3e790aee8380', 'clause', 'b507943d5babb00218ef7db757', 'elided_subject', 'الله / ربك (implied subject of يجتبيك)', 'Subject of يجتبيك not restated; recovered from ربك in the closing إنّ-clause.');
