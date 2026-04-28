# K-Maps Multi-Layer Linguistic Ingestion Plan

> Generated: 2026-04-27 — Based on Tibyan Spec + 4 Master DOCX (balagha/irab × philosophy/technical) + existing AL/QR schemas.

## Layers

Three independent ingestion pipelines under `km_arabic_linguistic/ingestion/`:

| Layer | Folder | Domain | Owns | Primary source |
|-------|--------|--------|------|---------------|
| صرف Sarf | `صرف/kmaps-sarf/` | morphology | root, lemma, wazn, verb form, idioms, antonyms | 10 tafsirs + 4 lexicons + 3 PDFs ✅ done |
| إعراب Iʿrāb | `اعراب/kmaps-irab/` | parsing/syntax | i'rab, taalluq, taqdir, qiraat, ikhtilaf, wajh_irab | **التبيان (Tibyan al-Akbari)** |
| بلاغة Balāgha | `بلاغة/kmaps-balagha/` (new) | rhetoric | tropes, fronting, omission, restriction, iltifat | tafsirs (linguistic-balagha layer only) |

**Strict layer boundary** — if a chunk has multi-layer content, each pipeline extracts only its own layer; the rest is routed out as cross-layer hints.

---

## 1. What Already Exists (Reuse, Don't Recreate)

### km_arabic_linguistic D1 (workers/ar-linguistics)

```
✅ Source registry
   ar_ling_sources, ar_ling_source_editions, ar_ling_source_chunks, ar_ling_source_toc

✅ Sarf canonical tables (migration 004)
   ar_ling_sarf_notes, ar_ling_sarf_tafsir_notes
   ar_ling_verb_frames, ar_ling_verb_frame_evidence
   ar_ling_antonym_pairs, ar_ling_antonym_evidence
   ar_ling_sarf_translation_loss, ar_ling_sarf_context_activations

✅ Pre-existing balagha skeleton (migration 001)
   al_balagha_terms, al_balagha_examples, al_balagha_relations
   → keep, but WRAP with new tafsir-grounded claim tables

✅ Pre-existing nahw/irab skeleton
   al_nahw_concepts, al_nahw_relations, al_nahw_concepts_raw
   al_parsed_sentences, al_clause_functions, al_clause_types
   al_phrase_functions, al_phrase_types
   al_governance_patterns, al_ellipsis_types
   al_syntax_relation_types
   → these are concept dictionaries; new staging adds Quran-grounded irab claims
```

### km_quran D1 (workers/quran)

```
✅ Sentence structure infrastructure (migrations 004, 006, 007)
   qr_ss_scope_reading            ← target for approved irab claims
   qr_ss_scope_morph_link         ← target for sarf links from irab
   qr_ss_scope_grammar_link       ← target for irab governance/role
   qr_ss_scope_balagha_link       ← target for approved balagha claims  ★
   qr_ss_scope_relations          ← taalluq target
   qr_ss_scope_nuance             ← semantic_effect target
   qr_ss_ellipsis_event           ← taqdir target
   qr_ss_tree, qr_ss_tree_node, qr_ss_tree_edge  ← D3 trees
   qr_evidence_items              ← approved Arabic source quotes
   qr_analysis_claims, qr_analysis_scopes
   qr_interpretive_differences    ← ikhtilaf target
   qr_diagram_instances, qr_diagram_specs
```

**Bottom line:** all promotion targets already exist in km_quran. We just add the staging layer in km_arabic_linguistics.

---

## 2. New Schema Additions (3 small migrations)

### Migration 005 — Tibyan/Iʿrāb staging (`005_irab_tibyan_tables.sql`)

Implements the Tibyan spec's "minimal schema additions":

