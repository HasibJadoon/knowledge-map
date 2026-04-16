/**
 * Block handle — Notion-style ⋮⋮ drag grip + context menu + block picker.
 * Uses a mutable editorRef so render() can be called before the editor is ready.
 */

import type { Editor } from '@tiptap/core';

export interface EditorRef {
  current: Editor | null;
  hoveredBlockPos: number | null;
  hoveredBlockNodeSize: number | null;
}

export interface BlockHandleCallbacks {
  /** Called when user selects "New Page" from the block picker. */
  onCreatePage?: (afterPos: number) => void;
}

// ── Block picker definitions ───────────────────────────────────────────────

interface PickerItem {
  group: string;
  icon: string;
  title: string;
  desc: string;
  run: (editor: Editor, afterPos: number) => void;
}

const PICKER_ITEMS: PickerItem[] = [
  // Text
  { group: 'Text', icon: 'T',    title: 'Text',         desc: 'Plain paragraph',
    run: (ed, p) => insertBlock(ed, p, { type: 'paragraph', content: [] }) },
  { group: 'Text', icon: 'H1',   title: 'Heading 1',    desc: 'Large heading',
    run: (ed, p) => insertBlock(ed, p, { type: 'heading', attrs: { level: 1 }, content: [] }) },
  { group: 'Text', icon: 'H2',   title: 'Heading 2',    desc: 'Medium heading',
    run: (ed, p) => insertBlock(ed, p, { type: 'heading', attrs: { level: 2 }, content: [] }) },
  { group: 'Text', icon: 'H3',   title: 'Heading 3',    desc: 'Small heading',
    run: (ed, p) => insertBlock(ed, p, { type: 'heading', attrs: { level: 3 }, content: [] }) },

  // Lists
  { group: 'Lists', icon: '•≡',  title: 'Bullet List',  desc: 'Unordered list',
    run: (ed, p) => { insertBlock(ed, p, { type: 'paragraph', content: [] }); ed.chain().focus().toggleBulletList().run(); } },
  { group: 'Lists', icon: '1≡',  title: 'Numbered List', desc: 'Ordered list',
    run: (ed, p) => { insertBlock(ed, p, { type: 'paragraph', content: [] }); ed.chain().focus().toggleOrderedList().run(); } },

  // Blocks
  { group: 'Blocks', icon: '❝',  title: 'Quote',        desc: 'Indented blockquote',
    run: (ed, p) => { insertBlock(ed, p, { type: 'paragraph', content: [] }); ed.chain().focus().setBlockquote().run(); } },
  { group: 'Blocks', icon: '</>', title: 'Code Block',   desc: 'Monospace code',
    run: (ed, p) => { insertBlock(ed, p, { type: 'paragraph', content: [] }); ed.chain().focus().setCodeBlock().run(); } },
  { group: 'Blocks', icon: '💡', title: 'Callout',      desc: 'Highlighted callout with icon',
    run: (ed, p) => ed.chain().focus().insertContentAt(p, { type: 'callout', attrs: { emoji: '💡' }, content: [{ type: 'paragraph' }] }).run() },
  { group: 'Blocks', icon: '—',  title: 'Divider',      desc: 'Horizontal rule',
    run: (ed, p) => ed.chain().focus().insertContentAt(p, { type: 'horizontalRule' }).run() },
];

function insertBlock(editor: Editor, afterPos: number, content: object): void {
  editor.chain()
    .focus()
    .insertContentAt(afterPos, content)
    .setTextSelection(afterPos + 1)
    .run();
}

interface BlockTarget {
  from: number;
  to: number;
  afterPos: number;
  selectionPos: number;
}

function getSelectionTarget(editor: Editor): BlockTarget {
  const { $from } = editor.state.selection;
  const depth = Math.max(1, $from.depth);
  const from = $from.before(depth);
  const to = $from.after(depth);

  return {
    from,
    to,
    afterPos: to,
    selectionPos: Math.min(from + 1, Math.max(from, to - 1)),
  };
}

