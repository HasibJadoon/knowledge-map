---
title: Knowledge Map — Architecture
status: published
tags: architecture, d1, schema
order_index: 1
---

# Knowledge Map — Architecture 

This document explains the **architecture and database schema** for the K-Maps personal learning system.

- Storage: **SQLite / Cloudflare D1**
- Time: store timestamps as **ISO-8601 TEXT (UTC)** via `datetime('now')`
- Data model: most “real content” lives as **canonical JSON** in a few core tables, with a thin relational spine for indexing, linking, and analytics.
- Integrity: `PRAGMA foreign_keys = ON;`

---

## 1) What this system is

K-Maps is a **Qur’an-centered learning + worldview system** with two main streams:

1) **Arabic/Qur’an Study Stream**
   - Qur’an passages / Arabic literature lessons
   - Tokenization + sentence layer for precise search
   - Roots → Lexicon → token occurrences
   - Idioms + grammar applied to spans
   - SRS cards and review loops

2) **Worldview Stream**
   - Claims (“meaning nodes”) extracted from sources (Bible / Jubilees / books / papers / lectures)
   - Evidence anchoring + concept mapping
   - Cross references between Qur’an passages and external sources
   - Output as scripts / slides / articles / podcasts

Everything is designed to be:
- **Source-agnostic** (Qur’an, literature, books, video transcripts, etc.)
- **Queryable** (tokens, spans, anchors, edges)
- **Composable** (content items built from references)

---

## 2) Core design principles

### A) JSON is the canonical content format
Tables like `ar_lessons`, `wv_claims`, `wv_content_items`, `brainstorm_sessions` store **canonical JSON payloads** for maximum flexibility.

### B) Relational tables provide the “spine”
Relational tables give you:
- indexing + filters (status/type/user)
- stable linking across entities
- audit logs + activity timeline
- anchoring and graph edges

### C) Two layers for text
1) **Canonical lesson JSON** (rich, human-oriented)
2) **Text backbone** (sentence/token/span) for **search + linking** across sources

---

## 3) Entity map (high level)

**Users & state**
- `users`
- `user_state`
- `user_activity_logs`

**Arabic / Qur'an learning**
- `ar_lessons` (canonical JSON lesson)
- `ar_roots` + `ar_root_words`
- `ar_lexicon`
- `ar_grammatical_concepts`

**Worldview + library + production**
- `brainstorm_sessions`
- `library_entries`
- `wv_claims`
- `wv_content_items`
- `wv_content_library_links`

**Cross-linking graph**
- `wv_concepts`
- `wv_concept_anchors`
- `wv_cross_references`
- `wv_discourse_edges`

**Planning / execution**
- `sp_weekly_plans`
- `sp_weekly_tasks`
- `sp_sprint_reviews`
- `ar_reviews`

**Source-agnostic text backbone**
- `text_documents`
- `text_sentences`
- `text_tokens`
- `token_lexicon_links`
- `token_spans`
- `idioms`
- `idiom_instances`
- `grammar_instances`

**Docs / wiki**
- `docs` (markdown pages stored in DB)

---

## 4) Table-by-table purpose

### 4.1 Users, UI state, analytics

#### `users`
Stores authentication + role + preferences.
- `settings_json` holds user-level defaults (UI, study prefs)
- `role` supports admin/editor/user

#### `user_state`
Stores the user’s current workspace:
- what entity is open (`current_type`, `current_id`, `current_unit_id`)
- `focus_mode` (reading/extracting/memorizing/writing/reviewing)
- `state_json` stores UI state (filters, panes, scroll)

#### `user_activity_logs`
Append-only activity timeline:
- `event_type`: lesson_opened, extract_created, anchor_created, review_done, …
- `target_type/target_id` let you compute analytics and audit trails
- `event_json` holds context (snippet, tags, before/after, etc.)

---

### 4.2 Arabic study (roots → lexicon → lessons)

