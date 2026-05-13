-- ─── 2026-05-14 — annotate scholarship bodies with Arabic glosses ──────
--
-- The Al-Jallad notes use scholarly Semitic transliteration (ḍll, ġny,
-- wdʿ, ʿāʾil, …). To make the prose readable for non-specialists we
-- append the matching Arabic form in parentheses immediately after each
-- transliterated token:  `ġny`  →  `ġny (غني)`.
--
-- One UPDATE per row so the substitutions are surgical — chained REPLACE
-- with shared prefixes (ġny / ġnyt, ḍll / ẓll) would double-substitute.

-- رضي
UPDATE ar_ling_root_scholarship
   SET body_plain = 'Among the most common roots for divine satisfaction in Ancient North Arabian. Dadanitic ẓll (ضلل)-ceremony petitions the deity for rḍy (رضي) as ritual outcome.',
       body_md    = 'Among the most common roots for divine satisfaction in Ancient North Arabian. Dadanitic ẓll (ضلل)-ceremony petitions the deity for rḍy (رضي) as ritual outcome.'
 WHERE source_id = 'SRC:ALJ:2026:EXCQRN' AND root_norm = 'رضي';

-- ضلل
UPDATE ar_ling_root_scholarship
   SET body_plain = 'Safaitic ḍll (ضلل) = loss of loved ones / emotional affliction (grief). South Arabian ḍll (ضلل) = plague (sickness valency). A state-word, not (only) cognitive error.',
       body_md    = 'Safaitic ḍll (ضلل) = loss of loved ones / emotional affliction (grief). South Arabian ḍll (ضلل) = plague (sickness valency). A state-word, not (only) cognitive error.'
 WHERE source_id = 'SRC:ALJ:2026:EXCQRN' AND root_norm = 'ضلل';

-- عيل
UPDATE ar_ling_root_scholarship
   SET body_plain = 'Safaitic ʿyl (عيل) attests both the verbal sense "to be in need" and possibly nominal ʿyl (عيل) ("need"). Direct cognate of Quranic ʿāʾil (عائل).',
       body_md    = 'Safaitic ʿyl (عيل) attests both the verbal sense "to be in need" and possibly nominal ʿyl (عيل) ("need"). Direct cognate of Quranic ʿāʾil (عائل).'
 WHERE source_id = 'SRC:ALJ:2026:EXCQRN' AND root_norm = 'عيل';

-- غني
UPDATE ar_ling_root_scholarship
   SET body_plain = 'Verbal root ġny (غني) among the most common invocations in Safaitic. Nominal ġnyt (غنية) ("freedom from want") even more frequent. Safaitic pattern (state-of-need → invocation → request for ġnyt (غنية)) is structurally identical to Q 93:8.',
       body_md    = 'Verbal root ġny (غني) among the most common invocations in Safaitic. Nominal ġnyt (غنية) ("freedom from want") even more frequent. Safaitic pattern (state-of-need → invocation → request for ġnyt (غنية)) is structurally identical to Q 93:8.'
 WHERE source_id = 'SRC:ALJ:2026:EXCQRN' AND root_norm = 'غني';

-- قلى
UPDATE ar_ling_root_scholarship
   SET body_plain = 'Hismaic qlw (قلى) — divine detestation of a transgressor. Q 93:3 negates the very verb the Hismaic confession affirms.',
       body_md    = 'Hismaic qlw (قلى) — divine detestation of a transgressor. Q 93:3 negates the very verb the Hismaic confession affirms.'
 WHERE source_id = 'SRC:ALJ:2026:EXCQRN' AND root_norm = 'قلى';

-- نعم
UPDATE ar_ling_root_scholarship
   SET body_plain = 'Safaitic/inscriptional nʿm (نعم) = divine favour granted in response to petition. Is.M 204 invokes Allāt to "grant him (nʿm — نعم)" using the imperative hb / whb (وهب), the dominant Safaitic verb of divine giving.',
       body_md    = 'Safaitic/inscriptional nʿm (نعم) = divine favour granted in response to petition. Is.M 204 invokes Allāt to "grant him (nʿm — نعم)" using the imperative hb / whb (وهب), the dominant Safaitic verb of divine giving.'
 WHERE source_id = 'SRC:ALJ:2026:EXCQRN' AND root_norm = 'نعم';

-- هدي
UPDATE ar_ling_root_scholarship
   SET body_plain = 'The sense of divine guidance in Safaitic is carried by ḫfrt (خفرة) (protection / guidance-through). KRS 6835: through ḫfrt (خفرة) comes deliverance from death (fltn m-mt — فلتن من موت).',
       body_md    = 'The sense of divine guidance in Safaitic is carried by ḫfrt (خفرة) (protection / guidance-through). KRS 6835: through ḫfrt (خفرة) comes deliverance from death (fltn m-mt — فلتن من موت).'
 WHERE source_id = 'SRC:ALJ:2026:EXCQRN' AND root_norm = 'هدي';

-- ودع
UPDATE ar_ling_root_scholarship
   SET body_plain = 'Safaitic wdʿ (ودع) — divine forsaking (curse formula: wdʿ (ودع) + Divine Name + Anthroponym).',
       body_md    = 'Safaitic wdʿ (ودع) — divine forsaking (curse formula: wdʿ (ودع) + Divine Name + Anthroponym).'
 WHERE source_id = 'SRC:ALJ:2026:EXCQRN' AND root_norm = 'ودع';

-- يتم
UPDATE ar_ling_root_scholarship
   SET body_plain = 'Safaitic ytm (يتم) — used in contexts of drought and divine absence; metaphorical valency "abandoned by the gods" alongside biological orphanhood. Al-Jallad: "perhaps the most fascinating example of religious metaphor."',
       body_md    = 'Safaitic ytm (يتم) — used in contexts of drought and divine absence; metaphorical valency "abandoned by the gods" alongside biological orphanhood. Al-Jallad: "perhaps the most fascinating example of religious metaphor."'
 WHERE source_id = 'SRC:ALJ:2026:EXCQRN' AND root_norm = 'يتم';
