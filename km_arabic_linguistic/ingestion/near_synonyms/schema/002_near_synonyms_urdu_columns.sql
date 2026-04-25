-- Adds Urdu meaning fields for existing near-synonym installations.
-- Run only when these columns are missing.

ALTER TABLE ar_ling_near_synonym_sets ADD COLUMN canonical_ur TEXT;

ALTER TABLE ar_ling_near_synonym_members ADD COLUMN basic_gloss_ur TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN contrast_note_ur TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN usage_rule_ur TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN quran_usage_pattern_ur TEXT;
ALTER TABLE ar_ling_near_synonym_members ADD COLUMN nuance_note_ur TEXT;
