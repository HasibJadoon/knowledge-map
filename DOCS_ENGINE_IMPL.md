# K-MAPS Document Engine — Claude Code Implementation Brief

> Read CLAUDE.md first, then this file.
> Work one phase at a time. Complete all steps in a phase before moving to the next.
> Run `wrangler d1 execute knowledgemap --remote` for all migrations.
> All Angular components: standalone, ChangeDetectionStrategy.OnPush, signals only.

---

## PHASE 1 — Database + Worker Scaffold
**Goal:** Tables exist in production D1. API routes return valid JSON.

### Step 1.1 — Run migration
Create `database/migrations/legacy/2026-04-14_km_documents.sql` with this exact content:

```sql
-- km_documents: primary document table
CREATE TABLE IF NOT EXISTS km_documents (
  id               TEXT PRIMARY KEY,
  workspace_id     INTEGER REFERENCES wv_workspace(id),
  title            TEXT NOT NULL DEFAULT 'Untitled',
  doc_type         TEXT NOT NULL DEFAULT 'note',
  domain           TEXT NOT NULL DEFAULT 'general',
  document_json    TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  status           TEXT NOT NULL DEFAULT 'draft',
  container_id     INTEGER REFERENCES ar_container(id),
  unit_id          INTEGER REFERENCES ar_container_unit(id),
  source_id        INTEGER REFERENCES wv_source(id),
  source_unit_id   INTEGER REFERENCES wv_unit(id),
  surah            INTEGER,
  ayah_from        INTEGER,
  ayah_to          INTEGER,
  canonical_ref    TEXT,
  production_type  TEXT,
  target_audience  TEXT,
  tags_json        TEXT DEFAULT '[]',
  word_count       INTEGER DEFAULT 0,
  is_template      INTEGER DEFAULT 0,
  parent_doc_id    TEXT REFERENCES km_documents(id),
  sort_order       INTEGER DEFAULT 0,
  created_by       TEXT,
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now')),
  published_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_kmdoc_workspace ON km_documents(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_kmdoc_domain    ON km_documents(domain, doc_type);
CREATE INDEX IF NOT EXISTS idx_kmdoc_updated   ON km_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_kmdoc_source    ON km_documents(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kmdoc_quran     ON km_documents(surah, ayah_from, ayah_to) WHERE surah IS NOT NULL;

-- Version snapshots
CREATE TABLE IF NOT EXISTS km_document_versions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id   TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  version_num   INTEGER NOT NULL,
  title         TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  word_count    INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  UNIQUE (document_id, version_num)
);
CREATE INDEX IF NOT EXISTS idx_kmdocv_doc ON km_document_versions(document_id, version_num DESC);

-- Block → WV entity links
CREATE TABLE IF NOT EXISTS km_block_wv_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id    TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  rel_type    TEXT DEFAULT 'related',
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_kmblkwv        ON km_block_wv_links(document_id, block_id);
CREATE INDEX IF NOT EXISTS idx_kmblkwv_entity ON km_block_wv_links(entity_type, entity_id);

-- Block → Quran ayah links
CREATE TABLE IF NOT EXISTS km_block_quran_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id    TEXT NOT NULL,
  surah       INTEGER NOT NULL,
  ayah_from   INTEGER NOT NULL,
  ayah_to     INTEGER NOT NULL,
  relationship TEXT DEFAULT 'related',
  note        TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_kmblkqr      ON km_block_quran_links(document_id, block_id);
CREATE INDEX IF NOT EXISTS idx_kmblkqr_ayah ON km_block_quran_links(surah, ayah_from, ayah_to);

-- Block → Source links
CREATE TABLE IF NOT EXISTS km_block_source_links (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id    TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id       TEXT NOT NULL,
  source_id      INTEGER NOT NULL REFERENCES wv_source(id),
  source_unit_id INTEGER REFERENCES wv_unit(id),
  page_ref       INTEGER,
  quote_text     TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);

-- Block → Arabic entity links
CREATE TABLE IF NOT EXISTS km_block_arabic_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id    TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   INTEGER NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_kmblkar ON km_block_arabic_links(document_id, block_id);

-- Task extraction registry
CREATE TABLE IF NOT EXISTS km_doc_tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id  TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id     TEXT NOT NULL,
  plan_item_id INTEGER REFERENCES wv_plan_item(id),
  title        TEXT NOT NULL,
  due_date     TEXT,
  priority     INTEGER DEFAULT 2,
  status       TEXT DEFAULT 'pending',
  created_at   TEXT DEFAULT (datetime('now'))
);

-- R2 media registry
CREATE TABLE IF NOT EXISTS km_doc_media (
  id          TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES km_documents(id) ON DELETE CASCADE,
  block_id    TEXT,
  r2_key      TEXT NOT NULL UNIQUE,
  url         TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  file_name   TEXT,
  size_bytes  INTEGER,
  width       INTEGER,
  height      INTEGER,
  alt_text    TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- FTS5 full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS km_docs_fts USING fts5(
  id UNINDEXED, title, document_json,
  content=km_documents, content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS km_docs_ai AFTER INSERT ON km_documents BEGIN
  INSERT INTO km_docs_fts(rowid, id, title, document_json)
  VALUES (new.rowid, new.id, new.title, new.document_json);
END;

CREATE TRIGGER IF NOT EXISTS km_docs_au AFTER UPDATE ON km_documents BEGIN
  INSERT INTO km_docs_fts(km_docs_fts, rowid, id, title, document_json)
  VALUES ('delete', old.rowid, old.id, old.title, old.document_json);
  INSERT INTO km_docs_fts(rowid, id, title, document_json)
  VALUES (new.rowid, new.id, new.title, new.document_json);
END;

CREATE TRIGGER IF NOT EXISTS km_docs_ad AFTER DELETE ON km_documents BEGIN
  INSERT INTO km_docs_fts(km_docs_fts, rowid, id, title, document_json)
  VALUES ('delete', old.rowid, old.id, old.title, old.document_json);
END;
```

