PRAGMA foreign_keys = ON;

UPDATE quran_ayah_lemmas
SET primary_ar_u_token = (
  SELECT ar_u_token
  FROM quran_ayah_lemma_location loc
  WHERE loc.lemma_id = quran_ayah_lemmas.lemma_id
    AND loc.ar_u_token IS NOT NULL
  ORDER BY loc.id
  LIMIT 1
)
WHERE primary_ar_u_token IS NULL;
