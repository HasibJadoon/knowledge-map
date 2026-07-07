------------------------------------------------------------------------------
-- Seed · Morphology card sense synopsis (arc + range)
--
-- Authored 360° synopsis for anchor words. Non-anchor cards fall back to
-- gloss_en / quran_meanings, so only the modelled words need a row here.
------------------------------------------------------------------------------

-- مُبِين (44:2:2) — the anchor/model word
UPDATE qr_morph_display_words
   SET sense_arc_en   = 'separation → clarity',
       sense_range_en = 'clear · manifest · self-evident · that which makes plain'
 WHERE surah_no = 44 AND ayah_no = 2 AND word_index = 2;