Then run:
```bash
wrangler d1 execute knowledgemap --file=database/migrations/legacy/2026-04-14_km_documents.sql --remote
```

**Verify:** `wrangler d1 execute knowledgemap --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'km_%';" --remote`
Expected: 7 rows (km_documents, km_document_versions, km_block_wv_links, km_block_quran_links, km_block_source_links, km_block_arabic_links, km_doc_tasks, km_doc_media, km_docs_fts).

---

### Step 1.2 — Scaffold Worker routes

Create these files under `workers/docs/`:

**`workers/docs/index.ts`** — GET list + POST create
```typescript
import { nanoid } from 'nanoid';

interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspace_id');
  const domain = url.searchParams.get('domain');
  const status = url.searchParams.get('status') ?? 'draft';
  const limit = parseInt(url.searchParams.get('limit') ?? '50');
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  let query = `SELECT id, title, doc_type, domain, status, word_count,
                      surah, ayah_from, ayah_to, canonical_ref,
                      source_id, container_id, tags_json,
                      created_at, updated_at
               FROM km_documents WHERE status != 'archived'`;
  const params: unknown[] = [];

  if (workspaceId) { query += ` AND workspace_id = ?`; params.push(workspaceId); }
  if (domain)      { query += ` AND domain = ?`;        params.push(domain); }
  if (status !== 'all') { query += ` AND status = ?`;   params.push(status); }

  query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return Response.json({ docs: results, limit, offset });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json() as Record<string, unknown>;
  const id = nanoid(21);
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO km_documents
      (id, workspace_id, title, doc_type, domain, document_json,
       container_id, unit_id, source_id, source_unit_id,
       surah, ayah_from, ayah_to, canonical_ref,
       production_type, target_audience, tags_json, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id,
    body.workspace_id ?? null,
    body.title ?? 'Untitled',
    body.doc_type ?? 'note',
    body.domain ?? 'general',
    JSON.stringify({ type: 'doc', content: [] }),
    body.container_id ?? null,
    body.unit_id ?? null,
    body.source_id ?? null,
    body.source_unit_id ?? null,
    body.surah ?? null,
    body.ayah_from ?? null,
    body.ayah_to ?? null,
    body.canonical_ref ?? null,
    body.production_type ?? null,
    body.target_audience ?? null,
    JSON.stringify(body.tags ?? []),
    now, now
  ).run();

  return Response.json({ id }, { status: 201 });
};
```

