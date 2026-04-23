# K-MAPS v2 — Multi-DB Microservices Topology
> Canonical architecture reference — 2026-04-20 (revised 2026-04-20)
> Single source of truth for module database ownership, table catalogs,
> cross-module refs, and worker binding strategy.

---

## 1. Architecture Overview

K-MAPS v2 uses **7 independent Cloudflare D1 databases** — one per module.
Each database is the single canonical owner of its module's tables.
There are **no SQL foreign keys across database boundaries**.
All cross-module links use **typed string references** (`MODULE:ULID`)
validated at the Worker service layer.

```
┌──────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Angular 17+)                          │
│        /quran | /arabic | /worldview | /planner | /workspace | /hub  │
└─────────────────────────┬────────────────────────────────────────────┘
                          │  HTTP/REST
┌─────────────────────────▼────────────────────────────────────────────┐
│              EXISTING PAGES FUNCTIONS / API COMPAT LAYER             │
│         Keeps current UI response shapes while migration runs         │
└─────────────────────────┬────────────────────────────────────────────┘
                          │  Worker-to-Worker calls only
┌─────────────────────────▼────────────────────────────────────────────┐
│                    DOMAIN WORKERS (one DB owner each)                 │
│ quran | ar-linguistics | arabic | worldview | content | planner | core│
└──┬──────┬──────┬──────┬──────┬──────┬──────┬─────────────────────────┘
   │      │      │      │      │      │      │
 DB_QR  DB_AL  DB_AR  DB_WV  DB_CM  DB_PL  DB_CORE
   │      │      │      │      │      │      │
 km_    km_    km_    km_    km_    km_    km_
 quran  arabic_ arabic world- content planner core
        ling-          view
        uistic
```

---

## 2. Module → Database Mapping (SETTLED 2026-04-20)

| Code | Module Name | D1 Database | Table Prefix | Worker Binding | Migration Dir |
|------|-------------|-------------|--------------|----------------|---------------|
| **QR** | Quran | `km_quran` | `qr_*` | `DB_QR` | `km-quran/` |
| **AL** | Arabic Linguistic | `km_arabic_linguistic` | `ar_ling_*` | `DB_AL` | `km-arabic-linguistic/` |
| **AR** | Arabic | `km_arabic` | `ar_*` | `DB_AR` | `km-arabic/` |
| **WV** | Worldview | `km_worldview` | `wv_*` | `DB_WV` | `km-worldview/` |
| **CM** | Content | `km_content` | `cm_*` | `DB_CM` | `km-content/` |
| **PL** | Planner | `km_planner` | `pl_*` | `DB_PL` | `km-planner/` |
| **CORE** | Core | `km_core` | `core_*` | `DB_CORE` | `km-core/` |

**Critical naming facts (do not revisit):**
- Module name is `km_arabic_linguistic` — singular, no trailing 's'
- AL uses a **single prefix `ar_ling_*`** for ALL tables — backbone (nahw, sarf,
  balagha, particles, analysis vocab registries) AND dictionary (roots, lemmas,
  lexicon entries, expressions, tokens). There is **NO `al_*` prefix**.
- `km_lexicon` is NOT a separate DB. There is no `DB_LX` binding.
- Legacy `LX:` typed refs in existing column names resolve to `DB_AL` for backward
  compat. All new code uses `AL:` typed refs.

---

## 3. AL is the Arabic Language Backbone

`km_arabic_linguistic` (`DB_AL`) is the **shared linguistic foundation** consumed
by both `km_quran` (QR) and `km_arabic` (AR). It is the single canonical owner of:

- **Sarf** (morphology): roots, root variants, morphological patterns, form paradigms
- **Nahw** (syntax grammar): concepts, rules, hierarchy, sentence types, clause types
- **Balagha** (rhetoric): bayan/maani/badi concepts, relations, definitional examples
- **Analysis vocabulary registries**: sentence kinds, clause types, clause functions,
  phrase types, phrase functions, syntax relation types, reading types, evidence types,
  nuance types, ellipsis types
- **Particle registry**: particle definitions, governance patterns (ʿAmil→maʿmūl)
- **Lexicon**: roots, lemmas, lexicon entries, senses, sense relations, expressions,
  tokens, collocations
- **Discipline trees**: nahw/sarf/balagha sub-discipline containers and units
- **Sources + embedding pipeline**: al-Alfiyya, Misbah, Mufassal chunks in Qdrant

**Rule**: Never duplicate sarf/nahw/balagha definitions in AR or QR.
Always point to AL via `AL:` typed refs.

---

## 4. Cross-Module Reference Format

### Typed String Refs

```
QR:01HW3XXXXXXXXXXXXXXXXXXX   ← Quran scope ULID
AL:01HY2XXXXXXXXXXXXXXXXXXX   ← Arabic Linguistic entity ULID
LX:01HY2XXXXXXXXXXXXXXXXXXX   ← Legacy alias → resolves to DB_AL (backward compat only)
AR:01HZ1XXXXXXXXXXXXXXXXXXX   ← Arabic learning entity ULID
WV:01JA3XXXXXXXXXXXXXXXXXXX   ← Worldview entity ULID
CM:01JB4XXXXXXXXXXXXXXXXXXX   ← Content entity ULID
PL:01JC5XXXXXXXXXXXXXXXXXXX   ← Planner entity ULID
CORE:01JD6XXXXXXXXXXXXXXXXXXX ← Core entity ULID
```