#### `ar_roots`
Master table for Arabic roots and card generation.
Key ideas:
- keep multiple romanization/search forms (`root_latn`, `root_norm`, `alt_latn_json`)
- keep study metadata (`difficulty`, `frequency`, `status`)
- `meta_json` captures auxiliary data (family, romanization sources, cards)

#### `ar_root_words`
Maps a root to locations (lightweight):
- `word_location` is your flexible locator (e.g. `DOC_QURAN_HAFS:12:23:TOK_05` or `12:23:5`)
This is optional once you have full token backbone, but still useful for quick root-to-occurrence mapping.

#### `ar_lexicon`
Derived forms / headwords linked to roots.
- `root_id` FK to `ar_roots`
- `morphology_json` holds wazn/masdars/features
- `cards_json` stores one or more SRS cards per entry

#### `ar_grammatical_concepts`
Your Arabic grammar KB:
- stable string IDs (`GRAM_NAHW_001`)
- categories: syntax/morphology/particle/rhetoric/discourse/semantics
- `examples_json` and `cards_json` support teaching + SRS

#### `ar_lessons`
Canonical lesson JSON for Qur’an/literature/linguistics:
- `lesson_type`: quran | literature | linguistics
- `lesson_json`: full structured payload (units, notes, vocab, MCQs, etc.)
This is your “human-facing learning object” layer.

---

### 4.3 Worldview stream + library + production

#### `brainstorm_sessions`
Raw thinking snapshots:
- stage: raw → structured → linked
- `session_json` can store multi-pane editing snapshots, highlights, extracts

#### `library_entries`
Everything you read/watch/listen to:
- entry_type: author/book/chapter/paper/video/podcast/episode/debate/organization/…
- `entry_json` can store canonical library payload
- `qa_json` stores your Q/A notes

#### `wv_claims`
Renamed from worldview_lessons: these are **meaning nodes**.
- `claim` JSON is the canonical object (assertion + qualifiers + evidence + counterpoints, etc.)
This is the “stable thesis/claim inventory.”

#### `wv_content_items`
Actual outputs you publish:
- types: podcast/youtube/article/newsletter/short/slides/script/note/…
- `refs_json` tracks where content is sourced from (anchors, units, timestamps)
- `content_json` contains outlines, scripts, shotlists, render instructions

#### `wv_content_library_links`
A generic link table:
- link a library entry to an Arabic lesson / worldview claim / content item
- store `note` and optional `link_qa_json`

---

### 4.4 Planning + reviews

#### `sp_weekly_plans`
Container for a week (board metadata).

#### `sp_weekly_tasks`
Kanban tasks:
- `task_type`: arabic | worldview | content | crossref | admin
- `kanban_state`: backlog | planned | doing | blocked | done
- optional links to `ar_lessons`, `wv_claims`, `wv_content_items`

#### `sp_sprint_reviews`
Monthly retrospective (JSON).

#### `ar_reviews`
Lightweight rating/notes stored in `ar_reviews`:
- `target_type` + `target_id` pattern

---

### 4.5 Cross-linking and graph layer

#### `wv_concepts`
Your universal concept inventory (Qur’an-centered spine):
- `slug` is stable unique key (COVENANT, TAWHID, REVELATION, SOVEREIGNTY…)

#### `wv_concept_anchors`
Evidence nodes: anchors wv_concepts to places in any target stream:
- `target_type/target_id` points to lesson/claim/library/content/etc
- `unit_id` + `ref` help locate inside JSON or source
- `evidence` is the excerpt/snippet
- (recommended) add optional `span_id` to anchor to exact token spans

#### `wv_cross_references`
Generic cross reference objects as JSON:
- use for “Qur’an ↔ Bible”, “claim ↔ claim”, “concept ↔ concept”, etc.

#### `wv_discourse_edges`
Graph edges describing relationships:
- `edge_type`: sentence_flow | concept_flow | argument_flow
- `relation`: استئناف | تعليل | support | contrast | …
- can connect units across sources, not just within one doc

---

