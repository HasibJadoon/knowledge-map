PRAGMA foreign_keys = ON;

-- Prefer the “token_index - 1” candidate by checking pos_index + 1 = token_index first.
UPDATE quran_ayah_lemma_location
SET ar_token_occ_id = (
  SELECT ar_token_occ_id
  FROM ar_occ_token
  WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
    AND pos_index + 1 = token_index
  LIMIT 1
)
WHERE ar_token_occ_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_occ_token
    WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
      AND pos_index + 1 = token_index
  );

UPDATE quran_ayah_lemma_location
SET ar_token_occ_id = (
  SELECT ar_token_occ_id
  FROM ar_occ_token
  WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
    AND pos_index = token_index
  LIMIT 1
)
WHERE ar_token_occ_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_occ_token
    WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
      AND pos_index = token_index
  );

UPDATE quran_ayah_lemma_location
SET ar_u_token = (
  SELECT ar_u_token
  FROM ar_occ_token
  WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
    AND pos_index + 1 = token_index
  LIMIT 1
)
WHERE ar_u_token IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_occ_token
    WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
      AND pos_index + 1 = token_index
  );

UPDATE quran_ayah_lemma_location
SET ar_u_token = (
  SELECT ar_u_token
  FROM ar_occ_token
  WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
    AND pos_index = token_index
  LIMIT 1
)
WHERE ar_u_token IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_occ_token
    WHERE unit_id = 'U:QURAN:' || surah || ':' || ayah
      AND pos_index = token_index
  );

UPDATE quran_ayah_lemmas
SET primary_ar_u_token = COALESCE(
    primary_ar_u_token,
    (
      SELECT ar_u_token
      FROM quran_ayah_lemma_location loc
      WHERE loc.lemma_id = quran_ayah_lemmas.lemma_id
        AND loc.ar_u_token IS NOT NULL
      ORDER BY loc.id
      LIMIT 1
    )
  )
WHERE primary_ar_u_token IS NULL;