**`workers/docs/[docId].ts`** — GET single + PATCH update + DELETE archive
```typescript
interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const doc = await env.DB.prepare(
    `SELECT * FROM km_documents WHERE id = ? AND status != 'archived'`
  ).bind(params.docId).first();
  if (!doc) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(doc);
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const body = await request.json() as Record<string, unknown>;
  const now = new Date().toISOString();
  const fields: string[] = [];
  const values: unknown[] = [];

  const allowed = ['title','document_json','status','word_count','tags_json',
                   'doc_type','domain','production_type','target_audience','is_template'];
  for (const key of allowed) {
    if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
  }
  if (!fields.length) return Response.json({ error: 'Nothing to update' }, { status: 400 });

  fields.push('updated_at = ?'); values.push(now);
  values.push(params.docId);

  await env.DB.prepare(
    `UPDATE km_documents SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  return Response.json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  await env.DB.prepare(
    `UPDATE km_documents SET status = 'archived', updated_at = ? WHERE id = ?`
  ).bind(new Date().toISOString(), params.docId).run();
  return Response.json({ ok: true });
};
```

**`workers/docs/search.ts`** — Full-text search
```typescript
interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  if (!q) return Response.json({ results: [] });

  const domain = url.searchParams.get('domain');
  const limit = parseInt(url.searchParams.get('limit') ?? '20');

  let query = `
    SELECT d.id, d.title, d.doc_type, d.domain, d.status, d.updated_at,
           snippet(km_docs_fts, 2, '<mark>', '</mark>', '…', 24) AS excerpt
    FROM km_documents d
    JOIN km_docs_fts f ON f.id = d.id
    WHERE km_docs_fts MATCH ? AND d.status != 'archived'
  `;
  const params: unknown[] = [q + '*'];
  if (domain) { query += ` AND d.domain = ?`; params.push(domain); }
  query += ` ORDER BY bm25(km_docs_fts) LIMIT ?`;
  params.push(limit);

  const { results } = await env.DB.prepare(query).bind(...params).all();
  return Response.json({ results });
};
```

**`workers/docs/versions.ts`** — GET versions list + POST create snapshot
```typescript
interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const { results } = await env.DB.prepare(
    `SELECT id, version_num, title, word_count, created_at
     FROM km_document_versions WHERE document_id = ?
     ORDER BY version_num DESC LIMIT 20`
  ).bind(params.docId).all();
  return Response.json({ versions: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const body = await request.json() as Record<string, unknown>;
  const { results } = await env.DB.prepare(
    `SELECT COALESCE(MAX(version_num), 0) + 1 AS next FROM km_document_versions WHERE document_id = ?`
  ).bind(params.docId).all();
  const versionNum = (results[0] as { next: number }).next;

  await env.DB.prepare(
    `INSERT INTO km_document_versions (document_id, version_num, title, snapshot_json, word_count)
     VALUES (?,?,?,?,?)`
  ).bind(params.docId, versionNum, body.title, body.snapshot_json, body.word_count ?? 0).run();

  return Response.json({ version_num: versionNum }, { status: 201 });
};
```

**`workers/docs/links/quran.ts`** — GET + POST + DELETE quran block links
```typescript
interface Env { DB: D1Database; }

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const { results } = await env.DB.prepare(
    `SELECT * FROM km_block_quran_links WHERE document_id = ? ORDER BY created_at`
  ).bind(params.docId).all();
  return Response.json({ links: results });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const b = await request.json() as Record<string, unknown>;
  const { meta } = await env.DB.prepare(
    `INSERT INTO km_block_quran_links (document_id, block_id, surah, ayah_from, ayah_to, relationship, note)
     VALUES (?,?,?,?,?,?,?)`
  ).bind(params.docId, b.block_id, b.surah, b.ayah_from, b.ayah_to, b.relationship ?? 'related', b.note ?? null).run();
  return Response.json({ id: meta.last_row_id }, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const b = await request.json() as { id: number };
  await env.DB.prepare(
    `DELETE FROM km_block_quran_links WHERE id = ? AND document_id = ?`
  ).bind(b.id, params.docId).run();
  return Response.json({ ok: true });
};
```

**`workers/docs/links/wv.ts`** — same pattern for WV entity links (entity_type, entity_id, rel_type).
**`workers/docs/links/arabic.ts`** — same pattern for Arabic entity links.
**`workers/docs/links/source.ts`** — same pattern for source + source_unit_id links.

Add `nanoid` to package.json if not already present:
```bash
npm install nanoid
```

---

### Step 1.3 — Add route to app.routes.ts

In `apps/k-maps-v2/src/app/app.routes.ts` add:
```typescript
{ path: 'docs', loadChildren: () => import('./features/docs/docs.routes').then(m => m.DOCS_ROUTES) },
```

**Phase 1 done when:** `curl https://k-maps.app/api/docs` returns `{ docs: [], limit: 50, offset: 0 }`.

---

## PHASE 2 — Angular Feature Scaffold
**Goal:** `/docs` route loads. Empty editor renders. No TypeScript errors.

### Step 2.1 — Install Tiptap packages
```bash
cd apps/k-maps-v2
npm install @tiptap/core @tiptap/pm @tiptap/starter-kit
npm install @tiptap/extension-unique-id @tiptap/extension-placeholder
npm install @tiptap/extension-text-align @tiptap/extension-character-count
npm install @tiptap/extension-image @tiptap/extension-link
npm install tiptap-text-direction
```

### Step 2.2 — Create feature folder structure
```
apps/k-maps-v2/src/app/features/docs/
├── docs.routes.ts
├── docs-shell/
│   └── docs-shell.component.ts  (lists docs on left, router-outlet center)
├── doc-editor/
│   └── doc-editor.component.ts  (hosts tiptap editor)
└── services/
    ├── doc-editor.service.ts
    ├── doc-context.service.ts
    └── doc-save.service.ts
```

### Step 2.3 — docs.routes.ts
```typescript
import { Routes } from '@angular/router';
export const DOCS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./docs-shell/docs-shell.component').then(m => m.DocsShellComponent)
  },
  {
    path: ':docId',
    loadComponent: () =>
      import('./doc-editor/doc-editor.component').then(m => m.DocEditorComponent)
  }
];
```

### Step 2.4 — DocEditorService
File: `apps/k-maps-v2/src/app/features/docs/services/doc-editor.service.ts`
```typescript
import { Injectable, signal, computed } from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import UniqueId from '@tiptap/extension-unique-id';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { TextDirection } from 'tiptap-text-direction';

export interface DocContext {
  domain: 'general' | 'quran' | 'arabic' | 'worldview' | 'workspace';
  docType: string;
  surah: number | null;
  ayahFrom: number | null;
  ayahTo: number | null;
  sourceId: number | null;
  sourceUnitId: number | null;
  containerId: number | null;
  unitId: number | null;
  workspaceId: number | null;
}

@Injectable({ providedIn: 'root' })
export class DocEditorService {
  private _editor: Editor | null = null;
  get editor() { return this._editor; }

  readonly docId      = signal<string | null>(null);
  readonly title      = signal('Untitled');
  readonly isSaving   = signal(false);
  readonly isDirty    = signal(false);
  readonly wordCount  = signal(0);
  readonly rightPanel = signal<'links' | 'metadata' | 'outline' | null>('outline');
  readonly leftOpen   = signal(true);

  readonly context = signal<DocContext>({
    domain: 'general', docType: 'note',
    surah: null, ayahFrom: null, ayahTo: null,
    sourceId: null, sourceUnitId: null,
    containerId: null, unitId: null,
    workspaceId: null
  });

  readonly hasQuranContext  = computed(() => this.context().surah != null);
  readonly hasSourceContext = computed(() => this.context().sourceId != null);
  readonly canonicalRef     = computed(() => {
    const c = this.context();
    if (!c.surah) return null;
    const from = c.ayahFrom ?? 1;
    const to   = c.ayahTo   ?? from;
    return from === to ? `${c.surah}:${from}` : `${c.surah}:${from}-${to}`;
  });

  applyContext(ctx: Partial<DocContext>): void {
    this.context.update(c => ({ ...c, ...ctx }));
  }

  initEditor(element: HTMLElement): void {
    this._editor = new Editor({
      element,
      extensions: [
        StarterKit,
        UniqueId.configure({ types: ['heading', 'paragraph', 'blockquote', 'listItem', 'codeBlock'] }),
        Placeholder.configure({ placeholder: 'Start writing, or type / for commands…' }),
        CharacterCount,
        TextDirection.configure({
          types: ['heading', 'paragraph', 'blockquote', 'listItem']
        }),
      ],
      onUpdate: ({ editor }) => {
        this.isDirty.set(true);
        this.wordCount.set(editor.storage.characterCount?.words() ?? 0);
      }
    });
  }

  destroyEditor(): void {
    this._editor?.destroy();
    this._editor = null;
  }

  getJSON(): object {
    return this._editor?.getJSON() ?? { type: 'doc', content: [] };
  }
}
```

### Step 2.5 — DocSaveService
File: `apps/k-maps-v2/src/app/features/docs/services/doc-save.service.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocEditorService } from './doc-editor.service';

@Injectable({ providedIn: 'root' })
export class DocSaveService {
  private http   = inject(HttpClient);
  private editor = inject(DocEditorService);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 1500;

  scheduleSave(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.save(), this.DEBOUNCE_MS);
  }

  private save(): void {
    const id = this.editor.docId();
    if (!id) return;
    this.editor.isSaving.set(true);
    this.http.patch(`/api/docs/${id}`, {
      title: this.editor.title(),
      document_json: JSON.stringify(this.editor.getJSON()),
      word_count: this.editor.wordCount()
    }).subscribe({
      next: () => { this.editor.isSaving.set(false); this.editor.isDirty.set(false); },
      error: () => { this.editor.isSaving.set(false); }
    });
  }
}
```

### Step 2.6 — DocEditorComponent (minimal shell)
File: `apps/k-maps-v2/src/app/features/docs/doc-editor/doc-editor.component.ts`
```typescript
import { Component, OnInit, OnDestroy, ElementRef, ViewChild,
         inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DocEditorService } from '../services/doc-editor.service';
import { DocSaveService } from '../services/doc-save.service';

@Component({
  selector: 'km-doc-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="km-docs-shell">
      <header class="km-doc-topbar">
        <input class="km-doc-title" [(ngModel)]="titleModel"
               (ngModelChange)="onTitleChange($event)"
               placeholder="Untitled" />
        <span class="km-doc-save-status">
          {{ editorSvc.isSaving() ? 'Saving…' : editorSvc.isDirty() ? 'Unsaved' : 'Saved' }}
        </span>
      </header>
      <main class="km-doc-editor-wrap">
        <div #editorEl class="km-doc-editor-el"></div>
      </main>
    </div>
  `
})
export class DocEditorComponent implements OnInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  readonly editorSvc = inject(DocEditorService);
  private saveSvc    = inject(DocSaveService);
  private route      = inject(ActivatedRoute);
  private http       = inject(HttpClient);

  titleModel = '';

  ngOnInit(): void {
    const docId = this.route.snapshot.paramMap.get('docId');
    if (docId) {
      this.editorSvc.docId.set(docId);
      this.http.get<Record<string, string>>(`/api/docs/${docId}`).subscribe(doc => {
        this.editorSvc.title.set(doc['title']);
        this.titleModel = doc['title'];
        this.editorSvc.initEditor(this.editorEl.nativeElement);
        try {
          const json = typeof doc['document_json'] === 'string'
            ? JSON.parse(doc['document_json']) : doc['document_json'];
          this.editorSvc.editor?.commands.setContent(json);
        } catch { /* empty doc */ }
      });
    } else {
      this.editorSvc.initEditor(this.editorEl.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.editorSvc.destroyEditor();
  }

  onTitleChange(val: string): void {
    this.editorSvc.title.set(val);
    this.editorSvc.isDirty.set(true);
    this.saveSvc.scheduleSave();
  }
}
```

Add basic SCSS to `doc-editor.component.scss`:
```scss
.km-docs-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--km-bg);
}