Quran scope shorthand (human-readable, in addition to ULID refs):
```
QR:2:255          ← surah 2, ayah 255
QR:2:255-257      ← surah 2, ayah range 255–257
QR:36             ← entire surah 36
```

### Worker Resolver Pattern

The old resolver pattern below is no longer allowed for domain Workers. A
domain Worker must bind only its own database. If it needs another domain, it
calls that domain Worker through a Cloudflare service binding or HTTP client.

Allowed:

```typescript
// workers/quran/src/env.ts
export interface QuranEnv {
  DB_QR: D1Database;
  AR_LINGUISTICS?: Fetcher;
  WORLDVIEW?: Fetcher;
}
```

Not allowed in a domain Worker:

```typescript
interface QuranEnv {
  DB_QR: D1Database;
  DB_AL: D1Database;   // cross-domain DB binding: forbidden
  DB_PL: D1Database;   // cross-domain DB binding: forbidden
}
```

The compatibility layer may keep current public routes, but it should also call
domain Workers instead of reading domain databases directly as each route is
migrated.

### Legacy Direct-DB Resolver Pattern

```typescript
// functions/_shared/typed-ref.ts

export function parseRef(ref: string): { module: string; id: string } {
  const colonIdx = ref.indexOf(':');
  return { module: ref.slice(0, colonIdx), id: ref.slice(colonIdx + 1) };
}

export function dbForModule(env: Env, module: string): D1Database {
  const map: Record<string, D1Database> = {
    QR:   env.DB_QR,
    AL:   env.DB_AL,   // km_arabic_linguistic — ar_ling_* tables
    LX:   env.DB_AL,   // legacy alias → DB_AL (resolves qr_ss_* column values)
    AR:   env.DB_AR,
    WV:   env.DB_WV,
    CM:   env.DB_CM,
    PL:   env.DB_PL,
    CORE: env.DB_CORE,
  };
  const db = map[module];
  if (\!db) throw new Error(`Unknown module ref: ${module}`);
  return db;
}

export async function resolveRef<T>(
  env: Env, ref: string, sql: string
): Promise<T | null> {
  const { module, id } = parseRef(ref);
  const db = dbForModule(env, module);
  return await db.prepare(sql).bind(id).first<T>() ?? null;
}
```

---

## 5. Complete Table Catalog

### 5.1 km_quran (QR) — 11-Layer Schema

#### Layer 1: Corpus Base
| Table | Description |
|-------|-------------|
| `qr_surahs` | 114 surahs — number, name, revelation type, ayah count |
| `qr_ayah` | 6,236 ayahs — text_uthmani_clean, text_bare, translation, verse_mark, page_number |
| `qr_word_occurrences` | **Single canonical owner** of all visible Quranic words (77,430+ rows) |
| `qr_lemmas` | Lemma registry linked from word_occurrences |
| `qr_lemma_occurrences` | Word ↔ Lemma mapping |
| `qr_translation_sources` | Translation source metadata |
| `qr_translations` | Per-ayah translations (multiple translators) |
| `qr_translation_passages` | Passage-level translations |
| `qr_page_layout_lines` | Mushaf page layout (line positions per page) |
| `qr_surah_ayah_meta` | Per-ayah metadata (sajdah, hizb, juz, etc.) |

#### Layer 2: Surah Organism
| Table | Description |
|-------|-------------|
| `qr_surah_profiles` | Governing movement, central claim, opening/closure force |
| `qr_surah_atomic_profiles` | Atomic center, structural type, resolution pattern |
| `qr_surah_passages` | Canonical meso-level passage segments |
| `qr_surah_openings` | Fatihah analysis (opening type, rhetorical force) |
| `qr_surah_closures` | Khatimah analysis (closure type, echo_of_opening) |
| `qr_surah_structural_pivots` | Topic turns, addressee shifts, rhetorical climaxes |

#### Layer 3: Structure Science
| Table | Description |
|-------|-------------|
| `qr_surah_structure_units` | Compositional blocks (A/B/C/A_prime/center/bridge/coda) |
| `qr_surah_structure_links` | Internal bridges: mirror/echo/contrast/anticipation |
| `qr_surah_structure_readings` | Alternative structure maps (ring, Farahi, Islahi, etc.) |
| `qr_surah_symmetry_patterns` | Ring (ABCCBA), mirror panel, parallel pairs |
| `qr_surah_diamond_patterns` | Diamond, cross-balanced, hourglass patterns |
| `qr_surah_sequence_patterns` | Linear escalation, staircase, alternating patterns |
| `qr_surah_motif_clusters` | Semantic constellations (covenant cluster, light-darkness, etc.) |
| `qr_surah_coherence_signals` | Lexical return, root concentration, opening-closure echo |

#### Layer 4: Literary + Sonic Architecture
| Table | Description |
|-------|-------------|
| `qr_surah_topic_flows` | Semantic topic progression (introduce/develop/escalate/contrast/conclude) |
| `qr_surah_rhetoric_profiles` | Dominant mode, clause density, emphasis patterns, suspension use |
| `qr_surah_fawasil_patterns` | Rhyme endings — dominant rhyme, rhyme family, density |
| `qr_surah_discourse_shifts` | Addressee shifts, mode changes, genre transitions |
| `qr_surah_iltifat_events` | Person/number/tense shifts (التفات) with rhetorical force |

#### Layer 5: Meaning Profiles
| Table | Description |
|-------|-------------|
| `qr_topic_registry` | Canonical topic labels (topic_key slug) |
| `qr_scope_topics` | Per-scope topic assignments (surah/passage/ayah_range) |
| `qr_surah_theme_profiles` | Primary + secondary themes, theological/ethical axis |
| `qr_surah_theology_profiles` | Divine attributes, prophethood, eschatology, cosmology |
| `qr_surah_worldview_profiles` | Anthropology, value architecture, moral universe |

