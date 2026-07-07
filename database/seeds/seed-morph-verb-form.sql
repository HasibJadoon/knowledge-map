------------------------------------------------------------------------------
-- Seed · Verb form / family (model verb) for Sūrat ad-Dukhān (44) verbs
--
-- Form I family determined by the middle-vowel pattern (past → present):
--   فرق: فَرَقَ يَفْرُقُ (a-u) → نَصَرَ    · لعب: لَعِبَ يَلْعَبُ (i-a) → سَمِعَ
-- Forms II–X: the augmented model verb (أَفْعَلَ = Form IV).
------------------------------------------------------------------------------

-- أَنْزَلْنَاهُ (44:3:2) — نزل · Form IV
UPDATE qr_morph_display_words SET verb_form_ar = 'أَفْعَلَ'
 WHERE surah_no = 44 AND ayah_no = 3 AND word_index = 2;

-- يُفْرَقُ (44:4:2) — فرق · Form I, نَصَرَ family (فَرَقَ يَفْرُقُ)
UPDATE qr_morph_display_words SET verb_form_ar = 'نَصَرَ'
 WHERE surah_no = 44 AND ayah_no = 4 AND word_index = 2;

-- يُحْيِي (44:8:5) — حيي · Form IV
UPDATE qr_morph_display_words SET verb_form_ar = 'أَفْعَلَ'
 WHERE surah_no = 44 AND ayah_no = 8 AND word_index = 5;

-- وَيُمِيتُ (44:8:6) — موت · Form IV
UPDATE qr_morph_display_words SET verb_form_ar = 'أَفْعَلَ'
 WHERE surah_no = 44 AND ayah_no = 8 AND word_index = 6;

-- يَلْعَبُونَ (44:9:5) — لعب · Form I, سَمِعَ family (لَعِبَ يَلْعَبُ)
UPDATE qr_morph_display_words SET verb_form_ar = 'سَمِعَ'
 WHERE surah_no = 44 AND ayah_no = 9 AND word_index = 5;