.km-doc-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--km-border);
}

.km-doc-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--km-text);
  background: transparent;
  border: none;
  outline: none;
  flex: 1;
  font-family: var(--km-font-body);
}

.km-doc-save-status {
  font-size: 0.75rem;
  color: var(--km-text-3);
}

.km-doc-editor-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 48px;
}

.km-doc-editor-el {
  max-width: 720px;
  margin: 0 auto;

  .ProseMirror {
    outline: none;
    min-height: 400px;
    font-size: 1rem;
    line-height: 1.8;
    color: var(--km-text);
    font-family: var(--km-font-body);

    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      color: var(--km-text-3);
      pointer-events: none;
      float: left;
      height: 0;
    }

    [dir="rtl"] {
      font-family: var(--km-font-arabic-amiri);
      font-size: 1.3rem;
      line-height: 2.2;
      text-align: right;
    }
  }
}
```

**Phase 2 done when:** `ng serve` compiles with no errors and navigating to `/docs/new` shows an editable title + Tiptap editor that auto-saves.

---

## PHASE 3 — DocContextService + Context Auto-fill
**Goal:** Opening a doc from `/quran/12` auto-sets domain=quran, surah=12 without user input.

File: `apps/k-maps-v2/src/app/features/docs/services/doc-context.service.ts`
```typescript
import { Injectable, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DocEditorService, DocContext } from './doc-editor.service';

