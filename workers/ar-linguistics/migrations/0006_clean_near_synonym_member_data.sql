-- ─── Migration 0006 — clean near-synonym member data ─────────────────────────
--
-- Two cleanups, applied in order:
--
-- 1. Delete Urdu-leak members. The qurandev ingestion split each topic's
--    `topicUr` (Urdu label like "راہ - راستہ") on hyphens and inserted the
--    halves as Arabic synonym members. They are detectable by Urdu-only
--    Unicode codepoints not present in Arabic text:
--      ٹ (U+0679)  ڈ (U+0688)  ڑ (U+0691)  ں (U+06BA)
--      ھ (U+06BE)  ے (U+06D2)  ہ (U+06C1)  ۂ (U+06C2)  ۃ (U+06C3)
--    Dependent rows in member_sources and evidence are removed first since
--    there is no ON DELETE CASCADE.
--
-- 2. Null out placeholder per-member glosses. The pipeline filled
--    basic_gloss / basic_gloss_ur on every row with the parent set's
--    canonical_en / canonical_ur — providing no real per-member nuance.
--    Setting them to NULL prevents the UI from showing the topic label as
--    if it were a per-word gloss.

-- ── 1. Urdu-leak member purge ─────────────────────────────────────────────────
DELETE FROM ar_ling_near_synonym_member_sources
WHERE member_id IN (
  SELECT id FROM ar_ling_near_synonym_members
  WHERE arabic_display LIKE '%ٹ%'
     OR arabic_display LIKE '%ڈ%'
     OR arabic_display LIKE '%ڑ%'
     OR arabic_display LIKE '%ں%'
     OR arabic_display LIKE '%ھ%'
     OR arabic_display LIKE '%ے%'
     OR arabic_display LIKE '%ہ%'
     OR arabic_display LIKE '%ۂ%'
     OR arabic_display LIKE '%ۃ%'
);

DELETE FROM ar_ling_near_synonym_evidence
WHERE member_id IN (
  SELECT id FROM ar_ling_near_synonym_members
  WHERE arabic_display LIKE '%ٹ%'
     OR arabic_display LIKE '%ڈ%'
     OR arabic_display LIKE '%ڑ%'
     OR arabic_display LIKE '%ں%'
     OR arabic_display LIKE '%ھ%'
     OR arabic_display LIKE '%ے%'
     OR arabic_display LIKE '%ہ%'
     OR arabic_display LIKE '%ۂ%'
     OR arabic_display LIKE '%ۃ%'
);

DELETE FROM ar_ling_near_synonym_members
WHERE arabic_display LIKE '%ٹ%'
   OR arabic_display LIKE '%ڈ%'
   OR arabic_display LIKE '%ڑ%'
   OR arabic_display LIKE '%ں%'
   OR arabic_display LIKE '%ھ%'
   OR arabic_display LIKE '%ے%'
   OR arabic_display LIKE '%ہ%'
   OR arabic_display LIKE '%ۂ%'
   OR arabic_display LIKE '%ۃ%';

-- Also remove members with empty/whitespace-only arabic_display.
DELETE FROM ar_ling_near_synonym_member_sources
WHERE member_id IN (
  SELECT id FROM ar_ling_near_synonym_members
  WHERE arabic_display IS NULL OR trim(arabic_display) = ''
);
DELETE FROM ar_ling_near_synonym_evidence
WHERE member_id IN (
  SELECT id FROM ar_ling_near_synonym_members
  WHERE arabic_display IS NULL OR trim(arabic_display) = ''
);
DELETE FROM ar_ling_near_synonym_members
WHERE arabic_display IS NULL OR trim(arabic_display) = '';

-- ── 2. Null out placeholder glosses copied from the parent set ────────────────
UPDATE ar_ling_near_synonym_members
SET basic_gloss = NULL
WHERE basic_gloss IS NOT NULL
  AND basic_gloss = (
    SELECT s.canonical_en
    FROM ar_ling_near_synonym_sets s
    WHERE s.id = ar_ling_near_synonym_members.set_id
  );

UPDATE ar_ling_near_synonym_members
SET basic_gloss_ur = NULL
WHERE basic_gloss_ur IS NOT NULL
  AND basic_gloss_ur = (
    SELECT s.canonical_ur
    FROM ar_ling_near_synonym_sets s
    WHERE s.id = ar_ling_near_synonym_members.set_id
  );
