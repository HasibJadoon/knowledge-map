PRAGMA foreign_keys = ON;

-- Populate the lemma primary fields directly from ar_u_tokens based on lemma_ar.
UPDATE quran_ayah_lemmas
SET primary_ar_u_token = (
  SELECT ar_u_token
  FROM ar_u_tokens
  WHERE lemma_ar = quran_ayah_lemmas.lemma_text
  ORDER BY ar_u_token
  LIMIT 1
)
WHERE primary_ar_u_token IS NULL
  AND EXISTS (
    SELECT 1
    FROM ar_u_tokens
    WHERE lemma_ar = quran_ayah_lemmas.lemma_text
  );