@Injectable({ providedIn: 'root' })
export class DocContextService {
  private editor = inject(DocEditorService);
  private http   = inject(HttpClient);

  buildFromUrl(url: string, queryParams: Record<string, string>): Partial<DocContext> {
    if (url.startsWith('quran')) {
      const parts = url.split('/');
      const surah = parts[1] ? parseInt(parts[1]) : null;
      return {
        domain: 'quran',
        docType: 'tafsir',
        surah,
        ayahFrom: queryParams['from'] ? parseInt(queryParams['from']) : null,
        ayahTo:   queryParams['to']   ? parseInt(queryParams['to'])   : null,
      };
    }
    if (url.startsWith('worldview')) {
      return { domain: 'worldview', docType: 'analysis' };
    }
    if (url.startsWith('arabic')) {
      const parts = url.split('/');
      return {
        domain: 'arabic',
        docType: 'lesson',
        unitId: parts[2] ? parseInt(parts[2]) : null,
      };
    }
    return { domain: 'general', docType: 'note' };
  }

  // Call this before navigating to /docs/new
  openNewDocWithContext(originUrl: string, queryParams: Record<string, string> = {}): void {
    const ctx = this.buildFromUrl(originUrl, queryParams);
    // POST to create new doc with context pre-filled
    this.http.post<{ id: string }>('/api/docs', {
      ...ctx,
      title: 'Untitled'
    }).subscribe(({ id }) => {
      this.editor.applyContext(ctx);
      // Navigate to new doc
    });
  }
}
```

Add "New Document" button to every feature screen that calls:
```typescript
// In QuranTextComponent (surah page):
newDoc() {
  this.docCtx.openNewDocWithContext(
    `quran/${this.surahId}`,
    { from: this.selectedAyah?.toString() ?? '' }
  );
}
```

---

## PHASE 4 — Quran Blocks (ayah_embed + passage_embed)
**Goal:** Typing `/ayah` in the editor inserts an ayah block with live Arabic text.

### Step 4.1 — AyahEmbedExtension
File: `apps/k-maps-v2/src/app/features/docs/doc-editor/tiptap-extensions/ayah-embed.extension.ts`
```typescript
import { Node, mergeAttributes } from '@tiptap/core';