// DragHandle already resolves the exact hovered block for us. Reuse it so block
// actions apply to the visible handle target instead of a stale text cursor.
function getTargetBlock(editorRef: EditorRef, editor: Editor): BlockTarget {
  if (typeof editorRef.hoveredBlockPos === 'number' && editorRef.hoveredBlockPos >= 0) {
    const node = editor.state.doc.nodeAt(editorRef.hoveredBlockPos);
    const nodeSize = editorRef.hoveredBlockNodeSize ?? node?.nodeSize ?? null;

    if (node && nodeSize && nodeSize > 0) {
      const from = editorRef.hoveredBlockPos;
      const to = from + nodeSize;

      return {
        from,
        to,
        afterPos: to,
        selectionPos: node.isTextblock
          ? Math.min(from + 1, to - 1)
          : Math.max(from, to - 1),
      };
    }
  }

  return getSelectionTarget(editor);
}

function runOnTargetBlock(
  editorRef: EditorRef,
  editor: Editor,
  command: (chain: ReturnType<Editor['chain']>, target: BlockTarget) => ReturnType<Editor['chain']>,
): void {
  const target = getTargetBlock(editorRef, editor);
  const chain = editor.chain().focus().setTextSelection(target.selectionPos);
  command(chain, target).run();
}

// ── Block picker state ─────────────────────────────────────────────────────

let pickerEl: HTMLElement | null = null;
let pickerSelectedIdx = 0;
let pickerItems: PickerItem[] = [...PICKER_ITEMS];
let pickerOnSelect: ((item: PickerItem) => void) | null = null;

function closeBlockPicker() {
  pickerEl?.remove();
  pickerEl = null;
  pickerOnSelect = null;
  document.removeEventListener('mousedown', outsidePickerClick, true);
  document.removeEventListener('keydown', pickerKeydown);
}

function outsidePickerClick(e: MouseEvent) {
  if (!pickerEl?.contains(e.target as Node)) closeBlockPicker();
}

function pickerKeydown(e: KeyboardEvent) {
  if (!pickerEl) return;
  if (e.key === 'Escape') { closeBlockPicker(); return; }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    pickerSelectedIdx = (pickerSelectedIdx + 1) % pickerItems.length;
    rerenderPicker();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    pickerSelectedIdx = (pickerSelectedIdx - 1 + pickerItems.length) % pickerItems.length;
    rerenderPicker();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const item = pickerItems[pickerSelectedIdx];
    if (item) pickerOnSelect?.(item);
  }
}

function rerenderPicker() {
  if (!pickerEl) return;

  // Rebuild content area (keep header)
  const content = pickerEl.querySelector('.km-bp__content') as HTMLElement;
  if (!content) return;
  content.innerHTML = '';

  const groups = [...new Set(pickerItems.map(i => i.group))];
  groups.forEach(group => {
    const groupItems = pickerItems.filter(i => i.group === group);

    const groupEl = document.createElement('div');
    groupEl.className = 'km-bp__group';

    const label = document.createElement('div');
    label.className = 'km-bp__group-label';
    label.textContent = group.toUpperCase();
    groupEl.appendChild(label);

    groupItems.forEach(item => {
      const idx = pickerItems.indexOf(item);
      const btn = document.createElement('button');
      btn.className = 'km-bp__item' + (idx === pickerSelectedIdx ? ' km-bp__item--active' : '');

      btn.innerHTML = `
        <span class="km-bp__icon">${item.icon}</span>
        <span class="km-bp__text">
          <span class="km-bp__title">${item.title}</span>
          <span class="km-bp__desc">${item.desc}</span>
        </span>
      `;
      btn.addEventListener('mouseenter', () => {
        if (pickerSelectedIdx === idx) return;
        content.querySelector('.km-bp__item--active')?.classList.remove('km-bp__item--active');
        btn.classList.add('km-bp__item--active');
        pickerSelectedIdx = idx;
      });
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); pickerOnSelect?.(item); });
      groupEl.appendChild(btn);
    });
    content.appendChild(groupEl);
  });

  const active = content.querySelector('.km-bp__item--active') as HTMLElement | null;
  active?.scrollIntoView({ block: 'nearest' });
}

