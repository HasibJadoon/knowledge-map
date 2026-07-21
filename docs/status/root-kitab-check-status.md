# Root Check Status — كتب (k-t-b) · All Layers & Memlets

> Live D1 audit. Run date: 2026-07-21. Scope: root **كتب** across the morphology
> word-view **display layers** (17) and the backing **memlets** (9), in
> `km_quran`, `km_arabic_linguistic`, `km_arabic`.
> Legend: ✅ live · 🟡 present-but-not-live/partial · ❌ missing.

## A. Display layers — `km_quran.qr_morph_display_blocks` (root_ar='كتب')

All **17 layer types are present**. Distribution by scope:

| Layer | Scope | Present | Status |
|---|---|---|---|
| root_dna | root | ✅ | live |
| sarf | lemma (`MDL:كتب#46fde4b8`) | ✅ | live |
| derivations | root | ✅ | live |
| lexicon | root | ✅ | live |
| attestations | root | ✅ | live |
| synthesis | root | ✅ | live |
| kindred | root | ✅ | live |
| metaphor | root | ✅ | live |
| constellation | root | ✅ | live |
| occurrences | root | ✅ | live |
| development | root | ✅ | live |
| usage_map | root | ✅ | live |
| master_story | root | ✅ | live |
| irab | context ×4 āyahs | ✅ | live |
| tafsir | context ×4 āyahs | ✅ | live |
| balagha | context — **44:2 only** | 🟡 | live |
| translators | context — **44:2 only** | 🟡 | live |

### Context lenses per āyah (4 lenses = irab · balagha · translators · tafsir)
| Āyah | word | irab | balagha | translators | tafsir |
|---|---|---|---|---|---|
| 44:2 | 1 وَالْكِتَابِ | ✅ | ✅ | ✅ | ✅ |
| 17:14 | 2 كِتَابَكَ | ✅ | ❌ | ❌ | ✅ |
| 27:28 | 2 بِكِتَابِي | ✅ | ❌ | ❌ | ✅ |
| 13:39 | 8 الْكِتَابِ | ✅ | ❌ | ❌ | ✅ |

**Gap: 6 context blocks** (balagha + translators for 17:14, 27:28, 13:39).

### Word-anchor rows — `qr_morph_display_words`
| Word | Row | Notes |
|---|---|---|
| 44:2:1 | ✅ | is_anchor=1, freq=319, sense_arc set — but `gloss_en` is **NULL** 🟡 |
| 17:14:2 | ❌ | no row |
| 27:28:2 | ❌ | no row |
| 13:39:8 | ❌ | no row |

## B. Memlets (9) — backing data for كتب

| # | Memlet | Backing table | كتب rows | Status |
|---|---|---|---|---|
| 1 | Definition / senses | `ar_ling_lexicon_root_entries` (Five-Lens) | 10 | ✅ (`ar_ling_senses` table absent) |
| 2 | Word sums / ṣarf | `ar_ling_verb_government` | 9 | ✅ |
| 3 | Context relationship | `qr_word_occurrences` (44:2,17:14,27:28,13:39) | 4 | ✅ |
| 4 | Word constellation | `ar_ling_near_synonym_members` | 0 | ❌ (block self-contained via data_json) |
| 5 | Images / illustration | `ar_ling_root_illustration` | 0 | ❌ |
| 6 | Memory hooks | `ar_ling_vocab_memory_hooks` | 0 | ❌ |
| 7 | Roots / derivation family | `ar_ling_roots` + `ar_ling_lemmas` | 1 + 40 | ✅ |
| 8 | Verbal idiom | `ar_ling_expressions` | 0 | ❌ |
| 9 | Examples / exercises | `ar_ling_vocab_exercises` | — | ❌ (table absent) |

Additional backing: `ar_ling_lexicon_blocks` 590 ✅ · `ar_ling_root_scholarship` 1 ✅
(Lisan gem) · `ar_ling_root_antonyms` 0 ❌ · `qr_tafsir_entries` 8 per āyah ×4 ✅.

## C. Root-level status flags
- `ar_ling_root_vocab` (root_norm='كتب') exists, rich core_sense, but **status='draft'** 🟡
  — pipeline step 4 expects `status='live'`.
- `ar_ling_roots` كتب: id `cb303790920fa750c588a8f5fd`, freq 319 ✅.
- SRS (`km_arabic`): **0** كتب cards; 1 `quran_vocab` deck exists (not كتب-specific).
- `km_core`: identity/workspace domain — no per-root morphology data by design;
  no "cybernetics" object found. Not part of the word-view layers.

