# K-MAPS — Claude Deep Memory

> Last updated: 2026-04-17
> This file is the single source of truth for all architectural decisions,
> brainstormed features, DB schema, and coding patterns for this project.
> Read this at the start of every session.

---

## 1. Project Identity

**K-MAPS v2** — Knowledge Map — an Islamic knowledge platform built on Cloudflare.

Core pillars:
1. **Quran** — Arabic text, translations, passages, verse-by-verse reader, mushaf view
2. **Arabic Language** — vocabulary, grammar, roots, lessons, exercises
3. **Worldview (Wv)** — comparative religion research, brainstorm journal, parallel scripture comparison
4. **Hub** — global master data management and data entry center (the "CMS" of the app)
5. **Workspace** — collaborative study groups, reading plans, sessions, podcasts
6. **Planner** — personal reading goals, calendar, kanban, timeline, session logging

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 17+ standalone components, signals |
| Animations | GSAP (all transitions, stagger, morphs) |
| Backend | Cloudflare Workers (TypeScript functions/) |
| Database | Cloudflare D1 (SQLite) — database: `knowledgemap` |
| Styling | SCSS with BEM, CSS custom properties (--km-*) |
| Fonts | Poppins (body), UthmanicHafs_V22 (Quran), AmiriQuran, QCFSurahHeader, SurahName |
| Deployment | Cloudflare Pages + Workers |
| Package manager | npm workspaces (monorepo) |

### Key CSS Variables
```scss
--km-bg, --km-surface, --km-surface-2
--km-text, --km-text-2, --km-text-3
--km-gold, --km-border, --km-border-gold
--km-font-body (Poppins), --km-font-heading
--km-font-arabic (UthmanicHafs), --km-font-arabic-amiri (AmiriQuran)
```

---

## 3. Monorepo Structure

```
knowledge-map/
├── apps/k-maps-v2/          ← MAIN APP (Angular, active development)
├── apps/app-k-maps/         ← Ionic app
├── apps/k-maps/             ← Legacy app
├── functions/               ← Cloudflare Workers (all API routes)
├── database/migrations/     ← SQL migration files
├── docs/                    ← Documentation + brainstorm specs
├── scripts/                 ← utility scripts
├── resources/               ← learning resources
└── wrangler.toml            ← Cloudflare config (db: knowledgemap)
```

### Main App Structure
```
apps/k-maps-v2/src/app/
├── core/
│   ├── landing/
│   └── login/
├── features/
│   ├── hub/           ← GLOBAL data management (all sections)
│   ├── quran/         ← Quran reader + surah + passage
│   ├── arabic/        ← Arabic learning
│   ├── worldview/     ← Wv research + comparison (alias: /worldview)
│   ├── workspace/     ← Workspace full screen
│   ├── planner/       ← Planner full screen
│   └── content/       ← Content management
├── shared/
│   └── services/k-maps.service.ts   ← main HTTP service
└── app.routes.ts
```

---

## 4. App Routes (app.routes.ts — existing)

```
/landing     → LandingComponent
/login       → LoginComponent
/hub         → HUB_ROUTES         ← global data management
/quran       → QURAN_ROUTES
/arabic      → ARABIC_ROUTES
/worldview   → WORLDVIEW_ROUTES   ← NOTE: route is /worldview not /wv
/planner     → PLANNER_ROUTES
/workspace   → WORKSPACE_ROUTES
/content     → CONTENT_ROUTES
```

**IMPORTANT**: The Worldview feature route is `/worldview` (not `/wv`). All references in brainstorm use `/worldview`.

---

## 5. Architecture Principles

### Two-Layer Design
```
MANAGEMENT LAYER   /hub/*
  → All data entry, CRUD, configuration
  → Right panel only for forms (never navigate away from hub)
  → Universal HubPanelService opens correct form

EXPERIENCE LAYER   /quran/* | /worldview/* | /arabic/* | /planner | /workspace/*
  → Beautiful, immersive, minimal chrome
  → Read-focused, annotations via overlay panel only
```

### Hub = Platform CMS
The `/hub` route is the **single entry point for ALL master data** across:
- Quran (surahs, passages, translations, tags, verse marks)
- Arabic (vocabulary, grammar, lessons, exercises, word links)
- Worldview (worldviews, topics, sources, authors, publications, brainstorms, comparisons, highlights, notes, distillations, quran links, people)
- Workspace (workspaces, members, plans, sessions, podcasts)

### Data Entry Rule
**ALL data entry happens in the Hub right panel only.**
No standalone form routes anywhere in the app.
The panel service is available system-wide (overlay in experience screens too).

### Angular Patterns
- All components: **standalone**, `ChangeDetectionStrategy.OnPush`
- State: Angular **signals** (`signal<T>()`, `computed()`, `effect()`)
- No NgModules, no RxJS where signals suffice
- GSAP for ALL animations (no CSS animations except `@keyframes spin`)
- Lazy-loaded routes via `loadComponent` / `loadChildren`

---

## 6. Database — Cloudflare D1

**Database name**: `knowledgemap`
**Execute remote**: `wrangler d1 execute knowledgemap --file=PATH --remote`
**IMPORTANT**: D1 does NOT enforce foreign keys at runtime (`PRAGMA foreign_keys` defaults OFF). FKs are schema documentation only. Indexes do the performance work.

