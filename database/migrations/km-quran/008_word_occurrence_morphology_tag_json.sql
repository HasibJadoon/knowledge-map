-- Add structured JSON companion for qr_word_occurrences.morphology_tag.
-- SQLite/D1 stores JSON values internally as text, but this declares JSON type
-- and validates JSON shape for non-null values.

ALTER TABLE qr_word_occurrences
  ADD COLUMN morphology_tag_json JSON
  CHECK (morphology_tag_json IS NULL OR json_valid(morphology_tag_json));

UPDATE qr_word_occurrences
SET morphology_tag_json = json_object(
  'source', 'QAC-0.4',
  'raw', morphology_tag
)
WHERE morphology_tag IS NOT NULL
  AND morphology_tag_json IS NULL;