function openBlockPicker(
  anchor: DOMRect,
  editor: Editor,
  afterPos: number,
  onCreatePage?: (pos: number) => void,
) {
  closeBlockPicker();
  pickerSelectedIdx = 0;

  // Build items list — include Page if callback provided
  pickerItems = [...PICKER_ITEMS];
  if (onCreatePage) {
    pickerItems.push({
      group: 'Pages',
      icon: '📄',
      title: 'New Page',
      desc: 'Create a linked sub-document',
      run: (_ed, pos) => { onCreatePage(pos); },
    });
  }

  injectPickerStyles();

  const menu = document.createElement('div');
  menu.className = 'km-bp__menu';
  pickerEl = menu;

  // Search bar
  const searchWrap = document.createElement('div');
  searchWrap.className = 'km-bp__search-wrap';
  const searchInput = document.createElement('input');
  searchInput.className = 'km-bp__search';
  searchInput.placeholder = 'Filter blocks…';
  searchInput.setAttribute('autocomplete', 'off');
  searchWrap.appendChild(searchInput);
  menu.appendChild(searchWrap);

  const content = document.createElement('div');
  content.className = 'km-bp__content';
  menu.appendChild(content);

  pickerOnSelect = (item) => {
    closeBlockPicker();
    item.run(editor, afterPos);
  };

  // Filter on input
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase();
    pickerItems = (q
      ? PICKER_ITEMS.filter(i => i.title.toLowerCase().includes(q) || i.group.toLowerCase().includes(q))
      : [...PICKER_ITEMS]
    );
    if (onCreatePage) {
      if (!q || 'page'.includes(q) || 'new page'.includes(q)) {
        pickerItems.push({
          group: 'Pages', icon: '📄', title: 'New Page',
          desc: 'Create a linked sub-document',
          run: (_ed, pos) => { onCreatePage(pos); },
        });
      }
    }
    pickerSelectedIdx = 0;
    rerenderPicker();
  });

  // Prevent arrow keys from moving editor cursor while picker is open
  searchInput.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      pickerKeydown(e);
    }
  });

  document.body.appendChild(menu);
  rerenderPicker();

  // Position menu
  let top = anchor.bottom + window.scrollY + 6;
  let left = anchor.left + window.scrollX;
  menu.style.top  = `${top}px`;
  menu.style.left = `${left}px`;

  requestAnimationFrame(() => {
    const r = menu.getBoundingClientRect();
    if (r.right  > window.innerWidth  - 8) menu.style.left = `${window.innerWidth - r.width - 8}px`;
    if (r.bottom > window.innerHeight - 8) menu.style.top  = `${anchor.top + window.scrollY - r.height - 6}px`;
    searchInput.focus();
  });

  document.addEventListener('mousedown', outsidePickerClick, true);
  document.addEventListener('keydown', pickerKeydown);
}