#### Layer 6: Linguistic Nuance (qr_ss_* stack)
| Table | Description |
|-------|-------------|
| `qr_ss_occ_segment` | Sub-word elements: particles, articles, pronouns — NOT words |
| `qr_ss_occ_sentence` | Sentence occurrences (lx_sentence_kind_ref → AL: typed ref) |
| `qr_ss_occ_clause` | Clause occurrences, recursive parent_clause_id (lx_clause_type_ref → AL:) |
| `qr_ss_occ_phrase` | Phrase occurrences with head_word_id (lx_phrase_type_ref → AL:) |
| `qr_ss_scope_member_map` | Word ↔ Scope membership (UNIQUE on word + scope_type + scope_id) |
| `qr_ss_scope_relations` | Scope ↔ Scope relations (lx_relation_ref → AL:) |
| `qr_ss_syntax_relations` | UD-style dependency (head_word_id → dep_word_id) |
| `qr_ss_scope_morph_link` | Irab application: position, sign, syntactic function, is_disputed |
| `qr_ss_scope_grammar_link` | Grammar rule link (lx_grammar_ref → AL: ar_ling_nahw_concepts) |
| `qr_ss_scope_balagha_link` | Rhetoric link (lx_balagha_ref → AL: ar_ling_balagha_concepts) |
| `qr_ss_scope_nuance` | Discourse force, emphasis, suspension, ellipsis signals |
| `qr_ss_ellipsis_event` | Ellipsis (ḥadhf) events with type + interpretation |
| `qr_ss_scope_reading` | Alternative analysis readings (scholar + paradigm) |
| `qr_ss_scope_reading_evidence_link` | Evidence for a reading |
| `qr_ss_tree` | Constituency/dependency/LF-semantic tree registry |
| `qr_ss_tree_node` | Tree nodes (scope anchors with depth + label) |
| `qr_ss_tree_edge` | Parent→child edges within tree |
| `qr_ss_tree_layout_cache` | D3-ready layout JSON (downstream projection, is_stale flag) |
| `qr_surah_clause_patterns` | Surah-level dominant clause type rollups |
| `qr_surah_register_shifts` | Formal/informal/liturgical register shifts |
| `qr_surah_ellipsis_patterns` | Surah-level ellipsis frequency + patterns |

> **Critical qr_ss_* rules:**
> - `qr_word_occurrences` = single owner of visible words. Never create `qr_ss_occ_word`.
> - Populate `qr_ss_occ_*` + `qr_ss_scope_member_map` BEFORE generating `qr_ss_tree_*`.
> - Tree rows are downstream projections only.
> - All `lx_*_ref` column values carry `AL:` typed refs (legacy column names use `lx_` prefix
>   but the string values are `AL:ULID`).

#### Layer 7: Reasoning + Evidence
| Table | Description |
|-------|-------------|
| `qr_analysis_scopes` | Polymorphic anchor for any QR target |
| `qr_analysis_claims` | Analytical claims (confidence: proposed→classical_consensus) |
| `qr_analysis_claims_fts` | FTS5 virtual table |
| `qr_scope_nuances` | Qualifications, tensions, ambiguities, limits |
| `qr_evidence_items` | Typed evidence (quran_passage through radiocarbon, manuscript, inscription) |
| `qr_evidence_items_fts` | FTS5 virtual table |
| `qr_claim_evidence_links` | Claim ↔ Evidence (supports/contradicts/qualifies) |
| `qr_arguments` | Structured arguments (claims_json + evidence_ids_json) |
| `qr_argument_relations` | Argument ↔ Argument (supports/refutes/synthesizes/reframes) |
| `qr_debate_clusters` | Debate groupings (theological/legal/linguistic/manuscript) |

#### Layer 8: Tafsir + Reception
| Table | Description |
|-------|-------------|
| `qr_tafsir_entries` | Per-scope tafsir (scholar + surah + ayah_from/ayah_to) |
| `qr_scholar_profiles` | Scholar biographies (era, madhab, kalam_school) |
| `qr_scholar_works` | Scholar's works |
| `qr_scholarly_paradigms` | Paradigm types (classical_tafsir → radiocarbon_material) |
| `qr_scholar_paradigm_links` | Scholar ↔ Paradigm |
| `qr_scholar_positions` | Scholar positions on scopes (FTS5 indexed) |
| `qr_surah_reception_histories` | Interpretive history summaries |
| `qr_interpretive_differences` | Points of scholarly disagreement |
| `qr_material_witnesses` | Manuscripts, inscriptions, codices, palimpsests |
| `qr_material_witness_observations` | Codicological/palaeographic/radiocarbon observations |

#### Layer 9: Cross-Surah + Comparative
| Table | Description |
|-------|-------------|
| `qr_surah_relations` | Surah ↔ Surah relations |
| `qr_quran_bil_quran_relations` | Quran-internal intertextual links |
| `qr_tradition_sources` | Non-Quranic parallel tradition sources |
| `qr_comparative_claims` | Claims comparing Quran to other traditions |
| `qr_civilizational_claims` | Quran's engagement with civilizational ideas |