```sql
-- Cross-layer ingestion run audit
CREATE TABLE ar_ling_ingestion_runs (
    id TEXT PRIMARY KEY,
    layer TEXT NOT NULL CHECK(layer IN ('sarf','irab','balagha')),
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    edition_id TEXT,
    scope_label TEXT,             -- e.g. "S1", "S2:1-20"
    started_at TEXT DEFAULT (datetime('now')),
    finished_at TEXT,
    status TEXT NOT NULL CHECK(status IN ('running','succeeded','failed')),
    stats_json TEXT,              -- {chunks:N, claims:N, errors:N}
    note TEXT
);

-- Chunk → Quran scope link (which ayat does this raw chunk discuss?)
CREATE TABLE ar_ling_source_quran_links (
    id TEXT PRIMARY KEY,
    chunk_id TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    surah INTEGER NOT NULL,
    ayah_from INTEGER NOT NULL,
    ayah_to INTEGER NOT NULL,
    word_index INTEGER,           -- nullable for whole-ayah scope
    detection TEXT NOT NULL CHECK(detection IN ('explicit','heading','heuristic')),
    detection_note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Generic AI-extracted claims (irab/balagha/sarf all flow through here for review)
CREATE TABLE ar_ling_source_claims (
    id TEXT PRIMARY KEY,
    layer TEXT NOT NULL CHECK(layer IN ('sarf','irab','balagha')),
    claim_type TEXT NOT NULL,     -- irab|taalluq|taqdir|qiraat|ikhtilaf|wajh_irab|semantic_effect|rule_reference| ... 
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    edition_id TEXT,
    chunk_id TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    surah INTEGER NOT NULL,
    ayah_from INTEGER NOT NULL,
    ayah_to INTEGER NOT NULL,
    word_index INTEGER,
    source_quote_ar TEXT NOT NULL,  -- exact substring of chunk text — REQUIRED
    locator_json TEXT,              -- {chunk_id, page, char_offset}
    claim_payload TEXT NOT NULL,    -- normalized JSON per claim_type
    confidence TEXT NOT NULL DEFAULT 'pending'
        CHECK(confidence IN ('high','medium','low','pending')),
    review_status TEXT NOT NULL DEFAULT 'pending'
        CHECK(review_status IN ('pending','approved','rejected','needs_fix','flagged')),
    reviewer TEXT,
    review_note TEXT,
    promoted_evidence_id TEXT,      -- qr_evidence_items.id once promoted
    promoted_reading_id TEXT,       -- qr_ss_scope_reading.id once promoted
    run_id TEXT REFERENCES ar_ling_ingestion_runs(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Beginner/intermediate/advanced/research notes per claim
CREATE TABLE ar_ling_ai_sense_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT NOT NULL REFERENCES ar_ling_source_claims(id),
    note_level TEXT NOT NULL CHECK(note_level IN ('basic','intermediate','advanced','research')),
    note_md TEXT NOT NULL,
    teaching_focus TEXT,
    review_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_aslc_layer ON ar_ling_source_claims(layer, surah, ayah_from);
CREATE INDEX idx_aslc_chunk ON ar_ling_source_claims(chunk_id);
CREATE INDEX idx_asql_surah ON ar_ling_source_quran_links(surah, ayah_from);
CREATE INDEX idx_aisn_claim ON ar_ling_ai_sense_notes(claim_id);
```

### Migration 006 — Iʿrāb canonical tables (`006_irab_tables.sql`)

These are sarf's mirror for irab, populated from approved staging claims:

