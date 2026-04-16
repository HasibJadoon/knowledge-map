/**
 * Mobile Block Handle — Notion-style + add / ⠿ drag grip for touch devices.
 * Shows when a block is tapped. Tap + to add a block below; press-hold ⠿ to drag-reorder.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Fragment, type Node as PmNode } from '@tiptap/pm/model';
import type { Editor } from '@tiptap/core';

// ── Block picker items ─────────────────────────────────────────────────────

interface PickerItem {
  icon: string;
  label: string;
  run: (editor: Editor, afterPos: number) => void;
}

interface BlockTarget {
  anchorEl: HTMLElement;
  from: number;
  to: number;
  depth: number;
  node: PmNode;
  indexInParent: number;
  parentDepth: number;
  parentFrom: number;
  parentTo: number;
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
  target: BlockTarget,
) {
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
  header.textContent = 'Block Options';
  sheet.appendChild(header);

  const actions: Array<{ icon: string; label: string; danger?: boolean; run: () => void }> = [
    {
      icon: '⎘', label: 'Duplicate',
      run: () => editor.chain().focus().insertContentAt(target.to, target.node.toJSON()).run(),
    },
    {
      icon: '↑', label: 'Move up',
      run: () => target.indexInParent > 0 ? applyMoveWithinParent(view, target, target.indexInParent - 1) : undefined,
    },
    {
      icon: '↓', label: 'Move down',
      run: () => applyMoveWithinParent(view, target, target.indexInParent + 1),
    },
    {
      icon: '🗑', label: 'Delete', danger: true,
      run: () => editor.chain().focus().deleteRange({ from: target.from, to: target.to }).run(),
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

// ── Move block within its current parent container ──────────────────────────

function applyMoveWithinParent(view: EditorView, target: BlockTarget, toIndex: number) {
  const { state } = view;
  const $from = state.doc.resolve(target.from);
  const parentNode = target.parentDepth === 0 ? state.doc : $from.node(target.parentDepth);
  const children: PmNode[] = [];
  parentNode.forEach(child => children.push(child));

  if (target.indexInParent < 0 || target.indexInParent >= children.length) return;

  const moved = children.splice(target.indexInParent, 1)[0];
  const insertIdx = Math.min(Math.max(toIndex, 0), children.length);
  children.splice(insertIdx, 0, moved);

  const fragment = Fragment.fromArray(children);
  const tr = state.tr.replaceWith(target.parentFrom, target.parentTo, fragment);
  view.dispatch(tr.scrollIntoView());
}

// ── Main Plugin View ────────────────────────────────────────────────────────

class BlockHandleView {
  private hostEl: HTMLElement;
  private handle: HTMLElement;
  private addBtn: HTMLElement;
  private gripBtn: HTMLElement;

  private activeTarget: BlockTarget | null = null;

  // Touch drag state
  private dragging = false;
  private dragStartY = 0;
  private dragMoved = false;
  private ghost: HTMLElement | null = null;
  private dropLine: HTMLElement | null = null;

  // Long-press timer for grip
  private menuTimer: ReturnType<typeof setTimeout> | null = null;

  // Tap-to-caret state (iOS WKWebView fix)
  private tapStartX = 0;
  private tapStartY = 0;
  private tapStartTime = 0;

  constructor(private view: EditorView, private editor: Editor) {
    injectStyles();
    this.hostEl = (view.dom.parentElement as HTMLElement | null) ?? document.body;

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

    // Touch events for drag + tap-menu (touch only — no click handler to avoid
    // desktop left-click unintentionally opening the block context menu)
    this.gripBtn.addEventListener('touchstart',  this.onGripTouchStart,  { passive: false });
    this.gripBtn.addEventListener('touchmove',   this.onGripTouchMove,   { passive: false });
    this.gripBtn.addEventListener('touchend',    this.onGripTouchEnd,    { passive: false });

    this.handle.appendChild(this.addBtn);
    this.handle.appendChild(this.gripBtn);
    this.hostEl.appendChild(this.handle);

    // Show handle: hover on desktop only.
    view.dom.addEventListener('mousemove',  this.onEditorMouseMove);
    view.dom.addEventListener('mouseleave', this.onEditorMouseLeave);
    document.addEventListener('touchstart', this.onDocTouchOutside, { passive: true });

    // ── iOS tap-to-caret fix ────────────────────────────────────────────────
    // On iOS WKWebView (PWA), tapping a contenteditable inside ion-content's
    // scroll container does NOT reliably trigger the browser's native focus +
    // caret placement.  iOS defers event dispatch while deciding scroll vs tap,
    // and that window breaks normal contenteditable focus.
    //
    // Fix: intercept touchstart/touchend on the ProseMirror DOM directly.
    // If it's a single tap (< 10 px movement, < 500 ms), call posAtCoords to
    // get the exact PM position and dispatch a TextSelection + view.focus().
    // passive:true is critical — preventDefault() would suppress the keyboard.
    view.dom.addEventListener('touchstart', this.onTapStart, { passive: true });
    view.dom.addEventListener('touchend',   this.onTapEnd,   { passive: true });
  }

  // ── Editor hover (desktop): show handle next to hovered block ────────────

  private onEditorMouseMove = (e: MouseEvent) => {
    const target = this.resolveHandleTarget(e.target as HTMLElement | null);
    if (target) this.showHandle(target);
    else if (this.activeTarget) this.hideHandle();
  };

  private onEditorMouseLeave = () => {
    this.hideHandle();
  };

  // ── iOS tap-to-caret ───────────────────────────────────────────────────────

  private onTapStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    this.tapStartX = t.clientX;
    this.tapStartY = t.clientY;
    this.tapStartTime = Date.now();
  };

  /**
   * On a single tap inside the ProseMirror content area, manually place the
   * caret at the tapped position.
   *
   * This is required on iOS PWA: tapping a contenteditable inside
   * ion-content's scroll container doesn't reliably trigger the browser's
   * own focus+caret mechanism.  We replicate it here without preventDefault
   * so the soft keyboard still appears.
   *
   * KEY FIX — dispatch before focus:
   * Calling view.focus() BEFORE dispatch causes iOS to fire a focusin event
   * that resets the selection, so the caret snaps to the wrong position.
   * The correct sequence is: dispatch the TextSelection first, then call
   * view.focus() inside requestAnimationFrame so iOS honours our placement.
   *
   * Primary strategy — document.caretRangeFromPoint:
   * This is the WebKit-native API Safari uses internally for tap-to-caret.
   * It is more accurate than posAtCoords (which does elementFromPoint + math)
   * especially near line-wraps and inside inline Arabic/RTL text on iPhone.
   */
  private onTapEnd = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = Math.abs(touch.clientX - this.tapStartX);
    const dy = Math.abs(touch.clientY - this.tapStartY);
    const dt = Date.now() - this.tapStartTime;

    // Swipe/scroll or long-press — let the browser handle natively
    if (dx > 10 || dy > 10 || dt > 500) return;

    const docSize = this.view.state.doc.content.size;

    // ── Strategy 1: WebKit-native caretRangeFromPoint ─────────────────────────
    // The same API Safari uses internally — most accurate on iPhone/iPad.
    const nativeRange = (document as Document & {
      caretRangeFromPoint?(x: number, y: number): Range | null;
    }).caretRangeFromPoint?.(touch.clientX, touch.clientY);

    if (nativeRange) {
      try {
        const pmPos = this.view.posAtDOM(nativeRange.startContainer, nativeRange.startOffset);
        const clampedPos = Math.max(0, Math.min(pmPos, docSize));
        // Dispatch BEFORE focus — iOS focusin resets the caret if focus fires first
        this.view.dispatch(
          this.view.state.tr.setSelection(TextSelection.create(this.view.state.doc, clampedPos))
        );
        requestAnimationFrame(() => this.view.focus());
        return;
      } catch {
        // posAtDOM throws if the DOM node isn't inside the ProseMirror doc
        // (e.g. tapped a decoration widget) — fall through to posAtCoords
      }
    }

    // ── Strategy 2: posAtCoords fallback ─────────────────────────────────────
    const result = this.view.posAtCoords({ left: touch.clientX, top: touch.clientY });
    const pos = result != null
      ? Math.max(0, Math.min(result.pos, docSize))
      : docSize;

    this.view.dispatch(
      this.view.state.tr.setSelection(TextSelection.create(this.view.state.doc, pos))
    );
    requestAnimationFrame(() => this.view.focus());
  };

  // ── Editor touch (mobile): show handle next to tapped block ───────────────

  private onEditorTouch = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    const target = this.resolveHandleTarget(el);
    if (target) this.showHandle(target);
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

  // ── Grip: long-press = menu, drag = reorder ───────────────────────────────

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
      if (this.activeTarget?.anchorEl) this.startGhost(this.activeTarget.anchorEl);
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
    const activeTarget = this.activeTarget;
    const siblingContainer = this.currentSiblingContainer();
    if (activeTarget && info.index !== -1 && info.index !== activeTarget.indexInParent) {
      applyMoveWithinParent(this.view, activeTarget, info.index);
      requestAnimationFrame(() => {
        const nextAnchor = siblingContainer
          ? (Array.from(siblingContainer.children).filter(child => child instanceof HTMLElement) as HTMLElement[])[info.index] ?? null
          : null;
        const nextTarget = this.resolveHandleTarget(nextAnchor);
        if (nextTarget) this.showHandle(nextTarget);
        else this.hideHandle();
      });
    }
  };

  private openMenu(): void {
    if (!this.activeTarget) return;
    openBlockMenu(this.editor, this.view, this.activeTarget);
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
    const containerRect = (this.currentSiblingContainer() ?? this.view.dom).getBoundingClientRect();
    this.dropLine.style.display = 'block';
    this.dropLine.style.top    = `${lineY}px`;
    this.dropLine.style.left   = `${containerRect.left}px`;
    this.dropLine.style.width  = `${containerRect.width}px`;
  }

  private cleanupDrag() {
    this.ghost?.remove();
    this.ghost = null;
    this.dropLine?.remove();
    this.dropLine = null;
    if (this.activeTarget?.anchorEl) {
      this.activeTarget.anchorEl.style.opacity = '';
    }
  }

  private findDropSlot(y: number): { index: number; lineY: number } {
    const blocks = this.currentSiblingElements();
    for (let i = 0; i < blocks.length; i++) {
      const rect = blocks[i].getBoundingClientRect();
      if (y < rect.top + rect.height / 2) {
        return { index: i, lineY: rect.top - 1 };
      }
    }
    const last = blocks[blocks.length - 1]?.getBoundingClientRect();
    return { index: blocks.length - 1, lineY: last?.bottom ?? y };
  }

  private positionHandle(block: HTMLElement) {
    const rect = block.getBoundingClientRect();
    const H = 28; // handle height
    const hostRect = this.hostEl.getBoundingClientRect();
    const top = rect.top - hostRect.top + Math.max(0, (rect.height / 2) - (H / 2));
    const left = Math.max(2, rect.left - hostRect.left - 34);
    this.handle.style.top  = `${top}px`;
    this.handle.style.left = `${left}px`;
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

  private clampPos(pos: number): number {
    return Math.max(0, Math.min(pos, this.view.state.doc.content.size));
  }

  private createTarget(anchorEl: HTMLElement, depth: number, pos: number): BlockTarget | null {
    const safePos = this.clampPos(pos);
    const $pos = this.view.state.doc.resolve(safePos);
    if (depth < 1 || depth > $pos.depth) return null;

    const parentDepth = depth - 1;
    const parentFrom = parentDepth === 0 ? 0 : $pos.start(parentDepth);
    const parentTo = parentDepth === 0 ? this.view.state.doc.content.size : $pos.end(parentDepth);

    return {
      anchorEl,
      from: $pos.before(depth),
      to: $pos.after(depth),
      depth,
      node: $pos.node(depth),
      indexInParent: $pos.index(parentDepth),
      parentDepth,
      parentFrom,
      parentTo,
    };
  }

  private resolveHandleTarget(el: HTMLElement | null): BlockTarget | null {
    if (!el) return null;

    const listItem = el.closest('li');
    if (listItem instanceof HTMLElement && this.view.dom.contains(listItem)) {
      const listPos = this.clampPos(this.view.posAtDOM(listItem, 0) + 1);
      const $pos = this.view.state.doc.resolve(listPos);
      for (let depth = $pos.depth; depth > 0; depth--) {
        const type = $pos.node(depth).type.name;
        if (type === 'listItem' || type === 'taskItem') {
          return this.createTarget(listItem, depth, listPos);
        }
      }
    }

    const topLevel = this.topLevelBlockAt(el);
    if (!topLevel) return null;

    const topPos = this.clampPos(this.view.posAtDOM(topLevel, 0) + 1);
    const topTarget = this.createTarget(topLevel, 1, topPos);
    return topTarget;
  }

  private currentSiblingContainer(): HTMLElement | null {
    if (!this.activeTarget) return null;
    if (this.activeTarget.node.type.name === 'listItem' || this.activeTarget.node.type.name === 'taskItem') {
      return this.activeTarget.anchorEl.parentElement;
    }
    return this.view.dom;
  }

  private currentSiblingElements(): HTMLElement[] {
    const container = this.currentSiblingContainer();
    if (!container) return [];
    const children = Array.from(container.children).filter(
      child => child instanceof HTMLElement
    ) as HTMLElement[];
    if (container === this.view.dom) return children;
    return children.filter(child => child.tagName === 'LI');
  }

  private activeBlockAfterPos(): number {
    const target = this.activeTarget;
    if (!target) return -1;

    if (target.node.type.name === 'listItem' || target.node.type.name === 'taskItem') {
      const $from = this.view.state.doc.resolve(target.from);
      for (let depth = target.depth - 1; depth > 0; depth--) {
        const type = $from.node(depth).type.name;
        if (type === 'bulletList' || type === 'orderedList' || type === 'taskList') {
          return $from.after(depth);
        }
      }
    }

    return target.to;
  }

  // ── Handle positioning ─────────────────────────────────────────────────

  private showHandle(target: BlockTarget) {
    if (this.activeTarget?.anchorEl && this.activeTarget.anchorEl !== target.anchorEl) {
      this.activeTarget.anchorEl.classList.remove('km-block-active');
    }
    this.activeTarget = target;
    this.activeTarget.anchorEl.classList.add('km-block-active');
    this.positionHandle(target.anchorEl);
    this.handle.style.display = 'flex';
  }

  // ── ProseMirror view lifecycle ─────────────────────────────────────────

  update() {
    if (this.activeTarget?.anchorEl && this.handle.style.display !== 'none') {
      this.positionHandle(this.activeTarget.anchorEl);
    }
  }

  hideHandle() {
    this.activeTarget?.anchorEl.classList.remove('km-block-active');
    this.activeTarget = null;
    this.handle.style.display = 'none';
  }

  destroy() {
    this.activeTarget?.anchorEl.classList.remove('km-block-active');
    this.cleanupDrag();
    closeSheet();
    this.handle.remove();
    this.view.dom.removeEventListener('mousemove',  this.onEditorMouseMove);
    this.view.dom.removeEventListener('mouseleave', this.onEditorMouseLeave);
    this.view.dom.removeEventListener('touchstart', this.onTapStart);
    this.view.dom.removeEventListener('touchend',   this.onTapEnd);
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
      position: absolute;
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
      border-radius: 7px;
      background: rgba(28,28,30,0.9);
      color: rgba(255,255,255,0.4);
      cursor: pointer;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      touch-action: none;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.09);
      transition: background 0.12s, color 0.12s;
    }
    .km-mbh__add:active  { background: rgba(201,168,76,0.2); color: #c9a84c; border-color: rgba(201,168,76,0.3); }
    .km-mbh__grip        { cursor: grab; }
    .km-mbh__grip:active { cursor: grabbing; background: rgba(201,168,76,0.2); color: #c9a84c; border-color: rgba(201,168,76,0.3); }

    /* ── Bottom sheet backdrop ────────────────────────────────── */
    .km-mbh-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.48);
      z-index: 10000;
      display: flex; align-items: flex-end;
    }

    .km-mbh-sheet {
      width: 100%;
      background: #1c1c1e;
      border-radius: 20px 20px 0 0;
      padding: 0 0 env(safe-area-inset-bottom, 20px);
      max-height: 78vh;
      overflow-y: auto;
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.32,0.72,0,1);
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .km-mbh-sheet--open { transform: translateY(0); }

    .km-mbh-sheet__header {
      padding: 14px 20px 10px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.28);
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }

    /* block picker grid */
    .km-mbh-sheet__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      padding: 12px 14px;
    }

    .km-mbh-sheet__item {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 11px 13px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: background 0.1s, border-color 0.1s;
    }
    .km-mbh-sheet__item:active {
      background: rgba(201,168,76,0.1);
      border-color: rgba(201,168,76,0.28);
    }

    .km-mbh-sheet__icon {
      font-size: 0.82rem;
      font-weight: 700;
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.06);
      border-radius: 8px;
      flex-shrink: 0;
      color: rgba(255,255,255,0.72);
      border: 1px solid rgba(255,255,255,0.07);
    }

    .km-mbh-sheet__label {
      font-size: 0.83rem;
      color: rgba(255,255,255,0.78);
      font-weight: 500;
      letter-spacing: -0.005em;
    }

    /* action list (context menu) */
    .km-mbh-sheet__action {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 16px 20px;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255,255,255,0.055);
      color: rgba(255,255,255,0.84);
      font-size: 0.95rem;
      font-family: -apple-system, 'Poppins', sans-serif;
      cursor: pointer;
      text-align: left;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: background 0.1s;
    }
    .km-mbh-sheet__action:last-child { border-bottom: none; }
    .km-mbh-sheet__action:active { background: rgba(255,255,255,0.05); }
    .km-mbh-sheet__action--danger { color: rgba(255,72,72,0.92); }
    .km-mbh-sheet__action--danger:active { background: rgba(200,40,40,0.1); }

    .km-mbh-sheet__ai {
      font-size: 1rem;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: rgba(255,255,255,0.06);
      border-radius: 7px;
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