### Existing Quran Tables
```sql
ar_quran_surahs          -- 114 rows: id, name_ar, name_en, revelation, ayah_count
ar_quran_ayah            -- 6,236 rows: surah, ayah, text_uthmani, text_uthmani_clean,
                         --   text_bare, text, translation, verse_mark, page_number
ar_quran_surah_passage   -- passages: surah, passage_index, ayah_from, ayah_to, theme
```

### verse_mark format (SETTLED)
- Stored as plain **Arabic-Indic digits only** (`١` `٢` `٣` etc.)
- U+06DD (۝) stripped from ALL 6,236 rows in production
- Rendered with `font-family: var(--km-font-arabic)` (UthmanicHafs)
- CSS: `display: inline`, equal margins `0 0.18em`, no CSS circle
- Do NOT use U+06DD in any new code — UthmanicHafs renders it as twin frames (bug)

### Existing Passage Indexes
```sql
idx_ar_qsp_surah_range  -- (surah, ayah_from, ayah_to)
idx_ar_qsp_ayah_from    -- (surah, ayah_from)   ← added 2026-03-22
idx_ar_qsp_ayah_to      -- (surah, ayah_to)     ← added 2026-03-22
```

## 8. Angular Feature Architecture

### Hub (Management Layer)
```
/hub → HubComponent (3-col: sidebar | table | right panel)

Sections:
  📖 Quran    → Surahs, Passages, Translations, Ayah Tags, Verse Marks
  ع  Arabic   → Containers, Units, Tasks, Vocabulary, Grammar, Idioms,
                 Balagha, Domains, Domain Phrases
  🌍 Worldview → Worldviews, Topics, Sources, Authors, Publications,
                  Brainstorms, Comparisons, Highlights, Notes,
                  Distillations, Quran Links, People
  🌍 Worldview → Worldviews, Topics, Sources, Authors, Publications,
                  Brainstorms, Comparisons, Highlights, Notes,
                  Distillations, Quran Links, People
  🏛 Workspace → Workspaces, Members, Plans, Sessions, Review Queue, Podcasts

Panel Service (HubPanelService):
  mode: signal<HubPanelMode | null>
  context: signal<Record<string, unknown>>
  open(mode, context?) / close()

Panel Modes (one per entity):
  'source' | 'author' | 'publication' | 'unit' | 'sub_unit'
  'highlight' | 'note' | 'distillation' | 'quran_link'
  'person' | 'workspace' | 'plan' | 'plan_item' | 'session'
  'podcast' | 'participant' | 'talking_point'
  'worldview' | 'topic' | 'brainstorm' | 'comparison' | 'cell'
  'surah' | 'passage' | 'translation' | 'vocabulary' | 'grammar'
```

### Experience Screens (Full-Screen)
```
/quran                → Quran explorer (existing)
/quran/:surahId       → QuranTextComponent (existing — verse/arabic/mushaf tabs)
/worldview            → Worldview root (to be expanded)
/worldview/compare/:cid      → Parallel comparison grid (multi-column)
/worldview/brainstorm/:bid   → Brainstorm editor (markdown + sidebar)
/planner              → Planner (sidebar + calendar/kanban/timeline)
/workspace/:wid       → Workspace hub (header + 6-tab + activity)
```

### Privacy Model (CRITICAL)
```
wv_person.visibility = 'private'   → FAMILY
  - Never shown to workspace members
  - Never appears in workspace member picker
  - Never in activity feeds visible to others
  - Owner-only access

wv_person.visibility = 'workspace' → FRIENDS / COLLEAGUES
  - Can be added to workspaces
  - Visible to other workspace members within that workspace
  - Can be podcast participants
```

### Planner Views
Three toggle views (all in /planner full screen):
1. **Calendar** — weekly/monthly grid, session dots, source icons
2. **Kanban** — columns: Pending | In Progress | Done | Skipped (drag-drop)
3. **Timeline** — gantt-style bar chart per plan

Kanban filter bar: by plan, by priority, by source, by date range

---

## 9. GSAP Animation Patterns

```typescript
// Library/grid card entrance
gsap.fromTo('.card', { opacity:0, y:20 },
  { opacity:1, y:0, duration:0.4, stagger:0.04, ease:'power2.out' })

// Hub right panel slide
open:  gsap.fromTo(panel, { x:360, opacity:0 }, { x:0, opacity:1, duration:0.35, ease:'expo.out' })
close: gsap.to(panel, { x:360, opacity:0, duration:0.25, ease:'expo.in' })
morph: gsap.fromTo(form, { opacity:0, y:10 }, { opacity:1, y:0, duration:0.22, ease:'power2.out' })

// Comparison columns stagger
gsap.fromTo('.comp-tab', { x:-30, opacity:0 },
  { x:0, opacity:1, duration:0.35, stagger:0.06, ease:'power2.out' })

// Planner stat count-up
gsap.fromTo(el, { textContent:0 },
  { textContent: count, duration:0.8, snap:{ textContent:1 }, ease:'power2.out' })

// Kanban drag
dragStart: gsap.to(card, { scale:1.04, boxShadow:'0 12px 40px rgba(201,168,76,0.25)', duration:0.15 })
drop:      gsap.fromTo(card, { y:-8 }, { y:0, duration:0.3, ease:'bounce.out' })

// Check-off plan item
gsap.timeline()
  .to(checkbox, { scale:1.3, duration:0.15 })
  .to(checkbox, { scale:1, duration:0.1 })
  .to(itemText, { opacity:0.4, duration:0.3 }, '-=0.1')

// Workspace member avatars
gsap.fromTo('.member-avatar', { scale:0, opacity:0 },
  { scale:1, opacity:1, duration:0.4, stagger:0.06, ease:'back.out(2)' })

// Page-break dividers in Quran reader
gsap.fromTo(lines, { scaleX:0, opacity:0 },
  { scaleX:1, opacity:1, duration:0.7, ease:'power3.out' })
```