## D. Verdict
- **Layers:** 17/17 types live. The root portrait (root + 44:2) is complete; the
  three cross-reference āyahs are **thin** — only irab+tafsir, missing balagha+translators,
  and have **no word-anchor rows**.
- **Memlets:** definition, ṣarf/verb-gov, occurrences, roots/derivation, tafsir,
  lexicon-blocks, scholarship are backed. Constellation, illustration, memory-hooks,
  verbal-idiom, exercises, antonyms are **not linked to canonical tables** (blocks
  render from inline `data_json` only).

## E. Build applied (this branch) ✅
Completed on the existing 4-āyah scope; verified against live D1:
1. ✅ **+6 context blocks** — balāgha + translators for 17:14, 27:28, 13:39.
   All four āyahs now render the full 4 lenses (irāb · balāgha · translators · tafsīr).
2. ✅ **Backfill** `gloss_en` on the anchor 44:2:1.
3. ✅ **Flip** `ar_ling_root_vocab.status` draft → **live** for كتب.

Seed: `database/seeds/seed-morph-display-kitab-context-fill.sql` (idempotent).
Note: the 3 cross-reference āyahs render as **contexts inside the 44:2:1 word view**
(via `MorphDisplayRepo.wordView` → occurrences → context switcher), so they need
no standalone `qr_morph_display_words` rows.

### Deferred (larger content authoring — do not fabricate)
Memlet backing still un-linked to canonical tables for كتب: memory-hooks,
illustration, near-synonym membership, verbal-idiom links, exercises (table absent),
antonyms. Blocks currently render from inline `data_json`. SRS deck/cards for كتب
also pending.

---

## F. Root-Ling (AL) level — the authoritative layer status
> Correction of level: the root's canonical linguistic truth lives in
> **`km_arabic_linguistic` (AL)**, not QR. `qr_morph_display_blocks` (section A) is
> the render-time **projection**; AL is the source of truth. The canonical per-root
> tracker is **`ar_ling_root_build_status`** and the layer contract is the registry
> **`ar_ling_reg_build_layer`** (22 layers) + **`ar_ling_reg_sub_layer`** (24 bands).

**Build tracker — `ar_ling_root_build_status` (كتب):**
`book_scope = 44:1–9` (Sūrat ad-Dukhān passage) · `total_books = 11` ·
`done_books = 4` · **status = in_progress** (updated 2026-07-19). → This root is a
live **passage build**, not complete.

**Registry layer coverage for كتب** (`ar_ling_reg_build_layer`, scope = root/lemma):
| Layer | Band | Carrier table | كتب | Status |
|---|---|---|---|---|
| 100 root | 00-CORE / 10-DNA | `ar_ling_roots`, `ar_ling_root_dna` | 1 / 1 | ✅ |
| 100 root | 14-SENSE | `ar_ling_root_senses` | 8 | ✅ |
| 100 root | 16-AXES | `ar_ling_root_sense_axes` | 0 | ❌ |
| 100 root | 18-STAGE | `ar_ling_root_development_stages` | 0 | ❌ |
| 100 root | 30-KIN | `ar_ling_root_antonyms` | 0 | ❌ |
| 100 root | 52-SCHOL | `ar_ling_root_scholarship` | 1 | 🟡 thin |
| 070 vocab | 70-VOCAB | `ar_ling_root_vocab` | 1 | ✅ live |
| 010 source | 50-META | `ar_ling_lexicon_blocks` | 590 / 9 books | ✅ |
| 010 source | 52 | `ar_ling_lexicon_root_entries` | 10 (1 clean, 1 live, 8 raw) | 🟡 4/11 built |
| 200 lemma | 20-GOV | `ar_ling_verb_government` | 9 | ✅ |
| 200 lemma | (lemmas) | `ar_ling_lemmas` | 40 | ✅ |
| 400 kindred | — | `ar_ling_near_synonym_members` | 0 | ❌ |
| 500 expression | — | `ar_ling_expressions` (`ar_applied_balagha` absent) | 0 | ❌ |
| 600 memlet | 72-MEM | `ar_ling_vocab_memory_hooks` | 0 | ❌ |
| — article | — | `ar_ling_root_article_block` | full raw article | 🟡 status=raw (unpublished) |

**Verdict (Root-Ling):** the identity + معجم + sarf-government + senses spine is
**built**; the **synthesis/learn bands are empty** (sense-axes, development-stages,
antonyms, near-synonyms, expressions, memory-hooks) and the long-form root article
is still `raw`. Lexicon build is **4/11 books** for the 44:1–9 scope.

