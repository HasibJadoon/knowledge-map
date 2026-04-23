-- SQL script to add a sub_category column, derive its values,
-- and rectify categories for legacy placeholder rows prefixed with "gram|".

-- 1) `sub_category` now exists in base schema; keep this migration
--    focused on backfilling/normalizing values.

-- 2) Populate the sub_category using the existing category. If the
--    category has a dot (e.g. `nahw.irab`) the portion after the dot
--    becomes the sub_category. If there is no dot or the category
--    is NULL then the sub_category is set equal to the category.
UPDATE ar_u_grammar
SET sub_category = CASE
    WHEN category IS NULL THEN NULL
    WHEN instr(category, '.') > 0 THEN substr(category, instr(category, '.') + 1)
    ELSE category
END;

-- 3) Normalize the placeholder rows that begin with the prefix
--    "gram|". Many of these lacked categories in the original data.
--    The following UPDATE statements assign an appropriate category
--    and sub_category for each of these rows based on the concept
--    they represent. This mapping follows traditional Arabic
--    grammatical taxonomy (nahw, sarf, balagha, etc.). You can
--    adjust these assignments if your curriculum uses different
--    groupings.

-- Khabar (predicative) in syntax
UPDATE ar_u_grammar
SET category = 'nahw.jumal', sub_category = 'jumal'
WHERE canonical_input = 'gram|khabar';

-- Idafa and mudaf (genitive construction) both belong to the
-- Majrurat chapter since the second term is genitive. They are
-- grouped under the same sub_category.
UPDATE ar_u_grammar
SET category = 'nahw.majrurat', sub_category = 'majrurat'
WHERE canonical_input IN ('gram|idafa', 'gram|mudaf', 'gram|mudaf_ilayh');

-- Adjectives (general naat)
UPDATE ar_u_grammar
SET category = 'nahw.tawabi', sub_category = 'tawabi'
WHERE canonical_input = 'gram|naat';

-- Past tense verb (fiil madi) - morphological chapter on verbs
UPDATE ar_u_grammar
SET category = 'sarf.afal', sub_category = 'afal'
WHERE canonical_input = 'gram|fiil_madi';

-- Laʿalla wa akhawatuha - particles that behave like the sisters of
-- inna. These are treated among the nawasikh (abrogators).
UPDATE ar_u_grammar
SET category = 'nahw.nawasikh', sub_category = 'nawasikh'
WHERE canonical_input = 'gram|laʿalla_wa_akhawatuha';

-- The imperfect verb (fiʿl mudariʿ) in its various spellings belongs
-- to the verb patterns in morphology.
UPDATE ar_u_grammar
SET category = 'sarf.afal', sub_category = 'afal'
WHERE canonical_input IN ('gram|fiʿl_mudariʿ', 'gram|fiil_mudari', 'gram|fiil_mudariʿ', 'gram|fiʿl_mudari');

-- Particle combination "ma bima" - treat as a miscellaneous
-- grammatical tool in nahw.
UPDATE ar_u_grammar
SET category = 'nahw.other', sub_category = 'other'
WHERE canonical_input = 'gram|ma_bima';

-- Waw al-hal introduces a circumstantial clause
UPDATE ar_u_grammar
SET category = 'nahw.jumal', sub_category = 'jumal'
WHERE canonical_input = 'gram|waw_hal';

-- Inna mukhaffafa counts among the nawasikh
UPDATE ar_u_grammar
SET category = 'nahw.nawasikh', sub_category = 'nawasikh'
WHERE canonical_input = 'gram|inna_mukhaffafa';

-- Kana and its defective verb (fiil naqis) family
UPDATE ar_u_grammar
SET category = 'nahw.nawasikh', sub_category = 'nawasikh'
WHERE canonical_input = 'gram|fiil_naqis_kana';

-- Lam al-ibtida belongs to the emphasis tools
UPDATE ar_u_grammar
SET category = 'nahw.tawkid', sub_category = 'tawkid'
WHERE canonical_input = 'gram|lam_ibtida';

-- Extra "min" particle
UPDATE ar_u_grammar
SET category = 'nahw.majrurat', sub_category = 'majrurat'
WHERE canonical_input = 'gram|min_zaida';