---

## 10. Key Technical Decisions (Settled)

### Verse Marks
- Store: plain Arabic-Indic digits in DB (`١٢٣` not `۝١۝٢`)
- Render: `display:inline`, UthmanicHafs font, margin `0 0.18em`, no CSS circle
- NEVER use U+06DD (۝) — UthmanicHafs renders it as twin empty frames

### D1 / SQLite
- FKs declared but NOT enforced at runtime
- Always create explicit indexes for query performance
- Use `wrangler d1 execute knowledgemap --file=PATH --remote` for migrations
- D1 doesn't support `X'hex'` byte literals in WHERE — use character literals

### Angular Signals
- All component state via `signal<T>()`
- Derived state via `computed()`
- Side effects via `effect()`
- No `.subscribe()` except for HTTP (KMapsService returns Observables)

### Quran Text Columns (in ar_quran_ayah)
- `text_uthmani_clean` — no verse number, no U+06DD (preferred)
- `text_uthmani` — may have verse marker at end
- `text_bare` — stripped of diacritics
- `text` — fallback
- Always use: `text_uthmani_clean ?? text_uthmani ?? text`

---

## 11. Build Order (Next Steps)

```
Phase 1: Database
  [ ] database/migrations/legacy/2026-03-22_wv_schema.sql  (all wv_* tables)
  [ ] Run migration on production D1

Phase 2: Worker API
  [ ] functions/worldview/sources.ts     GET/POST /worldview/sources
  [ ] functions/worldview/units.ts       GET/POST /worldview/units
  [ ] functions/worldview/highlights.ts
  [ ] functions/worldview/notes.ts
  [ ] functions/worldview/distillations.ts
  [ ] functions/worldview/brainstorm.ts
  [ ] functions/worldview/comparison.ts
  [ ] functions/worldview/people.ts
  [ ] functions/workspace/*.ts
  [ ] functions/planner/*.ts

Phase 3: Hub Shell
  [ ] HubComponent (3-col layout)
  [ ] HubSidebarComponent (4 sections)
  [ ] HubPanelService (signal-based)
  [ ] HubPanelComponent (slide-in)
  [ ] HubTableComponent (reusable)

Phase 4: Hub Sections
  [ ] Quran section (surahs, passages)
  [ ] Worldview section (sources, people, worldviews, topics)
  [ ] Workspace section
  [ ] Arabic section

Phase 5: Experience Screens
  [ ] Worldview Parallel Comparison (/worldview/compare/:cid)
  [ ] Brainstorm Editor (/worldview/brainstorm/:bid)
  [ ] Planner (/planner) — calendar + kanban + timeline
  [ ] Workspace Screen (/workspace/:wid)
  [ ] Source Reader (/worldview/:id/read)
```

---

## 12. File Naming Conventions

```
Features:    kebab-case.component.ts/.html/.scss
Services:    kebab-case.service.ts
Routes:      feature.routes.ts  → export const FEATURE_ROUTES: Routes
Migrations:  YYYY-MM-DD_description.sql
```

---

## 13. Important References

- Quran text: `apps/k-maps-v2/src/app/features/quran/text/quran-text.component.*`
- Main service: `apps/k-maps-v2/src/app/shared/services/k-maps.service.ts`
- Fonts: `apps/k-maps-v2/src/scss/_fonts.scss`
- CSS vars: `apps/k-maps-v2/src/scss/_variables.scss` (or similar)
- Passage migration: `database/migrations/legacy/2026-03-22_passage_indexes.sql`
- Quran worker: `functions/ar/quran/ayahs.ts`

---

## 14. AI Pipeline — Architecture & Mac M4 Setup

> Last updated: 2026-04-17
> This section covers the offline Claude-powered extraction pipeline that reads
> Islamic sources (tafsir, grammar books, etc.), chunks them, embeds them in
> Qdrant, and extracts structured knowledge into the live D1 database.

---

### 14.1 Core Design Decision (SETTLED — do not revisit)

**NO dedicated `km_tafsir_*` tables.** All extracted knowledge maps directly
into the existing `wv_*` / `ar_*` tables. The pipeline writes to production
tables, not a separate staging schema.

