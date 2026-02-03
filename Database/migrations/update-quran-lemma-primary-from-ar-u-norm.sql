PRAGMA foreign_keys = ON;

UPDATE quran_ayah_lemmas
SET primary_ar_u_token = (
  SELECT ar_u_token
  FROM ar_u_tokens
  WHERE lemma_norm = quran_ayah_lemmas.lemma_text_clean
  ORDER BY ar_u_token
  LIMIT 1
)
WHERE primary_ar_u_token IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_u_tokens
    WHERE lemma_norm = quran_ayah_lemmas.lemma_text_clean
  );
