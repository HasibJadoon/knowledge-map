-- الْكِتَابِ (root كتب) word-view blocks — generated. INSERT OR REPLACE (idempotent).

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:root_dna', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'root_dna', NULL, 1, 'الجذر', 'Root DNA', 'جڑ',
  'يردّ ابن فارس مادّة (ك ت ب) إلى أصلٍ واحد: ==الجمعُ والضمُّ==. فالكِتابُ ضمُّ الحروف بعضِها إلى بعض، والكَتيبةُ الجيشُ المجتمع؛ ومنه استُعمِلت في الفَرْض والقضاء (كُتِبَ عليكم) لأنّه أمرٌ مُثبَتٌ مضموم.', 'Ibn Fāris fixes the whole root to one core: ==gathering and binding together==. A كِتاب binds letters into one whole; a كَتيبة is a massed battalion. From that bound-together sense the root reaches ==prescribing / decreeing== (كُتِبَ عليكم, “it is written upon you”) — a fixed, joined ordinance.', 'ابن فارس پورے مادّے کو ایک اصل کی طرف لوٹاتے ہیں: جمع اور ضم۔ کتاب حروف کو ملانے سے، کتیبہ جمع شدہ لشکر؛ پھر فرض و قضا (کُتِبَ علیکم)۔', '{"letters":["ك","ت","ب"],"core_ar":"الجمعُ والضمُّ؛ ثم الكتابةُ والفَرْض","frequency_quran":319}', 'saaid_maqayis_al_lugha', 0, 'classical', '["classical"]', '{"icon":"dna"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:sarf', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'sarf', NULL, 2, 'الوزن والصرف', 'Wazn & Ṣarf', 'وزن و صرف',
  'كِتاب على وزن ==فِعال==، وهو في أصله مصدرٌ من كَتَبَ (بمعنى الكِتابة) ثم نُقِل فصار اسماً بمعنى المفعول: ==المكتوب==، أي الشيء المُثبَت بالخطّ. والجذر سالمٌ لا إعلال فيه.', 'كِتاب is the pattern ==فِعال==. It began as a maṣdar of كَتَبَ (the act of writing) and then shifted to a concrete noun of the object — ==المكتوب==, “the written thing.” The root is sound (سالم), no iʿlāl.', 'کِتاب وزن فِعال پر ہے؛ اصل میں مصدر (لکھنا) تھا، پھر بمعنی مفعول (لکھی ہوئی چیز) نام بن گیا۔ جڑ سالم ہے۔', '{"pattern_ar":"فِعال","from_ar":"كَتْب (مصدر)","to_ar":"كِتاب (بمعنى المكتوب)","rule":"مصدرٌ نُقِل إلى معنى اسم المفعول (فِعال بمعنى مَفْعول)، كاللِّباس بمعنى المَلبوس","features":[{"k":"الوزن","v":"فِعال"},{"k":"الأصل","v":"مصدر كَتَبَ"},{"k":"الدلالة","v":"بمعنى المفعول (المكتوب)"},{"k":"نوع الجذر","v":"سالم"}]}', 'qac_morphology', 0, 'classical', '["classical","linguistic"]', '{"icon":"ruler"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:derivations', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'derivations', NULL, 3, 'الاشتقاق', 'Derived Family', 'مشتقات',
  'من (ك ت ب) تتفرّع أسرةٌ كاملة: فعلُ الكتابة ومزيداته، والفاعل (كاتِب)، والمفعول (مكتوب)، والمصادر والأسماء (كِتاب، كِتابة)، وما احتفظ بأصل ==الجمع== كالكَتيبة للجيش المجتمع.', 'From ك ت ب spreads a whole family: the verb of writing and its augmented forms, the doer (كاتِب), the done-to (مكتوب), the nouns (كِتاب, كِتابة), and words that keep the raw ==gathering== sense — كَتيبة, a massed battalion.', 'ک ت ب سے پورا خاندان: فعلِ کتابت، کاتب، مکتوب، کتاب، کتابہ، اور جمع کے اصل معنی پر کتیبہ (لشکر)۔', '{"groups":[{"form_ar":"الفعل — Verb","items":[{"ar":"كَتَبَ","en":"to write; to prescribe (I)"},{"ar":"كاتَبَ","en":"to correspond; to contract manumission (III)"},{"ar":"اكْتَتَبَ","en":"to have (something) written; to copy (VIII)"}]},{"form_ar":"اسم الفاعل — Active participle","items":[{"ar":"كاتِب","en":"writer, scribe"}]},{"form_ar":"اسم المفعول — Passive participle","items":[{"ar":"مَكْتوب","en":"written; prescribed, decreed"}]},{"form_ar":"المصادر والأسماء — Nouns","items":[{"ar":"كِتاب","en":"book, scripture"},{"ar":"كِتابة","en":"writing (the act/craft)"},{"ar":"كَتيبة","en":"battalion (a gathered troop)"},{"ar":"كُتّاب","en":"scribes; a writing-school"}]}]}', 'kmaps_five_lens', 1, 'linguistic', '["linguistic"]', '{"icon":"git-fork"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:lexicon', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'lexicon', NULL, 4, 'المعاجم', 'Classical Lexicons', 'لغات',
  '==ما يضيفه كلُّ معجم== لا مجرّد النقل: يبدأ الخليلُ بالحسّ (خِياطة الأديم)، ويجمعه ابنُ فارس في أصلٍ واحد، ويرتّبه الراغبُ من الحسّ إلى الحُكم، ويُبرِز ابنُ منظور دلالة الفَرْض والقَدَر.', '==The shade each lexicon adds==, not raw entries: al-Khalīl starts from the senses (stitching hide to hide), Ibn Fāris binds it to one core, al-Rāghib orders it from the physical to the decreed, and Ibn Manẓūr foregrounds fate/ordinance.', 'ہر لغت جو اضافہ کرتی ہے: خلیل حسی معنی سے، ابن فارس ایک اصل میں، راغب حس سے حکم تک، ابن منظور فرض و قدر کو نمایاں کرتے ہیں۔', '{"entries":[{"source":"al-Khalīl, Kitāb al-ʿAyn","death":"d. 170 AH","shade_ar":"الكَتْبُ: ضمُّ أديمٍ إلى أديمٍ بالخِياطة؛ ومنه الكِتابُ لضمِّ الحروف","shade_en":"The physical root: stitching one hide to another — from which كِتاب, the binding of letters."},{"source":"Ibn Fāris, Maqāyīs al-Lugha","death":"d. 395 AH","shade_ar":"أصلٌ صحيحٌ واحد: الجمعُ والضمُّ؛ تتفرّع منه المعاني كلُّها","shade_en":"One sound core — gathering and binding — from which every sense branches."},{"source":"al-Rāghib, Mufradāt","death":"d. 502 AH","shade_ar":"الكَتْبُ: ضمُّ الشيء إلى الشيء؛ يُستعمَل في ضمّ الحروف بالخطّ، ثم في الفَرْض والحُكم والقَدَر","shade_en":"Joins thing to thing → joining letters by writing → then prescribing, judging, destining."},{"source":"Ibn Manẓūr, Lisān al-ʿArab","death":"d. 711 AH","shade_ar":"الكِتابُ: الفَرْضُ والحُكمُ والقَدَر؛ وما يُكتَبُ فيه؛ وكَتَبَ اللهُ الشيءَ: قضاه","shade_en":"Ordinance, judgement, decree — and the thing written in; كَتَبَ اللهُ = God decreed."}]}', 'kmaps_five_lens', 1, 'classical', '["classical"]', '{"icon":"book-open"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:attestations', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'attestations', NULL, 5, 'الاستعمال الأقدم', 'Earliest Usage', 'قدیم ترین استعمال',
  'قبل أن يصير (الكِتاب) وحياً منزَّلاً، عاش الجذرُ في الحسّ: خرزُ الأديم، والكَتيبةُ المجتمعة، والصحيفةُ المكتوبة، ثم الفَرْضُ المقضيّ.', 'Before كِتاب meant revealed scripture, the root lived in the tangible: stitching hide, a massed battalion, a written pact — and then the settled decree.', 'کتاب کے وحی بننے سے پہلے جڑ حسی معنی میں: چمڑا سینا، کتیبہ، لکھی صحیفہ، پھر فرض۔', '{"witnesses":[{"era_ar":"الجاهلية","era_en":"Pre-Islamic","kind_ar":"حسّي","phrase_ar":"كَتَبَ السِّقاءَ","gloss_en":"stitched the waterskin shut","image_ar":"ضمُّ أديمٍ إلى أديم","image_en":"binding hide to hide","lex_source":"Kitāb al-ʿAyn","lex_ar":"الكَتْبُ: الخَرْزُ بسَيرَين","lex_en":"to sew with two thongs","motif":"shape","icon":"link"},{"era_ar":"الجاهلية","era_en":"Pre-Islamic","kind_ar":"حربي","phrase_ar":"كَتيبةٌ خَضراء","gloss_en":"a dense (iron-grey) battalion","image_ar":"الجماعةُ المجتمعة من الجيش","image_en":"a massed troop","lex_source":"Lisān al-ʿArab","lex_ar":"الكَتيبة: الجماعةُ المستكتِبة","lex_en":"the gathered company","motif":"family","icon":"landmark"},{"era_ar":"صدر الإسلام","era_en":"Early Islamic","kind_ar":"وثائقي","phrase_ar":"كِتابُ النبيِّ ﷺ","gloss_en":"the Prophet’s written pact/letter","image_ar":"الصحيفةُ والعهد المكتوب","image_en":"a written pact","lex_source":"Mufradāt","lex_ar":"الكِتاب: ما يُضَمُّ من الحروف","lex_en":"letters bound together","motif":"arrival","icon":"quote"},{"era_ar":"قرآني","era_en":"Qurʾānic","kind_ar":"حُكمي","phrase_ar":"كُتِبَ عليكم","gloss_en":"it is prescribed upon you","image_ar":"الفَرْضُ المُثبَت","image_en":"a fixed ordinance","lex_source":"Lisān al-ʿArab","lex_ar":"كَتَبَ اللهُ الشيءَ: قضاه","lex_en":"God decreed it","motif":"split","icon":"key-round"}]}', 'kmaps_five_lens', 0, 'classical', '["classical"]', '{"icon":"landmark"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:kindred', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'kindred', NULL, 7, 'النظائر والأضداد', 'Kindred & Contrast', 'نظائر و اضداد',
  'الكِتابُ من عائلةِ الوحي المكتوب: يجاوره ما كُتِب في صحفٍ وأسفار؛ ويقابله ما لم يُثبَت: الشِّفاهُ والمَحْو.', 'كِتاب belongs to the family of written revelation; near it stand other written things (leaf, tome, psalm), and against it stands the unfixed — the oral and the erased.', 'کتاب لکھی وحی کے خاندان سے؛ نظائر: صحیفہ، سِفر، زبور؛ اضداد: شفاہی، محو۔', '{"synonyms":[{"ar":"صحيفة","en":"ṣaḥīfa","note":"a single leaf/page"},{"ar":"سِفْر","en":"sifr","note":"a large weighty tome"},{"ar":"زَبور","en":"zabūr","note":"a written psalm/scripture"}],"contrast":[{"ar":"شِفاهيّ","en":"oral","note":"spoken, not committed to writing"},{"ar":"مَحْو","en":"erasure","note":"blotted out vs. what is fixed (يمحو الله ويثبت)"}]}', 'kmaps_five_lens', 1, 'linguistic', '["linguistic"]', '{"icon":"scale"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:metaphor', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'metaphor', NULL, 8, 'التصوير الذهني', 'Conceptual Metaphor', 'تصور',
  'الاستعارةُ الجذرية: ==القَدَرُ كِتابٌ مكتوب==. فما ثُبِّت بالخطّ لا يُمحى، فصار الكَتْبُ صورةً للحُكم الماضي والقضاء المُبرَم.', 'The root metaphor: ==DESTINY IS A WRITTEN RECORD==. What is set down in writing cannot be unwritten, so كَتْب becomes the image of a settled, binding decree.', 'بنیادی استعارہ: تقدیر ایک لکھی کتاب — جو لکھا گیا مٹتا نہیں۔', '{"source_ar":"الكتابةُ والتثبيت","target_ar":"الحُكمُ والقَدَرُ المُبرَم","mapping":"DESTINY IS A WRITTEN RECORD"}', 'kmaps_five_lens', 1, 'linguistic', '["linguistic"]', '{"icon":"git-compare"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:constellation', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'constellation', NULL, 9, 'كوكبة الكلمة', 'Word Constellation', 'کوکبہ',
  'يدور حول (كِتاب) مشتقّاتُه القريبة (كاتِب، مكتوب، كِتابة، كَتيبة) في المدار الأول، ونظائرُه (صحيفة، سِفْر) في المدار الثاني.', 'Around كِتاب orbit its close derivatives (scribe, written, writing, battalion) in the inner ring, and its kindred (page, tome) in the outer ring.', 'کتاب کے گرد مشتقات اور نظائر کے مدار۔', '{"center":{"ar":"كِتاب","root":"ك ت ب"},"nodes":[{"ar":"كاتِب","en":"scribe","ring":1,"angle":25,"kind":"derived"},{"ar":"مَكْتوب","en":"written","ring":1,"angle":95,"kind":"derived"},{"ar":"كِتابة","en":"writing","ring":1,"angle":165,"kind":"derived"},{"ar":"كَتيبة","en":"battalion","ring":1,"angle":300,"kind":"derived"},{"ar":"صحيفة","en":"page","ring":2,"angle":60,"kind":"synonym"},{"ar":"سِفْر","en":"tome","ring":2,"angle":130,"kind":"synonym"},{"ar":"شِفاهيّ","en":"oral","ring":2,"angle":235,"kind":"contrast"}]}', 'kmaps_five_lens', 1, 'linguistic', '["linguistic"]', '{"icon":"orbit"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:synthesis', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'synthesis', NULL, 6, 'التخليص الجامع', 'Synthesis', 'خلاصہ',
  'تجتمع الخيوط: ==ما ضُمَّ وأُثبِتَ==. من ضمِّ الأديم إلى ضمِّ الحروف إلى تثبيت الحُكم — فالكِتابُ فَرْضٌ مقضيٌّ صار وحياً مُبيناً.', 'The strands converge on ==what is bound and fixed==: from stitching hide, to binding letters, to fixing a decree — كِتاب is a settled ordinance that becomes a clarifying Scripture.', 'سب دھاگے ملتے ہیں: جو باندھا اور طے کیا گیا — کتاب فرضِ مقضی جو وحیِ مبین بنا۔', '{"output":"كِتابٌ: ما ضُمَّ وأُثبِتَ — فَرْضٌ مقضيٌّ صار وحياً مُبيناً","strands":[{"kind":"lexicon","badge":"المعجم","source":"Ibn Fāris","ar":"الجمعُ والضمُّ","en":"gathering & binding","concept":"binding","icon":"link"},{"kind":"lexicon","badge":"المفردات","source":"al-Rāghib","ar":"ضمُّ الحروف ثم الفَرْض","en":"writing → decreeing","concept":"decree","icon":"feather"},{"kind":"verbal_idiom","badge":"السياق","source":"كُتِبَ عليكم","ar":"الأمرُ المُثبَت","en":"a fixed ordinance","concept":"binding-decree","icon":"quote"},{"kind":"tafsir","badge":"التفسير","source":"al-Zamakhsharī","ar":"الكتابُ المبينُ: القرآن","en":"the clear Book = the Qurʾān","concept":"scripture","icon":"book-open"}]}', 'kmaps_synthesis', 1, 'linguistic', '["linguistic","tafsir"]', '{"icon":"sparkles"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:occurrences', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'occurrences', NULL, 10, 'الشواهد القرآنية', 'Qurʾānic Occurrences', 'قرآنی شواہد',
  'يردُ الجذرُ نحوَ ٣١٩ مرّةً بمعانٍ متضامّة: الوحيُ المنزَّل، والفَرْضُ المقضيّ، وسِجِلُّ الأعمال، والرسالةُ المكتوبة. وموضعُ الدراسة هنا: ﴿وَالْكِتَابِ الْمُبِينِ﴾.', 'The root occurs ~319 times across kindred senses — revealed Scripture, settled decree, the record of deeds, a written letter. The study locus here is ﴿وَالْكِتَابِ الْمُبِينِ﴾.', 'جڑ تقریباً ۳۱۹ بار: وحی، فرض، اعمال نامہ، خط۔ مطالعہ: ﴿وَالْکِتَابِ الْمُبِینِ﴾۔', '{"items":[{"ayah_key":"44:2","kind_ar":"الكتاب المبين","en":"the clear Book","motif":"revelation","text_ar":"وَالْكِتَابِ الْمُبِينِ","note":"القرآنُ المُقسَمُ به، الموصوفُ بالإبانة","focus":true,"icon":"star"},{"ayah_key":"17:14","kind_ar":"كتابُ الأعمال","en":"the record of deeds","motif":"split","text_ar":"اقْرَأْ كِتَابَكَ","note":"صحيفةُ العمل التي كتبها الحفَظة، يقرؤها المرءُ على نفسه","icon":"quote"},{"ayah_key":"27:28","kind_ar":"كتابُ سليمان","en":"a written letter","motif":"arrival","text_ar":"اذْهَب بِّكِتَابِي هَٰذَا","note":"رسالةٌ مكتوبة أرسلها سليمانُ إلى ملكة سبأ","icon":"feather"},{"ayah_key":"13:39","kind_ar":"أمُّ الكتاب","en":"the archetype/decree","motif":"shape","text_ar":"وَعِندَهُ أُمُّ الْكِتَابِ","note":"أصلُ الكتاب وجملتُه عند الله — الثابتُ الذي عليه المحوُ والإثبات","icon":"key-round"}]}', NULL, 0, 'quran', '["quran"]', '{"icon":"map-pin"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:development', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'development', NULL, 11, 'التطور الدلالي', 'Semantic Development', 'ارتقائے معنی',
  'يمشي المعنى من الحسّ إلى التنزيل: الضمُّ ثم الخطُّ ثم الفَرْضُ ثم الكتابُ المُنزَّل.', 'The sense travels from the tangible to revelation: binding → writing → decreeing → the revealed Book.', 'معنی حس سے وحی تک: ضم → خط → فرض → منزَّل کتاب۔', '{"stages":[{"label_ar":"الضمّ","label_en":"Binding","note":"ضمُّ الشيء إلى الشيء؛ خرزُ الأديم، والكَتيبة"},{"label_ar":"الخطّ","label_en":"Writing","note":"ضمُّ الحروف بالكتابة — الكِتابة والكاتب"},{"label_ar":"الفَرْض","label_en":"Decreeing","note":"كُتِبَ عليكم — الأمرُ المُثبَت المقضيّ"},{"label_ar":"الكتاب المُنزَّل","label_en":"Scripture","note":"الوحيُ المكتوبُ المحفوظ — الكتاب المبين"}]}', 'kmaps_five_lens', 1, 'linguistic', '["linguistic"]', '{"icon":"trending-up"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:usage_map', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'usage_map', NULL, 12, 'خريطة الاستعمال', 'Usage Map', 'نقشۂ استعمال',
  'توزُّعُ معاني (كتاب) عبر مواضعه: وحيٌ، وفَرْضٌ، وسِجِلٌّ، ورسالة.', 'How كِتاب’s senses distribute across its verses: Scripture, decree, record, letter.', 'کتاب کے معانی کی تقسیم: وحی، فرض، سجل، خط۔', '{"axes":[{"ar":"وحي منزَّل","en":"Scripture"},{"ar":"فَرْض وحُكم","en":"Decree"},{"ar":"سِجِلّ الأعمال","en":"Record"},{"ar":"رسالة مكتوبة","en":"Letter"}],"rows":[{"ref":"44:2","label":"الكتاب المبين","weights":[3,1,0,0]},{"ref":"2:2","label":"ذلك الكتاب","weights":[3,0,0,0]},{"ref":"2:183","label":"كُتِب عليكم","weights":[0,3,0,0]},{"ref":"17:14","label":"اقرأ كتابك","weights":[0,1,3,0]},{"ref":"27:28","label":"اذهب بكتابي","weights":[0,0,0,3]},{"ref":"3:64","label":"أهل الكتاب","weights":[3,1,0,0]}]}', 'kmaps_usage_map', 1, 'quran', '["quran"]', '{"icon":"grid-3x3"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:root:كتب:master_story', 'root', 'كتب', 'كتب', '44:2', 44, 2, 1,
  'master_story', NULL, 13, 'القصة الجامعة', 'Master Story', 'جامع کہانی',
  'قصةُ (كتاب) في أربع حركات: الضمُّ، فالخطُّ، فالفَرْضُ، فالكتابُ المُبين.', 'The story of كِتاب in four movements: binding, then writing, then decreeing, then the Book made manifest.', 'کتاب کی کہانی چار حرکتوں میں۔', '{"medallion_ar":"كِتاب","medallion_root":"ك ت ب","threads":["المعجم","الاشتقاق","التفسير"],"movements":[{"no":"I","motif":"binding","en":"The Binding","ar":"الضمّ","accent":"#c9a84c","text":"في الأصلِ ضمٌّ: خرزُ الأديم، وجمعُ الكَتيبة — كلُّ ما جُمِعَ وضُمَّ.","icon":"link","chips":[{"ar":"كَتيبة","en":"battalion"}]},{"no":"II","motif":"writing","en":"The Writing","ar":"الخطّ","accent":"#7fb58f","text":"ثم ضُمَّت الحروفُ بالخطّ، فكان الكاتبُ والمكتوبُ والكِتابة.","icon":"feather","chips":[{"ar":"كاتِب","en":"scribe"}]},{"no":"III","motif":"decree","en":"The Decree","ar":"الفَرْض","accent":"#8878e2","text":"وما أُثبِتَ بالكتابةِ لا يُمحى، فصار كُتِبَ بمعنى فُرِضَ وقُضِيَ.","icon":"key-round","chips":[{"ar":"كُتِبَ عليكم","en":"prescribed"}]},{"no":"IV","motif":"scripture","en":"The Book Made Manifest","ar":"الكتاب المبين","accent":"#93b8d6","text":"وبلغَ الجذرُ ذروتَه: كِتابٌ منزَّلٌ مُبينٌ، أُقسِمَ به على نزوله في ليلةٍ مباركة.","icon":"book-open","chips":[{"ar":"المبين","en":"clear"}]}]}', 'kmaps_master_story', 1, 'linguistic', '["linguistic","tafsir"]', '{"icon":"sparkles"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:ctx:44:2:irab', 'context', '44:2', 'كتب', '44:2', 44, 2, 1,
  'irab', NULL, 1, 'الإعراب في السياق', 'Iʿrāb in Context', 'اعراب',
  'الواوُ واوُ القسم، و﴿الكتابِ﴾ ==مجرورٌ بواو القسم==، والجارُّ والمجرورُ متعلّقان بفعلٍ محذوفٍ تقديرُه أَقْسِمُ؛ و﴿المبينِ﴾ نعتٌ للكتاب. وجملةُ ﴿إنّا أنزلناه﴾ جوابُ القسم.', '﴿الكتابِ﴾ is ==genitive by the oath-wāw==, the prepositional phrase hanging on an elided verb (تقديره أَقْسِمُ, “I swear”); ﴿المبينِ﴾ is its adjective (naʿt). ﴿إنّا أنزلناه﴾ is the response to the oath.', 'واو قسم؛ ﴿الکتاب﴾ اس سے مجرور، فعل محذوف (أقسم) سے متعلق؛ ﴿المبین﴾ نعت؛ ﴿إنا أنزلناه﴾ جواب قسم۔', '{"role_ar":"مُقسَمٌ به","role_en":"the sworn-by (genitive)","position_ar":"مجرورٌ بواو القسم، متعلّقٌ بفعلٍ محذوفٍ تقديرُه أَقْسِمُ","sign_ar":"الكسرة","sources":["الإعراب الميسّر: الواو واو القسم، ﴿الكتاب﴾ مجرور بها، ﴿المبين﴾ نعت للكتاب","الجدول في إعراب القرآن: ﴿الكتاب﴾ متعلّق بفعلٍ محذوف تقديره أقسم؛ ﴿إنّا أنزلناه﴾ جواب القسم لا محلّ لها","إعراب الدرويش: تقدّم نظيرُه في الزخرف؛ ﴿إنّا أنزلناه﴾ جواب القسم"]}', 'muyassar_irab', 0, 'classical', '["classical"]', '{"icon":"waypoints"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:ctx:44:2:balagha', 'context', '44:2', 'كتب', '44:2', 44, 2, 1,
  'balagha', NULL, 2, 'البلاغة', 'Balāgha', 'بلاغت',
  'قَسَمٌ بالكتاب على تنزيلِه: يُقسِمُ الوحيُ ==بنفسه== تعظيماً؛ وصفةُ ﴿المبين﴾ تُبرِزُ أنّ المُقسَمَ به بيِّنٌ في ذاته مُبِينٌ لغيره — رابطةٌ بين الوحي والوضوح.', 'An oath sworn ==by the Book upon its own descent== — revelation swearing by itself to dignify it; the epithet ﴿المبين﴾ makes the sworn-by both clear in itself and clarifying — binding revelation to intelligibility.', 'کتاب کی قسم اس کے نزول پر؛ ﴿المبین﴾ وحی کو وضوح سے جوڑتی ہے۔', '{"formula_ar":"قَسَمٌ (كِتاب) + نعت (مُبِين)","formula_en":"the كتاب-مبين oath binds revelation to its own clarity","refs":["43:2","44:2","12:1","26:2","27:1","28:2"]}', 'kmaps_five_lens', 1, 'modern', '["modern"]', '{"icon":"feather"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:ctx:44:2:translators', 'context', '44:2', 'كتب', '44:2', 44, 2, 1,
  'translators', NULL, 3, 'اختيارات المترجمين', 'Translator Choices', 'مترجمین کے اختیار',
  'يتفاوتُ نقلُ ﴿الكتاب المبين﴾ بين "الكتاب الواضح" و"الكتاب المُوضِّح" — على قراءةِ ﴿المبين﴾ لازماً أو متعدّياً.', 'Renderings of ﴿الكتاب المبين﴾ swing between “the clear Book” and “the Book that makes clear,” tracking whether ﴿المبين﴾ is read as intransitive or causative.', 'ترجمے: "واضح کتاب" یا "واضح کرنے والی کتاب"۔', '{"renderings":[{"translator":"Abdel Haleem","text":"the Scripture that makes things clear","reading":"causative"},{"translator":"Pickthall","text":"the Scripture that maketh plain","reading":"causative"},{"translator":"Yusuf Ali","text":"the Book that makes things clear","reading":"causative"},{"translator":"Sahih Intl","text":"the clear Book","reading":"partial"},{"translator":"K-MAPS gloss","text":"the Book that is clear in itself and makes all else clear","reading":"both"}]}', 'kmaps_five_lens', 1, 'modern', '["modern"]', '{"icon":"languages"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:ctx:44:2:tafsir', 'context', '44:2', 'كتب', '44:2', 44, 2, 1,
  'tafsir', NULL, 4, 'التفسير', 'Tafsīr & Scholars', 'تفسیر',
  'أجمعَ المفسّرون أنّ الواو للقسم، وأنّ ﴿الكتاب المبين﴾ هو القرآن؛ ورَدَّه الطبريُّ إلى أمِّ الكتاب / اللوح المحفوظ، وجعل ﴿إنّا أنزلناه﴾ جوابَ القسم.', 'The exegetes agree the wāw is an oath and that ﴿الكتاب المبين﴾ is the Qurʾān; al-Ṭabarī ties it to أمّ الكتاب / the Preserved Tablet, with ﴿إنّا أنزلناه﴾ as the oath’s response.', 'مفسرین: واو قسم؛ ﴿الکتاب المبین﴾ = قرآن؛ طبری: امّ الکتاب/لوح محفوظ۔', '{"entries":[{"scholar":"al-Ṭabarī","work":"Jāmiʿ al-Bayān","text":"أقسمَ اللهُ بهذا الكتابِ أنّه أنزله في ليلةٍ مباركة؛ والكتابُ يُرَدُّ إلى أمِّ الكتاب واللوحِ المحفوظ."},{"scholar":"al-Zamakhsharī","work":"al-Kashshāf","text":"الواوُ واوُ القسم، و﴿إنّا أنزلناه﴾ جوابُه؛ و﴿الكتابُ المبينُ﴾: القرآن."}]}', 'TABARI', 0, 'tafsir', '["tafsir"]', '{"icon":"quote"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:ctx:17:14:irab', 'context', '17:14', 'كتب', '17:14', 44, 2, 1,
  'irab', NULL, 1, 'الإعراب في السياق', 'Iʿrāb in Context', 'اعراب',
  '﴿كِتابَكَ﴾ ==مفعولٌ به منصوب== لفعل الأمر ﴿اقرأ﴾، وعلامةُ نصبِه الفتحة، والكافُ مضافٌ إليه. وجملةُ ﴿اقرأ كتابك﴾ في محلِّ نصبٍ ==مقولُ قولٍ محذوف== تقديرُه: يُقالُ له.', '﴿كِتابَكَ﴾ is the ==direct object (accusative)== of the imperative ﴿اقرأ﴾ (sign: fatḥa), the attached ك being muḍāf ilayh. The clause is ==the object of an elided verb of saying== (يُقال له, “it is said to him”).', '﴿کتابک﴾ فعلِ امر ﴿اقرأ﴾ کا مفعول بہ منصوب؛ کاف مضاف الیہ؛ جملہ محذوف قول کا مقول۔', '{"role_ar":"مفعولٌ به","role_en":"direct object (accusative)","position_ar":"مقولُ قولٍ محذوف (يُقالُ له)؛ الكافُ مضافٌ إليه","sign_ar":"الفتحة","sources":["الإعراب الميسّر: ﴿اقرأ كتابك﴾ في موضع نصبٍ مقولُ قولٍ محذوف؛ ﴿كتابك﴾ مفعولٌ به","إعراب الدعّاس: ﴿كتاب﴾ مفعولٌ به والكافُ مضافٌ إليه، والجملةُ مقولُ القول لفعلٍ محذوف تقديره يُقال له","التبيان (العُكبري): ﴿اقرأ﴾ أي يُقال له"]}', 'muyassar_irab', 0, 'classical', '["classical"]', '{"icon":"waypoints"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:ctx:17:14:tafsir', 'context', '17:14', 'كتب', '17:14', 44, 2, 1,
  'tafsir', NULL, 4, 'التفسير', 'Tafsīr & Scholars', 'تفسیر',
  'الكِتابُ هنا ==صحيفةُ عملِ العبد== التي كتبها الحفَظة في الدنيا، يُقرِئُه اللهُ إيّاها فيكون حسيبَ نفسِه.', 'Here كِتاب is ==the record of one’s own deeds==, written by the recording angels, which one is made to read against oneself — one’s own reckoner.', 'یہاں کتاب اعمال کا نامہ ہے جسے فرشتوں نے لکھا؛ انسان خود اسے پڑھے گا۔', '{"entries":[{"scholar":"al-Ṭabarī","work":"Jāmiʿ al-Bayān","text":"اقرأ كتابَ عملِك الذي عملتَه في الدنيا، الذي كان كاتبانا يكتبانه ونُحصيه عليك — حسبُك اليومَ نفسُك عليك حسيباً."},{"scholar":"al-Zamakhsharī","work":"al-Kashshāf","text":"طائرُه عملُه لازمٌ له لزومَ القلادةِ أو الغُلّ؛ ﴿اقرأ﴾ على إرادةِ القول، والكتابُ صحيفةُ العمل."},{"scholar":"Ibn Kathīr","work":"Tafsīr al-Qurʾān al-ʿAẓīm","text":"ما طار عنه من عملِه من خيرٍ وشرّ يُلزَمُ به ويُجازى عليه — ﴿كراماً كاتبين يعلمون ما تفعلون﴾، تفصيلُ الأعمال في صحيفةٍ منشورة."}]}', 'TABARI', 0, 'tafsir', '["tafsir"]', '{"icon":"quote"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:ctx:27:28:irab', 'context', '27:28', 'كتب', '27:28', 44, 2, 1,
  'irab', NULL, 1, 'الإعراب في السياق', 'Iʿrāb in Context', 'اعراب',
  '﴿بِكِتابِي﴾ ==جارٌّ ومجرور==؛ الباءُ حرفُ جرّ و﴿كتابي﴾ مجرورٌ بها وعلامةُ جرّه الكسرة، والياءُ مضافٌ إليه، والجارُّ والمجرورُ متعلّقان بـ﴿اذهب﴾. و﴿هٰذا﴾ نعتٌ لـ﴿كتابي﴾ أو بدلٌ منه (عطفُ بيان).', '﴿بِكِتابِي﴾ is a ==prepositional phrase==: بِ + كتاب (genitive, sign: kasra), the ي being muḍāf ilayh, the whole phrase hanging on ﴿اذهب﴾. ﴿هٰذا﴾ is its adjective / appositive.', '﴿بکتابی﴾ جار و مجرور، ﴿اذهب﴾ سے متعلق؛ یاء مضاف الیہ؛ ﴿ہذا﴾ نعت/بدل۔', '{"role_ar":"اسمٌ مجرورٌ بالباء","role_en":"genitive after the preposition bāʾ","position_ar":"جارٌّ ومجرور متعلّقان بـ﴿اذهب﴾؛ الياءُ مضافٌ إليه؛ ﴿هذا﴾ نعتٌ أو بدلٌ/عطفُ بيان","sign_ar":"الكسرة","sources":["الإعراب الميسّر: ﴿بكتابي﴾ جارٌّ ومجرور متعلّقان بـ﴿اذهب﴾، و﴿هذا﴾ نعتٌ لكتابي أو بدلٌ منه","الجدول في إعراب القرآن: ﴿بكتابي﴾ متعلّق بـ﴿اذهب﴾؛ ﴿هذا﴾ عطفُ بيانٍ على كتابي أو بدلٌ منه في محلّ جرّ","إعراب الدرويش: ثم كتب سليمانُ كتاباً هذه صورتُه — أي كتابٌ مكتوبٌ مُرسَل"]}', 'muyassar_irab', 0, 'classical', '["classical"]', '{"icon":"waypoints"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:ctx:27:28:tafsir', 'context', '27:28', 'كتب', '27:28', 44, 2, 1,
  'tafsir', NULL, 4, 'التفسير', 'Tafsīr & Scholars', 'تفسیر',
  'الكِتابُ هنا ==رسالةٌ مكتوبة== أنشأها سليمانُ وأرسلها إلى ملكة سبأ يدعوها إلى طاعته والإسلام؛ وفيها دليلُ جوازِ مكاتبةِ غيرِ المسلمين بالدعوة.', 'Here كِتاب is ==a written letter== Solomon composed and sent to the Queen of Sheba, summoning her to obedience and faith — grounding the ruling that letters of daʿwa may be sent to non-Muslims.', 'یہاں کتاب ایک لکھا خط ہے جو سلیمان نے ملکہ سبا کو دعوت کے لیے بھیجا۔', '{"entries":[{"scholar":"Ibn ʿĀshūr","work":"al-Taḥrīr wa-l-Tanwīr","text":"ألهمَ اللهُ سليمانَ أن يجعلَ طريقَ المراسلة، فكتبَ إلى ملكةِ سبأ كتاباً لتأتيَه وتدخلَ في طاعتِه وتُصلحَ ديانةَ قومِها."},{"scholar":"al-Ālūsī","work":"Rūḥ al-Maʿānī","text":"بعدما كتبَ كتابَه في ذلك المجلس؛ وفي الآيةِ دليلٌ على جوازِ إرسالِ الكتبِ إلى المشركين لإبلاغِ الدعوة، وقد كتبَ رسولُ الله ﷺ إلى كسرى وقيصر."}]}', 'TABARI', 0, 'tafsir', '["tafsir"]', '{"icon":"quote"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:ctx:13:39:irab', 'context', '13:39', 'كتب', '13:39', 44, 2, 1,
  'irab', NULL, 1, 'الإعراب في السياق', 'Iʿrāb in Context', 'اعراب',
  '﴿عِندَهُ﴾ ظرفٌ متعلّقٌ بمحذوفٍ ==خبرٌ مقدَّم==، و﴿أُمُّ﴾ ==مبتدأٌ مؤخَّرٌ مرفوع== وعلامةُ رفعِه الضمة، و﴿الكتابِ﴾ ==مضافٌ إليه مجرور== بالكسرة. والجملةُ استئنافيّة.', '﴿عِندَهُ﴾ is a fronted adverbial ==predicate==; ﴿أُمُّ﴾ is the ==delayed subject== (marfūʿ, sign: ḍamma); ﴿الكتابِ﴾ is the ==second term of the iḍāfa== (genitive). The clause is an opener (isti’nāf).', '﴿عندہ﴾ خبر مقدم؛ ﴿أمّ﴾ مبتدأ مؤخر مرفوع؛ ﴿الکتاب﴾ مضاف الیہ مجرور۔', '{"role_ar":"مبتدأٌ مؤخَّر (أُمّ) في إضافةِ ﴿أُمّ الكتاب﴾","role_en":"delayed subject in the iḍāfa “Mother of the Book”","position_ar":"الخبرُ مقدَّمٌ شبهُ جملة (عنده)؛ ﴿الكتابِ﴾ مضافٌ إليه مجرور","sign_ar":"الضمة (أُمّ) / الكسرة (الكتاب)","sources":["الإعراب الميسّر: ﴿عنده﴾ ظرفٌ متعلّقٌ بمحذوفٍ خبرٍ مقدَّم، و﴿أمّ﴾ مبتدأٌ مؤخَّر، و﴿الكتاب﴾ مضافٌ إليه","إعراب الدعّاس: ﴿أمّ﴾ مبتدأٌ مؤخَّر، ﴿عند﴾ ظرفٌ متعلّقٌ بالخبرِ المقدَّم، ﴿الكتاب﴾ مضافٌ إليه، والجملةُ مستأنفة","الجدول: لا محلَّ لها معطوفةٌ على الاستئنافيّة؛ وفي ﴿لكلِّ أجلٍ كتاب﴾ فنُّ الاستخدام (الأجلُ المكتوب والسِّجِلّ)"]}', 'muyassar_irab', 0, 'classical', '["classical"]', '{"icon":"waypoints"}', 'live');

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, is_synthesis, register, registers_json, meta_json, status)
 VALUES ('MDB:ctx:13:39:tafsir', 'context', '13:39', 'كتب', '13:39', 44, 2, 1,
  'tafsir', NULL, 4, 'التفسير', 'Tafsīr & Scholars', 'تفسیر',
  '﴿أمُّ الكتاب﴾ ==أصلُ الكتاب وجملتُه== عند الله: المرجعُ الثابتُ الذي منه المحوُ والإثبات، لا يناله تبديل. وعن كعب: جعلَ اللهُ علمَه كتاباً.', '﴿أمُّ الكتاب﴾ is ==the origin and whole of the Book== with God — the fixed master from which erasing and confirming proceed, untouched by change. Per Kaʿb: God made His knowledge a Book.', '﴿أمّ الکتاب﴾ کتاب کی اصل و جملہ اللہ کے پاس؛ ثابت مرجع جس سے محو و اثبات ہوتا ہے۔', '{"entries":[{"scholar":"al-Ṭabarī","work":"Jāmiʿ al-Bayān","text":"أولى الأقوال أنّ عنده أصلَ الكتاب وجملتَه: الناسخُ والمنسوخُ وما يُبدَّلُ وما يُثبَت، كلُّ ذلك في كتاب؛ إلا الشقاءَ والسعادةَ فإنهما لا يُغَيَّران. وعن كعب: قال اللهُ لعلمِه كُنْ كتاباً فكان."},{"scholar":"al-Ālūsī","work":"Rūḥ al-Maʿānī","text":"يمحو اللهُ ويُثبِتُ نسخاً للأحكامِ بحسب الحكمةِ والوقت، أو من ديوانِ الحفَظة، أو آجالُ الحياةِ والموت — والكلُّ محكومٌ بأمِّ الكتابِ الثابتِ عنده."}]}', 'TABARI', 0, 'tafsir', '["tafsir"]', '{"icon":"quote"}', 'live');

UPDATE qr_morph_display_words SET
  is_anchor=1, frequency_quran=319, difficulty=3, badge_color='#c9a84c',
  derived_type_ar='مصدر بمعنى المفعول', derived_type_en='verbal noun (as object)',
  gloss_ar='الكِتابُ المنزَّل — ما ضُمَّ وأُثبِتَ فصار وحياً', gloss_en='==What is bound and fixed== — letters gathered, a decree set down, then the revealed Book.',
  sense_arc_en='binding → decree → the Book',
  sense_range_en='revealed scripture · a decree/ordinance · the record of deeds · a written letter'
 WHERE surah_no=44 AND ayah_no=2 AND word_index=1;