## G. Balāgha — source check (lexicon + grammar books in D1)
Per the directive to ground balāgha in real D1 sources:
- **Lexicon (معاجم):** ✅ strong — `ar_ling_lexicon_blocks` for كتب = **590 blocks
  across 9 dictionaries** (Tāj al-ʿArūs 268, Mufradāt 168, Lane 51, Lisān 35,
  Maqāyīs 25, Jamhara 12, ʿAyn 11, Ṣiḥāḥ 10, Miṣbāḥ 10).
- **Grammar / balāgha books:** ✅ corpus present — `ar_ling_gram_chunks`
  `discipline='BL'` = **4,125 chunks / 923 bābs** (alongside NH 8,138 / SF 9,056).
  **Not yet linked to كتب** — balāgha for the passage must be sourced by searching
  this BL corpus (FTS) + the معاجم, not authored free-hand.
- **Gaps:** `ar_ling_gram_terms` has **no BL rows** (only NH 2 / SF 2); the AL
  balāgha-concept tables `ar_ling_balagha_concepts` / `ar_ling_balagha_examples`
  (referenced by `balagha.repo.ts`) are **absent from D1** — so balāgha currently has
  a corpus but no concept taxonomy or per-root linkage.

### G.1 Books present in D1 (the grounding corpus)
**Balāgha / rhetoric books — `ar_ling_gram_chunks` `discipline='BL'` (12 books):**
| Book | Author (d. AH) | Chunks |
|---|---|---|
| المثل السائر | Ibn al-Athīr | 992 |
| دلائل الإعجاز | al-Jurjānī (471) | 689 |
| الطراز | al-ʿAlawī (745) | 682 |
| الإيضاح في علوم البلاغة | al-Qazwīnī (739) | 638 |
| مفتاح العلوم | al-Sakkākī (626) | 590 |
| أسرار البلاغة | al-Jurjānī (471) | 421 |
| شرح المفصل | Ibn Yaʿīsh | 42 |
| المقتضب | al-Mubarrad | 34 |
| همع الهوامع | al-Suyūṭī | 21 |
| الكتاب | Sībawayh | 7 |
| جامع الدروس | al-Ghalāyīnī | 5 |
| شرح قطر الندى | Ibn Hishām | 4 |

**Lexicon books (11 target معاجم) — `ar_ling_lexicon_blocks` / `ar_ling_sources`:**
al-Khalīl *ʿAyn* (170) · Ibn Durayd *Jamhara* (321) · al-Jawharī *Ṣiḥāḥ* (393) ·
Ibn Fāris *Maqāyīs* (395) · al-Rāghib *Mufradāt* (502) · al-Ṣaghānī *ʿUbāb* (650) ·
Ibn Manẓūr *Lisān* (711) · al-Fayyūmī *Miṣbāḥ* (770) · al-Fīrūzābādī *Qāmūs* (817) ·
al-Zabīdī *Tāj* (1205) · *Lane* — plus Sinai *Key Terms* & Mir *Verbal Idioms*.
For كتب: blocks present in **9/11** (missing ʿUbāb, Qāmūs); **4/11 cleaned**.

### G.2 How balāgha grounds (method)
The balāgha books are organized **by device/bāb, not by āyah** — `«الكتاب المبين»`
returns 0 text hits. Ground the āyah's balāgha by its **device**: 44:2 is an
**oath (qasam) + descriptive epithet (mubīn)**, and the qasam bāb is richly covered
(`القسم/أقسم`: Ibn al-Athīr 143 · Sakkākī 51 · al-ʿAlawī 28 · Asrār 21 · Īḍāḥ 17 ·
Dalāʾil 13). So a grounded balāgha block cites those chunks + the معجم sense — never
free-hand. (The QR balāgha in section E is a placeholder pending this grounding.)

## H. Next actions (Root-Ling build)
1. Continue the lexicon build 4/11 → 11/11 for scope 44:1–9 via the
   **`kmaps-lexicon-builder`** skill (trilingual entry + ṣarf family panel + footnote
   apparatus per source; verified against the source text).
2. Fill the empty synthesis bands (sense-axes, development-stages, antonyms,
   near-synonyms) from the built معاجم — no fabrication.
3. Ground the āyah-level balāgha (44:2 etc.) against the `BL` gram-chunk corpus +
   معاجم via **`kmaps-ss-builder`**; only then project to `qr_morph_display_blocks`.
4. Publish `ar_ling_root_article_block` (raw → live) once bands 1–3 are filled.

> Note: the QR context-lens fill in section E is the display **projection** and stays
> valid, but it is downstream of the AL Root-Ling build above.
