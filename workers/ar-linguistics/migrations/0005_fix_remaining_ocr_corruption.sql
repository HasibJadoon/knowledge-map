-- Fix remaining OCR corruption in ar_ling_near_synonym_members.
-- Three categories:
--   1. Single-character fragments (OCR broke Arabic words into individual letters)
--   2. Entries containing چ (not an Arabic letter - Urdu/Persian only)
--   3. Urdu verb phrase constructions (کرنا، ہونا، لینا، دینا، آنا، جانا)
-- arabic_display/arabic_bare are NULLed; Urdu meaning is already in basic_gloss_ur.

UPDATE ar_ling_near_synonym_members
SET arabic_display = NULL, arabic_bare = NULL
WHERE arabic_display IS NOT NULL
  AND (
    -- single-char OCR fragment
    (arabic_bare IS NOT NULL AND length(trim(arabic_bare)) = 1)
    -- چ is not an Arabic letter
    OR arabic_display LIKE '%چ%'
    -- Urdu verb infinitive constructions
    OR arabic_display LIKE '% کرنا%' OR arabic_display = 'کرنا'
    OR arabic_display LIKE '% ہونا%' OR arabic_display = 'ہونا'
    OR arabic_display LIKE '% لینا%' OR arabic_display = 'لینا'
    OR arabic_display LIKE '% دینا%' OR arabic_display = 'دینا'
    OR arabic_display LIKE '% آنا%'
    OR arabic_display LIKE '% جانا%'
  );

-- Note: ar_ling_lemmas.lemma_text has a NOT NULL constraint so corrupted lemma
-- stubs (ALL:NS: prefix, seeded from the same OCR source) are left in place.
-- They do not affect UI rendering; a separate schema migration is needed to
-- allow NULLs or add a corrupted flag before cleaning them.
