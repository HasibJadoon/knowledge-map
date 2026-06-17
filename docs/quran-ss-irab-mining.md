# Surah study module + sentence-structure mining from iʿrāb/tafsīr

> Scope: `km_quran` (QR domain). Worked reference: **Surah 39 (az-Zumar)**.
> Companion data: `database/seeds/seed-qr-surah39-*.sql`.

This note records (a) the table-driven study-module architecture, (b) the
pipeline for mining **sentence structure** into the `qr_ss_*` tables from the
iʿrāb books and tafsīr, with **nuanced multiple readings**, and (c) the honest
status of Surah 39.

## 1. Study module comes from km_quran tables, not JSON

Per `docs/wiki/03-quranic-teaching/Data Storage Map.md`:

- *Qurʾān text is never duplicated in lessons.*
- *Linguistic analysis is never authored inside lessons.*
- Flow: **Qurʾān text → universal language atoms → occurrences → lesson (how to teach).**

So each study **task is a thin pointer** that resolves its content live from
canonical km_quran tables. A task's `task_json` carries `sources` (the
structured tables it reads) and `mapped_from` (the raw book tables those
structured tables are populated from) — never the content itself.

### Steps (per passage), step_no, and source tables

| Step | code | sources (resolved from) | mapped_from (raw) | Surah 39 status |
|---|---|---|---|---|
| Reading | RDG 100 | `qr_ayah`, `qr_translations`, `qr_surah_ayah_meta` | — | ✅ live |
| Morphology | MOR 200 | `qr_word_occurrences`, `qr_lemma_occurrences`, `qr_lemmas` | `qr_irab_book_entries` | ✅ live (1172 words) |
| Sentence structure | SS 300 | `qr_ss_occ_sentence`, `qr_ss_occ_clause`, `qr_ss_syntax_relations`, `qr_ss_scope_morph_link`, `qr_ss_scope_reading` | `qr_irab_book_entries` | ⏳ mining (39:1 done) |
| Expressions | EXP 400 | `qr_ss_occ_phrase`, `qr_ss_scope_balagha_link` | `AL:ar_ling_expressions` | ⏳ pending |
| Comprehension | CMP 500 | `qr_study_questions`, `qr_analysis_claims`, `qr_scope_nuances` | — | ✅ live |
| Passage structure | PS 600 | `qr_surah_passages`, `qr_surah_structure_units`, `qr_surah_symmetry_patterns`, `qr_surah_topic_flows` | — | ✅ live |
| Scholarship & tafsīr | SCH 700 | `qr_scholar_positions`, `qr_scholar_profiles`, `qr_interpretive_differences` | `qr_tafsir_entries`, `qr_irab_book_entries` | ⏳ pending mapping |

Tables: `qr_surah_study_passages` (8) → `qr_surah_study_steps` (56 = 7×8) →
`qr_surah_study_tasks` (56 root tasks). New table `qr_study_questions`
(migration `0004`) holds the comprehension bank (24 rows for Surah 39).

## 2. Sources available for Surah 39

- **Iʿrāb books (5):** Daas (1014), Jadwal (588), Muyassar (193), Darwīsh (65),
  ʿUkbarī/Tibyān (33) — total **1,893** entries, spanning 1–75.
- **Tafsīr (8 works):** Ṭabarī, Zamakhsharī, Rāzī, Ibn ʿAṭiyya, Ibn Kathīr,
  Abū Ḥayyān, Ālūsī, Ibn ʿĀshūr — total **310** entries.

### Blockers to a clean automated mine

1. **Word linking is 0% done.** All 1,893 `qr_irab_book_entries` rows for
   Surah 39 have `word_occurrence_id IS NULL` (`word_link_status = 'pending'`).
   Entries are fragment-level (`target_text_bare`), so they must be matched to
   `qr_word_occurrences` by normalized text before per-word i‘rāb can attach.
2. **Cross-book disagreement is the norm**, and some entries carry
   `alternative_json` (within-book variants). Both are *features* — they are
   the multiple readings — but require reconciliation, not naive overwrite.
3. The `qr_ss_scope_reading` / `qr_ss_scope_morph_link` tables were previously
   empty DB-wide (no prior model); the shapes below are the proposed canon.

## 3. Mining pipeline (`scripts/mine-ss-from-irab.mjs`)

For each ayah in a surah:

