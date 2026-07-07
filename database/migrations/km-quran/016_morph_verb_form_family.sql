------------------------------------------------------------------------------
-- 016 · Morphology card — verb form / family (وزن الفعل)
--
-- The verb form ("family") shown on the card as its model verb (mīzān):
--   • Form I (الثلاثي المجرد) — one of the six families by middle-vowel pattern:
--       نَصَرَ (a-u) · ضَرَبَ (a-i) · فَتَحَ (a-a) · حَسِبَ (i-i) · سَمِعَ (i-a) · كَرُمَ (u-u)
--   • Forms II–X — the augmented model: فَعَّلَ · فَاعَلَ · أَفْعَلَ · تَفَعَّلَ · تَفَاعَلَ ·
--       اِنْفَعَلَ · اِفْتَعَلَ · اِفْعَلَّ · اِسْتَفْعَلَ
--
-- Form I's family is NOT derivable from the QAC tag (it depends on the present-
-- tense vowel), so it is AUTHORED here per verb. Augmented forms fall back to a
-- model derived from the QAC form in the worker when this column is null.
------------------------------------------------------------------------------

ALTER TABLE qr_morph_display_words ADD COLUMN verb_form_ar TEXT;  -- model verb: نَصَرَ / سَمِعَ / أَفْعَلَ …
