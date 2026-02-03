PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

ALTER TABLE quran_ayah_lemma_location ADD COLUMN word_simple TEXT;
ALTER TABLE quran_ayah_lemma_location ADD COLUMN word_diacritic TEXT;

COMMIT;

PRAGMA foreign_keys = ON;