#### Layer 10: Projections
| Table | Description |
|-------|-------------|
| `qr_worldview_nodes` | QR-owned worldview concept nodes (outward projection only) |
| `qr_worldview_edges` | QR worldview graph edges |
| `qr_diagram_specs` | D3/Mermaid diagram spec templates |
| `qr_diagram_instances` | Rendered diagram instances (payload_json, is_stale) |
| `qr_doc_links` | QR scope → CM document typed ref |
| `qr_surah_analysis_cache` | Denormalized surah analysis summaries |
| `qr_passage_analysis_cache` | Denormalized passage analysis summaries |

#### Layer 11: Outer Horizon
| Table | Description |
|-------|-------------|
| `qr_context_topics` | Late antique / inter-scriptural / Arabian milieu topics |
| `qr_context_topic_links` | QR scope ↔ Context topic |
| `qr_context_claims` | Claims about historical/textual context |
| `qr_context_evidence_items` | Evidence for context claims |
| `qr_context_evidence_links` | Context claim ↔ Evidence |
| `qr_historical_context_profiles` | Per-surah historical context summaries |
| `qr_academic_question_registry` | Formal academic questions (manuscript/epigraphy/archaeology) |
| `qr_academic_positions` | Scholarly positions on academic questions |

---

### 5.2 km_arabic_linguistic (AL) — Arabic Language Backbone

> **Single prefix `ar_ling_*`. No `al_*` prefix.** Shared by QR (via typed refs in
> qr_ss_* columns), AR (vocab/grammar typed refs), and the AI embedding pipeline.

#### Layer 1: Root Science
| Table | Description |
|-------|-------------|
| `ar_ling_roots` | Arabic roots (root_text UNIQUE, root_letters, frequency_quran) |
| `ar_ling_root_variants` | Orthographic / dialectal variants |
| `ar_ling_root_relations` | Root ↔ Root (cognate, derivative, related, contrasted) |
| `ar_ling_root_semantic_fields` | Root → semantic domain mapping |

#### Layer 2: Lemma Science
| Table | Description |
|-------|-------------|
| `ar_ling_lemmas` | Lemmas (root_id, part_of_speech, verb_form) |
| `ar_ling_lemma_variants` | Plural forms, broken plurals, duals |
| `ar_ling_lemma_root_links` | Lemma ↔ Root links (primary/secondary/disputed) |
| `ar_ling_lemma_registers` | Lemma → register (quranic/classical/msa/dialectal) |

#### Layer 3: Sarf / Morphology
| Table | Description |
|-------|-------------|
| `ar_ling_morphology` | Morphological patterns (gender, number, case, tense, derivation) |
| `ar_ling_lemma_morphology` | Lemma ↔ Morphology junction |
| `ar_ling_form_paradigms` | Verb/noun conjugation paradigms (pattern + root → full paradigm) |
| `ar_ling_inflection_rules` | Irregular inflection rules |
| `ar_ling_conjugation_templates` | Template rows for exercise generation |

#### Layer 4: Nahw / Syntax Grammar
| Table | Description |
|-------|-------------|
| `ar_ling_nahw_concepts` | Nahw concepts (concept_key slug, parent_id recursive, category) |
| `ar_ling_nahw_relations` | Concept ↔ Concept relations |
| `ar_ling_sentence_types` | Jumlah ismiyyah / fi'liyyah / shart / nida / istifham, etc. |
| `ar_ling_clause_types` | Main, subordinate, relative, conditional, adverbial, etc. |
| `ar_ling_phrase_types` | Noun phrase, verb phrase, prep phrase, adj phrase, adv phrase |

#### Layer 5: Balagha / Rhetoric
| Table | Description |
|-------|-------------|
| `ar_ling_balagha_concepts` | Rhetoric terms (bayan/maani/badi category, definition) |
| `ar_ling_balagha_branches` | Sub-discipline branches within each balagha category |
| `ar_ling_rhetorical_relations` | Term ↔ Term relations |
| `ar_ling_balagha_examples` | Definitional Quranic/classical examples |

#### Layer 6: Lexicon / Semantics
| Table | Description |
|-------|-------------|
| `ar_ling_lexicon_entries` | Dictionary entries with definitions (FTS5 indexed) |
| `ar_ling_senses` | Polysemy: distinct senses per lemma |
| `ar_ling_sense_relations` | Sense ↔ Sense (synonym/antonym/hyponym/meronym) |
| `ar_ling_semantic_fields` | Semantic field groupings |
| `ar_ling_near_synonym_sets` | Near-synonym clusters with nuance notes |

#### Layer 7: Expressions + Collocations
| Table | Description |
|-------|-------------|
| `ar_ling_expressions` | Idiomatic expressions and collocates |
| `ar_ling_expression_tokens` | Token slots within an expression pattern |
| `ar_ling_expression_types` | Expression type registry (idiom/proverb/collocation/etc.) |
| `ar_ling_collocations` | Statistical collocations (lemma_a ↔ lemma_b + weight) |

#### Layer 8: Sources + Evidence
| Table | Description |
|-------|-------------|
| `ar_ling_sources` | Linguistic source texts (grammar books, lexicons, sharh) |
| `ar_ling_source_editions` | Edition metadata per source |
| `ar_ling_source_chunks` | Text chunks for embedding (is_embedded, qdrant_id, chunk_kind) |
| `ar_ling_source_chunks_fts` | FTS5 virtual table |
| `ar_ling_source_index` | Chapter/section navigation index |
| `ar_ling_source_toc` | Table of contents per source |
| `ar_ling_evidence_items` | Quranic + classical evidence for lemmas/concepts |

