# K-MAPS Doc Editor — Notion-Like Refactor Prompt
## Precise implementation guide — Ionic Mobile App

> **Primary target**: `apps/app-k-maps/src/app/features/docs/` (Ionic 8 / Angular 20 / Capacitor 8)
> **Secondary reference**: `apps/k-maps/src/app/features/docs/` (web app — same logic, adapt for mobile)
> **Framework**: Angular 20 + **Ionic 8** + Capacitor 8
> **⚠️ Mobile-first**: ALL components, layouts, and interactions must be designed for iOS/Android touch
> **Reference style**: [Hasib's Notion Notes](https://abdul-brain.notion.site/Notes-6e5f9139c7284823a7e188ef6467b598)
> **Tiptap template ref**: https://tiptap.dev/docs/ui-components/templates/notion-like-editor

---

## What Already Exists (Do NOT Rewrite)

The doc editor is already a sophisticated Tiptap implementation. These are **working and should be kept**:

| File | Status |
|---|---|
| `doc-editor.component.ts` | Keep — fix rAF violations only |
| `doc-editor.service.ts` | Keep — fix rAF violations only |
| `doc-save.service.ts` | Keep as-is |
| `doc-context.service.ts` | Keep as-is |
| `doc-extract.service.ts` | Keep as-is |
| `tiptap-extensions/auto-direction.extension.ts` | Keep — fix debounce |
| `tiptap-extensions/ayah-embed.extension.ts` | Keep as-is |
| `tiptap-extensions/arabic-blocks.extension.ts` | Keep as-is |
| `tiptap-extensions/worldview-blocks.extension.ts` | Keep as-is |
| `tiptap-extensions/page-link.extension.ts` | Keep as-is |
| `tiptap-extensions/callout.extension.ts` | Refactor styling only |
| `tiptap-extensions/slash-command.extension.ts` | Extend with missing blocks |
| `block-handle/block-handle.ts` | Keep as-is |
| `highlight-toolbar/highlight-toolbar.component.ts` | Keep as-is |

**This prompt is about**:
1. Fixing the `requestAnimationFrame` violation spam
2. Upgrading typography to match Notion's clean hierarchy
3. Adding missing base blocks: Task List, better Code Block, improved Callout variants
4. Polishing the slash command menu UI

---

## 1. Fix — requestAnimationFrame Violations

### Root Cause Analysis

The spam comes from **two specific places** in `doc-editor.component.ts`:

**Problem 1 — Nested rAF in `animateContentIn()`**
```typescript
// CURRENT (bad) — nested rAF causes cascading frame budget overruns
private animateContentIn(): void {
  const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
  if (!pm) return;
  const blocks = (Array.from(pm.children) as HTMLElement[]).slice(0, 20);
  if (blocks.length <= 1) return;

  requestAnimationFrame(() => {  // ← outer rAF (caller already in rAF)
    gsap.fromTo(blocks,          // ← GSAP creates another rAF internally
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' }
    );
  });
}
```
The caller already runs inside `requestAnimationFrame(...)`, so wrapping GSAP in another rAF creates cascading frames that overrun their budget.

**Problem 2 — MutationObserver firing on every keystroke**
```typescript
// CURRENT (bad) — MutationObserver fires on EVERY text change (typing)
this.mutationObserver = new MutationObserver((mutations) => {
  for (const m of mutations) {
    m.addedNodes.forEach(node => {
      if (!(node instanceof HTMLElement)) return;
      if (node.tagName === 'HR') {
        // GSAP runs here, inside the MutationObserver callback
        // which itself is triggered by every keystroke
        gsap.fromTo(node, { scaleX: 0, opacity: 0 }, { ... });
      }
    });
  }
});
this.mutationObserver.observe(pm, { childList: true });
```
ProseMirror re-creates block DOM nodes on every edit, so the MutationObserver fires constantly, consuming the rAF budget even though the GSAP code only runs for HR.

### Fix — `doc-editor.component.ts`

Replace `watchForNewBlocks()` and `animateContentIn()` with these corrected versions:

```typescript
// ── FIXED animateContentIn ──────────────────────────────────
// Remove the inner requestAnimationFrame — caller is already in rAF
private animateContentIn(): void {
  const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
  if (!pm) return;
  const blocks = (Array.from(pm.children) as HTMLElement[]).slice(0, 20);
  if (blocks.length <= 1) return;

  // GSAP is called directly — no extra rAF wrapper
  gsap.fromTo(blocks,
    { opacity: 0, y: 10 },
    { opacity: 1, y: 0, duration: 0.35, stagger: 0.03, ease: 'power2.out', clearProps: 'transform,opacity' }
  );
}

// ── FIXED watchForNewBlocks ─────────────────────────────────
// Use a debounce gate so GSAP only fires once per slash-command insert,
// not on every single keystroke.
private lastHrCount = 0;
private animateDebounce: ReturnType<typeof setTimeout> | null = null;

private watchForNewBlocks(): void {
  const pm = this.editorEl.nativeElement.querySelector('.ProseMirror');
  if (!pm || this.mutationObserver) return;

  this.lastHrCount = pm.querySelectorAll('hr').length;

  this.mutationObserver = new MutationObserver(() => {
    // Cheap check — count HRs without touching the mutation records
    if (this.animateDebounce) return;  // gate: ignore burst of mutations
    this.animateDebounce = setTimeout(() => {
      this.animateDebounce = null;
      const hrs = Array.from(pm.querySelectorAll('hr')) as HTMLElement[];
      if (hrs.length > this.lastHrCount) {
        const newHr = hrs[hrs.length - 1];
        this.lastHrCount = hrs.length;
        gsap.fromTo(newHr,
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform,opacity' }
        );
      }
    }, 50);  // 50ms debounce — fast enough to catch slash command, invisible to typing
  });

  this.mutationObserver.observe(pm, { childList: true, subtree: false });
}
```

### Fix — `auto-direction.extension.ts`

The AutoDirection extension runs on every `appendTransaction`, which is called on every keystroke. Wrap the scan in a microtask:

```typescript
// In the Plugin's appendTransaction handler:
appendTransaction(transactions, _old, newState) {
  const docChanged = transactions.some(t => t.docChanged);
  if (!docChanged) return null;

  // Defer the expensive node-scan out of the PM render cycle
  queueMicrotask(() => this.runDirectionScan(newState));

  return null;  // Always return null here — no synchronous transaction
},
```

The actual `runDirectionScan` function that traverses nodes and dispatches direction-setting transactions runs in the microtask queue, after PM has finished rendering. This eliminates the rAF budget overrun.

### Fix — `doc-editor.service.ts`

The `onUpdate` callback fires on every keystroke. Move signal updates out of it:

```typescript
// CURRENT (causes issues if signals trigger change detection mid-frame)
onUpdate: ({ editor }) => {
  this.wordCount.set(editor.storage.characterCount.words());
  this.isDirty.set(true);
  this.saveFn?.();
},

// FIXED — defer signal updates to microtask
onUpdate: ({ editor }) => {
  this.isDirty.set(true);               // simple boolean, fast ✓
  this.saveFn?.();                       // schedules async save ✓
  queueMicrotask(() => {                 // defer heavy count after PM renders
    this.wordCount.set(editor.storage['characterCount']?.words() ?? 0);
  });
},
```

---

## 2. Typography — Full Notion-Like Hierarchy

Replace the typography section in `doc-editor.component.scss`. Keep the existing file structure, replace/merge the content block:

### The Notion Style Reference (from your Notion page)

Your Notion page uses:
- **H1**: Very large, bold, no underline border — serves as page title inside content
- **H2**: Bold, clear step-down from H1, acts as section header
- **H3**: Medium weight, slightly muted, acts as sub-section
- **Text**: 16px Poppins, line-height 1.75, comfortable reading
- **Quotes**: Left border, italic, slightly muted
- **Callouts**: Colored background with emoji, rounded corners
- **Dividers**: Thin, centered, with subtle diamond ornament (you already have this)
- **Code**: Mono font, dark surface background
- **Lists**: Clean with proper indentation

### Updated Typography SCSS

Update `doc-editor.component.scss` — the `.km-editor .ProseMirror` scope:

```scss
// ── Base prose ────────────────────────────────────────────────
.km-editor .ProseMirror {
  outline: none;
  caret-color: var(--km-gold);
  font-family: var(--km-font-body);  // Poppins
  font-size: 16px;
  color: var(--km-text);
  line-height: 1.75;
  padding-bottom: 30vh;  // breathing room at bottom

  // ── Paragraphs ──────────────────────────────────────────────
  > p {
    margin: 0 0 2px;
    min-height: 1.75em;
  }

  // ── Placeholders ────────────────────────────────────────────
  p.is-empty:first-child::before,
  h1.is-empty::before,
  h2.is-empty::before,
  h3.is-empty::before {
    content: attr(data-placeholder);
    color: var(--km-text-3);
    pointer-events: none;
    float: left;
    height: 0;
  }

  // ── Headings ────────────────────────────────────────────────
  h1, h2, h3 {
    font-family: var(--km-font-body);
    font-weight: 700;
    color: var(--km-text);
    margin: 0;
    line-height: 1.25;
  }

  // H1 — page-section title
  h1 {
    font-size: 1.875rem;    // 30px
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 4px;
    letter-spacing: -0.02em;
    color: var(--km-text);

    &:first-child { margin-top: 0.5em; }
  }

  // H2 — section header
  h2 {
    font-size: 1.375rem;    // 22px
    font-weight: 600;
    margin-top: 1.3em;
    margin-bottom: 3px;
    letter-spacing: -0.01em;
    color: var(--km-text);
  }

  // H3 — sub-section (slightly muted)
  h3 {
    font-size: 1.125rem;    // 18px
    font-weight: 600;
    margin-top: 1.1em;
    margin-bottom: 2px;
    color: var(--km-text-2);
    letter-spacing: 0;
  }

  // ── Divider / HR ─────────────────────────────────────────────
  // Keep your existing diamond ornament style — it's great already.
  // Only ensure margin is generous
  hr {
    border: none;
    margin: 28px auto;
    // ... keep existing diamond ::before/::after ornament
  }

  // ── Blockquote / Quote ───────────────────────────────────────
  blockquote {
    border-left: 3px solid var(--km-gold);
    margin: 12px 0;
    padding: 6px 0 6px 18px;
    color: var(--km-text-2);
    font-style: italic;
    background: rgba(201, 168, 76, 0.055);
    border-radius: 0 8px 8px 0;
    position: relative;

    p {
      margin: 0;
      color: inherit;
      font-style: inherit;
    }

    &::before {
      content: '"';
      position: absolute;
      top: -4px;
      left: -2px;
      font-size: 2.5rem;
      color: var(--km-gold);
      opacity: 0.3;
      font-family: Georgia, serif;
      line-height: 1;
    }
  }

  // ── Callout ──────────────────────────────────────────────────
  // See Section 3 below for full callout spec

  // ── Code ─────────────────────────────────────────────────────
  code:not(pre code) {
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.85em;
    background: var(--km-surface-2);
    border: 1px solid var(--km-border);
    border-radius: 4px;
    padding: 0.1em 0.4em;
    color: #e07b54;  // warm orange — Notion code color
  }

  pre {
    background: var(--km-surface-2);
    border: 1px solid var(--km-border);
    border-radius: 10px;
    padding: 16px 20px;
    overflow-x: auto;
    margin: 12px 0;

    code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.875rem;
      background: none;
      border: none;
      padding: 0;
      border-radius: 0;
      color: var(--km-text);
    }
  }

  // ── Lists ─────────────────────────────────────────────────────
  ul, ol {
    padding-left: 1.6em;
    margin: 2px 0;

    li {
      margin: 1px 0;
      line-height: 1.75;
      padding-left: 2px;

      // Nested lists
      ul, ol { margin: 1px 0; }
    }
  }

  // Bullet custom marker
  ul li::marker { color: var(--km-gold); }

  // Numbered list marker
  ol { counter-reset: list-counter; }
  ol li::marker { color: var(--km-text-2); font-size: 0.95em; }

  // ── Task List ────────────────────────────────────────────────
  ul[data-type="taskList"] {
    list-style: none;
    padding-left: 2px;

    li {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 2px 0;
      margin: 0;

      > label {
        flex-shrink: 0;
        margin-top: 4px;
        display: flex;
        align-items: center;
        cursor: pointer;
      }

      input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: var(--km-gold);
        border-radius: 4px;
        cursor: pointer;
      }

      > div {
        flex: 1;
        p { margin: 0; }
      }

      &[data-checked="true"] > div {
        opacity: 0.45;
        text-decoration: line-through;
        text-decoration-color: var(--km-text-3);
      }
    }
  }

  // ── Inline Formatting ─────────────────────────────────────────
  strong { font-weight: 700; }
  em     { font-style: italic; }
  s      { text-decoration: line-through; opacity: 0.55; }
  u      { text-decoration-color: var(--km-gold); text-underline-offset: 3px; }
  mark   { background: rgba(201, 168, 76, 0.28); border-radius: 3px; padding: 0.05em 2px; }

  // Links
  a {
    color: var(--km-gold);
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-thickness: 1px;
    transition: opacity 0.15s;
    &:hover { opacity: 0.75; }
  }

  // ── Images ───────────────────────────────────────────────────
  img {
    max-width: 100%;
    border-radius: 8px;
    display: block;
    margin: 12px 0;
  }

  // ── Arabic text (domain blocks) ───────────────────────────────
  [data-arabic], .km-arabic, [dir="rtl"] > p {
    font-family: var(--km-font-arabic);
    font-size: 1.4em;
    line-height: 2.1;
    direction: rtl;
    text-align: right;
  }

  // ── Selection ────────────────────────────────────────────────
  ::selection {
    background: rgba(201, 168, 76, 0.22);
  }
}
```

---

## 3. Callout Block — Refactor `callout.extension.ts`

### Current State
The extension exists but may render with limited variant support.

### Target: 6 Callout Types

Update `callout.extension.ts` to support these variants, each with emoji + color:

| Type | Default Emoji | Border Color | Background |
|---|---|---|---|
| `tip` | 💡 | `var(--km-gold)` | `rgba(201,168,76, 0.10)` |
| `info` | ℹ️ | `#3b82f6` | `rgba(59,130,246, 0.08)` |
| `warning` | ⚠️ | `#f59e0b` | `rgba(245,158,11, 0.08)` |
| `danger` | 🚨 | `#ef4444` | `rgba(239,68,68, 0.08)` |
| `success` | ✅ | `#22c55e` | `rgba(34,197,94, 0.08)` |
| `quote` | 💬 | `var(--km-border)` | `var(--km-surface-2)` |

### Updated Extension Attributes

```typescript
addAttributes() {
  return {
    type: {
      default: 'tip',
      parseHTML: el => el.getAttribute('data-callout-type') ?? 'tip',
      renderHTML: attrs => ({ 'data-callout-type': attrs['type'] }),
    },
    emoji: {
      default: '💡',
      parseHTML: el => el.getAttribute('data-callout-emoji') ?? '💡',
      renderHTML: attrs => ({ 'data-callout-emoji': attrs['emoji'] }),
    },
  };
},

renderHTML({ node, HTMLAttributes }) {
  return [
    'div',
    mergeAttributes(HTMLAttributes, {
      'data-callout': '',
      'data-callout-type': node.attrs['type'],
      'data-callout-emoji': node.attrs['emoji'],
      class: `km-callout km-callout--${node.attrs['type']}`,
    }),
    ['span', { class: 'km-callout__emoji', contenteditable: 'false' }, node.attrs['emoji']],
    ['div', { class: 'km-callout__body' }, 0],
  ];
},
```

### Callout SCSS

```scss
// In doc-editor.component.scss

.km-editor .ProseMirror {
  .km-callout {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 10px;
    border-left: 3px solid transparent;
    margin: 8px 0;
    transition: background 0.2s;

    &__emoji {
      font-size: 1.15em;
      flex-shrink: 0;
      line-height: 1.75;
      user-select: none;
      cursor: pointer;  // clicking opens emoji picker
    }

    &__body {
      flex: 1;
      min-width: 0;
      p { margin: 0; }
    }

    // Variants
    &--tip     { background: rgba(201,168,76, 0.10); border-color: #c9a84c; }
    &--info    { background: rgba(59,130,246,  0.08); border-color: #3b82f6; }
    &--warning { background: rgba(245,158,11,  0.08); border-color: #f59e0b; }
    &--danger  { background: rgba(239,68,68,   0.08); border-color: #ef4444; }
    &--success { background: rgba(34,197,94,   0.08); border-color: #22c55e; }
    &--quote   { background: var(--km-surface-2);     border-color: var(--km-border); font-style: italic; }
  }
}
```

### Callout Type Picker

When the emoji is clicked, show a small floating picker to change the callout type:

```html
<!-- callout-type-picker.component.html -->
<div class="km-callout-picker">
  @for (variant of variants; track variant.type) {
    <button class="km-callout-picker__item"
            [title]="variant.label"
            (click)="select(variant)">
      {{ variant.emoji }}
    </button>
  }
</div>
```

```typescript
readonly variants = [
  { type: 'tip',     emoji: '💡', label: 'Tip' },
  { type: 'info',    emoji: 'ℹ️', label: 'Info' },
  { type: 'warning', emoji: '⚠️', label: 'Warning' },
  { type: 'danger',  emoji: '🚨', label: 'Danger' },
  { type: 'success', emoji: '✅', label: 'Success' },
  { type: 'quote',   emoji: '💬', label: 'Quote' },
];
```

---

## 4. Slash Command — Add Missing Base Blocks

Open `slash-menu/slash-menu.config.ts` and add these entries to the existing registry:

### Missing Blocks to Add

```typescript
// Add to SLASH_ITEMS array — in the appropriate group

// ── TEXT GROUP additions ──────────────────────────────────────
{
  id: 'callout-tip',
  title: 'Callout',
  description: 'Colored callout box with emoji',
  icon: '💡',
  keywords: ['callout', 'note', 'box', 'highlight'],
  group: 'text',
  command: (editor) => editor.chain().focus()
    .insertContent({
      type: 'callout',
      attrs: { type: 'tip', emoji: '💡' },
      content: [{ type: 'paragraph' }],
    })
    .run(),
},
{
  id: 'callout-info',
  title: 'Info',
  description: 'Blue information callout',
  icon: 'ℹ️',
  keywords: ['info', 'information', 'callout'],
  group: 'text',
  command: (editor) => editor.chain().focus()
    .insertContent({ type: 'callout', attrs: { type: 'info', emoji: 'ℹ️' }, content: [{ type: 'paragraph' }] })
    .run(),
},
{
  id: 'callout-warning',
  title: 'Warning',
  description: 'Yellow warning callout',
  icon: '⚠️',
  keywords: ['warning', 'caution', 'callout'],
  group: 'text',
  command: (editor) => editor.chain().focus()
    .insertContent({ type: 'callout', attrs: { type: 'warning', emoji: '⚠️' }, content: [{ type: 'paragraph' }] })
    .run(),
},

// ── LIST GROUP additions ──────────────────────────────────────
{
  id: 'todo',
  title: 'Task List',
  description: 'Checkboxes for to-do items',
  icon: '☑',
  keywords: ['todo', 'task', 'checklist', 'checkbox', 'check'],
  group: 'list',
  command: (editor) => editor.chain().focus().toggleTaskList().run(),
},
```

### Slash Menu Visual Grouping

Ensure groups are labeled and visually separated in `slash-command.extension.ts`:

```typescript
// Groups config — ordered display
export const SLASH_GROUPS = [
  { key: 'text',       label: 'Text & Media' },
  { key: 'list',       label: 'Lists' },
  { key: 'quran',      label: 'Quran ۝' },
  { key: 'arabic',     label: 'Arabic ع' },
  { key: 'worldview',  label: 'Worldview 🌍' },
] as const;
```

---

## 5. Task List — Add to Extension List

In `doc-editor.service.ts`, add TaskList and TaskItem to the Tiptap extensions array:

```typescript
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';

// In initEditor extensions array, add after StarterKit:
TaskList,
TaskItem.configure({ nested: true }),
```

Install packages if not already installed:

```bash
npm install @tiptap/extension-task-list @tiptap/extension-task-item
```

---

## 6. Document Header — Notion-Like Page Title

Update `doc-editor.component.html` to add an emoji/icon slot before the title (like Notion):

```html
<div class="km-docs-shell">
  <header class="km-doc-topbar">

    <!-- Notion-style: emoji icon + expandable title -->
    <div class="km-doc-header-row">
      <!-- Emoji icon (optional, click to pick) -->
      <button class="km-doc-icon" (click)="pickIcon()" title="Add icon">
        {{ editorSvc.icon() || '📄' }}
      </button>

      <!-- Editable title -->
      <input class="km-doc-title"
             [(ngModel)]="titleModel"
             (ngModelChange)="onTitleChange($event)"
             placeholder="Untitled"
             (keydown.enter)="focusEditor()" />
    </div>

    <!-- Status bar -->
    <div class="km-doc-meta">
      <span class="km-doc-save-status" [class.saving]="editorSvc.isSaving()" [class.dirty]="editorSvc.isDirty()">
        @if (editorSvc.isSaving()) { Saving… }
        @else if (editorSvc.isDirty()) { Unsaved }
        @else { Saved ✓ }
      </span>
      <span class="km-doc-sep">·</span>
      <span class="km-doc-wordcount">{{ editorSvc.wordCount() }} words</span>
    </div>
  </header>

  <div class="km-doc-body">
    <main class="km-doc-editor-wrap">
      <div #editorEl class="km-doc-editor-el"></div>
    </main>
    <km-doc-right-panel />
  </div>

  <km-highlight-toolbar />
</div>
```

### Header SCSS additions

```scss
.km-doc-header-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 32px 0 8px;
}

.km-doc-icon {
  font-size: 2rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  border-radius: 6px;
  transition: background 0.15s;
  flex-shrink: 0;

  &:hover { background: var(--km-surface-2); }
}

.km-doc-title {
  font-size: 2rem;
  font-weight: 700;
  font-family: var(--km-font-body);
  color: var(--km-text);
  background: none;
  border: none;
  outline: none;
  width: 100%;
  line-height: 1.25;
  letter-spacing: -0.02em;

  &::placeholder { color: var(--km-text-3); }
}

.km-doc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 16px;
  font-size: 0.78rem;
  color: var(--km-text-3);
}

.km-doc-save-status {
  &.saving { color: var(--km-text-3); }
  &.dirty  { color: #f59e0b; }
  &:not(.saving):not(.dirty) { color: #22c55e; }
}
```

---

## 7. Heading Size Reference Table

For the `doc-editor.component.html` title input and the Tiptap editor headings to feel cohesive:

| Element | Font size | Weight | Line height | Color |
|---|---|---|---|---|
| **Page title** (input) | `2rem` (32px) | 700 | 1.25 | `--km-text` |
| **H1** (in editor) | `1.875rem` (30px) | 700 | 1.25 | `--km-text` |
| **H2** (in editor) | `1.375rem` (22px) | 600 | 1.3 | `--km-text` |
| **H3** (in editor) | `1.125rem` (18px) | 600 | 1.35 | `--km-text-2` |
| **Body text** | `1rem` (16px) | 400 | 1.75 | `--km-text` |
| **Code** | `0.875rem` (14px) | 400 | 1.6 | `--km-text` |

The page title is intentionally slightly larger than H1 to create a clear document → section hierarchy.

---

## 8. Keyboard Shortcuts — Complete Reference

Verify all these work after the refactor (StarterKit + domain extensions):

| Block | Shortcut | Input Rule |
|---|---|---|
| H1 | `Mod+Alt+1` | `# ` |
| H2 | `Mod+Alt+2` | `## ` |
| H3 | `Mod+Alt+3` | `### ` |
| Quote | `Mod+Shift+B` | `> ` |
| Divider | — | `---` |
| Bullet list | `Mod+Shift+8` | `- ` or `* ` |
| Ordered list | `Mod+Shift+7` | `1. ` |
| Task list | `Mod+Shift+9` | `[ ] ` |
| Code block | `Mod+Alt+C` | ` ``` ` |
| Bold | `Mod+B` | `**text**` |
| Italic | `Mod+I` | `_text_` |
| Code inline | `Mod+E` | `` `text` `` |
| Underline | `Mod+U` | — |
| Strike | `Mod+Shift+S` | `~~text~~` |

---

## 9. Migration Checklist

```
Fix rAF Violations (Priority 1)
  [ ] Remove nested requestAnimationFrame in animateContentIn()
  [ ] Add 50ms debounce gate to MutationObserver in watchForNewBlocks()
  [ ] Wrap wordCount.set() in queueMicrotask() in doc-editor.service.ts
  [ ] Wrap auto-direction scan in queueMicrotask() in auto-direction.extension.ts

Typography Upgrade (Priority 2)
  [ ] Update heading sizes (H1: 1.875rem, H2: 1.375rem, H3: 1.125rem)
  [ ] Update blockquote styling with opening quote mark
  [ ] Update code/pre block styling with warm orange inline code color
  [ ] Add task list SCSS (checkbox + strikethrough on checked)
  [ ] Keep existing HR diamond ornament

Callout Refactor (Priority 3)
  [ ] Add 'type' and 'emoji' attributes to callout.extension.ts
  [ ] Add 6 callout variants with correct CSS classes
  [ ] Add callout variant SCSS
  [ ] (Optional) Add emoji picker for callout type switching

Slash Command (Priority 4)
  [ ] Add Callout (tip/info/warning) entries
  [ ] Add Task List entry
  [ ] Add group labels to menu UI

Task List Extension (Priority 5)
  [ ] npm install @tiptap/extension-task-list @tiptap/extension-task-item
  [ ] Add to extension list in doc-editor.service.ts

Page Header Polish (Priority 6)
  [ ] Add icon/emoji slot before title input
  [ ] Update save status display (colors: yellow=unsaved, green=saved)
  [ ] Add focusEditor() method to jump from title to editor on Enter

Verify
  [ ] Open Chrome DevTools Performance tab — confirm zero rAF violations
  [ ] Test slash menu: all 3 callout types, task list, heading shortcuts
  [ ] Test Arabic content: RTL detection still works after debounce fix
  [ ] Test Quran embed, vocab block, claim block — ensure no regressions
```

---

## 10. File-by-File Change Summary

| File | Change type | What changes |
|---|---|---|
| `doc-editor.component.ts` | Fix | `animateContentIn` (remove nested rAF) + `watchForNewBlocks` (add debounce gate) |
| `doc-editor.component.html` | Enhancement | Add emoji icon slot + richer save status |
| `doc-editor.component.scss` | Restyle | Full typography update per Section 2 |
| `doc-editor.service.ts` | Fix | `queueMicrotask` for wordCount in `onUpdate` |
| `auto-direction.extension.ts` | Fix | `queueMicrotask` for direction scan in `appendTransaction` |
| `callout.extension.ts` | Extend | Add type/emoji attrs + 6 variant classes |
| `slash-menu/slash-menu.config.ts` | Extend | Add callout variants + task list |
| `package.json` | Add deps | `@tiptap/extension-task-list`, `@tiptap/extension-task-item` |
| All other files | No change | Domain extensions untouched |

---

## 11. Ionic Mobile — Complete Component Architecture

Since this is an **Ionic 8 mobile app** (iOS/Android via Capacitor), every component must be designed for touch. This section overrides any web-only patterns above.

### 11a. Ionic Page Shell — `doc-editor.page.ts`

Replace any `<div>` wrappers with proper Ionic components:

```typescript
@Component({
  selector: 'app-doc-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ── Header ─────────────────────────────────────────── -->
    <ion-header class="ion-no-border km-doc-header" [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/docs" text="" />
        </ion-buttons>

        <ion-buttons slot="end">
          <!-- Save indicator -->
          <span class="km-save-pill"
                [class.saving]="editorSvc.isSaving()"
                [class.dirty]="editorSvc.isDirty()">
            @if (editorSvc.isSaving()) { Saving… }
            @else if (editorSvc.isDirty()) { • }
            @else { ✓ }
          </span>
          <!-- More options -->
          <ion-button fill="clear" (click)="openMoreSheet()">
            <ion-icon slot="icon-only" name="ellipsis-horizontal" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- ── Scrollable Content ─────────────────────────────── -->
    <ion-content
      class="km-doc-content"
      [scrollY]="true"
      [fullscreen]="true"
      (ionScrollStart)="onScrollStart()"
      (ionScrollEnd)="onScrollEnd()">

      <!-- Page cover (optional) -->
      @if (coverUrl()) {
        <div class="km-doc-cover"
             [style.background-image]="'url(' + coverUrl() + ')'">
        </div>
      }

      <!-- Page header: icon + title -->
      <div class="km-doc-header-area ion-padding-horizontal">
        <button class="km-doc-emoji-btn" (click)="pickEmoji()" [attr.aria-label]="'Change icon'">
          {{ emoji() }}
        </button>
        <ion-textarea
          class="km-doc-title-area"
          [(ngModel)]="title"
          [autoGrow]="true"
          [rows]="1"
          placeholder="Untitled"
          (ionInput)="onTitleChange()"
          (keydown.enter)="$event.preventDefault(); focusEditor()"
        />
      </div>

      <!-- Tiptap editor mount -->
      <div #editorMount
           class="km-editor-mount ion-padding-horizontal"
           (click)="onEditorAreaClick($event)">
      </div>

    </ion-content>

    <!-- ── Floating Formatting Toolbar (above keyboard) ────── -->
    @if (showToolbar() && toolbarPos()) {
      <div class="km-floating-toolbar"
           [style.bottom.px]="keyboardHeight() + 8">
        <km-format-toolbar [editor]="editor()" />
      </div>
    }

    <!-- ── Slash Menu (positioned above cursor) ─────────────── -->
    <km-slash-menu />

    <!-- ── Word count — bottom safe area ────────────────────── -->
    <div class="km-word-count-bar">
      {{ editorSvc.wordCount() }} words
    </div>
  `,
  imports: [
    IonHeader, IonToolbar, IonButtons, IonBackButton,
    IonButton, IonIcon, IonContent, IonTextarea,
    NgModel, NgIf, AsyncPipe,
    FormatToolbarComponent, SlashMenuComponent,
  ],
})
export class DocEditorPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('editorMount') editorMount!: ElementRef<HTMLDivElement>;

  readonly title        = signal('');
  readonly emoji        = signal('📝');
  readonly coverUrl     = signal<string | null>(null);
  readonly showToolbar  = signal(false);
  readonly toolbarPos   = signal<{ bottom: number } | null>(null);
  readonly keyboardHeight = signal(0);
  readonly editor       = computed(() => this.editorSvc.getEditor());

  private keyboardListeners: PluginListenerHandle[] = [];

  constructor(
    readonly editorSvc: DocEditorService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    // Track virtual keyboard height (Capacitor Keyboard plugin)
    this.keyboardListeners.push(
      await Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
        this.keyboardHeight.set(keyboardHeight);
      }),
      await Keyboard.addListener('keyboardWillHide', () => {
        this.keyboardHeight.set(0);
        this.showToolbar.set(false);
      }),
    );
  }

  ngAfterViewInit(): void {
    this.editorSvc.initEditor(this.editorMount.nativeElement);

    // Selection → show formatting toolbar above keyboard
    this.editorSvc.getEditor()?.on('selectionUpdate', ({ editor }) => {
      const { from, to } = editor.state.selection;
      this.showToolbar.set(from !== to);
    });
  }

  focusEditor(): void {
    this.editorSvc.getEditor()?.commands.focus('end');
  }

  onEditorAreaClick(event: Event): void {
    // If click is in blank area below content, move cursor to end
    const pm = this.editorMount.nativeElement.querySelector('.ProseMirror');
    if (event.target === this.editorMount.nativeElement || event.target === pm) {
      this.editorSvc.getEditor()?.commands.focus('end');
    }
  }

  async openMoreSheet(): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      buttons: [
        { text: 'Export', icon: 'download-outline', handler: () => this.exportDoc() },
        { text: 'Share', icon: 'share-outline', handler: () => this.shareDoc() },
        { text: 'Delete', icon: 'trash-outline', role: 'destructive', handler: () => this.confirmDelete() },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async pickEmoji(): Promise<void> {
    // Use an Ionic modal for emoji picking on mobile
    const modal = await this.modalCtrl.create({
      component: EmojiPickerComponent,
      breakpoints: [0, 0.5],
      initialBreakpoint: 0.5,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.emoji) this.emoji.set(data.emoji);
  }

  async ngOnDestroy(): Promise<void> {
    this.editorSvc.destroyEditor();
    for (const l of this.keyboardListeners) await l.remove();
  }
}
```

### 11b. Ionic-Specific SCSS

The Ionic shell wraps the ProseMirror editor. Mobile styling must account for safe areas, dynamic keyboard height, and touch targets.

```scss
// doc-editor.page.scss

// ── Ion Header ───────────────────────────────────────────────
ion-header.km-doc-header {
  --background: var(--km-bg);
  border-bottom: 1px solid var(--km-border);
}

// ── Ion Content ──────────────────────────────────────────────
ion-content.km-doc-content {
  --background: var(--km-bg);
  --padding-top: 0;
  --padding-start: 0;
  --padding-end: 0;
  --padding-bottom: 0;
}

// ── Page Cover ───────────────────────────────────────────────
.km-doc-cover {
  width: 100%;
  height: 180px;
  background-size: cover;
  background-position: center 30%;
  background-color: var(--km-surface-2);
}

// ── Document Header Area ─────────────────────────────────────
.km-doc-header-area {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding-top: 28px;
  padding-bottom: 4px;
}

.km-doc-emoji-btn {
  font-size: 2.2rem;
  line-height: 1;
  background: none;
  border: none;
  padding: 4px;
  border-radius: 8px;
  cursor: pointer;
  flex-shrink: 0;
  min-width: 44px;   // ← 44px minimum touch target (Apple HIG)
  min-height: 44px;
  display: grid;
  place-items: center;
  -webkit-tap-highlight-color: transparent;

  &:active { background: var(--km-surface-2); }
}

.km-doc-title-area {
  --background: transparent;
  --padding-top: 4px;
  --padding-bottom: 4px;
  --padding-start: 0;
  --padding-end: 0;
  font-size: 1.875rem;
  font-weight: 700;
  font-family: var(--km-font-body);
  color: var(--km-text);
  letter-spacing: -0.02em;
  line-height: 1.25;
  flex: 1;

  &::part(native) {
    padding: 0;
    font-size: inherit;
    font-weight: inherit;
    font-family: inherit;
    color: inherit;
    letter-spacing: inherit;
    line-height: inherit;
  }

  &::part(textarea) {
    padding: 0;
  }
}

// ── Editor Mount ─────────────────────────────────────────────
.km-editor-mount {
  padding-top: 12px;
  // Bottom padding = keyboard height + formatting toolbar + safe area
  padding-bottom: max(
    env(safe-area-inset-bottom, 0px) + 120px,
    calc(var(--kb-height, 0px) + 80px)
  );
  min-height: 60vh;  // ensure tappable empty space
  cursor: text;
}

// ── Editor Content (ProseMirror) ─────────────────────────────
.km-editor-mount .ProseMirror {
  outline: none;
  caret-color: var(--km-gold);
  font-family: var(--km-font-body);
  font-size: 16px;   // ← NEVER below 16px on mobile (prevents iOS zoom)
  color: var(--km-text);
  line-height: 1.75;

  // Paragraph
  p {
    margin: 0 0 2px;
    min-height: 1.75em;
  }

  // Headings — mobile sizes (slightly smaller than desktop)
  h1 {
    font-size: 1.625rem;   // 26px on mobile
    font-weight: 700;
    margin: 1.2em 0 4px;
    line-height: 1.2;
    &:first-child { margin-top: 0.4em; }
  }
  h2 {
    font-size: 1.25rem;    // 20px on mobile
    font-weight: 600;
    margin: 1em 0 3px;
  }
  h3 {
    font-size: 1.0625rem;  // 17px on mobile (stays above 16px base)
    font-weight: 600;
    margin: 0.9em 0 2px;
    color: var(--km-text-2);
  }

  // All other typography: same as Section 2
  // (blockquote, code, lists, callout, etc.)
}

// ── Floating Formatting Toolbar ──────────────────────────────
.km-floating-toolbar {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 999;
  display: flex;
  justify-content: center;
  padding: 0 8px;
  pointer-events: none;

  > km-format-toolbar {
    pointer-events: all;
    background: var(--km-surface);
    border: 1px solid var(--km-border);
    border-radius: 12px;
    padding: 6px 10px;
    display: flex;
    gap: 4px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.22);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    max-width: 100%;
    overflow-x: auto;

    // Touch-friendly button size
    button {
      min-width: 36px;
      min-height: 36px;
      border: none;
      background: none;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--km-text-2);
      display: grid;
      place-items: center;
      -webkit-tap-highlight-color: transparent;

      &:active  { background: var(--km-surface-2); }
      &.is-active { background: var(--km-gold); color: #000; }
    }

    .sep {
      width: 1px;
      height: 22px;
      background: var(--km-border);
      margin: auto 2px;
      flex-shrink: 0;
    }
  }
}

// ── Slash Menu (full-width bottom sheet on mobile) ────────────
:host ::ng-deep .km-slash-menu {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: var(--km-surface);
  border-radius: 16px 16px 0 0;
  border: 1px solid var(--km-border);
  border-bottom: none;
  box-shadow: 0 -8px 40px rgba(0,0,0,0.25);
  max-height: 55vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  // Drag handle
  &::before {
    content: '';
    display: block;
    width: 36px;
    height: 4px;
    background: var(--km-border);
    border-radius: 2px;
    margin: 10px auto 4px;
    flex-shrink: 0;
  }

  // Search input
  .km-slash-search {
    padding: 8px 16px 12px;
    border-bottom: 1px solid var(--km-border);
    flex-shrink: 0;

    input {
      width: 100%;
      background: var(--km-surface-2);
      border: none;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 16px;  // ← prevent iOS zoom
      color: var(--km-text);
      outline: none;
    }
  }

  // Scrollable items
  .km-slash-items {
    overflow-y: auto;
    flex: 1;
    padding: 8px 0 env(safe-area-inset-bottom, 16px);
    -webkit-overflow-scrolling: touch;
  }

  // Group label
  .km-slash-group-label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--km-text-3);
    padding: 10px 16px 4px;
  }

  // Item — full touch target
  .km-slash-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;   // generous touch target
    min-height: 56px;
    -webkit-tap-highlight-color: transparent;
    cursor: pointer;

    &__icon {
      width: 36px;
      height: 36px;
      background: var(--km-surface-2);
      border-radius: 8px;
      display: grid;
      place-items: center;
      font-size: 1.1rem;
      flex-shrink: 0;
    }

    &__title { font-size: 0.9375rem; font-weight: 500; color: var(--km-text); }
    &__desc  { font-size: 0.8125rem; color: var(--km-text-3); margin-top: 1px; }

    &:active, &--selected {
      background: var(--km-surface-2);
      .km-slash-item__icon { background: var(--km-gold); color: #000; }
    }
  }
}

// ── Save Indicator ────────────────────────────────────────────
.km-save-pill {
  font-size: 0.8rem;
  padding: 3px 8px;
  border-radius: 20px;
  margin-right: 4px;

  &.saving { color: var(--km-text-3); }
  &.dirty  { color: #f59e0b; font-size: 1.2rem; line-height: 1; }
  &:not(.saving):not(.dirty) { color: #22c55e; }
}

// ── Word Count ────────────────────────────────────────────────
.km-word-count-bar {
  position: fixed;
  bottom: env(safe-area-inset-bottom, 8px);
  right: 16px;
  font-size: 0.72rem;
  color: var(--km-text-3);
  pointer-events: none;
  z-index: 10;
}
```

### 11c. Capacitor Keyboard Integration

Install and configure the Capacitor Keyboard plugin:

```bash
npm install @capacitor/keyboard
npx cap sync
```

In `doc-editor.page.ts` (already shown above) and in your global `app.component.ts` or `main.ts`, sync the keyboard height to a CSS variable so all components can respond:

```typescript
// app.component.ts — global keyboard CSS var
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  Keyboard.addListener('keyboardWillShow', ({ keyboardHeight }) => {
    document.documentElement.style.setProperty('--kb-height', `${keyboardHeight}px`);
  });
  Keyboard.addListener('keyboardWillHide', () => {
    document.documentElement.style.setProperty('--kb-height', '0px');
  });
}
```

Then in SCSS you can use `var(--kb-height, 0px)` anywhere.

### 11d. Touch Interactions

**Long-press → Block Options (replace right-click)**

On mobile, users can't right-click. The existing `block-handle.ts` uses a ⋮⋮ grip — keep it but ensure touch targets are `min 44×44px`:

```scss
// block-handle.ts rendered element
.km-block-handle {
  min-width: 44px;
  min-height: 44px;
  display: grid;
  place-items: center;
  -webkit-tap-highlight-color: transparent;
}
```

**Tap to select block** — on iOS, the ProseMirror `contenteditable` tap behavior is correct by default. Ensure no `pointer-events: none` is accidentally applied to block wrappers.

**Drag to reorder** — requires `touch-action: none` on the draggable element:

```scss
.km-block-grip { touch-action: none; }
```

### 11e. Mobile Slash Menu — Bottom Sheet Instead of Popover

On web the slash menu appears near the cursor (floating popover). On mobile, always open as a **bottom sheet** — it's unreachable near the cursor when the keyboard is up.

Detect platform in the slash command extension:

```typescript
import { Capacitor } from '@capacitor/core';

// In slash-command.extension.ts renderMenu function:
const isMobile = Capacitor.isNativePlatform();

if (isMobile) {
  // Open bottom sheet via SlashMenuService signal
  slashMenuService.openBottomSheet(query);
} else {
  // Desktop: position near cursor
  slashMenuService.openPopover(query, coordsAtCursor);
}
```

### 11f. Font Size Safety

**Never use font sizes below 16px inside `contenteditable` on iOS** — Safari auto-zooms the viewport if input font-size < 16px, which breaks the editor layout.

```typescript
// In Tiptap editorProps, ensure minimum font size
editorProps: {
  attributes: {
    class: 'km-editor',
    style: 'font-size: 16px',  // ← iOS zoom prevention
  },
},
```

### 11g. Safe Area Insets

All bottom-fixed elements must respect the iPhone home indicator:

```scss
// Applied to: floating toolbar, slash menu, word count bar, any fixed bottom elements
padding-bottom: env(safe-area-inset-bottom, 0px);
// or
bottom: max(16px, env(safe-area-inset-bottom, 16px));
```

In `capacitor.config.ts`:

```typescript
ios: {
  contentInset: 'automatic',
}
```

---

## 12. Mobile Migration Checklist (additions to Section 9)

```
Ionic / Capacitor Mobile (Priority 0 — before everything else)
  [ ] Replace <div> page shell with ion-header + ion-content + ion-toolbar
  [ ] Replace <input> title with ion-textarea (auto-grow)
  [ ] Ensure no font-size < 16px in editor content (iOS zoom prevention)
  [ ] Add Capacitor Keyboard plugin + sync --kb-height CSS var
  [ ] Apply env(safe-area-inset-bottom) to all fixed bottom elements
  [ ] Change slash menu to bottom sheet on native platform
  [ ] Ensure all interactive elements have min 44×44px touch target
  [ ] Add touch-action: none to draggable block grips
  [ ] Test on real iOS device: verify no viewport zoom on tap
  [ ] Test on real Android device: verify keyboard avoidance
  [ ] Test slash menu bottom sheet: search, keyboard nav, dismiss
  [ ] Test formatting toolbar: appears above keyboard, all buttons reachable
  [ ] Test block handle: long-press menu works with touch
```
