# K-MAPS — Claude Deep Memory

> Last updated: 2026-03-22
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

---

## 7. Full Database Schema — Worldview System

> Migration file: Database/migrations/2026-03-22_wv_schema.sql (TO BE CREATED)

### Publications & Authors
```sql
CREATE TABLE wv_publication (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'publisher'|'journal'|'news'|'podcast_network'|'blog'|'magazine'
  url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_author (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_ar TEXT,
  bio TEXT,
  url TEXT,
  publication_id INTEGER REFERENCES wv_publication(id),
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Sources (Library)
```sql
CREATE TABLE wv_source (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  title_ar TEXT,
  type TEXT NOT NULL,  -- 'book'|'paper'|'article'|'podcast_ep'|'video'|'news'|'document'
  publication_id INTEGER REFERENCES wv_publication(id),
  published_date TEXT,
  url TEXT,
  isbn TEXT,
  cover_url TEXT,
  language TEXT DEFAULT 'en',
  total_pages INTEGER,
  status TEXT DEFAULT 'unread',  -- 'unread'|'reading'|'completed'|'reference'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_source_author (
  source_id INTEGER NOT NULL REFERENCES wv_source(id),
  author_id INTEGER NOT NULL REFERENCES wv_author(id),
  role TEXT DEFAULT 'author',  -- 'author'|'editor'|'translator'|'contributor'
  PRIMARY KEY (source_id, author_id)
);
```

### Units & Sub-Units
```sql
CREATE TABLE wv_unit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES wv_source(id),
  title TEXT NOT NULL,
  number INTEGER,
  page_from INTEGER,
  page_to INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'unread',  -- 'unread'|'reading'|'completed'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_sub_unit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL REFERENCES wv_unit(id),
  title TEXT,
  content_ref TEXT,
  page_from INTEGER,
  page_to INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Annotations
```sql
CREATE TABLE wv_highlight (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES wv_source(id),
  unit_id INTEGER REFERENCES wv_unit(id),
  sub_unit_id INTEGER REFERENCES wv_sub_unit(id),
  text TEXT NOT NULL,
  page INTEGER,
  color TEXT DEFAULT 'gold',      -- 'gold'|'blue'|'green'|'red'|'purple'
  category TEXT,                   -- 'key_idea'|'evidence'|'question'|'critique'|'definition'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_note (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER REFERENCES wv_source(id),
  unit_id INTEGER REFERENCES wv_unit(id),
  sub_unit_id INTEGER REFERENCES wv_sub_unit(id),
  highlight_id INTEGER REFERENCES wv_highlight(id),
  content TEXT NOT NULL,
  tags TEXT,  -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_distillation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER REFERENCES wv_source(id),
  unit_id INTEGER REFERENCES wv_unit(id),
  title TEXT,
  thesis TEXT NOT NULL,
  evidence TEXT,   -- JSON array of highlight IDs
  tags TEXT,       -- JSON array
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_quran_link (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER REFERENCES wv_source(id),
  unit_id INTEGER REFERENCES wv_unit(id),
  sub_unit_id INTEGER REFERENCES wv_sub_unit(id),
  highlight_id INTEGER REFERENCES wv_highlight(id),
  distillation_id INTEGER REFERENCES wv_distillation(id),
  note_id INTEGER REFERENCES wv_note(id),
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER NOT NULL,
  relationship TEXT DEFAULT 'related',
    -- 'supports'|'contradicts'|'context'|'illustrates'|'questions'|'related'
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### People (PRIVACY CRITICAL)
```sql
CREATE TABLE wv_person (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  nickname TEXT,
  relationship TEXT NOT NULL,  -- 'family'|'friend'|'colleague'|'scholar'|'mentor'
  family_role TEXT,            -- 'father'|'mother'|'spouse'|'sibling'|'child' (family only)
  visibility TEXT NOT NULL DEFAULT 'private',
    -- 'private'  = FAMILY — never shown to workspace members, never in WS member picker
    -- 'workspace' = friends/colleagues — can be added to workspaces
  avatar_url TEXT,
  bio TEXT,
  author_id INTEGER REFERENCES wv_author(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- PRIVACY RULE: wv_person WHERE visibility='private' (family)
-- MUST NEVER appear in workspace member pickers or activity feeds
-- MUST NEVER be visible to other workspace members
-- Only the owner can see their own family contacts
```

### Worldview Research
```sql
CREATE TABLE wv_worldview (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,   -- 'Islam'|'Christianity'|'Judaism'|'Buddhism'|'Secular Humanism'
  type TEXT NOT NULL,   -- 'religion'|'philosophy'|'ideology'|'school_of_thought'
  parent_id INTEGER REFERENCES wv_worldview(id),
  description TEXT,
  color TEXT,  -- UI accent e.g. '#2C7A4B'
  icon TEXT,   -- emoji
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed: Islam(1), Sunni→Islam(2), Shia→Islam(3),
--       Christianity(4), Catholic→Christianity(5), Protestant→Christianity(6),
--       Judaism(7), Orthodox→Judaism(8), Reform→Judaism(9)

CREATE TABLE wv_topic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,   -- 'Afterlife'|'God'|'Prayer'|'Justice'|'Creation'
  description TEXT,
  parent_id INTEGER REFERENCES wv_topic(id),
  tags TEXT,  -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_brainstorm (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  topic_id INTEGER REFERENCES wv_topic(id),
  content TEXT,   -- markdown
  status TEXT DEFAULT 'draft',  -- 'draft'|'developing'|'mature'|'distilled'
  tags TEXT,      -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_brainstorm_worldview (
  brainstorm_id INTEGER NOT NULL REFERENCES wv_brainstorm(id),
  worldview_id INTEGER NOT NULL REFERENCES wv_worldview(id),
  PRIMARY KEY (brainstorm_id, worldview_id)
);

CREATE TABLE wv_brainstorm_source (
  brainstorm_id INTEGER NOT NULL REFERENCES wv_brainstorm(id),
  source_id INTEGER NOT NULL REFERENCES wv_source(id),
  PRIMARY KEY (brainstorm_id, source_id)
);

CREATE TABLE wv_brainstorm_quran (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brainstorm_id INTEGER NOT NULL REFERENCES wv_brainstorm(id),
  surah INTEGER NOT NULL,
  ayah_from INTEGER NOT NULL,
  ayah_to INTEGER NOT NULL,
  note TEXT
);
```

### Parallel Comparison
```sql
CREATE TABLE wv_comparison (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  topic_id INTEGER REFERENCES wv_topic(id),
  description TEXT,
  status TEXT DEFAULT 'draft',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_comparison_tab (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comparison_id INTEGER NOT NULL REFERENCES wv_comparison(id),
  label TEXT NOT NULL,   -- 'Quran'|'Bible (KJV)'|'Torah'|'Ibn Kathir'
  source_type TEXT NOT NULL,
    -- 'quran'|'bible'|'torah'|'hadith'|'wv_source'|'free'
  worldview_id INTEGER REFERENCES wv_worldview(id),
  wv_source_id INTEGER REFERENCES wv_source(id),
  position INTEGER NOT NULL,
  color TEXT
);

CREATE TABLE wv_comparison_row (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  comparison_id INTEGER NOT NULL REFERENCES wv_comparison(id),
  theme TEXT,
  position INTEGER NOT NULL
);

CREATE TABLE wv_comparison_cell (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  row_id INTEGER NOT NULL REFERENCES wv_comparison_row(id),
  tab_id INTEGER NOT NULL REFERENCES wv_comparison_tab(id),
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  scripture_ref TEXT,   -- 'John 3:16' | 'Genesis 1:1'
  scripture_text TEXT,
  highlight_id INTEGER REFERENCES wv_highlight(id),
  sub_unit_id INTEGER REFERENCES wv_sub_unit(id),
  free_text TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE (row_id, tab_id)
);
```

### Workspace & People
```sql
CREATE TABLE wv_workspace (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'personal',
    -- 'personal'|'study_group'|'research'|'podcast_season'|'course'
  icon TEXT,
  color TEXT,
  status TEXT DEFAULT 'active',  -- 'active'|'archived'|'completed'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- PRIVACY: Only wv_person WHERE visibility='workspace' can be workspace members
CREATE TABLE wv_workspace_member (
  workspace_id INTEGER NOT NULL REFERENCES wv_workspace(id),
  person_id INTEGER NOT NULL REFERENCES wv_person(id),
  role TEXT DEFAULT 'member',  -- 'owner'|'member'|'viewer'
  joined_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, person_id)
  -- DB CHECK: person must have visibility='workspace'
);

CREATE TABLE wv_workspace_source (
  workspace_id INTEGER NOT NULL REFERENCES wv_workspace(id),
  source_id INTEGER NOT NULL REFERENCES wv_source(id),
  added_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, source_id)
);

CREATE TABLE wv_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER NOT NULL REFERENCES wv_workspace(id),
  person_id INTEGER REFERENCES wv_person(id),
  action TEXT NOT NULL,
    -- 'session_logged'|'highlight_added'|'note_added'|'distillation_created'
    -- 'unit_completed'|'source_added'|'brainstorm_updated'|'comparison_updated'
  entity_type TEXT,
  entity_id INTEGER,
  meta TEXT,  -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Planner
```sql
CREATE TABLE wv_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id INTEGER REFERENCES wv_workspace(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'reading',  -- 'reading'|'study'|'review'|'podcast_prep'
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT DEFAULT 'active',  -- 'active'|'completed'|'paused'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_plan_item (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id INTEGER NOT NULL REFERENCES wv_plan(id),
  source_id INTEGER REFERENCES wv_source(id),
  unit_id INTEGER REFERENCES wv_unit(id),
  title TEXT,
  target_date TEXT,
  priority INTEGER DEFAULT 2,  -- 1=high 2=medium 3=low
  status TEXT DEFAULT 'pending',  -- 'pending'|'in_progress'|'done'|'skipped'
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE wv_reading_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_item_id INTEGER REFERENCES wv_plan_item(id),
  source_id INTEGER NOT NULL REFERENCES wv_source(id),
  unit_id INTEGER REFERENCES wv_unit(id),
  sub_unit_id INTEGER REFERENCES wv_sub_unit(id),
  date TEXT NOT NULL DEFAULT (date('now')),
  duration_mins INTEGER,
  page_from INTEGER,
  page_to INTEGER,
  reflection TEXT,
  mood TEXT,  -- 'focused'|'distracted'|'inspired'|'confused'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_reminder (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  distillation_id INTEGER REFERENCES wv_distillation(id),
  note_id INTEGER REFERENCES wv_note(id),
  highlight_id INTEGER REFERENCES wv_highlight(id),
  due_date TEXT NOT NULL,
  interval_days INTEGER DEFAULT 7,
  status TEXT DEFAULT 'pending',  -- 'pending'|'done'|'snoozed'
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Podcasts
```sql
CREATE TABLE wv_podcast (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'solo',     -- 'solo'|'dialogue'|'panel'
  status TEXT DEFAULT 'planning', -- 'planning'|'recorded'|'published'
  recorded_at TEXT,
  published_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE wv_podcast_source (
  podcast_id INTEGER NOT NULL REFERENCES wv_podcast(id),
  source_id INTEGER NOT NULL REFERENCES wv_source(id),
  PRIMARY KEY (podcast_id, source_id)
);

CREATE TABLE wv_podcast_participant (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  podcast_id INTEGER NOT NULL REFERENCES wv_podcast(id),
  author_id INTEGER REFERENCES wv_author(id),
  person_id INTEGER REFERENCES wv_person(id),
  name TEXT,
  role TEXT DEFAULT 'guest',  -- 'host'|'co-host'|'guest'|'interviewee'
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE wv_talking_point (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  podcast_id INTEGER NOT NULL REFERENCES wv_podcast(id),
  content TEXT NOT NULL,
  source_id INTEGER REFERENCES wv_source(id),
  unit_id INTEGER REFERENCES wv_unit(id),
  highlight_id INTEGER REFERENCES wv_highlight(id),
  distillation_id INTEGER REFERENCES wv_distillation(id),
  surah INTEGER,
  ayah_from INTEGER,
  ayah_to INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  duration_mins INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 7b. Arabic Language System — Full Schema

> Migration: Database/migrations/2026-03-22_arabic_schema.sql (TO BE CREATED)
> Goal: Arabic + Classical Arabic proficiency. Two tracks: Content Library + Linguistics.

### Content Library
```sql
-- Literature containers: book, podcast, poetry, classical text, etc.
CREATE TABLE ar_container (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  title_ar     TEXT,
  type         TEXT NOT NULL,  -- 'book'|'podcast'|'poetry'|'essay'|'speech'|'article'|'classical_text'
  author       TEXT,
  level        TEXT NOT NULL,  -- 'beginner'|'intermediate'|'advanced'|'classical'
  domain       TEXT,           -- 'religious'|'literary'|'contemporary'|'classical'
  total_units  INTEGER,
  description  TEXT,
  url          TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Chapters / sections within a container
CREATE TABLE ar_container_unit (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  container_id INTEGER NOT NULL REFERENCES ar_container(id),
  title        TEXT NOT NULL,
  title_ar     TEXT,
  number       INTEGER,
  content_ref  TEXT,   -- page/timestamp reference
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now'))
);

-- Tasks: reading, vocabulary, comprehension, spaced repetition
CREATE TABLE ar_task (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  container_id  INTEGER REFERENCES ar_container(id),
  unit_id       INTEGER REFERENCES ar_container_unit(id),
  type          TEXT NOT NULL,  -- 'reading'|'vocabulary'|'comprehension'|'srs'
  title         TEXT NOT NULL,
  content       TEXT,
  answer        TEXT,
  difficulty    INTEGER DEFAULT 2,  -- 1=easy 2=medium 3=hard
  status        TEXT DEFAULT 'pending',  -- 'pending'|'in_progress'|'done'
  due_date      TEXT,
  next_review   TEXT,
  interval_days INTEGER DEFAULT 1,
  ease_factor   REAL DEFAULT 2.5,  -- SM-2 spaced repetition
  created_at    TEXT DEFAULT (datetime('now')),
  completed_at  TEXT
);
```

### Shared SRS Table
```sql
-- SHARED spaced repetition table — used by BOTH Quran and Arabic learning systems
-- ar_srs already exists for Quran; Arabic reuses the same table with entity_type
CREATE TABLE ar_srs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type   TEXT NOT NULL,  -- 'vocab'|'grammar'|'balagha'|'phrase'|'task'|'ayah'
  entity_id     INTEGER NOT NULL,
  next_review   TEXT NOT NULL DEFAULT (date('now')),
  interval_days INTEGER DEFAULT 1,
  ease_factor   REAL DEFAULT 2.5,
  repetitions   INTEGER DEFAULT 0,
  last_quality  INTEGER,   -- 0-5 SM-2 quality rating
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX idx_ar_srs_review ON ar_srs(next_review, entity_type);
```
**NOTE**: Quran SRS and Arabic learning SRS share this table. Do NOT embed SRS fields directly in ar_vocab or ar_task.

### Vocabulary
```sql
CREATE TABLE ar_vocab (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  root           TEXT,           -- trilateral root e.g. ك-ت-ب
  word           TEXT NOT NULL,
  pattern        TEXT,           -- morphological wazn (وزن)
  meanings       TEXT NOT NULL,  -- JSON array
  forms          TEXT,           -- JSON: { plural, dual, fem, verb_conjugations }
  examples       TEXT,           -- JSON [{ sentence, translation }]
  level          TEXT DEFAULT 'beginner',
  domain         TEXT,
  frequency_rank INTEGER,
  -- NO SRS fields here — use ar_srs table with entity_type='vocab'
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ar_vocab_unit (
  vocab_id  INTEGER NOT NULL REFERENCES ar_vocab(id),
  unit_id   INTEGER NOT NULL REFERENCES ar_container_unit(id),
  PRIMARY KEY (vocab_id, unit_id)
);

CREATE TABLE ar_vocab_ayah (
  vocab_id  INTEGER NOT NULL REFERENCES ar_vocab(id),
  surah     INTEGER NOT NULL,
  ayah      INTEGER NOT NULL,
  PRIMARY KEY (vocab_id, surah, ayah)
);
```

### Linguistics — 1. Grammar
```sql
CREATE TABLE ar_grammar_rule (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  term_ar      TEXT NOT NULL,   -- e.g. مبتدأ, فاعل, مفعول به
  term_en      TEXT NOT NULL,   -- e.g. Subject, Doer, Object
  category     TEXT NOT NULL,   -- 'noun'|'verb'|'particle'|'sentence_structure'|'iraab'
  sub_category TEXT,            -- e.g. 'raf'|'nasb'|'jarr' for إعراب
  explanation  TEXT NOT NULL,
  formula      TEXT,
  examples     TEXT,            -- JSON [{ ar, en, source }]
  tags         TEXT,            -- JSON
  sort_order   INTEGER DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ar_idiom (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase_ar   TEXT NOT NULL,
  phrase_en   TEXT NOT NULL,
  context     TEXT,   -- 'formal'|'informal'|'classical'|'colloquial'
  examples    TEXT,   -- JSON
  created_at  TEXT DEFAULT (datetime('now'))
);
```

### Linguistics — 2. Balagha (Arabic Rhetoric)
```sql
CREATE TABLE ar_balagha (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  term_ar     TEXT NOT NULL,  -- تشبيه | استعارة | كناية | طباق | جناس
  term_en     TEXT NOT NULL,  -- Simile | Metaphor | Metonymy | Antithesis | Paronomasia
  branch      TEXT NOT NULL,  -- 'bayan'|'maani'|'badi'
    -- علم البيان (figurative) | علم المعاني (semantics) | علم البديع (embellishment)
  definition  TEXT NOT NULL,
  examples    TEXT,           -- JSON [{ ar, en, source }]
  quran_refs  TEXT,           -- JSON [{ surah, ayah_from, ayah_to, note }]
  created_at  TEXT DEFAULT (datetime('now'))
);
```

### Linguistics — 3. Context Domains (Arabic Duolingo)
```sql
CREATE TABLE ar_domain (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,   -- 'home'|'market'|'mosque'|'travel'|'medical'|'academic'
  name_ar     TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  sort_order  INTEGER DEFAULT 0
);

CREATE TABLE ar_domain_phrase (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id       INTEGER NOT NULL REFERENCES ar_domain(id),
  phrase_ar       TEXT NOT NULL,
  phrase_en       TEXT NOT NULL,
  transliteration TEXT,
  audio_url       TEXT,
  level           TEXT DEFAULT 'beginner',
  sort_order      INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Domain seeds: home(1), market(2), mosque(3), travel(4), medical(5), academic(6), dua(7)
```

### Arabic Indexes
```sql
CREATE INDEX idx_ar_container_type   ON ar_container(type, level);
CREATE INDEX idx_ar_unit_container   ON ar_container_unit(container_id, sort_order);
CREATE INDEX idx_ar_task_unit        ON ar_task(unit_id, status);
CREATE INDEX idx_ar_task_review      ON ar_task(next_review, status);
CREATE INDEX idx_ar_vocab_root       ON ar_vocab(root);
CREATE INDEX idx_ar_vocab_level      ON ar_vocab(level, domain);
CREATE INDEX idx_ar_vocab_review     ON ar_vocab(next_review);
CREATE INDEX idx_ar_grammar_cat      ON ar_grammar_rule(category, sort_order);
CREATE INDEX idx_ar_balagha_branch   ON ar_balagha(branch);
CREATE INDEX idx_ar_domain_phrase    ON ar_domain_phrase(domain_id, sort_order);
```

---

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