#### Layer 9: Disciplinary Trees
| Table | Description |
|-------|-------------|
| `ar_ling_discipline_containers` | Nahw/sarf/balagha sub-discipline groupings |
| `ar_ling_discipline_units` | Units within a sub-discipline |
| `ar_ling_discipline_relations` | Prerequisite/part-of/related-to relations |

#### Layer 10: Bridges + Projections
| Table | Description |
|-------|-------------|
| `ar_ling_quran_links` | AL entity → QR typed ref (concept illustrated in Quran) |
| `ar_ling_arabic_links` | AL entity → AR typed ref (concept used in learning) |
| `ar_ling_content_links` | AL entity → CM typed ref (concept documented in CM) |
| `ar_ling_projection_cache` | Denormalized AL entity summaries for widget use |

#### Analysis Vocabulary Registries
These lookup tables are consumed by the `qr_ss_*` layer via `AL:` typed refs:

| Table | Values |
|-------|--------|
| `ar_ling_analysis_sentence_kinds` | jumlah_ismiyyah, fi'liyyah, shart, nida, istifham, etc. |
| `ar_ling_analysis_clause_types` | main, subordinate, relative, conditional, adverbial, etc. |
| `ar_ling_analysis_clause_functions` | subject, predicate, object, modifier, appositive, etc. |
| `ar_ling_analysis_phrase_types` | noun_phrase, verb_phrase, prep_phrase, adj_phrase, adv_phrase |
| `ar_ling_analysis_phrase_functions` | head, modifier, complement, specifier, adjunct |
| `ar_ling_analysis_syntax_relation_types` | subject, object, predicate, badal, na't, hal, tamyiz, etc. |
| `ar_ling_analysis_reading_types` | mainstream, minority, contested, historical, paradigm_specific |
| `ar_ling_analysis_evidence_types` | text_internal, lexical, structural, scholarly, manuscript |
| `ar_ling_analysis_nuance_types` | discourse_force, emphasis, suspension, contrast, ellipsis |
| `ar_ling_analysis_ellipsis_types` | mubtada_mahdhuf, khabar_mahdhuf, maf'ul_mahdhuf, fi'l_mahdhuf |

#### Particle Registries
| Table | Description |
|-------|-------------|
| `ar_ling_particles` | Particle definitions (particle_text, particle_type, grammatical_effect) |
| `ar_ling_governance_patterns` | ʿAmil → maʿmūl governance rules |

---

### 5.3 km_arabic (AR) — Arabic Learning System (33 tables)

> AR owns the **learning layer** only. All canonical linguistic truth lives in AL.
> AR tables carry `al_lemma_ref`, `al_nahw_ref`, `al_balagha_ref` typed refs pointing to `DB_AL`.

| Table | Description |
|-------|-------------|
| `ar_learning_tracks` | Curriculum tracks (quranic-arabic, classical, msa, sarf, nahw, balagha) |
| `ar_curricula` | Structured curricula (track + proficiency level) |
| `ar_curriculum_units` | Units within a curriculum |
| `ar_containers` | Study containers (courses, modules, book campaigns) |
| `ar_container_units` | Units within containers (lessons, grammar units, vocab sets) |
| `ar_container_unit_tasks` | Tasks within units (kanban_state, priority, step_no) |
| `ar_vocabulary` | Learner-facing vocabulary (`al_lemma_ref → AL:`) |
| `ar_vocabulary_evidence` | Quranic examples for vocabulary items |
| `ar_vocabulary_relations` | Synonym/antonym/root_family relations |
| `ar_unit_vocabulary_map` | Unit ↔ Vocabulary membership |
| `ar_grammar` | Applied grammar rules (`al_nahw_ref → AL:`) |
| `ar_grammar_vocabulary_links` | Grammar ↔ Vocabulary |
| `ar_unit_grammar_map` | Unit ↔ Grammar membership |
| `ar_applied_balagha` | Applied rhetoric examples (`al_balagha_ref → AL:`) |
| `ar_domains` | Context domains (quran, hadith, fiqh, literature, daily_life, academic, news, theology) |
| `ar_scenarios` | Learning scenarios within a domain |
| `ar_domain_phrases` | Domain phrases with audio URL and difficulty |
| `ar_lessons` | Structured lesson content (markdown body, Tiptap-compatible) |
| `ar_exercises` | Exercises (multiple_choice/fill_blank/translation/irab/parse/dictation) |
| `ar_exercise_attempts` | Per-user exercise attempt log |
| `ar_srs_decks` | SRS deck groupings (per-user) |
| `ar_srs_cards` | SRS cards (FSRS: stability, difficulty, scheduled_days, reps, lapses, card_state) |
| `ar_srs_reviews` | Review log (rating 1–4, scheduled_days, elapsed_days) |
| `ar_mastery_profiles` | Per-user mastery snapshots (vocab_mastered, grammar_mastered, streak) |
| `ar_user_track_profiles` | User ↔ Track enrolment (proficiency, started_at, completed_at) |
| `ar_unit_progress` | Unit progress per user (progress_pct, status) |
| `ar_task_completions` | Task completion log (score, time_spent_ms) |
| `ar_expressions` | Idioms, phrases, proverbs |
| `ar_classes` | Class delivery groups (curriculum + workspace_ref) |
| `ar_class_enrolments` | Student enrolments in a class |
| `ar_class_resources` | Resources assigned to a class |
| `ar_class_assignments` | Assignments (due_date, max_score, resource_type) |
| `ar_assignment_submissions` | Student submissions and scores |

---

### 5.4 km_worldview (WV) — Comparative Religion Research (141+ tables)

