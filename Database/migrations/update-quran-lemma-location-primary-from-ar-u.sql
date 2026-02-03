PRAGMA foreign_keys = ON;

UPDATE quran_ayah_lemma_location
SET ar_u_token = (
  SELECT ar_u_token
  FROM ar_u_tokens
  WHERE lemma_ar = (
    SELECT lemma_text
    FROM quran_ayah_lemmas
    WHERE lemma_id = quran_ayah_lemma_location.lemma_id
  )
  ORDER BY ar_u_token
  LIMIT 1
)
WHERE ar_u_token IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_u_tokens
    WHERE lemma_ar = (
      SELECT lemma_text
      FROM quran_ayah_lemmas
      WHERE lemma_id = quran_ayah_lemma_location.lemma_id
    )
  );
