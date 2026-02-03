PRAGMA foreign_keys = ON;

UPDATE quran_ayah_lemma_location
SET ar_u_token = (
  SELECT primary_ar_u_token
  FROM quran_ayah_lemmas
  WHERE quran_ayah_lemmas.lemma_id = quran_ayah_lemma_location.lemma_id
)
WHERE ar_u_token IS NULL
  AND EXISTS (
    SELECT 1
    FROM quran_ayah_lemmas
    WHERE quran_ayah_lemmas.lemma_id = quran_ayah_lemma_location.lemma_id
      AND quran_ayah_lemmas.primary_ar_u_token IS NOT NULL
  );