WV is a full **civilizational reasoning engine**. Key families:

| Family | Core Tables |
|--------|-------------|
| **Traditions** | `wv_worldviews`, `wv_tradition_relationships`, `wv_worldview_sources` |
| **Topics** | `wv_topics`, `wv_topic_relations`, `wv_topic_worldview_map` |
| **Moral ontology** | `wv_domains`, `wv_moral_axes`, `wv_virtue_profiles`, `wv_vice_profiles`, `wv_prophetic_episodes`, `wv_prophetic_virtues` |
| **Covenant + sacrifice** | `wv_covenant_frameworks`, `wv_covenant_clauses`, `wv_sacrifice_frameworks`, `wv_sacrifice_motifs` |
| **Modernity** | `wv_modernity_streams`, `wv_modernity_tradition_maps`, `wv_secularization_theses` |
| **Adversarial** | `wv_adversarial_patterns`, `wv_adversarial_tactics`, `wv_adversarial_examples` |
| **Coloniality** | `wv_colonial_projects`, `wv_colonial_phases`, `wv_colonial_effects`, `wv_decolonial_responses` |
| **People + sources** | `wv_people`, `wv_sources`, `wv_source_units`, `wv_source_details`, `wv_source_people` |
| **Reading + capture** | `wv_reading_sessions`, `wv_highlights`, `wv_notes`, `wv_note_relations` |
| **Comparison grids** | `wv_comparisons`, `wv_comparison_tabs`, `wv_comparison_rows`, `wv_comparison_cells` |
| **Knowledge graph** | `wv_nodes`, `wv_node_edges`, `wv_node_quran_links`, `wv_node_tafsir_links` |
| **Brainstorm** | `wv_brainstorm_sessions`, `wv_brainstorm_refs` |
| **Timeline** | `wv_events`, `wv_event_types`, `wv_timeline_views`, `wv_timeline_view_events` |
| **AI pipeline** | `wv_source_chunks`, `wv_distillations`, `wv_distill_batches`, `wv_insight_suggestions`, `wv_insight_decisions` |
| **Documents** | `wv_documents`, `wv_document_versions`, `wv_document_blocks`, `wv_block_node_links` |

---

### 5.5 km_content (CM) — Unified Authored Artifact Engine (27 tables)

CM is the **custody layer** for every artifact humans write, annotate, publish, and link.
Access governed by `policy_ref` → `DB_CORE.core_resource_policies`. No document-local
visibility booleans.

| Layer | Tables |
|-------|--------|
| **1. Sources** | `cm_sources`, `cm_source_details`, `cm_source_toc`, `cm_source_units`, `cm_source_chunks` |
| **2. Documents + Blocks** | `cm_documents`, `cm_document_versions`, `cm_blocks`, `cm_block_refs`, `cm_block_embeds` |
| **3. Notes + Capture** | `cm_notes`, `cm_note_targets`, `cm_capture_entries`, `cm_capture_links` |
| **4. Highlights + Comments** | `cm_highlights`, `cm_comments`, `cm_comment_reactions` |
| **5. Media** | `cm_media_assets`, `cm_media_transcripts`, `cm_audio_scenes`, `cm_media_chapters` |
| **6. Publications** | `cm_publications`, `cm_share_links`, `cm_distributions` |
| **7. Collections** | `cm_collections`, `cm_collection_items` |
| **8. Cross-module links** | `cm_resource_links` |
| **FTS5** | `cm_fts_sources`, `cm_fts_source_units`, `cm_fts_documents`, `cm_fts_notes`, `cm_fts_captures`, `cm_fts_media` |

Key design rules:
- `cm_block_refs.target_ref` carries any typed ref (`QR:` | `AL:` | `AR:` | `WV:` | `PL:` | `CM:`)
- `cm_share_links.token` IS the access grant — no per-document visibility fields
- `cm_source_chunks` mirrors WV/AL pipeline pattern (is_embedded, qdrant_id, embed_model)
- `cm_note_targets` allows one note to annotate multiple typed resources (m-to-m)

---

### 5.6 km_planner (PL) — Operational Study Planner (19 tables)

PL owns study plans, sessions, calendar, and kanban. Points OUTWARD to canonical
resources via typed refs. Does NOT copy Quranic semantics.

| Table | Description |
|-------|-------------|
| `pl_plans` | Study plans (workspace_ref, scope, priority) |
| `pl_plan_scopes` | Carve canonical resources into planning envelopes (resource_ref → typed ref) |
| `pl_plan_items` | Tasks within plans (kanban_state, priority, due_date) |
| `pl_task_resources` | Task → canonical content typed refs (CM:, AR:, QR:, WV:, AL:) |
| `pl_task_assignees` | Per-user task assignments (workspace_ref) |
| `pl_task_dependencies` | Task → Task dependency graph (blocks/blocked_by) |
| `pl_lanes` | Kanban lane definitions (pending/in_progress/done/skipped, wip_limit) |
| `pl_lane_items` | Current lane membership per task |
| `pl_packets` | Work bundles for class delivery or team sprints |
| `pl_packet_items` | Task items within a packet |
| `pl_sessions` | Study sessions (actual_start/end, mood, productivity 1–5) |
| `pl_session_item_logs` | Session ↔ Plan item completion log |
| `pl_goals` | Learning goals (pages_per_day, vocab_per_day, juz_per_month) |
| `pl_goal_snapshots` | Daily goal progress snapshots |
| `pl_calendar_entries` | Date-level calendar entries (scheduled/recurring/deadline/milestone) |
| `pl_streaks` | Daily streak tracking (current_streak, longest_streak) |
| `pl_plan_templates` | Reusable plan scaffolds (seeded: quran-30-days, arabic-beginner, worldview-research) |
| `pl_review_cycles` | Periodic review cycles (weekly/monthly/quarterly) |
| `pl_review_events` | Individual review events within a cycle |

