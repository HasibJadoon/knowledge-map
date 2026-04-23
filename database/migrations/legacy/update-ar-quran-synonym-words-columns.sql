--------------------------------------------------------------------------------
-- Add synonyms_norm_text + meanings_json to ar_quran_synonym_words
--------------------------------------------------------------------------------

-- Some remote environments may not have the legacy table yet.
-- Create a minimal compatible shell so the ALTER statements can run safely.
CREATE TABLE IF NOT EXISTS ar_quran_synonym_words (
  word_norm TEXT PRIMARY KEY
);

ALTER TABLE ar_quran_synonym_words ADD COLUMN synonyms_norm_text TEXT;
ALTER TABLE ar_quran_synonym_words ADD COLUMN meanings_json JSON
  CHECK (meanings_json IS NULL OR json_valid(meanings_json));