| What Claude Extracts | Target Table | node_type / field |
|---|---|---|
| Source (tafsir book) | `wv_sources` | `source_domain='classical_text'` |
| Chapter / section | `wv_source_units` | `unit_type='chapter'` |
| Per-ayah tafsir entry | `ar_quran_tafsir_entries` | `entry_type='explanation'` |
| Text chunk for embedding | `ar_source_chunks` | `chunk_type='other'` |
| Concept / Claim / Theme | `wv_nodes` | `node_type='concept'\|'claim'\|'theme'\|'tafsir_view'` |
| Edge between nodes | `wv_node_edges` | rich `relation_type` set |
| Motif | `ar_quran_motif_index` + `ar_quran_motif_occurrences` | — |
| Node ↔ Tafsir link | `wv_node_tafsir_links` | — |
| Evidence | `wv_evidence_links` | — |
| Claude AI suggestion (pending review) | `wv_insight_suggestions` | — |


---

### 14.2 The Only Migration Required

```sql
-- File: database/migrations/legacy/2026-04-17_pipeline_columns.sql
-- Adds embedding-pipeline tracking columns to ar_source_chunks

ALTER TABLE ar_source_chunks ADD COLUMN is_embedded  INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ar_source_chunks ADD COLUMN qdrant_id    TEXT;
ALTER TABLE ar_source_chunks ADD COLUMN chunk_kind   TEXT;
  -- 'discourse_link'|'rhetoric'|'lexical'|'syntax'|'grammar'|'semantic'|'theology'

CREATE INDEX IF NOT EXISTS idx_asc_embedded ON ar_source_chunks(is_embedded);
CREATE INDEX IF NOT EXISTS idx_asc_kind     ON ar_source_chunks(ar_u_source, chunk_kind);
```

Run with:
```bash
wrangler d1 execute knowledgemap \
  --file=database/migrations/legacy/2026-04-17_pipeline_columns.sql \
  --remote
```

---

### 14.3 Pipeline Flow

```
INGEST
  wv_sources (classical_text)
      └─ wv_source_units (chapters)
            └─ ar_source_chunks (text chunks, ~500 tokens each)
                    ↓ embed
EMBED
  Qdrant collection: "km_chunks"
  ar_source_chunks.qdrant_id ← UUID stored back in D1
  ar_source_chunks.is_embedded = 1
                    ↓ extract
EXTRACT  (Claude claude-opus-4-6 or sonnet-4-6)
  For each chunk → structured JSON:
    - nodes:  [ { node_type, title, text_plain, data_json } ]
    - edges:  [ { from_title, to_title, relation_type, note } ]
    - motifs: [ { motif_key, title, surah, ayah_from, ayah_to } ]
                    ↓ stage
STAGE (human-in-the-loop)
  wv_insight_suggestions
    suggestion_type: 'node' | 'edge' | 'cluster'
    payload_json: { ...extracted data }
    status: 'suggested'   ← Claude writes here
                    ↓ review in Hub UI
APPROVE
  Hub Review Queue → user approves / edits / rejects each suggestion
  status: 'approved' → pipeline writes to:
    wv_nodes + wv_node_edges + wv_node_tafsir_links + wv_evidence_links
    ar_quran_motif_index + ar_quran_motif_occurrences
```

---

### 14.4 Mac M4 Local Setup

#### Prerequisites

```bash
# 1. Install uv (fast Python package manager)
curl -Lsf https://astral.sh/uv/install.sh | sh

# 2. Create pipeline venv
cd scripts/pipeline   # or wherever app.py lives
uv venv .venv
source .venv/bin/activate

# 3. Install dependencies
uv pip install anthropic qdrant-client python-dotenv ulid-py httpx
```

#### Qdrant on Mac M4

```bash
# Option A — Docker (recommended)
docker run -d --name qdrant \
  -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant

# Option B — Native binary (Apple Silicon)
brew install qdrant   # if available, otherwise use Docker
```

#### `.env` file (in `scripts/pipeline/`)

```env
ANTHROPIC_API_KEY=sk-ant-...
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=km_chunks
D1_DATABASE_ID=<your-d1-db-id>
CLOUDFLARE_ACCOUNT_ID=<your-cf-account-id>
CLOUDFLARE_API_TOKEN=<your-cf-api-token>
WORKSPACE_ID=<default-workspace-ulid>
GROUP_ID=<default-group-ulid>
```

#### D1 Access from Python

The pipeline reads/writes D1 via the Cloudflare REST API (not wrangler), since
D1 doesn't have a direct TCP connection. Use the Cloudflare D1 HTTP API:

```python
import httpx, os

CF_BASE = f"https://api.cloudflare.com/client/v4/accounts/{os.environ['CLOUDFLARE_ACCOUNT_ID']}"
D1_URL  = f"{CF_BASE}/d1/database/{os.environ['D1_DATABASE_ID']}/query"
HEADERS = {"Authorization": f"Bearer {os.environ['CLOUDFLARE_API_TOKEN']}"}

def d1_query(sql: str, params: list = []) -> list[dict]:
    r = httpx.post(D1_URL, headers=HEADERS,
                   json={"sql": sql, "params": params})
    r.raise_for_status()
    return r.json()["result"][0]["results"]
```

---

### 14.5 `app.py` Entry Points

