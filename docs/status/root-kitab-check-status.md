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