## 5) The Source-Agnostic Text Backbone

This is the “query layer” that powers:
- exact token search
- span-based annotations (idioms/grammar/quotes)
- linking tokens to lexicon entries
- cross-sentence spans

### 5.1 `text_documents`
Document container (Qur’an, book, poem, transcript):
- `doc_id` is stable (DOC_QURAN_HAFS, DOC_DIWAN_MUTANABBI_001)
- `source_type`: quran | literature | other

### 5.2 `text_sentences`
Sentence layer:
- `sentence_id` is stable
- `ref` is flexible (“12:23”, “p33:l14”, “ch2:p5”)
- `sent_index` preserves order inside doc

### 5.3 `text_tokens`
Token layer:
- `doc_token_index` gives a global sequence across the entire doc (critical for spans)
- `pos_index` is position in sentence
- store `surface_ar`, optional `norm_ar`, `lemma_ar`, `pos`, `features_json`

### 5.4 `token_lexicon_links`
Links a token occurrence to a lexicon entry:
- supports confidence, primary/secondary senses, manual vs auto links

### 5.5 `token_spans`
A span references doc-level token indexes:
- spans can cross sentence boundaries
- label can be idiom/grammar/imagery/quote/discourse
- you can cache surface text for speed (`text_cache`)

### 5.6 Idioms + grammar application
- `idioms`: canonical idiom definitions
- `idiom_instances`: idiom applied to a specific `span_id`
- `grammar_instances`: grammatical concept applied to a `span_id`

This enables:
- “show me all instances of **مَعَاذَ الله** idiom”
- “list all spans tagged with GRAM_NAHW_… in Yusuf 12:19–29”
- “show me tokens linked to lexicon entry X”

---

## 6) Typical data flows

### Flow A — Qur’an lesson creation
1) Create `ar_lessons` row with canonical `lesson_json`
2) Ensure the source text exists in `text_documents`
3) Insert sentence + token backbone (`text_sentences`, `text_tokens`)
4) Link tokens to lexicon (`token_lexicon_links`)
5) Create spans for idioms/grammar (`token_spans`)
6) Apply idioms/grammar (`idiom_instances`, `grammar_instances`)
7) Extract wv_concepts from the lesson and anchor them (`wv_concepts`, `wv_concept_anchors`)
8) Log activity (`user_activity_logs`)

### Flow B — Worldview extraction
1) Add a source in `library_entries`
2) Run a `brainstorm_sessions` capture (raw → structured)
3) Stabilize into `wv_claims` (meaning nodes)
4) Create SRS through `wv_claims` (meaning nodes now host the canonical cards)
5) Anchor claims to wv_concepts via `wv_concept_anchors`
6) Connect claims to Qur’an via `wv_cross_references` and `wv_discourse_edges`
7) Produce output via `wv_content_items` referencing anchors/units

---

## 7) Two concrete examples

### Example 1 — Token → Lexicon → Root
- A token “الظالمون” is stored in `text_tokens`
- It links to a lexicon entry “ظالم” via `token_lexicon_links`
- That lexicon entry links to root “ظلم” via `lexicon.root_id`
Result:
- you can query “show me all token occurrences of the lexicon entry ظالم”
- you can query “show me all roots used in a passage + their occurrences”

### Example 2 — Idiom + Grammar over a span
- Create a `token_spans` row spanning tokens 120..124 (doc-level)
- Attach an idiom instance (`idiom_instances.span_id`)
- Attach a grammar instance (`grammar_instances.span_id`)
Result:
- you can render the passage and highlight the exact phrase
- you can build study cards from the idiom/grammar instances

---

## 8) Recommended repo doc structure

Place docs in your repo so the architecture is easy to find:

1. `docs/wiki/architecture.md` — **Architecture** must occupy the first order index so it is the lead doc in any generated tables/listings.
2. Add other knowledge-map docs (e.g., `docs/wiki/quran-token-backbone.md`) after Architecture so the alphabetical/slug sort keeps the architecture overview first.
