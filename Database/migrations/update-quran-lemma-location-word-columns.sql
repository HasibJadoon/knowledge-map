PRAGMA foreign_keys = ON;

UPDATE quran_ayah_lemma_location
SET word_simple = (
  SELECT COALESCE(norm_ar, surface_ar)
  FROM ar_occ_token
  WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
    AND pos_index + 1 = token_index
  LIMIT 1
)
WHERE word_simple IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_occ_token
    WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
      AND pos_index + 1 = token_index
  );

UPDATE quran_ayah_lemma_location
SET word_simple = (
  SELECT COALESCE(norm_ar, surface_ar)
  FROM ar_occ_token
  WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
    AND pos_index = token_index
  LIMIT 1
)
WHERE word_simple IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_occ_token
    WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
      AND pos_index = token_index
  );

UPDATE quran_ayah_lemma_location
SET word_diacritic = (
  SELECT surface_ar
  FROM ar_occ_token
  WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
    AND pos_index + 1 = token_index
  LIMIT 1
)
WHERE word_diacritic IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_occ_token
    WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
      AND pos_index + 1 = token_index
  );

UPDATE quran_ayah_lemma_location
SET word_diacritic = (
  SELECT surface_ar
  FROM ar_occ_token
  WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
    AND pos_index = token_index
  LIMIT 1
)
WHERE word_diacritic IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_occ_token
    WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
      AND pos_index = token_index
  );
