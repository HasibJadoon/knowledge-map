-- Fix OCR corruption: arabic_display and arabic_bare fields contain Urdu text
-- instead of Arabic words. The Urdu meaning is already captured in basic_gloss_ur.
-- Null out the corrupted fields; UI falls back to set.canonical_ar gracefully.
UPDATE ar_ling_near_synonym_members
SET arabic_display = NULL, arabic_bare = NULL
WHERE arabic_display LIKE '%ے%' OR arabic_display LIKE '%ں%'
   OR arabic_display LIKE '%ٹ%' OR arabic_display LIKE '%ڈ%'
   OR arabic_display LIKE '%ڑ%' OR arabic_display LIKE '%ہ%'
   OR arabic_display LIKE '%پ%' OR arabic_display LIKE '%گ%';
