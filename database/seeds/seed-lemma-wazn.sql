------------------------------------------------------------------------------
-- Seed · Lemma wazn — targeted authoring for weak-root nouns
--
-- High-frequency Qurʾānic nouns whose weak (hollow/defective/hamzated) roots
-- undergo iʿlāl, so the surface can't be aligned to ف/ع/ل automatically.
-- Authored once per lemma (covers every occurrence). Keyed by the exact
-- qr_lemmas.lemma_text so the worker's lemma join resolves.
------------------------------------------------------------------------------

UPDATE qr_lemmas SET wazn_ar = 'فَعَال'    WHERE lemma_text = 'سَمَآء';    -- سماء · سمو
UPDATE qr_lemmas SET wazn_ar = 'فَعَلَة'   WHERE lemma_text = 'ءَايَة';    -- آية · ايي
UPDATE qr_lemmas SET wazn_ar = 'فِعَالَة'  WHERE lemma_text = 'قِيَٰمَة';   -- قيامة · قوم
UPDATE qr_lemmas SET wazn_ar = 'أَفْعَال'  WHERE lemma_text = 'آبَاء';     -- آباء · ابو
UPDATE qr_lemmas SET wazn_ar = 'مَفْعَل'   WHERE lemma_text = 'مَقَام';    -- مقام · قوم
UPDATE qr_lemmas SET wazn_ar = 'فَعَال'    WHERE lemma_text = 'سَوَآء';    -- سواء · سوي
UPDATE qr_lemmas SET wazn_ar = 'مِفْعَال'  WHERE lemma_text = 'مِيقَٰت';    -- ميقات · وقت
UPDATE qr_lemmas SET wazn_ar = 'فِعَال'    WHERE lemma_text = 'لِقَآء';    -- لقاء · لقي
UPDATE qr_lemmas SET wazn_ar = 'تَفْعِيل'  WHERE lemma_text = 'تَأْوِيل';   -- تأويل · اول
UPDATE qr_lemmas SET wazn_ar = 'فُعْلَان'  WHERE lemma_text = 'عُدْوَٰن';   -- عدوان · عدو
UPDATE qr_lemmas SET wazn_ar = 'فِعْل'     WHERE lemma_text = 'اسْم';      -- اسم · سمو
UPDATE qr_lemmas SET wazn_ar = 'فَعُول'    WHERE lemma_text = 'عَدُوّ';     -- عدوّ · عدو
UPDATE qr_lemmas SET wazn_ar = 'فَعَلَان'  WHERE lemma_text = 'أَبَوَان';   -- أبوان · ابو
UPDATE qr_lemmas SET wazn_ar = 'فَعَال'    WHERE lemma_text = 'بَلَآء';    -- بلاء · بلو
UPDATE qr_lemmas SET wazn_ar = 'فَعَلَة'   WHERE lemma_text = 'حَيَاة';    -- حياة · حيي
UPDATE qr_lemmas SET wazn_ar = 'فُعَال'    WHERE lemma_text = 'دُعَآء';    -- دعاء · دعو
UPDATE qr_lemmas SET wazn_ar = 'فِعَال'    WHERE lemma_text = 'نِدَآء';    -- نداء · ندي