```
scripts/pipeline/
├── app.py            ← CLI entrypoint
├── ingest.py         ← chunk source → ar_source_chunks
├── embed.py          ← embed chunks → Qdrant + update qdrant_id
├── extract.py        ← Claude extraction → wv_insight_suggestions
├── approve.py        ← (optional) bulk-approve suggestions via CLI
├── d1.py             ← D1 HTTP helper
├── qdrant_client.py  ← Qdrant helpers
└── prompts/
    ├── concept_extract.md
    ├── edge_extract.md
    └── motif_extract.md
```

Key CLI commands:

```bash
# Chunk a source already in wv_sources
python app.py ingest --source-id <wv_sources_id>

# Embed all un-embedded chunks
python app.py embed --batch 50

# Run Claude extraction on a source's chunks
python app.py extract --source-id <wv_sources_id> --model claude-sonnet-4-6

# Approve all 'suggested' items for a batch
python app.py approve --batch-id <wv_distill_batches_id>
```

---

### 14.6 Claude Extraction Prompt Pattern

```python
SYSTEM = """
You are an Islamic knowledge graph extractor.
Given a passage from a tafsir or Arabic source, extract:
1. Nodes (concepts, claims, themes, tafsir_views)
2. Edges between nodes (from the wv_node_edges relation_type list)
3. Motifs (recurring Quranic patterns)

Return ONLY valid JSON matching the schema below. No prose.
"""

SCHEMA = {
  "nodes": [{"node_type": str, "title": str, "summary": str, "data_json": dict}],
  "edges": [{"from_title": str, "to_title": str, "relation_type": str, "note": str}],
  "motifs": [{"motif_key": str, "title": str, "surah": int, "ayah_from": int, "ayah_to": int}]
}
```

Valid `relation_type` values for edges (from `wv_node_edges`):
`supports`, `contradicts`, `mentions`, `related_to`, `part_of`, `derived_from`,
`feeds_output`, `questions`, `cites`, `about`, `illustrates`, `defines`,
`parallels`, `sequence`, `leads_to`, `resolves`, `echoes`, `contrasts_with`,
`completes`, `dovetails_with`, `center_of`, `framed_by`, `mirrors`,
`anticipates`, `fulfilled_by`, `other`

---

### 14.7 Human-in-the-Loop Review (Hub UI)

`wv_insight_suggestions` drives the review workflow:

```
status = 'suggested'   → shown in Hub Review Queue
status = 'approved'    → pipeline writes to target wv_* tables
status = 'edited'      → user modified payload, then approved
status = 'rejected'    → discarded
status = 'saved'       → written to DB, done
```

The `wv_distill_batches` table groups a set of suggestions into a named batch
(one batch per extraction run). Hub shows batch-level progress.

`wv_insight_decisions` records every approve/reject/edit action for audit.

---

### 14.8 Qdrant Collection Schema

```python
from qdrant_client.models import VectorParams, Distance

client.recreate_collection(
    collection_name="km_chunks",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
)

# Payload stored per point:
payload = {
    "chunk_id":    str,   # ar_source_chunks.chunk_id
    "ar_u_source": str,   # source key
    "chunk_kind":  str,   # discourse_link | rhetoric | lexical | ...
    "page_no":     int,
    "heading_norm":str,
    "text":        str,   # first 200 chars for display
}
```

Embedding model: use `text-embedding-3-small` (OpenAI) or `voyage-3` (Voyage AI)
— whichever is configured. Store model name in chunk `meta_json.embed_model`.

---

## 15. Microservices Architecture — Multi-DB Topology (CANONICAL — 2026-04-20)

> This is the SETTLED architecture. Each module owns its own Cloudflare D1 database.
> No cross-DB SQL foreign keys. Cross-module links use domain-name-driven typed UIDs (MODULE:ULID).
> See: `docs/architecture/multi-db-topology.md` for the full canonical table catalog.

### 15.1 Module → Database Mapping (7 DBs — SETTLED 2026-04-20)

| Module Code | Module Name              | D1 Database              | Table Prefix  | wrangler binding |
|-------------|--------------------------|--------------------------|---------------|-----------------|
| QR          | km_quran                 | `km_quran`               | `qr_*`        | `DB_QR`         |
| AL          | km_arabic_linguistic     | `km_arabic_linguistic`   | `ar_ling_*`   | `DB_AL`         |
| AR          | km_arabic                | `km_arabic`              | `ar_*`        | `DB_AR`         |
| WV          | km_worldview             | `km_worldview`           | `wv_*`        | `DB_WV`         |
| CM          | km_content               | `km_content`             | `cm_*`        | `DB_CM`         |
| PL          | km_planner               | `km_planner`             | `pl_*`        | `DB_PL`         |
| CORE        | km_core                  | `km_core`                | `core_*`      | `DB_CORE`       |

**SETTLED corrections (2026-04-20):**
- Module name is `km_arabic_linguistic` (singular — not "linguistics")
- AL uses a **single prefix `ar_ling_*`** for ALL tables — backbone (nahw, sarf, balagha, particles, analysis vocab) AND dictionary (roots, lemmas, lexicon, expressions). There is NO `al_*` prefix.
- km_lexicon is NOT a separate DB and has NO separate prefix. Everything is `ar_ling_*` in DB_AL.
- CORE is the 7th module, making this 7 DBs total.
- `'LX:<id>'` typed refs (legacy column names in qr_ss_*) resolve to `DB_AL`. New code uses `'AL:<id>'`.

