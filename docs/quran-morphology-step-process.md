# Process Memory — Qurʾān "Morphology" Study Step (Vocabulary Backbone + SRS + Memlets)

> Canonical memory for building the per-passage vocabulary/knowledge backbone that
> powers the **Surah → Passage → Morphology** study step, its **Membean-style
> Memlet** word view, and the **Anki-exportable SRS decks** at `/srs`.
> Read this before working on any passage. Last updated: 2026-06-18.
> Worked examples live: رووت زلف & خلص; Sūrah 39 (az-Zumar) Passage 1 (39:1–5).

## 0. Entry point
- App step: `k-maps.com/quran/surahs/<S>/study/<passage>?step=morphology`
- A grid of **word-occurrence cards** (NOUNS / VERBS filter). Each card shows the
  word form, gloss, **ROOT**, and āyah ref.
- **Click a card → deep word view** = the 9 Memlets (NO SRS inside the card).
- **SRS is separate** (`/srs`): one **Deck per Surah**, mixed card types, feeds Anki.

## 1. Databases & key tables
| Domain | D1 database | UUID |
|---|---|---|
| QR (Qurʾān source) | `km_quran` | `8dbd5053-c9b8-4dd0-9e45-1d66d3a58fba` |
| AL (Arabic linguistics — content) | `km_arabic_linguistic` | `192f4792-deb3-4f2e-9204-532cf484ecd2` |
| AR (Arabic learning — SRS/learner) | `km_arabic` | `7ffa77c9-2d6c-46cb-a360-b198da502252` |

### QR — passage source of truth
- `qr_word_occurrences(surah,ayah,word_index,word_text,word_text_bare,root,lemma,pos,morphology_tag,morphology_tag_json)` — **start here** to list a passage's words/roots.
- `qr_ayah`, `qr_surah_ayah_meta` — āyah text/meta.
- Verse analysis homes: `qr_analysis_claims`, `qr_context_claims`, `qr_context_topics`,
  `qr_historical_context_profiles`, `qr_surah_theme_profiles`, `qr_topic_registry`.

### AL — canonical content (one row per root/sense; reused by every surah)
- `ar_ling_roots(id,root_text,root_letters,meaning_core_en/ar,frequency_quran,…)` — canonical root.
- `ar_ling_root_vocab(root_norm PK,root_text,root_id,core_sense_en/ar,membean_hook,membean_anchors_json,illustration_key,diagram_key,unique_senses_json,examples_json,status,first_surah,first_ayah)` — **the denormalized vocabulary card** (Membean anchor).
- `ar_ling_lexicon_entries(id,lemma_id,entry_text,definition_en,…,root_id,source_id)` — parent for senses (FK lemma).
- `ar_ling_senses(id,lexicon_entry_id,sense_number,gloss_ar,gloss_en,context_note,qr_ref,note_md)`.
- `ar_ling_sense_relations(from_sense_id,to_sense_id,relation_type,nuance_note)`.
- `ar_ling_form_paradigms(id,paradigm_name,paradigm_type,verb_form,root_type,paradigm_json)` + `ar_ling_conjugation_templates(paradigm_id,person,tense,voice,template_form)` — **ṣarf**.
- `ar_ling_lemmas(id,lemma_text,root_id,…)` — derivation family.
- `ar_ling_near_synonym_sets` + `ar_ling_near_synonym_members(set_id,lemma_id,arabic_display,nuance_note,…)` — **REUSE; never invent new synonym data without checking membership first.**
- `ar_ling_expressions(id,expression_ar,expression_en,primary_lemma_id,qr_refs_json)` — **Mir Verbal Idioms** (2188 rows) + `ar_ling_collocations` — expressions.
- `ar_ling_root_scholarship(id,source_id,root_norm,reading_kind,title_en,body_md,…)` — gems (Lisan, Sinai, etc.). Sinai source = `src_sinai_2023_keyterms` (registered, **0 rows — do not fabricate**).
- `ar_ling_sources` — provenance (e.g. Lisan = `SRC:KETABONLINE:LISAN_AL_ARAB`).
- **NEW pedagogy tables (migration `ar-linguistics/0021`):**
  `ar_ling_vocab_memory_hooks`, `ar_ling_vocab_illustrations` (image|svg|video|story),
  `ar_ling_vocab_diagrams` (constellation|range|contrast|sarf_tree), `ar_ling_vocab_exercises`
  (def_mcq|cloze|synonym|antonym|choose_word|sarf|spelling).
- Cross-domain links: `ar_ling_quran_links(al_entity_ref,al_entity_type,qr_scope_ref,link_type)`.

### AR — SRS / learner workflow (the **proper** engine that powers `/srs`)
- `ar_srs_decks(id,core_user_ref,core_ws_ref,title,deck_type,description,card_count,is_shared,meta_json)` — **one deck per (user, Surah)**, `deck_type='quran_vocab'`.
- `ar_srs_cards(id,deck_id,core_user_ref,resource_ref,resource_type,FSRS…,card_template,front_text,back_text,extra_json,tags,suspended)` — UNIQUE(deck_id,resource_ref). FSRS = stability/difficulty/elapsed/scheduled/reps/lapses/card_state/next_review_at.
- `ar_srs_reviews(card_id,rating,stability_after,difficulty_after,scheduled_days_after,state_after,reviewed_at)` — rating log.
- `front_text/back_text/tags/extra_json` are the **Anki export snapshot** (migration `arabic/0001`).
- ⚠️ `ar_qr_vocab_*` (an earlier per-passage family) was **dropped** — use the proper tables.