---

### 5.7 km_core (CORE) — Identity + Policy Substrate (24 tables)

CORE is the identity and policy authority for the entire platform. No domain-specific tables.

| Table | Description |
|-------|-------------|
| `core_users` | User accounts (email UNIQUE, role, status, preferences_json) |
| `core_auth_sessions` | Auth sessions (session_token UNIQUE, device_info, expires_at) |
| `core_auth_tokens` | API tokens + OAuth tokens (token_type: api_key/oauth/magic_link) |
| `core_workspaces` | Workspace registry (owner_id, workspace_type, settings_json) |
| `core_workspace_members` | Member enrollment (role: owner/admin/member/viewer/guest) |
| `core_workspace_groups` | Sub-groups within workspaces (study_circle/reading_group/etc.) |
| `core_workspace_group_members` | Group membership |
| `core_workspace_roles` | Custom RBAC roles (permissions_json) |
| `core_workspace_member_roles` | Member ↔ Custom role |
| `core_workspace_policies` | Default policies per workspace (overridden per-resource) |
| `core_resource_policies` | **Governing policy per resource_ref** — visibility_scope + publication_state as orthogonal axes |
| `core_resource_grants` | Explicit access exceptions (user_ref, expires_at, inheritance_break) |
| `core_people` | Personal contacts (visibility: private/workspace) |
| `core_external_refs` | Legacy-to-new typed ref continuity table |
| `core_podcasts` | Workspace audio/video sessions |
| `core_podcast_participants` | Participants (person_id or typed person_ref) |
| `core_talking_points` | Podcast segment markers (timestamp_secs, qr_scope_ref) |
| `core_notifications` | User notifications (notif_type, is_read, action_url) |
| `core_activity_events` | Cross-module activity feed (entity_type, entity_ref, is_public) |
| `core_review_queue` | Hub-level review queue (source_module, source_ref, priority, status) |
| `core_srs_registry` | Cross-module SRS coordination (card_ref, due_date) |
| `core_feature_flags` | Feature flags (is_enabled, enabled_for_json) |
| `core_platform_config` | Key-value platform configuration |
| `core_audit_log` | Immutable audit trail (actor_ref, action, target_ref, diff_json) |

> **Policy model**: `core_resource_policies` governs every platform resource.
> `visibility_scope` ('private'|'workspace'|'link_share'|'public') and
> `publication_state` ('draft'|'review'|'published'|'archived'|'rejected') are
> **orthogonal** axes. The inheritance chain is:
> workspace default → collection default → item policy → explicit grant.

---

## 6. Worker Binding Strategy

Each Worker declares only the database bindings it actually needs:

```typescript
// functions/qr/_middleware.ts
// QR Workers: primary DB + AL for lexical lookups via AL: typed refs
interface Env { DB_QR: D1Database; DB_AL: D1Database; }

// functions/al/_middleware.ts
// AL Workers: self-contained — the backbone has no cross-DB deps
interface Env { DB_AL: D1Database; }

// functions/ar/_middleware.ts
// AR Workers: learning layer + AL (grammar/vocab registries) + QR (Quran refs)
interface Env { DB_AR: D1Database; DB_AL: D1Database; DB_QR: D1Database; }

// functions/wv/_middleware.ts
// WV Workers: worldview + CM (document cross-links)
interface Env { DB_WV: D1Database; DB_CM: D1Database; }

// functions/pl/_middleware.ts
// PL Workers: planner + QR (passage/surah scope refs)
interface Env { DB_PL: D1Database; DB_QR: D1Database; }

// functions/core/_middleware.ts
// CORE Workers: identity + policy — self-contained
interface Env { DB_CORE: D1Database; }

// functions/cm/_middleware.ts
// CM Workers: content + WV (node links) + QR (Quran embeds) + CORE (policy lookup)
interface Env { DB_CM: D1Database; DB_WV: D1Database; DB_QR: D1Database; DB_CORE: D1Database; }
```

---

## 7. wrangler.toml Multi-DB Configuration

```toml
name = "k-maps-v2"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB_QR"
database_name = "km_quran"
database_id = "<qr-db-uuid>"

[[d1_databases]]
binding = "DB_AL"
database_name = "km_arabic_linguistic"
database_id = "<al-db-uuid>"
# Single prefix: ar_ling_* for ALL tables (backbone + dictionary)
# LX: typed refs also resolve to DB_AL (legacy backward compat)

[[d1_databases]]
binding = "DB_AR"
database_name = "km_arabic"
database_id = "<ar-db-uuid>"

[[d1_databases]]
binding = "DB_WV"
database_name = "km_worldview"
database_id = "<wv-db-uuid>"

[[d1_databases]]
binding = "DB_CM"
database_name = "km_content"
database_id = "<cm-db-uuid>"

[[d1_databases]]
binding = "DB_PL"
database_name = "km_planner"
database_id = "<pl-db-uuid>"

[[d1_databases]]
binding = "DB_CORE"
database_name = "km_core"
database_id = "<core-db-uuid>"
```

---

## 8. Migration Strategy: Single DB → Multi-DB

Current state: all legacy tables in the `knowledgemap` D1 database.
Target: each module in its own dedicated D1 database.