function injectPickerStyles() {
  if (document.getElementById('km-block-picker-styles')) return;
  const style = document.createElement('style');
  style.id = 'km-block-picker-styles';
  style.textContent = `
    .km-bp__menu {
      position: absolute; z-index: 9999;
      background: #1c1c1c;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 6px;
      min-width: 260px; max-height: 380px;
      overflow: hidden;
      display: flex; flex-direction: column;
      box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);
      font-family: var(--km-font-body, system-ui);
      animation: km-bp-in 0.12s ease;
    }
    @keyframes km-bp-in {
      from { opacity: 0; transform: scale(0.97) translateY(-4px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .km-bp__search-wrap {
      padding: 4px 4px 6px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }
    .km-bp__search {
      width: 100%; padding: 5px 8px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px; outline: none;
      color: rgba(255,255,255,0.85);
      font-size: 0.82rem;
      font-family: inherit;
    }
    .km-bp__search::placeholder { color: rgba(255,255,255,0.25); }
    .km-bp__content {
      overflow-y: auto; flex: 1; padding: 4px 0;
    }
    .km-bp__content::-webkit-scrollbar { width: 4px; }
    .km-bp__content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
    .km-bp__group-label {
      font-size: 0.6rem; font-weight: 700;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: rgba(255,255,255,0.28);
      padding: 6px 10px 2px;
    }
    .km-bp__item {
      display: flex; align-items: center; gap: 9px;
      width: 100%; padding: 5px 8px;
      background: transparent; border: none;
      border-radius: 7px; cursor: pointer;
      text-align: left; color: rgba(255,255,255,0.82);
    }
    .km-bp__item--active { background: rgba(255,255,255,0.07); }
    .km-bp__icon {
      font-size: 0.75rem; font-weight: 700;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      flex-shrink: 0; color: rgba(255,255,255,0.65);
    }
    .km-bp__text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .km-bp__title { font-size: 0.82rem; font-weight: 600; }
    .km-bp__desc  { font-size: 0.68rem; color: rgba(255,255,255,0.32); margin-top: 1px; }
  `;
  document.head.appendChild(style);
}

// ── Main factory ───────────────────────────────────────────────────────────

