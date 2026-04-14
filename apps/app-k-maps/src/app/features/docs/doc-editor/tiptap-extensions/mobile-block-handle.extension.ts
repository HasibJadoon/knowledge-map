/**
 * Mobile Block Handle — Notion-style + add / ⠿ drag grip for touch devices.
 * Shows when a block is tapped. Tap + to add a block below; press-hold ⠿ to drag-reorder.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';

// ── Block picker items ─────────────────────────────────────────────────────

interface PickerItem {
  icon: string;
  label: string;
  run: (editor: Editor, afterPos: number) => void;
}

const PICKER_ITEMS: PickerItem[] = [
  { icon: '¶',   label: 'Text',
    run: (ed, p) => ed.chain().focus().insertContentAt(p, { type: 'paragraph', content: [] }).run() },
  { icon: 'H1',  label: 'Heading 1',
    run: (ed, p) => ed.chain().focus().insertContentAt(p, { type: 'heading', attrs: { level: 1 }, content: [] }).run() },
  { icon: 'H2',  label: 'Heading 2',
    run: (ed, p) => ed.chain().focus().insertContentAt(p, { type: 'heading', attrs: { level: 2 }, content: [] }).run() },
  { icon: 'H3',  label: 'Heading 3',
    run: (ed, p) => ed.chain().focus().insertContentAt(p, { type: 'heading', attrs: { level: 3 }, content: [] }).run() },
  { icon: '•≡',  label: 'Bullet List',
    run: (ed, p) => { ed.chain().focus().insertContentAt(p, { type: 'paragraph', content: [] }).run(); ed.chain().focus().toggleBulletList().run(); } },
  { icon: '1≡',  label: 'Numbered List',
    run: (ed, p) => { ed.chain().focus().insertContentAt(p, { type: 'paragraph', content: [] }).run(); ed.chain().focus().toggleOrderedList().run(); } },
  { icon: '❝',   label: 'Blockquote',
    run: (ed, p) => { ed.chain().focus().insertContentAt(p, { type: 'paragraph', content: [] }).run(); ed.chain().focus().toggleBlockquote().run(); } },
  { icon: '</>',  label: 'Code Block',
    run: (ed, p) => { ed.chain().focus().insertContentAt(p, { type: 'paragraph', content: [] }).run(); ed.chain().focus().toggleCodeBlock().run(); } },
  { icon: '💡',  label: 'Callout',
    run: (ed, p) => ed.chain().focus().insertContentAt(p, { type: 'callout', attrs: { emoji: '💡' }, content: [{ type: 'paragraph' }] }).run() },
  { icon: '—',   label: 'Divider',
    run: (ed, p) => ed.chain().focus().insertContentAt(p, { type: 'horizontalRule' }).run() },
];

// ── Block picker (vanilla bottom sheet) ───────────────────────────────────

let sheetEl: HTMLElement | null = null;

function closeSheet() {
  sheetEl?.remove();
  sheetEl = null;
}

function openBlockPicker(editor: Editor, afterPos: number) {
  closeSheet();
  injectStyles();

  const backdrop = document.createElement('div');
  backdrop.className = 'km-mbh-backdrop';
  backdrop.addEventListener('touchstart', closeSheet);
  backdrop.addEventListener('click', closeSheet);

  const sheet = document.createElement('div');
  sheet.className = 'km-mbh-sheet';
  sheetEl = backdrop;

  const header = document.createElement('div');
  header.className = 'km-mbh-sheet__header';
  header.textContent = 'Add Block';
  sheet.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'km-mbh-sheet__grid';

  for (const item of PICKER_ITEMS) {
    const btn = document.createElement('button');
    btn.className = 'km-mbh-sheet__item';
    btn.innerHTML = `<span class="km-mbh-sheet__icon">${item.icon}</span><span class="km-mbh-sheet__label">${item.label}</span>`;
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      closeSheet();
      item.run(editor, afterPos);
    });
    btn.addEventListener('click', () => { closeSheet(); item.run(editor, afterPos); });
    grid.appendChild(btn);
  }

  sheet.appendChild(grid);
  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);

  requestAnimationFrame(() => sheet.classList.add('km-mbh-sheet--open'));
}

// ── Context menu (bottom sheet) ────────────────────────────────────────────

function openBlockMenu(
  editor: Editor,
  view: EditorView,
  blockIndex: number,
) {
  closeSheet();
  injectStyles();

  const state = view.state;
  const children: PmNode[] = [];
  state.doc.forEach(child => children.push(child));
  const node = children[blockIndex];
  if (!node) return;

  // Compute afterPos for this block
  let pos = 0;
  for (let i = 0; i < blockIndex; i++) pos += children[i].nodeSize;
  const fromPos = pos;
  const toPos   = pos + node.nodeSize;

  const backdrop = document.createElement('div');
  backdrop.className = 'km-mbh-backdrop';
  backdrop.addEventListener('touchstart', closeSheet);
  backdrop.addEventListener('click', closeSheet);

  const sheet = document.createElement('div');
  sheet.className = 'km-mbh-sheet';
  sheetEl = backdrop;

  const header = document.createElement('div');
  header.className = 'km-mbh-sheet__header';
  header.textContent = 'Block Options';
  sheet.appendChild(header);

  const actions: Array<{ icon: string; label: string; danger?: boolean; run: () => void }> = [
    {
      icon: '⎘', label: 'Duplicate',
      run: () => editor.chain().focus().insertContentAt(toPos, node.toJSON()).run(),
    },
    {
      icon: '↑', label: 'Move up',
      run: () => blockIndex > 0 ? applyMove(view, blockIndex, blockIndex - 1) : undefined,
    },
    {
      icon: '↓', label: 'Move down',
      run: () => blockIndex < children.length - 1 ? applyMove(view, blockIndex, blockIndex + 1) : undefined,
    },
    {
      icon: '🗑', label: 'Delete', danger: true,
      run: () => editor.chain().focus().deleteRange({ from: fromPos, to: toPos }).run(),
    },
  ];

  for (const a of actions) {
    const btn = document.createElement('button');
    btn.className = `km-mbh-sheet__action${a.danger ? ' km-mbh-sheet__action--danger' : ''}`;
    btn.innerHTML = `<span class="km-mbh-sheet__ai">${a.icon}</span>${a.label}`;
    btn.addEventListener('touchend', (e) => { e.preventDefault(); closeSheet(); a.run(); });
    btn.addEventListener('click', () => { closeSheet(); a.run(); });
    sheet.appendChild(btn);
  }

  backdrop.appendChild(sheet);
  document.body.appendChild(backdrop);

  requestAnimationFrame(() => sheet.classList.add('km-mbh-sheet--open'));
}

// ── Move block (works on top-level doc children) ───────────────────────────

function applyMove(view: EditorView, fromIndex: number, toIndex: number) {
  const { state } = view;
  const children: PmNode[] = [];
  state.doc.forEach(child => children.push(child));
  if (fromIndex < 0 || fromIndex >= children.length) return;

  const moved = children.splice(fromIndex, 1)[0];
  const insertIdx = Math.min(Math.max(toIndex, 0), children.length);
  children.splice(insertIdx, 0, moved);

  const tr = state.tr.replaceWith(0, state.doc.content.size, children);
  view.dispatch(tr.scrollIntoView());
}

// ── Main Plugin View ────────────────────────────────────────────────────────

class BlockHandleView {
  private handle: HTMLElement;
  private addBtn: HTMLElement;
  private gripBtn: HTMLElement;

  private activeBlock: HTMLElement | null = null;
  private activeBlockIndex = -1;

  // Touch drag state
  private dragging = false;
  private dragStartY = 0;
  private dragMoved = false;
  private ghost: HTMLElement | null = null;
  private dropLine: HTMLElement | null = null;

  // Long-press timer for grip
  private menuTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private view: EditorView, private editor: Editor) {
    injectStyles();

    // ── Build handle ───────────────────────────────────────────────────────
    this.handle = document.createElement('div');
    this.handle.className = 'km-mbh';
    this.handle.style.display = 'none';

    this.addBtn = document.createElement('button');
    this.addBtn.className = 'km-mbh__add';
    this.addBtn.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M8 3a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 018 3z"/>
    </svg>`;
    this.addBtn.setAttribute('title', 'Add block');
    this.addBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.onAddTap(); });
    this.addBtn.addEventListener('click', () => this.onAddTap());

    this.gripBtn = document.createElement('button');
    this.gripBtn.className = 'km-mbh__grip';
    this.gripBtn.innerHTML = `<svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor">
      <circle cx="3" cy="2.5" r="1.3"/><circle cx="7" cy="2.5" r="1.3"/>
      <circle cx="3" cy="8"   r="1.3"/><circle cx="7" cy="8"   r="1.3"/>
      <circle cx="3" cy="13.5" r="1.3"/><circle cx="7" cy="13.5" r="1.3"/>
    </svg>`;
    this.gripBtn.setAttribute('title', 'Drag to move · Tap for menu');

    // Touch events for drag + tap-menu
    this.gripBtn.addEventListener('touchstart',  this.onGripTouchStart,  { passive: false });
    this.gripBtn.addEventListener('touchmove',   this.onGripTouchMove,   { passive: false });
    this.gripBtn.addEventListener('touchend',    this.onGripTouchEnd,    { passive: false });
    this.gripBtn.addEventListener('click',       () => this.onGripClick());

    this.handle.appendChild(this.addBtn);
    this.handle.appendChild(this.gripBtn);
    document.body.appendChild(this.handle);

    // Show handle on editor tap
    view.dom.addEventListener('click',   this.onEditorClick);
    view.dom.addEventListener('touchend', this.onEditorTouch);
    document.addEventListener('touchstart', this.onDocTouchOutside, { passive: true });
  }

  // ── Editor tap: show handle next to tapped block ───────────────────────

  private onEditorClick = (e: MouseEvent) => {
    const block = this.topLevelBlockAt(e.target as HTMLElement);
    if (block) this.showHandle(block);
  };

  private onEditorTouch = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    const block = el ? this.topLevelBlockAt(el) : null;
    if (block) this.showHandle(block);
  };

  private onDocTouchOutside = (e: TouchEvent) => {
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    if (!el) return;
    if (
      this.handle.contains(el) ||
      this.view.dom.contains(el) ||
      sheetEl?.contains(el)
    ) return;
    this.hideHandle();
  };

  // ── Add button ─────────────────────────────────────────────────────────

  private onAddTap() {
    const afterPos = this.activeBlockAfterPos();
    if (afterPos === -1) return;
    openBlockPicker(this.editor, afterPos);
  }

  // ── Grip: tap = menu, drag = reorder ───────────────────────────────────

  private onGripClick() {
    if (!this.dragMoved) this.openMenu();
  }

  private onGripTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    this.dragging = false;
    this.dragMoved = false;
    this.dragStartY = e.touches[0].clientY;

    // Long-press → menu if finger doesn't move
    this.menuTimer = setTimeout(() => {
      if (!this.dragMoved) this.openMenu();
    }, 500);
  };

  private onGripTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const dy = Math.abs(e.touches[0].clientY - this.dragStartY);

    if (!this.dragging && dy > 6) {
      // Crossed threshold — start drag
      this.dragging = true;
      this.dragMoved = true;
      if (this.menuTimer) { clearTimeout(this.menuTimer); this.menuTimer = null; }
      if (this.activeBlock) this.startGhost(this.activeBlock);
      this.createDropLine();
    }

    if (!this.dragging) return;

    const y = e.touches[0].clientY;
    if (this.ghost) this.ghost.style.top = `${y - 24}px`;

    const info = this.findDropSlot(y);
    this.showDropLine(info.lineY);
  };

  private onGripTouchEnd = (e: TouchEvent) => {
    if (this.menuTimer) { clearTimeout(this.menuTimer); this.menuTimer = null; }

    if (!this.dragging) return;
    this.dragging = false;

    const y = e.changedTouches[0].clientY;
    this.cleanupDrag();

    const info = this.findDropSlot(y);
    if (info.index !== -1 && info.index !== this.activeBlockIndex) {
      applyMove(this.view, this.activeBlockIndex, info.index);
      // Re-anchor handle
      requestAnimationFrame(() => {
        const newBlock = this.view.dom.children[info.index] as HTMLElement;
        if (newBlock) this.showHandle(newBlock);
      });
    }
  };

  private openMenu() {
    openBlockMenu(this.editor, this.view, this.activeBlockIndex);
  }

  // ── Ghost + drop line ──────────────────────────────────────────────────

  private startGhost(block: HTMLElement) {
    this.ghost = block.cloneNode(true) as HTMLElement;
    const rect = block.getBoundingClientRect();
    this.ghost.style.cssText = `
      position:fixed; left:${rect.left}px; top:${rect.top}px;
      width:${rect.width}px; max-height:100px; overflow:hidden;
      pointer-events:none; z-index:9998;
      background:#1e1e1e; border:1px solid rgba(201,168,76,0.4);
      border-radius:8px; padding:8px 12px; opacity:0.85;
      box-shadow:0 8px 28px rgba(0,0,0,0.6);
      transform:scale(1.02);
    `;
    block.style.opacity = '0.3';
    document.body.appendChild(this.ghost);
  }

  private createDropLine() {
    this.dropLine = document.createElement('div');
    this.dropLine.style.cssText = `
      position:fixed; height:2px; pointer-events:none; z-index:9997;
      background:#c9a84c; border-radius:2px; display:none;
      box-shadow:0 0 6px rgba(201,168,76,0.5);
    `;
    document.body.appendChild(this.dropLine);
  }

  private showDropLine(lineY: number) {
    if (!this.dropLine) return;
    const editorRect = this.view.dom.getBoundingClientRect();
    this.dropLine.style.display = 'block';
    this.dropLine.style.top    = `${lineY}px`;
    this.dropLine.style.left   = `${editorRect.left}px`;
    this.dropLine.style.width  = `${editorRect.width}px`;
  }

  private cleanupDrag() {
    this.ghost?.remove();
    this.ghost = null;
    this.dropLine?.remove();
    this.dropLine = null;
    if (this.activeBlock) {
      this.activeBlock.style.opacity = '';
    }
  }

  private findDropSlot(y: number): { index: number; lineY: number } {
    const blocks = Array.from(this.view.dom.children) as HTMLElement[];
    for (let i = 0; i < blocks.length; i++) {
      const rect = blocks[i].getBoundingClientRect();
      if (y < rect.top + rect.height / 2) {
        return { index: i, lineY: rect.top - 1 };
      }
    }
    const last = blocks[blocks.length - 1]?.getBoundingClientRect();
    return { index: blocks.length - 1, lineY: last?.bottom ?? y };
  }

  // ── Handle positioning ─────────────────────────────────────────────────

  private showHandle(block: HTMLElement) {
    // Remove active class from previously active block
    if (this.activeBlock && this.activeBlock !== block) {
      this.activeBlock.classList.remove('km-block-active');
    }
    this.activeBlock = block;
    this.activeBlock.classList.add('km-block-active');
    this.activeBlockIndex = Array.from(this.view.dom.children).indexOf(block);
    this.positionHandle(block);
    this.handle.style.display = 'flex';
  }

  hideHandle() {
    this.activeBlock?.classList.remove('km-block-active');
    this.activeBlock = null;
    this.activeBlockIndex = -1;
    this.handle.style.display = 'none';
  }

  private positionHandle(block: HTMLElement) {
    const rect = block.getBoundingClientRect();
    const H = 28; // handle height
    const top = rect.top + Math.max(0, (rect.height / 2) - (H / 2));
    // Position inside editor left padding (editor has 20px padding)
    const editorRect = this.view.dom.getBoundingClientRect();
    this.handle.style.top  = `${top}px`;
    this.handle.style.left = `${editorRect.left + 2}px`;
  }

  private topLevelBlockAt(el: HTMLElement | null): HTMLElement | null {
    if (!el) return null;
    let cur = el;
    while (cur && cur.parentElement !== this.view.dom) {
      cur = cur.parentElement as HTMLElement;
      if (!cur) return null;
    }
    return cur?.parentElement === this.view.dom ? cur : null;
  }

  private activeBlockAfterPos(): number {
    if (this.activeBlockIndex < 0) return -1;
    let pos = 0;
    const children: PmNode[] = [];
    this.view.state.doc.forEach(c => children.push(c));
    for (let i = 0; i <= this.activeBlockIndex && i < children.length; i++) {
      if (i === this.activeBlockIndex) return pos + children[i].nodeSize;
      pos += children[i].nodeSize;
    }
    return -1;
  }

  // ── ProseMirror view lifecycle ─────────────────────────────────────────

  update() {
    if (this.activeBlock && this.handle.style.display !== 'none') {
      this.positionHandle(this.activeBlock);
    }
  }

  destroy() {
    this.activeBlock?.classList.remove('km-block-active');
    this.cleanupDrag();
    closeSheet();
    this.handle.remove();
    this.view.dom.removeEventListener('click',    this.onEditorClick);
    this.view.dom.removeEventListener('touchend', this.onEditorTouch);
    document.removeEventListener('touchstart', this.onDocTouchOutside);
  }
}

// ── Styles ─────────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('km-mbh-styles')) return;
  const s = document.createElement('style');
  s.id = 'km-mbh-styles';
  s.textContent = `
    /* ── Floating handle ──────────────────────────────────────── */
    .km-mbh {
      position: fixed;
      display: flex;
      align-items: center;
      gap: 1px;
      z-index: 1000;
      pointer-events: all;
    }

    .km-mbh__add, .km-mbh__grip {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: none;
      border-radius: 6px;
      background: rgba(30,30,30,0.85);
      color: rgba(255,255,255,0.45);
      cursor: pointer;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      touch-action: none;
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .km-mbh__add:active  { background: rgba(201,168,76,0.15); color: #c9a84c; }
    .km-mbh__grip        { cursor: grab; }
    .km-mbh__grip:active { cursor: grabbing; background: rgba(201,168,76,0.15); color: #c9a84c; }

    /* ── Bottom sheet backdrop ────────────────────────────────── */
    .km-mbh-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 10000;
      display: flex; align-items: flex-end;
    }

    .km-mbh-sheet {
      width: 100%;
      background: #1c1c1e;
      border-radius: 18px 18px 0 0;
      padding: 0 0 env(safe-area-inset-bottom, 16px);
      max-height: 75vh;
      overflow-y: auto;
      transform: translateY(100%);
      transition: transform 0.28s cubic-bezier(0.32,0.72,0,1);
    }
    .km-mbh-sheet--open { transform: translateY(0); }

    .km-mbh-sheet__header {
      padding: 16px 20px 10px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.3);
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }

    /* block picker grid */
    .km-mbh-sheet__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
      padding: 10px 12px;
    }

    .km-mbh-sheet__item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .km-mbh-sheet__item:active { background: rgba(201,168,76,0.12); border-color: rgba(201,168,76,0.25); }

    .km-mbh-sheet__icon {
      font-size: 0.82rem;
      font-weight: 700;
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.07);
      border-radius: 7px;
      flex-shrink: 0;
      color: rgba(255,255,255,0.7);
    }

    .km-mbh-sheet__label {
      font-size: 0.82rem;
      color: rgba(255,255,255,0.8);
      font-weight: 500;
    }

    /* action list (context menu) */
    .km-mbh-sheet__action {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 15px 20px;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.82);
      font-size: 0.95rem;
      cursor: pointer;
      text-align: left;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }
    .km-mbh-sheet__action:last-child { border-bottom: none; }
    .km-mbh-sheet__action:active { background: rgba(255,255,255,0.05); }
    .km-mbh-sheet__action--danger { color: rgba(255,70,70,0.9); }
    .km-mbh-sheet__action--danger:active { background: rgba(200,40,40,0.1); }

    .km-mbh-sheet__ai {
      font-size: 1rem;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(s);
}

// ── Tiptap Extension ───────────────────────────────────────────────────────

export const MobileBlockHandle = Extension.create({
  name: 'mobileBlockHandle',

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('mobileBlockHandle'),
        view(editorView: EditorView) {
          return new BlockHandleView(editorView, editor);
        },
      }),
    ];
  },
});
