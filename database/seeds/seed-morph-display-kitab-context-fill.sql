-- Root كتب — context-lens fill: balāgha + translator-choices for the three
-- cross-reference āyahs (17:14, 27:28, 13:39) so every context in the كتب word
-- view carries the full 4 lenses (irāb · balāgha · translators · tafsīr), matching
-- the focus āyah 44:2. Idempotent INSERT OR REPLACE. Sibling shape mirrors the
-- existing MDB:ctx:كتب:*:balagha / *:translators rows (scope_key = S:A:word,
-- surah/ayah = 44/2). CHECK: balāgha is_synthesis=1 + source_slug LIKE 'kmaps_%';
-- translators is_synthesis=0 + non-kmaps source_slug + non-null source_ref.

INSERT OR REPLACE INTO qr_morph_display_blocks
 (id, scope_level, scope_key, root_ar, ayah_key, surah_no, ayah_no, word_index,
  block_type, block_subtype, display_order, title_ar, title_en, title_ur,
  text_ar, text_en, text_ur, data_json, source_slug, source_ref, is_synthesis, register, registers_json, meta_json, status)
 VALUES
-- ── 17:14 · كِتَابَكَ (word 2) ────────────────────────────────────────────────
('MDB:ctx:كتب:17:14:balagha','context','17:14:2','كتب','17:14',44,2,2,'balagha',NULL,2,'البلاغة','Balāgha','بلاغت',
 'أمرٌ للنفس بقراءة كتابها: «اقْرَأْ كِتَابَكَ» التفاتٌ يجعل العبدَ ==حسيبَ نفسِه==؛ وإسنادُ الحساب إلى النفس «كَفَىٰ بِنَفْسِكَ» أبلغُ في الإلزام والتقريع من إسنادِه إلى غيرها.',
 'A command to the self to read its own record — «Read your book» is an iltifāt that makes the servant ==his own reckoner==; assigning the audit to the self («your soul suffices») binds and rebukes more sharply than assigning it to another.',
 'نفس کو اپنا نامۂ اعمال پڑھنے کا حکم؛ التفات جو بندے کو ==خود اپنا حسیب== بنا دیتا ہے — حساب کو نفس کی طرف لوٹانا الزام میں زیادہ بلیغ ہے۔',
 '{"formula_ar":"أمرُ التقريع (اقرأ) + إسنادُ الحساب إلى النفس (حسيبًا)","formula_en":"self-as-reckoner: the imperative fuses with كفى بنفسك so deed and judge are one","formula_ur":"نفس بطور حسیب","refs":["17:13","17:14","69:19","84:7"]}',
 'kmaps_five_lens',NULL,1,'modern','["modern"]','{"icon":"feather"}','live'),
('MDB:ctx:كتب:17:14:translators','context','17:14:2','كتب','17:14',44,2,2,'translators',NULL,3,'اختيارات المترجمين','Translator Choices','مترجمین کے اختیار',
 'يتراوح نقلُ «كِتَابَكَ» بين "سِجِلّك/صحيفتك" على المجاز عن صحيفة الأعمال، و"كتابك" حرفيّاً.',
 'Renderings of «كِتَابَكَ» swing between “your record” (metonymy for the scroll of deeds) and a literal “your book.”',
 '«کتابک» کا ترجمہ "تیرا نامۂ اعمال" (مجازاً) یا لفظی "تیری کتاب" کے درمیان ہے۔',
 '{"renderings":[{"translator":"Abdel Haleem","text":"Read your record. Today your own soul is enough to calculate your account.","reading":"metonymic (record of deeds)"},{"translator":"Sahih Intl","text":"Read your record. Sufficient is yourself against you this Day as accountant.","reading":"metonymic (record)"},{"translator":"Pickthall","text":"Read thy Book. Thy soul sufficeth as reckoner against thee this day.","reading":"literal (book)"},{"translator":"Yusuf Ali","text":"Read thine (own) record: Sufficient is thy soul this day to make out an account against thee.","reading":"metonymic (record)"}]}',
 'qr_translation_sources','qr_translation_sources',0,'modern','["modern"]','{"icon":"languages"}','live'),
-- ── 27:28 · بِكِتَابِي (word 2) ───────────────────────────────────────────────
('MDB:ctx:كتب:27:28:balagha','context','27:28:2','كتب','27:28',44,2,2,'balagha',NULL,2,'البلاغة','Balāgha','بلاغت',
 'إيجازٌ في مقام التكليف: «اذْهَب بِّكِتَابِي هَٰذَا فَأَلْقِهْ إِلَيْهِمْ ثُمَّ تَوَلَّ عَنْهُم» — أفعالٌ متتابعةٌ بلا حشو، والإشارةُ بـ«هَٰذَا» ==تفخيمٌ== لشأن الكتاب وتعيينٌ لحضوره.',
 'Terse command-prose: «Take this letter of mine, cast it to them, then withdraw» — clipped consecutive verbs with no filler; the demonstrative «هَٰذَا» both ==dignifies== the letter and pins it as present.',
 'مقامِ تکلیف میں ایجاز: پے در پے افعال بلا حشو؛ «ہذا» کتاب کی ==تعظیم== و تعیین۔',
 '{"formula_ar":"إيجازٌ بالأفعال المتتابعة + إشارةُ التفخيم (هذا)","formula_en":"clipped serial imperatives + the honorific proximal demonstrative","formula_ur":"ایجاز + اشارۂ تعظیم","refs":["27:28","27:29","27:30"]}',
 'kmaps_five_lens',NULL,1,'modern','["modern"]','{"icon":"feather"}','live'),
