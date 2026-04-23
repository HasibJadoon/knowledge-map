# K-MAPS — Full System Brainstorm & Specification

> Created: 2026-03-22
> This document is the complete brainstorm and design specification for
> the K-MAPS platform. It covers all features, UI/UX, DB schema, and
> component architecture in full detail.

---

## Table of Contents

1. [Platform Vision](#1-platform-vision)
2. [Mental Model](#2-mental-model)
3. [Two-Layer Architecture](#3-two-layer-architecture)
4. [Hub — Global Management Layer](#4-hub--global-management-layer)
5. [Quran Feature](#5-quran-feature)
6. [Arabic Language Feature](#6-arabic-language-feature)
7. [Worldview (Wv) System](#7-worldview-wv-system)
8. [Workspace](#8-workspace)
9. [Planner](#9-planner)
10. [People & Privacy](#10-people--privacy)
11. [Podcast Builder](#11-podcast-builder)
12. [Database Schema (Complete)](#12-database-schema-complete)
13. [Angular Architecture (Complete)](#13-angular-architecture-complete)
14. [Routes](#14-routes)
15. [GSAP Animation Plan](#15-gsap-animation-plan)
16. [Privacy Model](#16-privacy-model)
17. [Build Order](#17-build-order)

---

## 1. Platform Vision

K-MAPS is an Islamic knowledge research platform. It is not a simple Quran reader — it is a **knowledge mapping system** where:

- You read the Quran, Arabic texts, and worldview sources
- You annotate, highlight, distill, and connect ideas
- You compare across traditions (Quran ↔ Bible ↔ Torah ↔ scholar)
- You brainstorm freely on worldview topics
- You build podcasts, study plans, and collaborative workspaces
- Everything is connected — an ayah links to a highlight links to a distillation links to a podcast talking point

The Hub is the management brain. The experience screens are the beautiful output.

---

## 2. Mental Model

```
KNOWLEDGE LAYERS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Primary Texts (Scripture):
  Quran  →  Surah → Ayah → Passage
  Bible  →  Book → Chapter → Verse      (in comparison cells)
  Torah  →  Portion → Chapter → Verse   (in comparison cells)

Secondary Sources (Library):
  wv_source  →  wv_unit  →  wv_sub_unit
  (book/article/podcast episode — no full text stored)

Annotations (on any level):
  wv_highlight  ← captured text from source
  wv_note       ← your thoughts (attached to anything)
  wv_distillation ← synthesised insight from N highlights/notes

Cross-References:
  wv_quran_link  ← connects source/highlight/distillation → ayah range

Research:
  wv_worldview   ← belief system taxonomy
  wv_topic       ← thematic question (Afterlife, God, Prayer…)
  wv_brainstorm  ← free-form journal entry
  wv_comparison  ← parallel multi-column scripture/source grid

Social & Planning:
  wv_person      ← family (private) or friends/colleagues (workspace)
  wv_workspace   ← collaborative project container
  wv_plan        ← reading goals and schedule
  wv_podcast     ← structured podcast with talking points

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 3. Two-Layer Architecture

### Management Layer → `/hub`
The single point of data entry for everything. Think of it as an elegant CMS.
- 3-column layout: sidebar nav | data table | right slide panel
- Right panel morphs to the correct form for any entity
- All creates, edits, and deletes happen here — never on experience screens
- Panel service is globally available (overlays experience screens too)

### Experience Layer → all other routes
Beautiful, immersive, focused interfaces for consuming and exploring knowledge.
- Minimal chrome, maximum content
- Read-heavy, annotation via overlay panel
- GSAP-animated transitions throughout

---

## 4. Hub — Global Management Layer

### Layout
```
┌────────────────────────────────────────────────────────────────────────┐
│  ⬡ Hub                                                    [? Help]     │
├──────────────┬──────────────────────────────────────┬─────────────────┤
│  SIDEBAR     │  CONTENT AREA                        │  RIGHT PANEL    │
│              │                                      │  (slide-in)     │
│  📖 Quran    │  ┌ Stat cards: 114 · 6236 · 892 ┐   │                 │
│    Surahs    │  └──────────────────────────────┘   │  ← all data     │
│    Passages  │  🔍 Search  Filter ▾  Sort ▾         │    entry        │
│    Transltns │  ─────────────────────────────────   │    happens      │
│    Tags      │  TABLE ROWS (sortable, filterable)   │    here         │
│    V.Marks   │  ─────────────────────────────────   │                 │
│              │  ☐  Col1   Col2   Col3   [Edit][Del] │  Form morphs    │
│  ع Arabic    │  ...                                 │  per entity     │
│    Vocab     │  Select all  Bulk delete  Pagination │                 │
│    Grammar   │                                      │                 │
│    Lessons   │                                      │                 │
│    Exercises │                                      │                 │
│    WordLinks │                                      │                 │
│              │                                      │                 │
│  🌍 Worldview│                                      │                 │
│    Worldviews│                                      │                 │
│    Topics    │                                      │                 │
│    Sources   │                                      │                 │
│    Authors   │                                      │                 │
│    Publicatns│                                      │                 │
│    Brainstorm│                                      │                 │
│    Comparisns│                                      │                 │
│    Highlights│                                      │                 │
│    Notes     │                                      │                 │
│    Distilltn │                                      │                 │
│    QuranLinks│                                      │                 │
│    People    │                                      │                 │
│              │                                      │                 │
│  🏛 Workspace│                                      │                 │
│    Workspaces│                                      │                 │
│    Members   │                                      │                 │
│    Plans     │                                      │                 │
│    Sessions  │                                      │                 │
│    Review Q  │                                      │                 │
│    Podcasts  │                                      │                 │
└──────────────┴──────────────────────────────────────┴─────────────────┘
```

### Hub Panel Service
```typescript
type HubPanelMode =
  // Quran
  | 'surah' | 'passage' | 'translation' | 'ayah_tag' | 'verse_mark'
  // Arabic
  | 'vocabulary' | 'grammar' | 'lesson' | 'exercise' | 'word_link'
  // Worldview
  | 'worldview' | 'topic' | 'source' | 'author' | 'publication'
  | 'unit' | 'sub_unit' | 'highlight' | 'note' | 'distillation'
  | 'quran_link' | 'brainstorm' | 'comparison' | 'comparison_cell'
  | 'person'
  // Workspace
  | 'workspace' | 'workspace_member' | 'plan' | 'plan_item'
  | 'reading_session' | 'reminder' | 'podcast' | 'participant' | 'talking_point'
  | null;
```

### Reusable Table Component
One `HubTableComponent` drives all sections. Config object per section:
```typescript
interface HubTableConfig<T> {
  columns: { key: string; label: string; sortable?: boolean; render?: (row: T) => string }[];
  panelMode: HubPanelMode;
  searchKeys: (keyof T)[];
  bulkDelete: boolean;
  filterDefs?: FilterDef[];   // e.g. type dropdown, status dropdown
}
```

---

## 5. Quran Feature

### Existing (Working)
- `/quran` — surah list grid
- `/quran/:surahId` — QuranTextComponent with 3 view modes:
  - **Verse by Verse** — Arabic + translation per ayah
  - **Arabic (Mushaf)** — continuous flow, page breaks, GSAP-animated
  - **Translation** — numbered translation list
- `/quran/:surahId/passage/:passageIndex` — passage view

### Key Implementation Details
- `ar_quran_ayah.text_uthmani_clean` — preferred text column (no verse number, no U+06DD)
- `ar_quran_ayah.verse_mark` — plain Arabic-Indic digits (`١٢٣`)
- Page grouping: `ayahsByPage` computed getter groups ayahs by `page_number`
- Page breaks: GSAP animates `.page-break__line` (scaleX) + `.page-break__num` (scale + opacity)
- Bismillah: shown for all surahs except At-Tawbah (surah 9)
- Al-Fatihah (surah 1, ayah 1) is the Bismillah — skip it in verse lists

### Hub Management (Quran Section)
- **Surahs**: edit metadata (name_ar, name_en, revelation type)
- **Passages**: add/edit passage ranges (surah, ayah_from, ayah_to, theme label)
- **Translations**: per-ayah translation management
- **Ayah Tags**: thematic tagging of ayah ranges
- **Verse Marks**: audit/correct verse_mark values

---

## 6. Arabic Language Feature

### Planned (to be built)
- **Vocabulary**: root → word → meanings → forms → example ayahs
- **Grammar**: rule name → explanation → examples → related rules
- **Lessons**: structured lesson with units, exercises
- **Exercises**: Q&A, fill-blank, matching — linked to vocab/grammar
- **Word Links**: specific word in specific ayah → vocabulary entry

### Hub Management (Arabic Section)
Full CRUD for all Arabic entities via hub table + right panel.

---

## 7. Worldview (Wv) System

### Core Concept
Wv is a **worldview research engine**. It supports:
1. **Library** — collecting and annotating sources (books, articles, papers, news)
2. **Brainstorm Journal** — free-form research log tied to topics and worldviews
3. **Parallel Comparison** — side-by-side multi-column scripture/source viewer
4. **Quran Connections** — linking source passages to Quranic ayahs

### What Wv Does NOT Store
- Full book text
- Complete Bible/Torah text (only cell-level snippets in comparisons)
- Does NOT replace a Quran reader (Quran has its own feature)

### Library (Sources)
```
wv_source (book/article/news/podcast episode)
  └── wv_unit (chapter)
        └── wv_sub_unit (section/paragraph reference)
              └── wv_highlight (captured text)
                    └── wv_note (your thoughts)
                          └── wv_distillation (synthesised insight)
                                └── wv_quran_link (→ ayah range)
```

Source types: `book | paper | article | podcast_ep | video | news | document`

### Brainstorm Journal
- Free-form markdown research notes
- Tagged by worldview(s) and topic
- Status progression: `draft → developing → mature → distilled`
- Linked to: sources, highlights, distillations, Quran ayahs
- Can be converted to a Distillation when mature
- Full-screen editor at `/worldview/brainstorm/:bid`

### Parallel Comparison
The most unique view in the platform. Side-by-side scripture/source comparison:

```
Topic: Concept of Afterlife
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 🟢 Quran     │ ✝ Bible(NIV) │ ✡ Torah      │ + Add tab    │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ ROW 1: Physical Resurrection                               │
│ 2:28         │ John 5:28-29 │ Ezek 37:1-14 │              │
│ [ayah text]  │ [verse text] │ [text]       │              │
│ 📝 note      │ 📝 note      │ 📝 note      │              │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ ROW 2: The Soul After Death                                │
│ 39:42        │ Luke 23:43   │ Eccl 12:7    │              │
│ [ayah text]  │ [verse text] │ [text]       │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

Tab types: `quran | bible | torah | hadith | wv_source | free`
- Quran cells: live-fetched from `ar_quran_ayah`
- Bible/Torah: `scripture_ref` + `scripture_text` stored in cell
- Source cells: linked to `wv_highlight` or `wv_sub_unit`
- Free cells: typed text/scholar quote

### Worldview Taxonomy
```
Islam
  ├── Sunni
  └── Shia
Christianity
  ├── Catholic
  └── Protestant
Judaism
  ├── Orthodox
  └── Reform
Buddhism
Secular Humanism
[+ any user-defined]
```

### Topics (Research Themes)
Hierarchical: parent → child topics
Examples: God → Attributes of God → Omniscience
          Afterlife → Physical Resurrection | Soul After Death | Heaven & Hell

---

## 8. Workspace

### Concept
A collaborative study/research project container. Groups sources, plans, people, and podcasts under one umbrella.

### Types
`personal | study_group | research | podcast_season | course`

### Full-Screen Layout (`/workspace/:wid`)
```
┌──────────────────────────────────────────────────────────┐
│ ← Hub   🏛 [Workspace Name]         [Settings][+ Invite] │
├──────────────────────────────────────────────────────────┤
│ MEMBERS: [👤 You] [👤 Ahmed] [👤 Sara]   + Add member    │
│ (only wv_person with visibility='workspace' shown here)  │
├──────────────────────────────────────────────────────────┤
│ [ Sources ][ Plan ][ Brainstorms ][ Comparisons ][ ... ] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Tab content (scoped to this workspace)                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Workspace Tabs
1. **Sources** — reading list for this workspace
2. **Plan** — active plan summary + item list
3. **Brainstorms** — shared brainstorm entries
4. **Comparisons** — shared comparison grids
5. **Podcasts** — workspace podcasts
6. **Activity** — feed of all member actions

### Activity Feed
Logs: session_logged | highlight_added | note_added | distillation_created | unit_completed | source_added | brainstorm_updated | comparison_updated

---

## 9. Planner

### Concept
Personal reading schedule and goal tracker. Separate from workspace (can link to workspace plan).

### Full-Screen Layout (`/planner`)
```
┌────────────────────────────────────────────────────────────┐
│ ← Hub   📅 Planner       [Week ▾] [+ Plan] [+ Log Session]│
├─────────────┬──────────────────────────────────────────────┤
│  PLANS      │  🔥 Streak: 14d  📚 12 sessions  📖 847 pages│
│  sidebar    │  ─────────────────────────────────────────── │
│             │  [ Calendar ][ Kanban ][ Timeline ] ← toggle  │
│  ● Plan A   │  ─────────────────────────────────────────── │
│    3/7 done │  (view content)                              │
│  ● Plan B   │                                              │
│    1/4 done │  TODAY'S ITEMS                               │
│             │  ☐ Ch.3 — Reconstruction of Religious...     │
│  ─────────  │    📕 Iqbal · target: today · priority: high │
│  + New Plan │  ☐ Review: Distillation on "Ijtihad"         │
└─────────────┴──────────────────────────────────────────────┘
```

### Three Views

#### Calendar View
- Monthly/weekly toggle
- Each day: source icon + session duration
- Color-coded by plan
- Click day → show that day's sessions + items

#### Kanban View
Columns: `Pending | In Progress | Done | Skipped`
- Drag-drop between columns (updates `status`)
- **Filter bar**: by plan ▾ | by priority ▾ | by source ▾ | by date range ▾
- Cards show: source icon, chapter title, target date, priority badge

#### Timeline View
- Gantt-style horizontal bars per plan
- Reading session dots on time axis
- Week/month/quarter zoom

### Reading Streak & Stats
- Streak: consecutive days with a logged session
- Total sessions, total pages, books completed
- GSAP count-up animation on load

---

## 10. People & Privacy

### Two Types (STRICT SEPARATION)

#### Family (visibility = 'private')
- Defined by `relationship IN ('family')` and `visibility = 'private'`
- `family_role`: father | mother | spouse | sibling | child | grandparent | uncle | aunt | cousin
- **NEVER** visible to workspace members
- **NEVER** appears in workspace member picker UI
- **NEVER** included in activity feeds visible to others
- Only owner can see their own family contacts
- Can be referenced in personal notes (privately)

#### Friends / Colleagues (visibility = 'workspace')
- `relationship IN ('friend', 'colleague', 'scholar', 'mentor')`
- Can be added to workspaces
- Visible to other workspace members within shared workspaces
- Can be podcast participants
- Their activity in shared workspaces is visible to other members

### UI Separation
- Hub > People section: two tabs — **Family** (private) | **Friends & Colleagues** (workspace)
- Workspace member picker: only shows `visibility = 'workspace'` people
- Family tab in hub has a lock icon 🔒 to reinforce privacy
- No UI path that would expose family to workspace

---

## 11. Podcast Builder

### Concept
Create structured audio content (solo monologue, dialogue, or panel discussion) anchored to reading material.

### Types
- **Solo** — personal reflection/lecture
- **Dialogue** — 1:1 conversation (with a friend or scholar)
- **Panel** — 1-to-many group discussion

### 4-Step Wizard (inside `/worldview/podcast/:pid` or hub-managed)

**Step 1: Info & Type**
- Title, description
- Type: solo | dialogue | panel
- Status: planning | recorded | published

**Step 2: Sources**
- Pick N sources from library
- These anchor the podcast content

**Step 3: Participants**
- Add from `wv_person` (visibility='workspace') or `wv_author`
- Or type ad-hoc name
- Assign roles: host | co-host | guest | interviewee
- Drag-reorder

**Step 4: Talking Points**
- Add talking points (drag-reorder)
- Each point can be anchored to:
  - A highlight from a source
  - A distillation
  - A direct Quran ayah range
  - A brainstorm entry
- Each point has an estimated duration (minutes)
- Total runtime shown

---

## 12. Database Schema (Complete)

### Migrations
All new tables: `database/migrations/legacy/2026-03-22_wv_schema.sql`

### Indexes (complete list for wv_*)
```sql
-- Sources
CREATE INDEX idx_wv_source_status    ON wv_source(status);
CREATE INDEX idx_wv_source_type      ON wv_source(type);
CREATE INDEX idx_wv_source_author    ON wv_source_author(source_id);

-- Units
CREATE INDEX idx_wv_unit_source      ON wv_unit(source_id, sort_order);
CREATE INDEX idx_wv_sub_unit         ON wv_sub_unit(unit_id, sort_order);

-- Annotations
CREATE INDEX idx_wv_highlight_source ON wv_highlight(source_id);
CREATE INDEX idx_wv_highlight_unit   ON wv_highlight(unit_id);
CREATE INDEX idx_wv_note_source      ON wv_note(source_id);
CREATE INDEX idx_wv_distil_source    ON wv_distillation(source_id);
CREATE INDEX idx_wv_qlink_surah      ON wv_quran_link(surah, ayah_from, ayah_to);

-- Research
CREATE INDEX idx_wv_bs_topic         ON wv_brainstorm(topic_id, status);
CREATE INDEX idx_wv_bs_updated       ON wv_brainstorm(updated_at DESC);
CREATE INDEX idx_wv_comp_topic       ON wv_comparison(topic_id);
CREATE INDEX idx_wv_tab_comp         ON wv_comparison_tab(comparison_id, position);
CREATE INDEX idx_wv_row_comp         ON wv_comparison_row(comparison_id, position);
CREATE INDEX idx_wv_cell_row         ON wv_comparison_cell(row_id);

-- People
CREATE INDEX idx_wv_person_vis       ON wv_person(visibility, relationship);

-- Workspace
CREATE INDEX idx_wv_ws_member        ON wv_workspace_member(workspace_id);
CREATE INDEX idx_wv_ws_source        ON wv_workspace_source(workspace_id);
CREATE INDEX idx_wv_activity_ws      ON wv_activity(workspace_id, created_at DESC);

-- Planner
CREATE INDEX idx_wv_plan_ws          ON wv_plan(workspace_id);
CREATE INDEX idx_wv_plan_item        ON wv_plan_item(plan_id, sort_order);
CREATE INDEX idx_wv_session_src      ON wv_reading_session(source_id, date);
CREATE INDEX idx_wv_reminder_due     ON wv_reminder(due_date, status);

-- Podcast
CREATE INDEX idx_wv_tp_podcast       ON wv_talking_point(podcast_id, sort_order);
```

---

## 13. Angular Architecture (Complete)

### Feature Folder Structure
```
apps/k-maps-v2/src/app/features/

hub/
  hub.component.ts/.html/.scss
  hub.routes.ts
  sidebar/
    hub-sidebar.component.ts
  sections/
    quran/
      hub-quran-shell.component.ts
      hub-surahs.component.ts
      hub-passages.component.ts
      hub-translations.component.ts
      hub-ayah-tags.component.ts
      hub-verse-marks.component.ts
    arabic/
      hub-arabic-shell.component.ts
      hub-vocabulary.component.ts
      hub-grammar.component.ts
      hub-lessons.component.ts
      hub-exercises.component.ts
      hub-word-links.component.ts
    worldview/
      hub-wv-shell.component.ts
      hub-worldviews.component.ts
      hub-topics.component.ts
      hub-sources.component.ts
      hub-authors.component.ts
      hub-publications.component.ts
      hub-brainstorms.component.ts
      hub-comparisons.component.ts
      hub-highlights.component.ts
      hub-notes.component.ts
      hub-distillations.component.ts
      hub-quran-links.component.ts
      hub-people.component.ts        ← two tabs: Family | Friends
    workspace/
      hub-workspace-shell.component.ts
      hub-workspaces.component.ts
      hub-members.component.ts
      hub-plans.component.ts
      hub-sessions.component.ts
      hub-review.component.ts
      hub-podcasts.component.ts
  panel/
    hub-panel.component.ts
    hub-panel.service.ts
    forms/
      (one form component per entity — ~28 forms)
  shared/
    hub-table.component.ts
    hub-search-bar.component.ts
    hub-bulk-actions.component.ts
    hub-stat-card.component.ts
    hub-empty-state.component.ts

worldview/
  worldview.routes.ts
  worldview.component.ts             ← landing / overview
  compare/
    wv-compare-list.component.ts     ← list of comparisons
    wv-compare-detail.component.ts   ← FULL SCREEN grid
    wv-compare-tab.component.ts      ← column header
    wv-compare-row.component.ts      ← row
    wv-compare-cell.component.ts     ← cell (quran/bible/free)
  brainstorm/
    wv-brainstorm-list.component.ts
    wv-brainstorm-detail.component.ts ← FULL SCREEN markdown editor
    wv-brainstorm-card.component.ts
  reader/
    wv-reader.component.ts           ← FULL SCREEN source reader
    wv-notes-panel.component.ts
    wv-highlight.component.ts
  shared/
    wv.service.ts
    wv-worldview-badge.component.ts
    wv-type-badge.component.ts
    wv-status-badge.component.ts

workspace/
  workspace.routes.ts
  workspace.component.ts             ← FULL SCREEN
  workspace-header.component.ts      ← title + members strip
  workspace-tabs.component.ts
  tabs/
    workspace-sources-tab.component.ts
    workspace-plan-tab.component.ts
    workspace-brainstorm-tab.component.ts
    workspace-compare-tab.component.ts
    workspace-podcast-tab.component.ts
    workspace-activity-tab.component.ts
  shared/
    workspace.service.ts
    member-avatar.component.ts

planner/
  planner.routes.ts
  planner.component.ts               ← FULL SCREEN
  planner-sidebar.component.ts       ← plan list + streak
  planner-toolbar.component.ts       ← view toggle + filters
  views/
    planner-calendar.component.ts
    planner-kanban.component.ts      ← with filter bar
    planner-timeline.component.ts
  shared/
    plan-item-card.component.ts
    session-card.component.ts
    streak-bar.component.ts
    review-queue.component.ts
    planner.service.ts
```

---

## 14. Routes

### Existing (in app.routes.ts)
```
/landing, /login, /hub, /quran, /arabic, /worldview, /planner, /workspace, /content
```

### Hub Routes (to expand)
```typescript
export const HUB_ROUTES: Routes = [
  {
    path: '',
    component: HubComponent,
    children: [
      { path: 'quran',     component: HubQuranShellComponent },
      { path: 'arabic',    component: HubArabicShellComponent },
      { path: 'worldview', component: HubWvShellComponent },
      { path: 'workspace', component: HubWorkspaceShellComponent },
      { path: '', redirectTo: 'quran', pathMatch: 'full' },
    ]
  }
];
```

### Worldview Routes (to expand)
```typescript
export const WORLDVIEW_ROUTES: Routes = [
  { path: '', component: WorldviewComponent },
  { path: 'compare/:cid', loadComponent: () => import('./compare/wv-compare-detail.component') },
  { path: 'brainstorm/:bid', loadComponent: () => import('./brainstorm/wv-brainstorm-detail.component') },
  { path: ':sourceId/read', loadComponent: () => import('./reader/wv-reader.component') },
];
```

### Planner Routes (to expand)
```typescript
export const PLANNER_ROUTES: Routes = [
  { path: '', component: PlannerComponent },
  // All sub-views (calendar/kanban/timeline) are state-driven, not route-driven
];
```

### Workspace Routes (to expand)
```typescript
export const WORKSPACE_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./workspace-list.component') },
  { path: ':wid', component: WorkspaceComponent },
];
```

---

## 15. GSAP Animation Plan

### Hub
```typescript
// Table rows stagger
gsap.fromTo('tr.hub-row', { opacity:0, y:8 }, { opacity:1, y:0, stagger:0.025 })

// Stat card count-up
gsap.fromTo(el, { textContent:0 }, { textContent:count, snap:{ textContent:1 }, duration:0.8 })

// Section nav indicator slide
gsap.to('.hub-nav__indicator', { y: activeItemY, duration:0.35, ease:'expo.out' })

// Panel open/close/morph
open:   gsap.fromTo(panel, { x:360, opacity:0 }, { x:0, opacity:1, duration:0.35, ease:'expo.out' })
close:  gsap.to(panel, { x:360, opacity:0, duration:0.25, ease:'expo.in' })
morph:  gsap.fromTo(form, { opacity:0, y:10 }, { opacity:1, y:0, duration:0.22, ease:'power2.out' })
```

### Comparison
```typescript
// Columns slide in staggered
gsap.fromTo('.comp-tab', { x:-30, opacity:0 }, { x:0, opacity:1, stagger:0.06 })

// New row drops in
gsap.fromTo(newRow, { y:20, opacity:0 }, { y:0, opacity:1, duration:0.3, ease:'power2.out' })

// Cell edit flash (after save)
gsap.to(cell, { boxShadow:'0 0 0 2px rgba(201,168,76,0.6)', duration:0.2, yoyo:true, repeat:1 })
```

### Planner
```typescript
// Calendar cells stagger
gsap.fromTo('.cal-day', { opacity:0, scale:0.9 }, { opacity:1, scale:1, stagger:{ amount:0.4 } })

// Kanban drag
dragStart: gsap.to(card, { scale:1.04, boxShadow:'0 12px 40px rgba(201,168,76,0.25)' })
drop:      gsap.fromTo(card, { y:-8 }, { y:0, ease:'bounce.out' })

// Check off item
gsap.timeline()
  .to(check, { scale:1.3, duration:0.15 })
  .to(check, { scale:1,   duration:0.1  })
  .to(text,  { opacity:0.4, duration:0.3 }, '-=0.1')

// Streak count-up
gsap.fromTo(streak, { textContent:0 }, { textContent:14, snap:{ textContent:1 }, duration:1 })

// View switch (calendar/kanban/timeline)
gsap.fromTo(newView, { opacity:0, y:12 }, { opacity:1, y:0, duration:0.3, ease:'power2.out' })
```

### Workspace
```typescript
// Member avatars pop in
gsap.fromTo('.member-avatar', { scale:0, opacity:0 },
  { scale:1, opacity:1, stagger:0.06, ease:'back.out(2)' })

// Tab content crossfade
gsap.fromTo(content, { opacity:0, y:10 }, { opacity:1, y:0, duration:0.28 })

// Activity feed items
gsap.fromTo('.activity-item', { opacity:0, x:-16 }, { opacity:1, x:0, stagger:0.05 })

// Progress bar fill
gsap.fromTo(bar, { width:'0%' }, { width:`${pct}%`, duration:0.8, ease:'power3.out' })
```

### Brainstorm
```typescript
// Card entrance
gsap.fromTo('.bs-card', { opacity:0, y:16 }, { opacity:1, y:0, stagger:0.04 })

// Status advance (dots)
gsap.fromTo(dot, { scale:0.6, opacity:0 }, { scale:1, opacity:1, ease:'back.out(2)' })

// Convert to distillation
gsap.timeline()
  .to(card, { scale:1.04, borderColor:'var(--km-gold)', duration:0.3 })
  .to(card, { y:-40, opacity:0, duration:0.4, ease:'power2.in' })
```

---

## 16. Privacy Model

### The Rule
```
Family (visibility='private')     ←→   Workspace (visibility='workspace')
        ↕                                         ↕
  FULLY INVISIBLE                        VISIBLE TO MEMBERS
  to everyone else                      within shared workspaces
```

### Implementation Checkpoints
1. **DB level**: `wv_workspace_member.person_id` must reference `wv_person WHERE visibility='workspace'`. Worker validates before INSERT.
2. **API level**: `/api/worldview/people` respects ownership — never returns other users' private contacts.
3. **UI level**: Workspace member picker queries: `WHERE visibility = 'workspace'`
4. **Hub People section**: Two tabs — 🔒 Family (private) | 👥 Friends & Colleagues
5. **Activity feed**: `wv_activity` only logs workspace-visible people. Never logs family member involvement.
6. **Podcast participants**: Only `visibility='workspace'` people appear in participant picker.

---

## 17. Build Order

```
━━━ Phase 1: Database ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] database/migrations/legacy/2026-03-22_wv_schema.sql
    All wv_* tables + all indexes
[ ] wrangler d1 execute knowledgemap --file=... --remote
[ ] Seed worldview rows (Islam/Christianity/Judaism + branches)

━━━ Phase 2: Worker API ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] functions/worldview/sources.ts
[ ] functions/worldview/units.ts
[ ] functions/worldview/highlights.ts
[ ] functions/worldview/notes.ts
[ ] functions/worldview/distillations.ts
[ ] functions/worldview/quran-links.ts
[ ] functions/worldview/brainstorm.ts
[ ] functions/worldview/comparison.ts
[ ] functions/worldview/people.ts        ← privacy filter here
[ ] functions/workspace/index.ts
[ ] functions/workspace/members.ts       ← privacy filter here
[ ] functions/workspace/activity.ts
[ ] functions/planner/plans.ts
[ ] functions/planner/sessions.ts

━━━ Phase 3: Hub Shell ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] HubComponent (3-col layout + child routing)
[ ] HubSidebarComponent (4 sections, animated indicator)
[ ] HubPanelService (signal-based, global)
[ ] HubPanelComponent (slide-in container)
[ ] HubTableComponent (reusable sortable/filterable)
[ ] HubStatCardComponent

━━━ Phase 4: Hub Sections ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Quran section (surahs, passages, translations, tags)
[ ] Worldview section (worldviews, topics, sources, authors)
[ ] People section (Family tab + Friends tab — privacy UI)
[ ] Workspace section (workspaces, members, plans, podcasts)
[ ] Arabic section (vocab, grammar, lessons)

━━━ Phase 5: Experience Screens ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Workspace full screen (/workspace/:wid)
[ ] Planner full screen (/planner) — calendar + kanban + timeline
[ ] Worldview Comparison (/worldview/compare/:cid)
[ ] Brainstorm Editor (/worldview/brainstorm/:bid)
[ ] Source Reader (/worldview/:id/read)

━━━ Phase 6: Podcast ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ ] Podcast CRUD via hub
[ ] Podcast 4-step wizard (managed from hub or workspace)
[ ] Talking points drag-reorder
[ ] Export/outline view
```

---

## Appendix: Naming Conventions

| Thing | Convention |
|---|---|
| Angular components | `kebab-case.component.ts` |
| Services | `kebab-case.service.ts` |
| Route exports | `FEATURE_ROUTES` |
| DB tables | `wv_snake_case` (worldview), `ar_snake_case` (arabic/quran) |
| CSS classes | BEM `.block__element--modifier` |
| CSS variables | `--km-variable-name` |
| Migration files | `YYYY-MM-DD_description.sql` |
| Worker functions | `functions/feature/entity.ts` |

## Appendix: Arabic Font Notes

| Font | File | Use |
|---|---|---|
| UthmanicHafs_V22 | UthmanicHafs_V22.woff2 (104KB) | Quran text (all views) |
| AmiriQuran | AmiriQuran.woff2 (61KB) | Available, not currently used for verse marks |
| QCFSurahHeader | QCF_SurahHeader_COLOR-Regular.woff2 | Surah name headers |
| SurahName | surah-name-v2.woff2 | Alternative surah names |

**CRITICAL**: UthmanicHafs renders U+06DD (۝) as an empty oval frame, NOT as a combined medallion with the digit. Always strip U+06DD and render plain Arabic-Indic digits only.
