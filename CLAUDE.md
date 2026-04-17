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
├── Database/migrations/     ← SQL migration files
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
  [ ] Database/migrations/2026-03-22_wv_schema.sql  (all wv_* tables)
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
- Passage migration: `Database/migrations/2026-03-22_passage_indexes.sql`
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
-- File: Database/migrations/2026-04-17_pipeline_columns.sql
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
  --file=Database/migrations/2026-04-17_pipeline_columns.sql \
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