**Domain-name-driven UIDs (SETTLED):**
All cross-module references use typed string IDs of the form `MODULE:ULID`. The module prefix IS the domain name. This is the integration contract. All typed ref columns store values in this format.

### 15.2 Cross-Module Reference Format — Domain-Name-Driven UIDs

No SQL FKs across databases. All cross-module links use **domain-name-driven typed IDs** of the form `MODULE:ULID`. The module prefix is the canonical domain name — this is the integration contract across all Workers and services.

```
QR:01HW3XXXXXXXXXXXXXXXXXXX    ← Quran entity (surah, passage, scope, claim…)
AL:01HY2XXXXXXXXXXXXXXXXXXX    ← Arabic Linguistic entity (root, lemma, nahw, balagha…)
AR:01HZ1XXXXXXXXXXXXXXXXXXX    ← Arabic learning entity (container, vocab, class…)
WV:01JA3XXXXXXXXXXXXXXXXXXX    ← Worldview entity (node, claim, tradition, event…)
CM:01JB4XXXXXXXXXXXXXXXXXXX    ← Content entity (document, note, media, source…)
PL:01JC5XXXXXXXXXXXXXXXXXXX    ← Planner entity (plan, task, packet…)
CORE:01JD6XXXXXXXXXXXXXXXXXXX  ← Core entity (user, workspace, group, role…)
LX:01HY2XXXXXXXXXXXXXXXXXXX    ← Legacy alias for AL — resolves to DB_AL
```

**Sub-typed refs** (for human-readable shorthand inside QR):
```
QR:2:255        ← surah 2, ayah 255
QR:2:255-257    ← surah 2, ayah range 255–257
QR:36           ← entire surah 36
```

Validated at **service level** (Worker code), never at DB level.

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
  return map[module] ?? (() => { throw new Error(`Unknown module: ${module}`); })();
}
```

### 15.3 wrangler.toml Multi-DB Configuration

```toml
# 7 modules — each gets its own D1 binding
[[d1_databases]]
binding = "DB_QR"
database_name = "km_quran"
database_id = "<qr-db-uuid>"

[[d1_databases]]
binding = "DB_AL"
database_name = "km_arabic_linguistic"   # singular — NOT km_arabic_linguistics
database_id = "<al-db-uuid>"
# ALL tables use ar_ling_* prefix (single prefix — no al_* prefix)
# LX:... typed refs also resolve to DB_AL (legacy compat)

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

### 15.4 Worker Service Structure (Multi-DB)

Each module's Workers declare ONLY the bindings they need:

```typescript
// functions/qr/_middleware.ts  — DB_QR + DB_AL (lexical lookups via AL: typed refs)
// functions/al/_middleware.ts  — DB_AL only
// functions/ar/_middleware.ts  — DB_AR + DB_AL + DB_QR
// functions/wv/_middleware.ts  — DB_WV + DB_CM + DB_CORE
// functions/cm/_middleware.ts  — DB_CM + DB_CORE
// functions/pl/_middleware.ts  — DB_PL + DB_QR (passage refs)
// functions/core/_middleware.ts — DB_CORE only
```

### 15.5 Migration Strategy (Single DB → 7 DBs)

Current state: all tables in single `knowledgemap` D1 DB.
Target state: 7 independent module DBs.

**Migration phases:**
1. **Freeze + rename (done)** — canonical prefix renames applied on single DB (qr_*, ar_ling_*)
2. **Schema design (done)** — all 7 module SQL files written, architecture settled
3. **Provision 7 DBs** — `wrangler d1 create` for all 7 module databases
4. **Schema deploy** — run `001_*.sql` migration files on each new DB (no data yet)
5. **Data migration** — export from `knowledgemap`, filter by prefix, import to correct DB
6. **Worker cutover** — update bindings per module, start with QR (read-heavy, safest)
7. **Decommission** — archive `knowledgemap` after all 7 modules cut over

**Provision command pattern:**
```bash
wrangler d1 create km_quran
wrangler d1 create km_arabic_linguistic
wrangler d1 create km_arabic
wrangler d1 create km_worldview
wrangler d1 create km_content
wrangler d1 create km_planner
wrangler d1 create km_core

# Deploy schema in run-order (AL first — no deps)
wrangler d1 execute km_arabic_linguistic \
  --file=database/migrations/km-arabic-linguistic/001_al_schema.sql --remote
wrangler d1 execute km_core \
  --file=database/migrations/km-core/001_core_schema.sql --remote
wrangler d1 execute km_quran \
  --file=database/migrations/km-quran/001_corpus_base.sql --remote
# ...continue per run-order in §15.10
```

### 15.6 Canonical QR Module Layer Stack

Based on final architecture docs (`km_quran_database_architecture_final_final_scan_v7.docx`):

