# Qur'anic Vocabulary Backbone — Seed Process & Table Plan

> Authoritative process for building the Qur'anic vocabulary backbone: a
> per-root, per-sense reference (Five-Lens + classical ṣarf + Membean-style
> multimodal learning + SRS) **synthesized from ALL sources** and stored in
> **tables** (never only HTML/JSON). A done root is reused (enhanced) by every
> later surah, never recreated.

---

## 0. Membean model we merge (verified via membean.com/how-it-works + /research)
Membean teaches each word through **9 "Memlets"** (modular learning units) and
**adaptive spaced repetition**:
- **Memory-Hook Memlet** — a mnemonic association (sound/meaning).
- **Constellation Memlet** — a network of related words (hyponymy, hypernymy,
  **polysemy**) — the semantic neighbourhood.
- **Image / illustration**, **example sentences**, **word parts / etymology**,
  **spelling**, **audio**, **usage**, **definition** — the remaining Memlets.
- **Spaced repetition** revisits a word *just before it is forgotten*; **"allowing
  some forgetting makes relearning more effective"** (deliberate interval stretch).
- **Mastery states**: *new → growing → well-learned*, shown on a dashboard;
  difficulty adapts to performance.
- **Heavy retrieval practice** — many, often hard, questions per word.

**Mapping to Qur'anic vocabulary:**
| Membean Memlet | Qur'anic backbone | Table |
|---|---|---|
| Memory hook | 1 hook **per sense** (+ root) | `ar_ling_vocab_memory_hooks` (NEW) |
| Constellation (hyper/hyponymy, polysemy) | root family + senses + synonyms/antonyms | `ar_ling_senses` + `near_synonym_*` + `sense_relations` (relation_type: synonym/antonym/broader/narrower) |
| Image | illustration per root/sense | `ar_ling_vocab_illustrations` (NEW) |
| Word parts | root + ṣarf paradigm | `ar_ling_roots` + `form_paradigms` + `conjugation_templates` |
| Example sentences | real āyāt occurrences | `qr_word_occurrences` ↔ `ar_ling_quran_links` |
| Audio | āyah recitation | (existing reading layer) |
| Adaptive SRS + mastery (new/growing/well-learned) | per sense **and** per root | `ar_ling_vocab_srs` (extend: scope + mastery_state) |
| Heavy retrieval (varied, hard) | exercise bank per sense | `ar_ling_vocab_exercises` (NEW) |

---

## 1. Source-consultation rule (NON-NEGOTIABLE — before any synthesis)
A sense/hook/synthesis may be written **only after** retrieving the actual text of:
- **All 10 lexica**: al-Khalīl (ʿAyn), Ibn Fāris (Maqāyīs), al-Jawharī (Ṣiḥāḥ),
  al-Rāghib (Mufradāt), al-Fayyūmī (Miṣbāḥ), Ibn Manẓūr (Lisān), al-Zabīdī (Tāj),
  al-Fīrūzābādī (Qāmūs), al-Ṣaghānī (ʿUbāb), Lane.
- **All tafsīr** covering the verse (Ṭabarī, Zamakhsharī, Rāzī, Ibn ʿAṭiyya,
  Qurṭubī, Ibn Kathīr, Ālūsī, Ibn ʿĀshūr, Abū Ḥayyān, …).
- **All iʿrāb books** (Muyassar, Jadwal, Daʿʿās, Darwīsh, ʿUkbarī/Tibyān).
- **Verbal idioms**: Mustansir **Mir**, *Verbal Idioms of the Qurʾān* (+ Iṣlāḥī).
- **Key terms**: Nicolai **Sinai**, *Key Terms of the Qurʾān*.
Every retrieved passage becomes a row in `ar_ling_lexicon_*` / `qr_evidence_items`
with provenance + dispute status. **No synthesis without ingested evidence.**

---

## 2. Granularity (4 levels)
```
ROOT (ar_ling_roots / ar_ling_root_vocab)      ← the backbone unit; ONE per root
  └─ SENSE (ar_ling_senses)                     ← each distinct sense; 1 hook + 1 SRS card each
       └─ LEMMA (ar_ling_lemmas)                ← surface words; carry ṣarf paradigm
            └─ OCCURRENCE (qr_word_occurrences) ← real āyāt; bridged via ar_ling_quran_links
```
- **Per root**: Five-Lens, core sense, illustration, root constellation, root-level SRS.
- **Per sense**: gloss, context, 1 memory hook, 1 SRS card, near-synonyms, antonyms, examples.

---

## 3. The Five Lenses (each synthesized from ALL sources)
1. **Ṣarf** — classical conjugation: past / present / **maṣdar** (all common) + derived
   forms (I–X), transitivity (lāzim/mutaʿaddī). → `form_paradigms` + `conjugation_templates`
   + `lemma_morphology` (reusable paradigms, one per wazn).
2. **Iʿrāb** — from all iʿrāb books. → `qr_ss_scope_reading` + `qr_evidence_items`.
3. **Dalāla** — semantic core from all lexica. → `ar_ling_senses` + `root_vocab.core_sense`.
4. **Balāgha** — rhetoric (mubālagha, tawkīd, etc.). → `qr_ss_scope_balagha_link` + `balagha_examples`.
5. **Tarjama** — translation nuance + controlled-loss note. → `vocab_depth` / sense note.

---

## 4. Table plan