## 2. Card taxonomy (a Surah Deck is a MIXED deck)
| `resource_type` | source table | `resource_ref` | notes |
|---|---|---|---|
| `qr_vocab_root` | AL root_vocab | `root_norm` | one per content root |
| `qr_vocab_sense` | AL senses | `SEN:<root>:<n>` | depth roots only |
| `qr_expression` | AL collocations | `QR:S:A` | notable collocation |
| `qr_verbal_idiom` | AL expressions (Mir) | `AREX:VI:…` | |
| `qr_verse` (+`extra_json.kind`) | QR / AL | `QR:S:A#<kind>` | kind ∈ important, difficult, **grammar(iʿrāb)**, **balagha**, **tafsir**, **historical(asbāb al-nuzūl)** — one card per lens |
| `qr_key_concept` (+`extra_json.domain`) | WV | `WV:concept:<slug>` | domain ∈ theology, psychology, philosophy, … |

Tags use Anki hierarchy: `Quran::<surah-name>::P<n> type::verse::balagha`.

## 3. Membean Memlet → table mapping (the deep word view)
1. **Definition** → `ar_ling_senses` (per-sense gloss).
2. **Word Sums** (morphology) → root + wazn: `form_paradigms` + `conjugation_templates` + the word's `qr_word_occurrences.morphology_tag`.
3. **Context Relationship** → āyāt the root recurs in: `qr_word_occurrences` ↔ `ar_ling_quran_links`.
4. **Word Constellation** → `ar_ling_senses` + `ar_ling_near_synonym_sets` + `sense_relations` (synonyms/antonyms).
5. **Images / Video Stories** → `ar_ling_vocab_illustrations`.
6. **Hooks** → `ar_ling_vocab_memory_hooks` (1/sense + root).
7. **Roots / Derivation family** → `ar_ling_roots` + `ar_ling_lemmas`.
8. **Verbal Idiom** → `ar_ling_expressions` (Mir).
9. **Examples / Retrieval** → `ar_ling_vocab_exercises`.
(+ Scholarship gem `ar_ling_root_scholarship` (Lisan); + Sinai key-term placeholder.)

## 4. The pipeline — run this for EACH passage
1. **List the passage.** `SELECT … FROM qr_word_occurrences WHERE surah=S AND ayah BETWEEN a1 AND a2`.
2. **Filter to content roots.** Exclude particles, pronouns, relatives (alladhī), demonstratives, and basics (بين، دون، كلّ). Keep verbs/nouns/adjectives.
3. **Fetch existing root ids/meanings** from `ar_ling_roots` (link, don't duplicate).
4. **Breadth pass (every content root):** upsert `ar_ling_root_vocab` (core_sense_en/ar, membean_hook, first_surah/ayah, status='live'); backfill `ar_ling_roots.meaning_core_*`.
5. **Depth pass (keystone roots):** lexicon entry → 4 senses → sense_relations → ṣarf paradigms + conjugations → 3 hooks → illustration → constellation diagram → 6 exercises → Lisan gem → quran_links. (See `seed-quran-vocab-zulf.sql`, `…-surah39-passage1.sql`.)
6. **Cross-reference (reuse, never duplicate):**
   - Near-synonyms: check `ar_ling_near_synonym_members` for the root's lemmas FIRST; add to existing sets if missing; record set ids in `root_vocab.membean_anchors_json`.
   - Verbal idioms: find in `ar_ling_expressions` by `expression_ar`/`qr_refs_json`; link.
   - Sinai key-terms: query `src_sinai_2023_keyterms`; **if empty, leave null — do not fabricate.**
7. **SRS:** ensure a Surah deck in `ar_srs_decks`; upsert cards into `ar_srs_cards`
   (vocab + expression + idiom + verse[kinds] + key_concept); fill `front_text/back_text/tags`
   (Anki snapshot); set `meta_json.categories`/`card_count`.
8. **Reproducibility:** mirror DDL to `workers/*/migrations/`, data to `database/seeds/`. Run `git diff --check`, commit, push.

## 5. Conventions & invariants
- **No duplication across domains** — store typed refs (`QR:`, `AL:`, `WV:`). Content (AL) is reused by every workspace; only SRS state (AR) is per user+workspace.
- **ID patterns:** `LEXE:<root>:main`, `SEN:<root>:<n>`, `PAR:<root>:<form>`, `CJ:<root>:…`, `SCH:<root>:<src>`, `QL:<root>:<S:A>`, `HOOK/ILL/DIAG/EX:<root>:…`; SRS deck `DECK:srs:<user>:<S>`, card `SRSC:<S>:<type>:<ref>`.
- D1 does not enforce FKs at runtime; still insert parents first.
- The d1 MCP query tool runs multi-statement SQL; batch related inserts.
- Don't fabricate scholar-attributed content (Sinai, tafsīr) — link real rows or leave null.

## 6. Status & gaps
- **Done:** AL pedagogy tables (0021); AR proper-SRS convention (0002); زلف & خلص full depth; Sūrah 39 P1 — 35 roots (breadth) + 2 depth; Sūrah 39 deck = **55 cards** (vocab 43, idiom 2, expression 1, verse 7 [important 2/difficult 1/grammar 1/balagha 1/tafsir 1/historical 1], concept 2) with Anki snapshots.
- **Gaps:** Sinai Key-Terms not ingested (source empty); illustrations are captions/placeholder SVG (no final art); collocations/expression + key-concept (WV) tables not yet populated as canonical rows (cards are self-contained for now); Anki export script not yet written; passages 39:6+ pending.
- **Mockups:** `quran-word-deepview.html` (morphology card → deep 9-Memlet word view, no SRS),
  `quran-srs-decks.html` (`/srs` deck browser → study session → Anki export),
  `quran-vocab-passage1.html` (earlier combined demo) — all under `database/mockups/`.
