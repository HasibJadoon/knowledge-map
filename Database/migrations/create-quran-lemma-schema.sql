PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS quran_ayah_lemmas (
  lemma_id                 INTEGER PRIMARY KEY,
  lemma_text               TEXT NOT NULL,
  lemma_text_clean         TEXT NOT NULL,
  words_count              INTEGER,
  uniq_words_count         INTEGER,
  primary_ar_u_token       TEXT,
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (primary_ar_u_token) REFERENCES ar_u_tokens(ar_u_token)
);

CREATE TABLE IF NOT EXISTS quran_ayah_lemma_location (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma_id       INTEGER NOT NULL REFERENCES quran_ayah_lemmas(lemma_id) ON DELETE CASCADE,
  word_location  TEXT NOT NULL,
  surah          INTEGER NOT NULL,
  ayah           INTEGER NOT NULL,
  token_index    INTEGER NOT NULL,
  ar_token_occ_id TEXT,
  ar_u_token     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ar_token_occ_id) REFERENCES ar_occ_token(ar_token_occ_id),
  FOREIGN KEY (ar_u_token) REFERENCES ar_u_tokens(ar_u_token)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quran_ayah_lemma_location_unique
  ON quran_ayah_lemma_location (lemma_id, word_location);

CREATE INDEX IF NOT EXISTS idx_quran_ayah_lemma_location_ref
  ON quran_ayah_lemma_location (surah, ayah);