export function createBlockHandleElement(
  editorRef: EditorRef,
  callbacks?: BlockHandleCallbacks,
): HTMLElement {
  // ── Styles ─────────────────────────────────────────────────────────────────
  if (!document.getElementById('km-block-handle-styles')) {
    const style = document.createElement('style');
    style.id = 'km-block-handle-styles';
    style.textContent = `
      .km-bh {
        display: flex; align-items: center; gap: 1px;
        user-select: none; position: relative;
        pointer-events: auto;
      }
      .km-bh__add, .km-bh__grip {
        pointer-events: auto;
        width: 18px; height: 24px;
        display: flex; align-items: center; justify-content: center;
        border: none; background: transparent;
        border-radius: 4px;
        color: rgba(255,255,255,0.3);
        cursor: pointer; padding: 0;
        transition: background 0.1s, color 0.1s;
      }
      .km-bh__add:hover, .km-bh__grip:hover {
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.65);
      }
      .km-bh__grip { cursor: grab; }
      .km-bh__grip:active { cursor: grabbing; }

      .km-bh__menu {
        position: fixed;
        background: #1c1c1c;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 5px;
        min-width: 200px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4);
        z-index: 20000;
        animation: km-menu-in 0.12s ease;
      }
      @keyframes km-menu-in {
        from { opacity: 0; transform: scale(0.96) translateY(-3px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      .km-bh__menu-label {
        font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em;
        text-transform: uppercase; color: rgba(255,255,255,0.28);
        padding: 4px 8px 2px;
      }
      .km-bh__menu-item {
        display: flex; align-items: center; gap: 9px;
        width: 100%; padding: 6px 8px;
        background: transparent; border: none;
        border-radius: 6px; color: rgba(255,255,255,0.8);
        font-size: 0.82rem; cursor: pointer; text-align: left;
        transition: background 0.1s;
      }
      .km-bh__menu-item:hover { background: rgba(255,255,255,0.07); }
      .km-bh__menu-item--danger { color: rgba(255,90,90,0.85); }
      .km-bh__menu-item--danger:hover { background: rgba(200,50,50,0.12); }
      .km-bh__mi-icon { font-size: 0.9rem; width: 20px; text-align: center; flex-shrink: 0; opacity: 0.8; }
      .km-bh__sep { height: 1px; background: rgba(255,255,255,0.07); margin: 4px 0; }

      .km-bh__turn-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 2px 0;
      }
      .km-bh__turn-btn {
        display: flex; align-items: center; gap: 6px;
        padding: 5px 7px; border-radius: 5px;
        border: none; background: transparent;
        color: rgba(255,255,255,0.7);
        font-size: 0.76rem; cursor: pointer; text-align: left;
        transition: background 0.1s;
      }
      .km-bh__turn-btn:hover { background: rgba(255,255,255,0.07); }
      .km-bh__turn-icon {
        font-size: 0.72rem; font-weight: 700;
        width: 18px; text-align: center; opacity: 0.55; flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Root ───────────────────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.className = 'km-bh';
  root.setAttribute('data-drag-handle', '');

  // ── + Add button ───────────────────────────────────────────────────────────
  const addBtn = document.createElement('button');
  addBtn.className = 'km-bh__add';
  addBtn.title = 'Add block below';
  addBtn.innerHTML = `<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
    <path d="M8 3a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 018 3z"/>
  </svg>`;

  addBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const editor = editorRef.current;
    if (!editor) return;

    const btnRect = addBtn.getBoundingClientRect();
    openBlockPicker(btnRect, editor, getTargetBlock(editorRef, editor).afterPos, callbacks?.onCreatePage);
  });

  // ── Grip ⋮⋮ ───────────────────────────────────────────────────────────────
  const grip = document.createElement('button');
  grip.className = 'km-bh__grip';
  grip.title = 'Click for options · Drag to reorder';
  grip.setAttribute('draggable', 'true');
  grip.innerHTML = `<svg viewBox="0 0 10 16" width="9" height="16" fill="currentColor">
    <circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/>
    <circle cx="3" cy="8" r="1.3"/><circle cx="7" cy="8" r="1.3"/>
    <circle cx="3" cy="13" r="1.3"/><circle cx="7" cy="13" r="1.3"/>
  </svg>`;

  root.appendChild(addBtn);
  root.appendChild(grip);

  // ── Context menu ───────────────────────────────────────────────────────────
  let menuEl: HTMLElement | null = null;

  function closeMenu() {
    menuEl?.remove(); menuEl = null;
    document.removeEventListener('mousedown', outsideClick, true);
    document.removeEventListener('keydown', onEsc);
  }

  function outsideClick(e: MouseEvent) {
    if (!menuEl?.contains(e.target as Node)) closeMenu();
  }
  function onEsc(e: KeyboardEvent) {
    if (e.key === 'Escape') closeMenu();
  }

  function openMenu(anchorRect: DOMRect) {
    closeMenu();
    const editor = editorRef.current;
    if (!editor) return;

    const menu = document.createElement('div');
    menu.className = 'km-bh__menu';
    menuEl = menu;

    // — Turn into ————————————————————————
    const turnLabel = document.createElement('div');
    turnLabel.className = 'km-bh__menu-label';
    turnLabel.textContent = 'Turn into';
    menu.appendChild(turnLabel);

    const grid = document.createElement('div');
    grid.className = 'km-bh__turn-grid';

    const turns: Array<{ icon: string; label: string; run: () => void }> = [
      { icon: 'T',   label: 'Text',       run: () => runOnTargetBlock(editorRef, editor, (chain) => chain.setParagraph()) },
      { icon: 'H₁',  label: 'Heading 1',  run: () => runOnTargetBlock(editorRef, editor, (chain) => chain.setHeading({ level: 1 })) },
      { icon: 'H₂',  label: 'Heading 2',  run: () => runOnTargetBlock(editorRef, editor, (chain) => chain.setHeading({ level: 2 })) },
      { icon: 'H₃',  label: 'Heading 3',  run: () => runOnTargetBlock(editorRef, editor, (chain) => chain.setHeading({ level: 3 })) },
      { icon: '•≡',  label: 'Bullet',     run: () => runOnTargetBlock(editorRef, editor, (chain) => chain.toggleBulletList()) },
      { icon: '1≡',  label: 'Numbered',   run: () => runOnTargetBlock(editorRef, editor, (chain) => chain.toggleOrderedList()) },
      { icon: '❝',   label: 'Blockquote', run: () => runOnTargetBlock(editorRef, editor, (chain) => chain.setBlockquote()) },
      { icon: '</>',  label: 'Code',       run: () => runOnTargetBlock(editorRef, editor, (chain) => chain.setCodeBlock()) },
    ];

    for (const t of turns) {
      const btn = document.createElement('button');
      btn.className = 'km-bh__turn-btn';
      btn.innerHTML = `<span class="km-bh__turn-icon">${t.icon}</span>${t.label}`;
      btn.addEventListener('mousedown', (ev) => { ev.preventDefault(); t.run(); closeMenu(); });
      grid.appendChild(btn);
    }
    menu.appendChild(grid);

    // — Actions ——————————————————————————
    const sep = document.createElement('div');
    sep.className = 'km-bh__sep';
    menu.appendChild(sep);

    const actions: Array<{ icon: string; label: string; danger?: boolean; run: () => void }> = [
      {
        icon: '⎘', label: 'Duplicate',
        run: () => {
          const target = getTargetBlock(editorRef, editor);
          const node = editor.state.doc.nodeAt(target.from);
          if (!node) return;
          editor.chain().focus().insertContentAt(target.to, node.toJSON()).run();
        },
      },
      {
        icon: '🔗', label: 'Copy block link',
        run: () => {
          const target = getTargetBlock(editorRef, editor);
          const id = (editor.state.doc.nodeAt(target.from)?.attrs['id'] as string | undefined) ?? '';
          const url = `${window.location.href.split('#')[0]}${id ? '#' + id : ''}`;
          navigator.clipboard?.writeText(url).catch(() => {});
        },
      },
      ...(callbacks?.onCreatePage ? [{
        icon: '📄', label: 'Turn into Page',
        run: () => {
          callbacks.onCreatePage?.(getTargetBlock(editorRef, editor).afterPos);
        },
      }] : []),
      {
        icon: '🗑', label: 'Delete block', danger: true,
        run: () => {
          const target = getTargetBlock(editorRef, editor);
          editor.chain().focus().deleteRange({ from: target.from, to: target.to }).run();
        },
      },
    ];

    for (const a of actions) {
      const item = document.createElement('button');
      item.className = `km-bh__menu-item${a.danger ? ' km-bh__menu-item--danger' : ''}`;
      item.innerHTML = `<span class="km-bh__mi-icon">${a.icon}</span>${a.label}`;
      item.addEventListener('mousedown', (ev) => { ev.preventDefault(); a.run(); closeMenu(); });
      menu.appendChild(item);
    }

    // Position
    menu.style.top  = `${anchorRect.bottom + 5}px`;
    menu.style.left = `${anchorRect.left - 4}px`;
    document.body.appendChild(menu);

    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      if (r.right  > window.innerWidth  - 8) menu.style.left = `${window.innerWidth - r.width - 8}px`;
      if (r.bottom > window.innerHeight - 8) menu.style.top  = `${anchorRect.top - r.height - 5}px`;
    });

    document.addEventListener('mousedown', outsideClick, true);
    document.addEventListener('keydown', onEsc);
  }

  // Click grip = open menu; drag = native DnD handled by DragHandle extension.
  // NOTE: do NOT call stopPropagation on mousedown — the DragHandle extension
  // must receive the event on its wrapper to initiate drag correctly.
  let clickTimer: ReturnType<typeof setTimeout> | null = null;
  grip.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    // Don't stopPropagation — DragHandle needs the event to bubble up
    e.preventDefault(); // prevent text selection while dragging
    const rect = grip.getBoundingClientRect();
    clickTimer = setTimeout(() => openMenu(rect), 150);
  });
  grip.addEventListener('dragstart', () => {
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    closeMenu();
  });
  // If the user releases the mouse without dragging, the timer fires → menu opens.
  // If the user drags, dragstart fires first → timer cleared, no menu.

  return root;
}