```sql
-- Approved i'rab claims — finer than qr_ss_scope_reading, references it.
CREATE TABLE ar_ling_irab_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT REFERENCES ar_ling_source_claims(id),
    word_occurrence_ref TEXT,          -- "QR:surah:ayah:word_index"
    surah INTEGER, ayah_from INTEGER, ayah_to INTEGER, word_index INTEGER,
    irab_role TEXT,                    -- مبتدأ، خبر، فاعل، مفعول به...
    irab_role_en TEXT,
    case_marking TEXT,                 -- مرفوع/منصوب/مجرور/مجزوم
    governor_word_ref TEXT,
    governance_type TEXT,
    note_ar TEXT, note_en TEXT,
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review',
    review_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_taalluq_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT REFERENCES ar_ling_source_claims(id),
    surah INTEGER, ayah INTEGER, word_index INTEGER,
    attached_phrase_ar TEXT,           -- the jar-majrur or zarf
    governor_ar TEXT,                  -- explicit or estimated governor
    governor_is_estimated INTEGER DEFAULT 0,
    note_ar TEXT, note_en TEXT,
    source_id TEXT, chunk_id TEXT,
    confidence TEXT, review_status TEXT, created_at TEXT
);

CREATE TABLE ar_ling_taqdir_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT REFERENCES ar_ling_source_claims(id),
    surah INTEGER, ayah INTEGER, word_index INTEGER,
    elided_word_ar TEXT,               -- the omitted word
    estimated_full_ar TEXT,            -- full sentence with estimation
    reason_md TEXT,                    -- why elision is required
    source_id TEXT, chunk_id TEXT,
    confidence TEXT, review_status TEXT, created_at TEXT
);

CREATE TABLE ar_ling_qiraat_morph_variants (
    id TEXT PRIMARY KEY,
    claim_id TEXT REFERENCES ar_ling_source_claims(id),
    surah INTEGER, ayah INTEGER, word_index INTEGER,
    reader_ar TEXT,                    -- e.g. "حفص عن عاصم"
    variant_form_ar TEXT,
    affects_case INTEGER DEFAULT 0,
    affects_meaning INTEGER DEFAULT 0,
    note_ar TEXT, note_en TEXT,
    source_id TEXT, chunk_id TEXT,
    confidence TEXT, review_status TEXT, created_at TEXT
);

CREATE TABLE ar_ling_irab_alternatives (
    id TEXT PRIMARY KEY,
    primary_claim_id TEXT REFERENCES ar_ling_source_claims(id),
    alternative_claim_id TEXT REFERENCES ar_ling_source_claims(id),
    relation_type TEXT,                -- agrees|contradicts|wajh
    rationale_md TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### Migration 007 — Balāgha canonical tables (`007_balagha_tables.sql`)

```sql
-- Tafsir-grounded balagha device claims
CREATE TABLE ar_ling_balagha_notes (
    id TEXT PRIMARY KEY,
    claim_id TEXT REFERENCES ar_ling_source_claims(id),
    surah INTEGER, ayah_from INTEGER, ayah_to INTEGER, word_index INTEGER,
    device_branch TEXT NOT NULL,       -- معاني | بيان | بديع
    device_subtype TEXT,               -- e.g. تقديم وتأخير, التفات, حصر, جناس...
    device_label_ar TEXT, device_label_en TEXT,
    rhetorical_effect_ar TEXT,
    rhetorical_effect_en TEXT,
    surah_movement_role TEXT,          -- contribution to passage coherence
    quote_ar TEXT NOT NULL,
    source_id TEXT NOT NULL REFERENCES ar_ling_sources(id),
    chunk_id TEXT NOT NULL REFERENCES ar_ling_source_chunks(id),
    confidence TEXT NOT NULL DEFAULT 'needs_review',
    review_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ar_ling_balagha_evidence (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL REFERENCES ar_ling_balagha_notes(id),
    quote_ar TEXT NOT NULL,
    explanation_md TEXT,
    source_id TEXT, chunk_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_albn_surah ON ar_ling_balagha_notes(surah, ayah_from);
CREATE INDEX idx_albn_branch ON ar_ling_balagha_notes(device_branch, device_subtype);
```

---

## 3. Pipeline Architecture (shared utilities, per-layer drivers)

```
km_arabic_linguistic/ingestion/
├── _shared/                         ← NEW: common Python utils
│   ├── kmaps_ingest/
│   │   ├── ids.py                  ← stable_id, point_id_from_chunk_id
│   │   ├── normalise_arabic.py     ← shared
│   │   ├── qdrant_store.py         ← shared client
│   │   ├── llm_client.py           ← OpenAI gpt-5-mini wrapper
│   │   ├── source_registry.py     ← register source/edition rows
│   │   ├── chunk_cleaner.py        ← shared cleaning rules
│   │   └── prompts/                ← prompt templates per layer
│   │       ├── sarf.md
│   │       ├── irab.md
│   │       └── balagha.md
│   └── pyproject.toml
│
├── صرف/kmaps-sarf/                  ← exists, in production
│
├── اعراب/kmaps-irab/                ← NEW
│   ├── .env
│   ├── data/
│   │   ├── raw/tibyan/             ← Tibyan pages JSONL
│   │   ├── staging/chunks/         ← cleaned chunks
│   │   ├── staging/claims/         ← extracted claims JSON
│   │   └── qdrant_storage/
│   └── scripts/
│       ├── 01_fetch_tibyan_pages.py
│       ├── 02_segment_surahs.py
│       ├── 03_register_source.py
│       ├── 04_chunk_and_link_quran.py
│       ├── 05_embed_chunks.py
│       ├── 06_extract_claims.py
│       ├── 07_validate_claims.py
│       ├── 08_generate_sense_notes.py
│       ├── 09_review_claims.py
│       ├── 10_promote_to_quran.py
│       └── 11_build_d3_trees.py
│
└── بلاغة/kmaps-balagha/             ← NEW (mirrors kmaps-irab)
    ├── data/raw/tafsirs_balagha/   ← reuse existing tafsir DBs, filtered for balagha-only paragraphs
    └── scripts/  (parallel structure)
```

### Shared Qdrant strategy

**One collection per layer** (cleaner than mixed):

```
kmaps_sarf_source_chunks      ← 34,538 (built ✅)
kmaps_irab_source_chunks      ← Tibyan-only, ~3K-5K chunks (TBD)
kmaps_balagha_source_chunks   ← tafsir paragraphs flagged "balagha", ~5K-10K chunks
```

Each uses identical embedding strategy (the new `build_embed_text()` in `embed_chunks.py`):
```
[Tibyan] Surah 2:255 | {chunk_text}
[Razi - Mafatih] Surah 2:25 | {chunk_text} (filtered to balagha sentences)
```

### LLM prompt strategy per layer

Each layer's `prompts/{layer}.md` defines:
1. **Allowed claim_types** (8–12 per layer, drawn from spec tables 22, 30)
2. **Strict layer boundary** ("if you see sarf, route as `cross_layer_hint`")
3. **JSON schema** with `claim_type`, `source_quote_ar`, `quran_scope`, `confidence`
4. **Refusal rule** if no Arabic source quote can be extracted

---

## 4. Tibyan source registration (immediate)

Per spec §3.1, before any chunking:

```sql
-- Source (the abstract work)
INSERT INTO ar_ling_sources (id, title_ar, title_en, source_type, author_name, period_label, note_md)
VALUES (
  'AL:SRC:TIBYAN_AKBARI', 'التبيان في إعراب القرآن',
  "Al-Tibyan fi I'rab al-Qur'an", 'irab',
  'أبو البقاء العكبري', 'd. 616 AH',
  '{"family":"irab","editor":"Ali al-Bajawi","authority":"core"}'
);

-- Edition (the concrete imported copy)
INSERT INTO ar_ling_source_editions (id, source_id, platform, source_url, edition_label, language, year_published)
VALUES (
  'AL:ED:TIBYAN_SHAMELA22928', 'AL:SRC:TIBYAN_AKBARI',
  'shamela', 'https://shamela.ws/book/22928',
  'Shamela 22928', 'ar', NULL
);

-- Run row (one per ingestion sweep)
INSERT INTO ar_ling_ingestion_runs (id, layer, source_id, edition_id, scope_label, status)
VALUES ('AL:RUN:TIBYAN_S1_2026_04_27', 'irab',
        'AL:SRC:TIBYAN_AKBARI', 'AL:ED:TIBYAN_SHAMELA22928',
        'S1', 'running');
```

---

## 5. Rollout Schedule (per Tibyan spec §10)

| Stage | Scope | Why | Owner |
|-------|-------|-----|-------|
| **Sarf full** | All 77,427 words | already running | gpt-5-mini, 5 workers, ~8 hrs |
| **Irab Pilot 1** | S1 (7 ayat) | validates pipeline end-to-end | manual review |
| **Irab Pilot 2** | S2:1-20 | disjoint letters, complex phrases | manual review |
| **Irab Pilot 3** | S2:21-29 | command/argument structure | manual review |
| **Irab Pilot 4** | S2:30-39 | narrative dialogue | manual review |
| **Irab Expansion** | S2 full in 14 batches | spec §10.1 batches | semi-automated |
| **Irab Continuation** | S3 → S114 | only after S2 quality verified | full automation |
| **Balagha Pilot** | S1 + S114 (short surahs) | tropes density + Makki rhetoric | manual review |
| **Balagha Expansion** | All Makki surahs first | rhetorical density | semi-automated |

**Hard rule (spec §13):** Never run full book extraction without chunk validation on a small range first.

---

## 6. Step-by-step build order

### Phase A — SCHEMA (1 hr, no Python yet)

1. Write `database/migrations/km-arabic-linguistics/005_irab_tibyan_tables.sql` (the staging tables)
2. Write `006_irab_tables.sql` (irab canonical)
3. Write `007_balagha_tables.sql` (balagha canonical)
4. Apply via `wrangler d1 migrations apply km_arabic_linguistics --remote`

### Phase B — IRAB PIPELINE (3-5 hrs)

1. Create `kmaps-irab/` folder skeleton (mirror `kmaps-sarf/`)
2. Move shared utils into `_shared/kmaps_ingest/` (refactor sarf to use them)
3. Write Tibyan fetch script (Shamela book 22928 — same Hawramani/cloudscraper approach)
4. Write surah segmentation: detect قال تعالى headings + ayah ranges
5. Reuse `clean_chunks.py` and `embed_chunks.py` (parameterize collection name)
6. Write irab-specific prompts/extraction (claim_types from Tibyan spec table 30)
7. Run S1 pilot (7 ayat → ~50-80 claims)
8. Manual review → promote → check qr_ss_scope_reading rows

### Phase C — BALAGHA PIPELINE (3-5 hrs after irab)

1. Create `kmaps-balagha/` skeleton
2. **No new source fetching** — reuse the 10 tafsir DBs already chunked
3. Filter chunks: only paragraphs with balagha trigger words (تقديم/تأخير, حصر, التفات, تقديم, جناس, تكرار, ...)
4. Embed filtered chunks into `kmaps_balagha_source_chunks`
5. Extract balagha claims (8 device subtypes, schema in master technical doc)
6. Run S1 + S114 pilot, manual review, promote

### Phase D — UNIFIED EMBED (already most-of-the-way done)

The current `embed_chunks.py` (just rebuilt) already supports:
- ✅ Quran-contextual embedding text
- ✅ Per-chunk source/surah/ayah payload
- ✅ `--rebuild` flag to wipe and rebuild

Need to add:
- `--collection NAME` flag (default `kmaps_sarf_source_chunks`)
- `--layer-filter sarf|irab|balagha` to filter `all_chunks_clean.jsonl` by chunk_kind/source

---

## 7. Critical Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Schema namespace | Reuse `ar_ling_*` (not `al_*`) | newer, sarf already there, cross-layer naming |
| Pre-existing al_balagha_terms | Keep, treat as concept dictionary | terms stay; new tafsir-grounded notes are claims |
| Pre-existing al_nahw_concepts | Keep, treat as concept dictionary | same; new claims reference these as `rule_reference` |
| Source quote requirement | **MANDATORY** per spec §11 | reject claims without `source_quote_ar` |
| Promotion gate | **manual review** for S1, S2 pilots | spec §6 step 8: no public UI before approval |
| Qdrant collections | One per layer | cleaner filtering, smaller vector counts per query |
| LLM | gpt-5-mini for all 3 layers | only one available; works well |
| Spine reuse | Same `qr_word_occurrences` for irab | spec §10 — irab attaches to existing words |
| Cross-layer hints | `cross_layer_hint` claim_type, routed to other queue | avoids contamination, preserves info |

---

## 8. What I'm Doing Right Now (next 30 min)

1. ✅ Already running: sarf clean rebuild (currently embedding 34,538 chunks, ~1 hr)
2. ⏳ Write the 3 SQL migrations (005, 006, 007) — about to do
3. ⏳ Create `kmaps-irab/` folder skeleton + Tibyan source registration script
4. ⏳ Update `wait_and_launch.sh` to also build irab Qdrant collection after sarf finishes

Defer until you confirm the schema:
- Tibyan fetch script (Shamela 22928 scraping)
- Irab claim extraction prompt
- Balagha pipeline

---

## 9. Open Questions for You

1. **Tibyan source** — fetch from Shamela.ws/book/22928 (Cloudflare-blocked) or do you have a local copy? The 4 Tibyan editions on Shamela differ; spec recommends Akbari edition.
2. **Balagha source** — use existing 10 tafsirs filtered for balagha sentences, or scrape a dedicated balagha book (e.g., `الكشاف`, `البحر المحيط`, `روح المعاني` are already chunked)?
3. **Promotion automation** — Spec says manual review gate for S1, S2. Do you want me to also wire the auto-promote SQL emit (executable only after `review_status='approved'`)?
4. **gpt-5-mini context** — per claim ~3K input tokens. For irab + balagha + sarf full Quran = ~230K LLM calls. At Tier 1 (200K TPM) that's ~24 hrs total compute. OK?