### 4a. Existing canonical tables to FILL (currently empty) — no duplication
| Table | Use |
|---|---|
| `ar_ling_senses` | per-root senses (gloss_ar/en, context, qr_ref) — the per-sense spine |
| `ar_ling_sense_relations` | **antonyms** + synonyms at sense level (relation_type) |
| `ar_ling_collocations` | **verb + preposition** pairs (kafara-bi, akhadha-ʿalā …) |
| `ar_ling_form_paradigms` + `ar_ling_conjugation_templates` | **classical ṣarf** (past/present/maṣdar, forms I–X) |
| `ar_ling_lemma_morphology` | transitivity, form, derived forms per lemma |
| `ar_ling_root_scholarship` | **scholar gems** (Sinai key-term, Mir idiom notes), per root |

### 4b. Existing populated tables to LINK into (never copy)
- `ar_ling_near_synonym_sets` (746) / `ar_ling_near_synonym_members` (3267) → near-synonyms.
- `ar_ling_expressions` (2188) → verbal idioms; **ingest Mir** as a new source edition here.
- `ar_ling_lemmas` (78,886), `ar_ling_lexicon_root_entries`, `ar_ling_lexicon_blocks` (Five-Lens).

### 4c. NEW tables to add (no canonical home)
```sql
-- Membean-style memory hooks, 1 per sense (+ optional per-root).
ar_ling_vocab_memory_hooks(
  id, scope_type('root'|'sense'), scope_ref, root_norm, sense_id,
  hook_md, anchors_json, sound_link, mnemonic_kind, status, created_at)

-- Visual associations (Membean image) per root/sense.
ar_ling_vocab_illustrations(
  id, scope_type, scope_ref, root_norm, sense_id,
  title, caption_md, svg_inline, asset_url, palette, status, created_at)

-- Root semantic-field diagrams (constellation / range-of-meaning / contrast).
ar_ling_vocab_diagrams(
  id, root_norm, diagram_kind('constellation'|'range'|'contrast'|'sarf_tree'),
  spec_json, renderer_key, svg_cache, status, created_at)

-- Membean assessment bank: varied question types per sense.
ar_ling_vocab_exercises(
  id, scope_type, scope_ref, root_norm, sense_id,
  exercise_kind('def_mcq'|'cloze'|'synonym'|'antonym'|'choose_word'|'sarf'|'spelling'),
  prompt_md, options_json, answer_key, qr_ref, difficulty, source_ref, status)

-- EXTEND ar_ling_vocab_srs: multi-scope + Membean mastery state.
ALTER ar_ling_vocab_srs ADD scope_type('root'|'sense'), scope_ref, sense_id,
  mastery_state('new'|'growing'|'well_learned') DEFAULT 'new', strength REAL DEFAULT 0;
  -- one card per ROOT and one per SENSE; "allow some forgetting" → stretch interval
```

### 4d. Trim the duplicating columns
`ar_ling_vocab_depth.{near_synonyms_json, antonyms_json, idioms_json}` are kept
only as a **denormalized read cache**; the canonical rows live in
`near_synonym_members` / `sense_relations` / `expressions`. Keep in `vocab_depth`:
transitivity, maṣādir, **prep_meanings**, nuance_gems, key_term_synthesis, sources.

---

## 5. Seed pipeline (ordered, per root — reproducible)
1. **Retrieve** all lexica (AL) + all tafsīr & iʿrāb (QR) for the root's verses →
   write `ar_ling_lexicon_*` / `qr_evidence_items` (provenance + dispute).
2. **Senses**: extract distinct senses → `ar_ling_senses` (with qr_ref per sense).
3. **Five-Lens**: synthesize → `lexicon_blocks` (canonical per-root) + `root_vocab`.
4. **Ṣarf**: attach/ð reuse `form_paradigms` (wazn) + `conjugation_templates`
   (past/present/maṣdar) + `lemma_morphology` (transitivity).
5. **Per sense**: 1 `vocab_memory_hooks` + 1 `vocab_srs` (scope=sense, mastery=0)
   + near-synonyms (`near_synonym_members`) + antonyms (`sense_relations`).
6. **Idioms**: link/ingest `ar_ling_expressions` (Mir) with qr_refs.
7. **Gems**: `ar_ling_root_scholarship` (Sinai key-term, Mir notes), per root.
8. **Media**: `vocab_illustrations` (per sense) + `vocab_diagrams` (constellation/contrast).
9. **Exercises**: generate `vocab_exercises` per sense (the 6 question kinds).
10. **Bridge**: `ar_ling_quran_links` for each occurrence (this surah + cross-surah).
    A new surah using a done root only adds links + examples — it **enhances** the
    one reference.

---

## 6. Key-verse nuance + scholar gems
- **Key-verse nuance** (per mufassir): `qr_ss_scope_reading` (synthesis) + word/clause
  `qr_ss_scope_nuance`, evidence per mufassir — already the per-word synthesis path.
- **Scholar gems** (Sinai, Mir, Rāzī subtleties): `ar_ling_root_scholarship` (root-level)
  and `qr_ss_scope_nuance` (verse-level), each attributed.

---

## 7. km_quran schema drift to fix (found in audit)
D1 has 13 tables missing from `workers/quran/schema.sql`: `qr_study_questions`,
`qr_iraab_book_display_*` (6), `qr_tafsir_book_display_*` (6); and schema.sql has
`qr_surah_register_shifts` absent from D1. → regenerate schema.sql from D1.

---

## 8. Completion test (a root is "done")
One query assembles, from **tables only**: Five-Lens (5 blocks) · classical ṣarf
(past/present/maṣdar + forms) · every sense with 1 memory hook + 1 SRS card ·
near-synonyms (linked) · antonyms (sense_relations) · verbal idioms (Mir) ·
nuance gems + key-term (Sinai) · illustration + constellation diagram · exercises ·
root-level SRS · and every cross-surah occurrence link — with nothing living only
in HTML or task_json.