| Layer | Role | Key Families |
|-------|------|-------------|
| 1. Corpus base | Text + coordinate truth | `qr_surahs`, `qr_ayah`, `qr_word_occurrences`, `qr_lemmas`, `qr_lemma_occurrences`, `qr_translations`, `qr_translation_sources`, `qr_page_layout_lines` |
| 2. Surah organism | Atomic identity + sections | `qr_surah_profiles`, `qr_surah_atomic_profiles`, `qr_surah_passages`, `qr_surah_openings`, `qr_surah_closures`, `qr_surah_structural_pivots` |
| 3. Structure science | Patterned composition + bridges | `qr_surah_structure_units`, `qr_surah_structure_links`, `qr_surah_structure_readings`, `qr_surah_symmetry_patterns`, `qr_surah_diamond_patterns`, `qr_surah_sequence_patterns` |
| 4. Literary + sonic | Topic flow, rhetoric, sound | `qr_surah_topic_flows`, `qr_surah_discourse_shifts`, `qr_surah_iltifat_events`, `qr_surah_rhetoric_profiles`, `qr_surah_rhyme_profiles`, `qr_surah_fawasil_patterns`, `qr_surah_coherence_signals` |
| 5. Meaning profiles | Themes, motifs, theology, worldview | `qr_topic_registry`, `qr_scope_topics`, `qr_surah_theme_profiles`, `qr_surah_motif_clusters`, `qr_surah_theology_profiles`, `qr_surah_worldview_profiles` |
| 6. Linguistic nuance | Sentence/clause/phrase/segment intelligence | `qr_ss_occ_segment`, `qr_ss_occ_sentence`, `qr_ss_occ_clause`, `qr_ss_occ_phrase`, `qr_ss_scope_member_map`, `qr_ss_scope_relations`, `qr_ss_syntax_relations`, `qr_ss_scope_morph_link`, `qr_ss_scope_grammar_link`, `qr_ss_scope_balagha_link`, `qr_ss_scope_nuance`, `qr_ss_ellipsis_event`, `qr_ss_scope_reading`, `qr_ss_tree`, `qr_ss_tree_node`, `qr_ss_tree_edge` |
| 7. Reasoning + evidence | Claims, arguments, evidence ontology | `qr_analysis_scopes`, `qr_analysis_claims`, `qr_claim_evidence_links`, `qr_scope_nuances`, `qr_arguments`, `qr_argument_relations`, `qr_evidence_items` |
| 8. Tafsir + reception | Scholarship, interpretive history, material witnesses | `qr_tafsir_entries`, `qr_scholar_profiles`, `qr_scholar_works`, `qr_scholar_positions`, `qr_scholarly_paradigms`, `qr_surah_scholar_readings`, `qr_interpretive_differences`, `qr_surah_reception_histories`, `qr_material_witnesses`, `qr_material_witness_observations` |
| 9. Cross-surah | Relations, Quran-bil-Quran, comparison | `qr_surah_relations`, `qr_quran_bil_quran_relations`, `qr_tradition_sources`, `qr_comparative_claims`, `qr_civilizational_claims` |
| 10. Projections | Graph nodes, diagrams, caches, doc links | `qr_worldview_nodes`, `qr_worldview_edges`, `qr_diagram_specs`, `qr_diagram_instances`, `qr_doc_links`, `qr_surah_analysis_cache`, `qr_passage_analysis_cache` |
| 11. Outer horizon | Late antique, textual history, academic debate | `qr_context_topics`, `qr_context_claims`, `qr_context_evidence_items`, `qr_tradition_relations`, `qr_historical_context_profiles`, `qr_late_antique_contexts`, `qr_material_witness_links`, `qr_script_history_profiles`, `qr_text_history_profiles`, `qr_preservation_discourses`, `qr_academic_question_registry`, `qr_academic_positions` |

**Critical sentence-structure rule (SETTLED):**
- `qr_word_occurrences` = single canonical owner of visible Quranic word occurrences (do NOT create `qr_ss_occ_word`)
- `qr_ss_occ_segment` = attached sub-word elements (particles, articles, pronouns)
- `qr_ss_*` occurrence + scope families populate BEFORE `qr_ss_tree_*` rows are generated
- Tree rows are downstream projections, NOT the primary store of truth

### 15.7 AL Module — km_arabic_linguistic (SETTLED 2026-04-20)

**`km_arabic_linguistic` is the shared Arabic linguistic truth module.** Single prefix `ar_ling_*`. No `al_*` prefix anywhere.

10-layer canonical schema:

| Layer | Name | Key families |
|---|---|---|
| 1 | Root science | `ar_ling_roots`, `ar_ling_root_variants`, `ar_ling_root_relations`, `ar_ling_root_semantic_fields` |
| 2 | Lemma science | `ar_ling_lemmas`, `ar_ling_lemma_variants`, `ar_ling_lemma_root_links`, `ar_ling_lemma_registers` |
| 3 | Sarf / morphology | `ar_ling_morphology`, `ar_ling_lemma_morphology`, `ar_ling_form_paradigms`, `ar_ling_inflection_rules`, `ar_ling_conjugation_templates` |
| 4 | Nahw / syntax | `ar_ling_nahw_concepts`, `ar_ling_nahw_relations`, `ar_ling_sentence_types`, `ar_ling_clause_types`, `ar_ling_phrase_types` |
| 5 | Balagha | `ar_ling_balagha_concepts`, `ar_ling_balagha_branches`, `ar_ling_rhetorical_relations`, `ar_ling_balagha_examples` |
| 6 | Lexicon / semantics | `ar_ling_lexicon_entries`, `ar_ling_senses`, `ar_ling_sense_relations`, `ar_ling_semantic_fields`, `ar_ling_near_synonym_sets` |
| 7 | Expressions | `ar_ling_expressions`, `ar_ling_expression_tokens`, `ar_ling_expression_types`, `ar_ling_collocations` |
| 8 | Sources + evidence | `ar_ling_sources`, `ar_ling_source_editions`, `ar_ling_source_chunks`, `ar_ling_source_index`, `ar_ling_source_toc`, `ar_ling_evidence_items` |
| 9 | Disciplinary trees | `ar_ling_discipline_containers`, `ar_ling_discipline_units`, `ar_ling_discipline_relations` |
| 10 | Bridges + projections | `ar_ling_quran_links`, `ar_ling_arabic_links`, `ar_ling_content_links`, `ar_ling_projection_cache` |

**Cross-module typed refs from AL:**
- QR → AL: `qr_ss_occ_clause.lx_clause_type_ref = 'AL:ULID'`, `qr_ss_scope_grammar_link.lx_grammar_ref = 'AL:ULID'`, `qr_ss_scope_balagha_link.lx_balagha_ref = 'AL:ULID'`
- AR → AL: `ar_vocabulary.lx_lemma_ref = 'AL:ULID'`, `ar_grammar.lx_nahw_ref = 'AL:ULID'`, `ar_applied_balagha.lx_balagha_ref = 'AL:ULID'`

**RULE: Never duplicate roots/lemmas/nahw/sarf/balagha definitions in AR or QR. Always reference AL.**

---

### 15.8 Module Ownership Rules (HARD — do not violate)

1. **QR owns** canonical Quranic text, claims, evidence, structure, rhetoric, tafsir, reception. Not WV.
2. **AL owns** all Arabic linguistic truth: roots, lemmas, sarf, nahw, balagha, lexicon, expressions, disciplinary trees. Not AR, not QR.
3. **AR owns** Arabic pedagogy: curriculum, classes, SRS, lessons, exercises, vocab (via AL:ULID refs). Not linguistic truth.
4. **WV owns** civilizational reasoning engine: traditions, thinkers, moral ontology, claims, events, institutions, maps, diagrams. Not QR Quranic semantics.
5. **CM owns** all authored artifacts: documents, notes, highlights, captures, sources, media, publications. Not WV, not AR.
6. **PL owns** operational execution only: plans, tasks, lanes, reviews, packets, dependencies. Never stores canonical scholarly truth.
7. **CORE owns** identity, workspaces, policies (workspace_policies, resource_policies, resource_grants, external_refs), roles, grants. No domain tables.
8. **Anti-patterns (BLOCK THESE):**
   - WV absorbing Quranic claims as its own canonical truth
   - CM growing its own ACL instead of using CORE policy tables
   - AR hard-coding grammar truth instead of pointing to AL
   - PL duplicating canonical resource content instead of typed refs
   - AL absorbing learner progression or pedagogy (that is AR's domain)

---

### 15.9 Canonical Module Schemas (per-DB migration files)

```
database/migrations/
├── km-arabic-linguistic/        ← ALL ar_ling_* (single prefix)
│   └── 001_al_schema.sql        ← 10 layers: roots→lemmas→sarf→nahw→balagha→lexicon→expressions→sources→disciplinary_trees→bridges
├── km-quran/                    ← FINALIZED — do not touch
│   ├── 001_corpus_base.sql
│   ├── 002_surah_spine.sql
│   ├── 003_meaning_and_reasoning.sql
│   ├── 004_sentence_structure.sql
│   └── 005_reception_and_projections.sql
├── km-arabic/
│   └── 001_ar_schema.sql        ← curriculum→classes→containers→vocab(AL:refs)→grammar(AL:refs)→SRS→lessons→exercises
├── km-worldview/
│   └── 001_wv_schema.sql        ← 10-layer civilizational engine (L1 ontology → L10 workflow)
├── km-content/
│   └── 001_cm_schema.sql        ← docs+notes+captures+sources+media+publications+policy-aware sharing
├── km-planner/
│   └── 001_pl_schema.sql        ← plans+plan_scopes+tasks+task_resources+lanes+review_cycles+packets
└── km-core/
    └── 001_core_schema.sql      ← users+workspaces+workspace_policies+resource_policies+resource_grants+external_refs+roles+grants
```

**Run order** when provisioning a fresh instance (7 DBs):
1. `km_arabic_linguistic` — no deps; shared backbone first
2. `km_core` — no deps; identity + policy substrate
3. `km_quran` — refs AL via typed refs (FINALIZED)
4. `km_arabic` — refs AL, QR
5. `km_worldview` — refs QR, AL, CM, CORE
6. `km_content` — refs QR, WV, AL, AR, CORE
7. `km_planner` — refs all modules via typed refs