-- Complex nominal phrase (murakkab)
UPDATE ar_u_grammar
SET category = 'nahw.usul', sub_category = 'usul'
WHERE canonical_input = 'gram|murakkab';

-- Verbal sentence (jumala fiʿliyya) - syntactic chapter on sentences
UPDATE ar_u_grammar
SET category = 'nahw.jumal', sub_category = 'jumal'
WHERE canonical_input = 'gram|jumala_fiʿliyya';

-- Ism and khabar of Laʿalla - they behave like sisters of inna
UPDATE ar_u_grammar
SET category = 'nahw.nawasikh', sub_category = 'nawasikh'
WHERE canonical_input IN ('gram|ism_laʿalla', 'gram|khabar_laʿalla');

-- Tankir (indefiniteness) is part of the marifa vs nakira chapter
UPDATE ar_u_grammar
SET category = 'nahw.marifa_nakira', sub_category = 'marifa_nakira'
WHERE canonical_input = 'gram|tankir';

-- The five verbs (afʿal khamsa) and thubut al-nun belong to
-- morphological conjugation rules
UPDATE ar_u_grammar
SET category = 'sarf.afal', sub_category = 'afal'
WHERE canonical_input IN ('gram|afʿal_khamsa', 'gram|thubut_nun');

-- Marifa (definiteness) in contrast to nakira
UPDATE ar_u_grammar
SET category = 'nahw.marifa_nakira', sub_category = 'marifa_nakira'
WHERE canonical_input = 'gram|maʿrifa';

-- Waw al-maʿiyya is treated among conjunctions
UPDATE ar_u_grammar
SET category = 'nahw.tawabi', sub_category = 'tawabi'
WHERE canonical_input = 'gram|wa_maʿiyya';

-- Lam al-tawkid (emphatic lam)
UPDATE ar_u_grammar
SET category = 'nahw.tawkid', sub_category = 'tawkid'
WHERE canonical_input = 'gram|lam_tawkid';

-- Imperative verb (fiil amr)
UPDATE ar_u_grammar
SET category = 'sarf.afal', sub_category = 'afal'
WHERE canonical_input = 'gram|fiil_amr';

-- Vocative particle (harf nida)
UPDATE ar_u_grammar
SET category = 'nahw.nida', sub_category = 'nida'
WHERE canonical_input = 'gram|harf_nida';

-- Compound numbers (adad murakkab)
UPDATE ar_u_grammar
SET category = 'nahw.adad', sub_category = 'adad'
WHERE canonical_input = 'gram|adad_murakkab';

-- Conjunction particle (harf atf)
UPDATE ar_u_grammar
SET category = 'nahw.tawabi', sub_category = 'tawabi'
WHERE canonical_input = 'gram|harf_atf';

-- Causal fa (fa sababiyya) appears in conditional/apodosis contexts
UPDATE ar_u_grammar
SET category = 'nahw.shart', sub_category = 'shart'
WHERE canonical_input = 'gram|fa_sababiyya';

-- Particles of preposition (huruf al-jar)
UPDATE ar_u_grammar
SET category = 'nahw.majrurat', sub_category = 'majrurat'
WHERE canonical_input = 'gram|huruf_jarr';

-- Simile particle (harf tashbih) is part of rhetoric - bayan
UPDATE ar_u_grammar
SET category = 'balagha.bayan', sub_category = 'bayan'
WHERE canonical_input = 'gram|harf_tashbih';

-- Harf tahqiq (particle of realization) used for emphasis
UPDATE ar_u_grammar
SET category = 'nahw.tawkid', sub_category = 'tawkid'
WHERE canonical_input = 'gram|harf_tahqiq';

-- Defective verbs (afʿal naqisa) belong to the nawasikh family
UPDATE ar_u_grammar
SET category = 'nahw.nawasikh', sub_category = 'nawasikh'
WHERE canonical_input = 'gram|afʿal_naqisa';

-- 4) After correcting these rows, ensure sub_category matches the
--    updated category (if it contains a dot). Run the derivation
--    again for rows whose category was just set.
UPDATE ar_u_grammar
SET sub_category = CASE
    WHEN category IS NULL THEN sub_category
    WHEN instr(category, '.') > 0 THEN substr(category, instr(category, '.') + 1)
    ELSE category
END
WHERE canonical_input LIKE 'gram|%';
