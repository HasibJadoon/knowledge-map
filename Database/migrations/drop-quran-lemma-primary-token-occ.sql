PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS quran_ayah_lemmas_new (
  lemma_id                 INTEGER PRIMARY KEY,
  lemma_text               TEXT NOT NULL,
  lemma_text_clean         TEXT NOT NULL,
  words_count              INTEGER,
  uniq_words_count         INTEGER,
  primary_ar_u_token       TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (primary_ar_u_token) REFERENCES ar_u_tokens(ar_u_token)
);

INSERT INTO quran_ayah_lemmas_new (
  lemma_id,
  lemma_text,
  lemma_text_clean,
  words_count,
  uniq_words_count,
  primary_ar_u_token,
  created_at
)
SELECT
  lemma_id,
  lemma_text,
  lemma_text_clean,
  words_count,
  uniq_words_count,
  primary_ar_u_token,
  created_at
FROM quran_ayah_lemmas;

DROP TABLE quran_ayah_lemmas;

ALTER TABLE quran_ayah_lemmas_new RENAME TO quran_ayah_lemmas;

COMMIT;

PRAGMA foreign_keys = ON;