export interface AyahEmbedAttrs {
  id: string;
  surah: number;
  ayah: number;
  text_uthmani: string;
  translation: string;
  show_translation: boolean;
  highlight_color: string | null;
  tafsir_note: string | null;
  dir: 'rtl';
  lang: 'ar';
}

export const AyahEmbed = Node.create<object, object>({
  name: 'ayah_embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id:               { default: null },
      surah:            { default: null },
      ayah:             { default: null },
      text_uthmani:     { default: '' },
      translation:      { default: '' },
      show_translation: { default: true },
      highlight_color:  { default: null },
      tafsir_note:      { default: null },
      dir:              { default: 'rtl' },
      lang:             { default: 'ar' },
    };
  },

  parseHTML() {
    return [{ tag: 'km-ayah-embed' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['km-ayah-embed', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    // Return Angular component via ViewContainerRef injection
    // See doc-editor.component for Angular node view bridge
    return () => { /* Angular NodeView bridge */ };
  }
});
```

### Step 4.2 — AyahEmbedComponent
File: `apps/k-maps-v2/src/app/features/docs/doc-editor/blocks/ayah-embed/ayah-embed.component.ts`
```typescript
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'km-ayah-embed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="km-block km-block--ayah" dir="rtl">
      <div class="ayah-text">{{ attrs.text_uthmani }}</div>
      <div class="ayah-translation" *ngIf="attrs.show_translation">
        {{ attrs.translation }}
      </div>
      <div class="ayah-ref">{{ attrs.surah }}:{{ attrs.ayah }}</div>
    </div>
  `,
  styles: [`
    .km-block--ayah {
      background: var(--km-surface);
      border-right: 3px solid var(--km-gold);
      border-radius: 8px;
      padding: 20px 24px;
      margin: 16px 0;
    }
    .ayah-text {
      font-family: var(--km-font-arabic);
      font-size: 1.8rem;
      line-height: 2.6;
      color: var(--km-text);
    }
    .ayah-translation {
      font-size: 0.9rem;
      color: var(--km-text-2);
      margin-top: 12px;
      font-style: italic;
    }
    .ayah-ref {
      font-size: 0.75rem;
      color: var(--km-gold);
      margin-top: 8px;
      font-weight: 600;
    }
  `]
})
export class AyahEmbedComponent {
  @Input() attrs: Record<string, unknown> = {};
}
```

Fetch ayah data when inserting block — call existing endpoint:
```typescript
// When user selects /ayah from slash menu:
http.get<{ text_uthmani: string; translation: string }>(
  `/api/ar/quran/ayahs?surah=${surah}&ayah=${ayah}`
).subscribe(data => {
  editor.commands.insertContent({
    type: 'ayah_embed',
    attrs: {
      id: nanoid(12), surah, ayah,
      text_uthmani: data.text_uthmani,
      translation: data.translation,
      show_translation: true, dir: 'rtl', lang: 'ar'
    }
  });
});
```

---

## PHASE 5 — Slash Menu
**Goal:** Typing `/` shows command palette. Selecting a block inserts it.

File: `apps/k-maps-v2/src/app/features/docs/doc-editor/slash-menu/slash-menu.component.ts`

Use Tiptap suggestion extension:
```typescript
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      }
    };
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
  }
});
```

Install: `npm install @tiptap/suggestion`

Slash menu groups (all 6 groups from architecture Section 6.3 are defined in:
`apps/k-maps-v2/src/app/features/docs/doc-editor/slash-menu/slash-menu.config.ts`

---

## PHASE 6 — Arabic Blocks
Same pattern as Phase 4. Create extensions + components for:
- `morphology_block` — shows word breakdown with root, pattern, POS, tense, case
- `nahw_block` — shows sentence with each word's إعراب term
- `vocab_block` — shows word + root + meanings + SRS toggle
- `root_analysis_block` — shows all derivatives + Quran occurrence count

Each component reads from `ar_vocab`, `ar_grammar_rule` via existing Arabic Workers or the linked `vocab_id` / `grammar_rule_id` attrs.

---

## PHASE 7 — Worldview + Production + Learning Blocks
Same pattern. Create extensions + components for all remaining block types from architecture Section 3.

Priority order:
1. `claim_block` (needed for worldview research docs)
2. `evidence_block` (links to wv_source)
3. `task_block` (links to wv_plan_item)
4. `reflection_block`
5. `scene_block` + `script_line` + `timeline_block` (podcast scripts)
6. `comprehension_block` + `children_block` (lesson docs)

---

## PHASE 8 — Right Panel + Outline
File: `apps/k-maps-v2/src/app/features/docs/doc-right-panel/doc-right-panel.component.ts`

Three tabs:
1. **Outline** — parse `document_json` for heading nodes, render as nested list, click scrolls editor
2. **Links** — query `km_block_quran_links`, `km_block_wv_links`, etc. for current doc
3. **Metadata** — edit doc_type, domain, production_type, target_audience, tags

---

## PHASE 9 — Selection Toolbar + Backward Feeding
File: `apps/k-maps-v2/src/app/features/docs/doc-editor/highlight-toolbar/highlight-toolbar.component.ts`

Listen for `editor.on('selectionUpdate')`. Show floating toolbar on non-empty selection.

Backward feed actions in `DocExtractService`:
- Extract to WV node → `POST /api/worldview/topics` + `POST /api/docs/:id/links/wv`
- Extract to vocab → `POST /api/arabic/vocab` + `POST /api/docs/:id/links/arabic`
- Extract task → `POST /api/planner/plan-items` + `POST /api/docs/:id` (update block attrs)
- Create SRS card → `INSERT km_srs` via `POST /api/srs`

---

## PHASE 10 — R2 Media + Image Blocks
Add to `wrangler.toml`:
```toml
[[r2_buckets]]
binding = "ASSETS_BUCKET"
bucket_name = "km-assets"
```

Create `workers/docs/media/upload.ts` (Worker that accepts multipart/form-data, puts to R2, inserts into km_doc_media).

Override Tiptap Image extension upload handler to use `/api/docs/:id/media`.

---

## Quick Reference — Key Commands

```bash
# Run migration
wrangler d1 execute knowledgemap --file=database/migrations/legacy/2026-04-14_km_documents.sql --remote

# Verify tables
wrangler d1 execute knowledgemap --command="SELECT name FROM sqlite_master WHERE name LIKE 'km_%';" --remote

# Dev server
cd apps/k-maps-v2 && ng serve

# Build
cd apps/k-maps-v2 && ng build

# Deploy Workers
wrangler deploy

# Test create doc
curl -X POST https://k-maps.app/api/docs \
  -H "Content-Type: application/json" \
  -d '{"domain":"quran","doc_type":"tafsir","surah":12,"ayah_from":1,"ayah_to":7}'
```

---

## How to Use This File With Claude Code

Open your terminal in `knowledge-map/` and run:
```bash
claude
```

Then say:
> "Read CLAUDE.md and DOCS_ENGINE_IMPL.md. Implement Phase 1 exactly as specified — create the migration SQL file, run it on production D1, then scaffold all the Worker files under workers/docs/. Do not skip any step."

Work one phase at a time. Each phase has a verification step — only move forward when it passes.