('MDB:ctx:كتب:27:28:translators','context','27:28:2','كتب','27:28',44,2,2,'translators',NULL,3,'اختيارات المترجمين','Translator Choices','مترجمین کے اختیار',
 'يكاد يُجمِعُ المترجمون على "letter" لأنّ الكتابَ هنا رسالةٌ مكتوبةٌ محدَّدة، لا كتابٌ/سِجِلّ.',
 'Translators are near-unanimous on “letter,” since كِتاب here is a specific written missive, not a book or record.',
 'مترجمین کا تقریباً اتفاق "letter" پر ہے، کیونکہ یہاں کتاب ایک متعیّن خط ہے۔',
 '{"renderings":[{"translator":"Sahih Intl","text":"Take this letter of mine and deliver it to them.","reading":"concrete (letter)"},{"translator":"Abdel Haleem","text":"Take this letter of mine and deliver it to them.","reading":"concrete (letter)"},{"translator":"Pickthall","text":"Go with this my letter and throw it down unto them.","reading":"concrete (letter)"},{"translator":"Yusuf Ali","text":"Go thou, with this letter of mine, and deliver it to them.","reading":"concrete (letter)"}]}',
 'qr_translation_sources','qr_translation_sources',0,'modern','["modern"]','{"icon":"languages"}','live'),
-- ── 13:39 · أُمُّ الْكِتَابِ (word 8) ─────────────────────────────────────────
('MDB:ctx:كتب:13:39:balagha','context','13:39:8','كتب','13:39',44,2,8,'balagha',NULL,2,'البلاغة','Balāgha','بلاغت',
 'استعارةٌ بالإضافة: «أُمُّ الْكِتَابِ» — جُعِل الأصلُ الجامعُ ==أُمًّا== لأنه المرجعُ الذي تُردُّ إليه الفروع؛ وقابله «يَمْحُو اللَّهُ مَا يَشَاءُ وَيُثْبِتُ» ==طباقًا== يُبرِزُ ثباتَ الأصل مع تغيُّر الفرع.',
 'A genitive metaphor: «أُمُّ الْكِتَابِ» — the gathering source is cast as a ==mother==, the reference to which all branches return; set antithetically («God erases what He wills and fixes») in a ==ṭibāq== that foregrounds the fixed origin against the mutable branch.',
 'اضافی استعارہ: «أمّ الکتاب» اصلِ جامع کو ==ماں== کہا؛ «یمحو/یثبت» کے ساتھ ==طباق== جو اصل کے ثبات کو نمایاں کرتا ہے۔',
 '{"formula_ar":"استعارةٌ إضافيّة (أُمّ) + طباق (يمحو/يثبت)","formula_en":"the ‘mother’ genitive metaphor + the erase/fix antithesis (ṭibāq)","formula_ur":"استعارہ + طباق","refs":["13:39","3:7","43:4"]}',
 'kmaps_five_lens',NULL,1,'modern','["modern"]','{"icon":"feather"}','live'),
('MDB:ctx:كتب:13:39:translators','context','13:39:8','كتب','13:39',44,2,8,'translators',NULL,3,'اختيارات المترجمين','Translator Choices','مترجمین کے اختیار',
 'ينقسم نقلُ «أُمُّ الْكِتَابِ» بين الحرفيّ "Mother of the Book" والمعنويّ "أصل الكتاب/مصدر الحكم"، تبعًا لقراءةِ «أُمّ» أصلًا جامعًا.',
 'Renderings of «أُمُّ الْكِتَابِ» split between the literal “Mother of the Book” and the sense-for-sense “source of Scripture / of ordinance,” tracking whether «أُمّ» is read as the gathering origin.',
 '«أمّ الکتاب» کا ترجمہ لفظی "Mother of the Book" اور معنوی "اصلِ کتاب/مصدرِ حکم" کے درمیان بٹا ہوا ہے۔',
 '{"renderings":[{"translator":"Sahih Intl","text":"Allah eliminates what He wills or confirms, and with Him is the Mother of the Book.","reading":"literal (Mother of the Book)"},{"translator":"Yusuf Ali","text":"Allah doth blot out or confirm what He pleaseth: with Him is the Mother of the Book.","reading":"literal (Mother of the Book)"},{"translator":"Abdel Haleem","text":"God erases or confirms whatever He will, and the source of Scripture is with Him.","reading":"sense (source of Scripture)"},{"translator":"Pickthall","text":"Allah effaceth what He will, and establisheth (what He will); and with Him is the source of ordinance.","reading":"sense (source of ordinance)"}]}',
 'qr_translation_sources','qr_translation_sources',0,'modern','["modern"]','{"icon":"languages"}','live');

-- ── word-anchor backfill: gloss_en was NULL on the anchor 44:2:1 ──────────────
UPDATE qr_morph_display_words SET
  gloss_en='==What is bound and fixed== — letters gathered, a decree set down, then the revealed Book.'
 WHERE surah_no=44 AND ayah_no=2 AND word_index=1 AND gloss_en IS NULL;