1. **Tokenize** `qr_word_occurrences` (ordered by `word_index`).
2. **Align** each `qr_irab_book_entries.target_text_bare` to a word span by
   normalized-text matching (drop diacritics/al-; longest-match), filling
   `word_occurrence_id` and `word_link_status='linked'`.
3. **Segment sentences** from the books' clause markers → `qr_ss_occ_sentence`
   (+ `qr_ss_occ_clause` where the book marks subordinate clauses), with
   `qr_ss_scope_member_map` linking each word to its sentence scope.
4. **Per-word iʿrāb** → `qr_ss_scope_morph_link` (`irab_position`,
   `irab_sign`, `syntactic_function`). Set `is_disputed=1` when books differ.
5. **Reconcile readings** → `qr_ss_scope_reading`: one row per distinct
   analysis, `is_minority`/`is_contested` set by book agreement count and any
   `alternative_json`; `scholar_ref` lists the contributing book slugs and
   tafsīr work ids. **This is the "nuanced multiple readings" layer.**
6. **Dependencies** → `qr_ss_syntax_relations` (head→dep with `relation_label`).
7. Cross-check the reading set against the **tafsīr** grammar discussions
   (`qr_tafsir_entries` for the ayah, esp. Zamakhsharī/Abū Ḥayyān/Rāzī) and
   attach corroborating `scholar_ref`s.

The reconciliation is deterministic given the alignment; the alignment step is
the only fuzzy part and should be reviewed where match confidence is low.

## 4. Worked gold example — 39:1

`تَنزِيلُ ٱلۡكِتَٰبِ مِنَ ٱللَّهِ ٱلۡعَزِيزِ ٱلۡحَكِيمِ` — mined from all five
iʿrāb books with tafsīr corroboration:

- **Sentence** `QR:SS:39:1:s1` — nominal (jumla ismiyya ibtidaiyya, *lā maḥalla lahā*).
- **Reading 1 (majority):** `تنزيل` = *mubtadaʾ*, khabar = `من الله` — Jadwal, Daas, Tibyan.
- **Reading 2 (minority/contested):** `تنزيل` = *khabar* of an omitted mubtadaʾ
  (*hādhā tanzīl*), `من الله` attached to the maṣdar — Jadwal's alternative,
  discussed by Zamakhsharī & Abū Ḥayyān.
- **Reading 3 (majority):** `العزيز الحكيم` = *naʿt* of the divine name.
- **Reading 4 (minority/contested):** `العزيز الحكيم` = *badal* — al-Daas.

Stored as: 1× `qr_ss_occ_sentence`, 6× `qr_ss_scope_member_map`,
6× `qr_ss_scope_morph_link` (2 flagged `is_disputed`), 4× `qr_ss_scope_reading`
(2 minority), 5× `qr_ss_syntax_relations`.

## 5. Status (Surah 39)

| Layer | State |
|---|---|
| Passages, structure, symmetry, topic flow, profiles | ✅ complete |
| Analysis scopes/claims, nuances, concept map, arguments | ✅ complete |
| Study steps + root tasks (7×8) + comprehension bank | ✅ complete |
| SS mining — ayah 39:1 | ✅ gold example (all tables) |
| Iʿrāb word-linking (1,893 entries) | ◑ 473 linked, 389 span, 1,031 ambiguous (`seed-qr-surah39-irab-wordlink.sql`) |
| SS mining — ayahs 39:2–75 | ⏳ order-aware miner over linked + ambiguous entries |
| Tafsīr → `qr_scholar_positions` mapping | ⏳ pending |

### Word-linking detail

Two deterministic SQL passes (`seed-qr-surah39-irab-wordlink.sql`) link only
**unique** single-token matches per ayah (`ayah_key`): exact bare match, then
hamza/alef/yāʾ/tāʾ-normalized match. This took Surah 39 from 0 → **473**
linked. The **1,031 ambiguous** entries are single tokens that repeat within
their ayah (so they need order-aware positional alignment), and **389 span**
entries are multi-word fragments (need span→head-word assignment). Both
remainders are the miner's job — they cannot be linked deterministically in
SQL without risking binding a fragment to the wrong occurrence.

Hand-authoring the remaining 74 ayahs would mean inventing grammatical
analysis at scale; the authority is the books, so the remainder should run
through the pipeline (step 2 alignment reviewed) rather than be transcribed.