### Phase 1 (Done): QR Rename
```bash
wrangler d1 execute knowledgemap \
  --file=database/migrations/legacy/2026-04-20_phase1_qr_rename.sql --remote
# Renamed: 22 ar_quran_* → qr_* tables + 23 compat views
```

### Phase 2 (Done): LX → ar_ling_* Rename
```bash
wrangler d1 execute knowledgemap \
  --file=database/migrations/legacy/2026-05-05_phase2_ling_rename.sql --remote
# Renamed: 18 ar_u_* → ar_ling_* tables + 19 compat views
```

### Phase 3: Provision New Databases
```bash
wrangler d1 create km_quran
wrangler d1 create km_arabic_linguistic
wrangler d1 create km_arabic
wrangler d1 create km_worldview
wrangler d1 create km_content
wrangler d1 create km_planner
wrangler d1 create km_core
```

### Phase 4: Run Schema Migrations (dependency order)
```bash
# 1. AL first — backbone has no cross-DB deps
wrangler d1 execute km_arabic_linguistic \
  --file=database/migrations/km-arabic-linguistic/001_al_schema.sql --remote

# 2. CORE second — identity substrate
wrangler d1 execute km_core \
  --file=database/migrations/km-core/001_core_schema.sql --remote

# 3. QR (references AL via typed refs)
wrangler d1 execute km_quran --file=database/migrations/km-quran/001_corpus_base.sql --remote
wrangler d1 execute km_quran --file=database/migrations/km-quran/002_surah_spine.sql --remote
wrangler d1 execute km_quran --file=database/migrations/km-quran/003_meaning_and_reasoning.sql --remote
wrangler d1 execute km_quran --file=database/migrations/km-quran/004_sentence_structure.sql --remote
wrangler d1 execute km_quran --file=database/migrations/km-quran/005_reception_and_projections.sql --remote

# 4. AR (references AL, QR)
wrangler d1 execute km_arabic \
  --file=database/migrations/km-arabic/001_ar_schema.sql --remote

# 5. WV (references QR, AL, CORE)
wrangler d1 execute km_worldview \
  --file=database/migrations/km-worldview/001_wv_schema.sql --remote

# 6. CM (references QR, WV, AL, AR, CORE)
wrangler d1 execute km_content \
  --file=database/migrations/km-content/001_cm_schema.sql --remote

# 7. PL (references all modules via typed refs)
wrangler d1 execute km_planner \
  --file=database/migrations/km-planner/001_pl_schema.sql --remote
```

### Phase 5: Data Migration
```bash
# Export from legacy DB
wrangler d1 export knowledgemap --output=legacy_dump.sql --remote
# Split by table prefix → per-module SQL files, then import:
wrangler d1 execute km_quran            --file=qr_data.sql --remote
wrangler d1 execute km_arabic_linguistic --file=ar_ling_data.sql --remote
# ... etc per module
```

### Phase 6: Worker Cutover
1. Update `wrangler.toml` with actual database_id values from Phase 3
2. Deploy Workers with module-specific bindings
3. Verify per module starting with QR (read-heavy, safest)
4. Retire compat views from legacy `knowledgemap` DB once all Workers confirmed

---

## 9. Privacy + Policy Model

```
core_people.visibility = 'private'   → FAMILY / PERSONAL ONLY
  - Never shown in workspace member pickers
  - Never visible to other workspace members
  - Owner-only access at all times

core_people.visibility = 'workspace' → FRIENDS / COLLEAGUES
  - Can be added to workspace member activities
  - Visible within that workspace only
  - Can be podcast participants

core_resource_policies governs ALL platform resources:
  visibility_scope:    private | workspace | link_share | public
  publication_state:   draft | review | published | archived | rejected
  (these two axes are ORTHOGONAL — not a combined enum)
  inherits_from_ref:   CORE:ULID chain resolution
```

---

## 10. Key Settled Decisions

| Decision | Rule |
|---|---|
| verse_mark | Plain Arabic-Indic digits (١٢٣) only; never U+06DD (renders as twin empty frames in UthmanicHafs) |
| qr_word_occurrences | SINGLE canonical owner of visible Quranic words; never create qr_ss_occ_word |
| qr_ss_* population order | qr_ss_occ_* + qr_ss_scope_member_map BEFORE qr_ss_tree_* rows |
| AL = Arabic backbone | sarf, nahw, balagha registries ALL in km_arabic_linguistic; QR and AR point to AL via AL: typed refs |
| AL prefix | Single prefix `ar_ling_*` for ALL AL tables — no `al_*` prefix anywhere |
| AL DB name | `km_arabic_linguistic` — singular, no trailing 's'. Binding: `DB_AL` |
| No DB_LX | km_lexicon does NOT exist. LX: refs resolve to DB_AL for backward compat only |
| Cross-module FKs | NONE. All cross-module links are typed string refs validated at Worker service layer |
| D1 FK enforcement | D1 does NOT enforce FKs at runtime (PRAGMA foreign_keys OFF by default). FKs are schema doc only |
| CORE policy model | visibility_scope and publication_state are ORTHOGONAL axes. No document-local visibility booleans |
| CM policy_ref | Every CM resource governed by a CORE policy row. Share links (tokens) are the access grant mechanism |
| Angular patterns | Standalone components, OnPush, signals (signal/computed/effect), GSAP for ALL animations |
| Hub data entry | ALL data entry happens in Hub right panel only. No standalone form routes |
| Privacy | core_people.visibility='private' is NEVER exposed outside owner. 'workspace' is scoped to that workspace only |

---
