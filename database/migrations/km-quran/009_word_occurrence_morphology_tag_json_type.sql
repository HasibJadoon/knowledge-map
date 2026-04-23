-- Convert qr_word_occurrences.morphology_tag_json from TEXT declaration to
-- SQLite JSON declaration, preserving all existing values.

ALTER TABLE qr_word_occurrences
  ADD COLUMN morphology_tag_json__json JSON
  CHECK (morphology_tag_json__json IS NULL OR json_valid(morphology_tag_json__json));

UPDATE qr_word_occurrences
SET morphology_tag_json__json = morphology_tag_json;

ALTER TABLE qr_word_occurrences
  DROP COLUMN morphology_tag_json;

ALTER TABLE qr_word_occurrences
  RENAME COLUMN morphology_tag_json__json TO morphology_tag_json;
