-- ─── Migration 0003 — purge Urdu-contaminated near-synonym members ────────────
--
-- During AI-assisted seeding, two classes of Urdu-contaminated members were
-- inserted into ar_ling_near_synonym_members:
--
--   Class A (~198 rows): arabic_display IS NULL, arabic_bare contains Urdu.
--     Criterion: arabic_display IS NULL AND source_status = 'ai_assisted'
--
--   Class B (~68 rows): arabic_display populated but with Urdu text.
--     Criterion: arabic_display contains Urdu-only Unicode characters:
--       ٹ (U+0679)  ڈ (U+0688)  ڑ (U+0691)  ں (U+06BA)
--       ھ (U+06BE)  ے (U+06D2)  ہ (U+06C1)
--
-- All matching rows are ai_assisted entries with no valid Arabic word form.
-- Human-verified members always have Arabic-only text in arabic_display.

-- Class A: no Arabic display text at all
DELETE FROM ar_ling_near_synonym_members
WHERE arabic_display IS NULL
  AND source_status   = 'ai_assisted';

-- Class B: Urdu script in the display field
DELETE FROM ar_ling_near_synonym_members
WHERE arabic_display LIKE '%ٹ%'
   OR arabic_display LIKE '%ڈ%'
   OR arabic_display LIKE '%ڑ%'
   OR arabic_display LIKE '%ں%'
   OR arabic_display LIKE '%ھ%'
   OR arabic_display LIKE '%ے%'
   OR arabic_display LIKE '%ہ%';
