import {
  Component, OnDestroy, inject, signal, effect,
  ChangeDetectionStrategy, ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocEditorService } from '../../services/doc-editor.service';
import { DocExtractService } from '../../services/doc-extract.service';

const HIGHLIGHT_COLORS = [
  { color: 'rgba(201,168,76,0.35)',  label: '🟡 Gold'   },
  { color: 'rgba(100,180,255,0.35)', label: '🔵 Blue'   },
  { color: 'rgba(100,220,130,0.35)', label: '🟢 Green'  },
  { color: 'rgba(255,120,100,0.35)', label: '🔴 Red'    },
  { color: 'rgba(200,130,255,0.35)', label: '🟣 Purple' },
  { color: 'rgba(255,200,80,0.35)',  label: '🟠 Yellow' },
];

// null = call unsetColor() to restore the inherited heading/paragraph colour
const TEXT_COLORS: Array<{ color: string | null; label: string }> = [
  { color: null,      label: '✕  Default (reset)'  },
  { color: '#ffffff', label: '⬜ White'             },
  { color: '#c9a84c', label: '🟡 Gold'              },
  { color: '#e8c96a', label: '🟠 Amber'             },
  { color: '#5aad88', label: '🟢 Green'             },
  { color: '#60a5fa', label: '🔵 Blue'              },
  { color: '#a78bfa', label: '🟣 Purple'            },
  { color: '#f87171', label: '🔴 Red'               },
  { color: '#fb923c', label: '🟠 Orange'            },
  { color: '#94a3b8', label: '🩶 Muted'             },
];

type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3'
               | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock' | 'callout';

interface ToolbarSheetItem {
  label: string;
  action: () => void;
  tone?: 'default' | 'danger';
}

@Component({
  selector: 'km-highlight-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <!-- 2-row floating bubble -->
      <div class="km-bubble"
           [style.top.px]="bubbleTop()"
           [style.left.px]="bubbleLeft()">

        <!-- Row 1 — inline marks + color swatches -->
        <div class="km-bubble__row">
          <button class="km-bb" [class.km-bb--on]="isBold()"
                  (touchend)="cmd('bold'); $event.preventDefault()"><b>B</b></button>
          <button class="km-bb" [class.km-bb--on]="isItalic()"
                  (touchend)="cmd('italic'); $event.preventDefault()"><i>I</i></button>
          <button class="km-bb" [class.km-bb--on]="isUnderline()"
                  (touchend)="cmd('underline'); $event.preventDefault()"><u>U</u></button>
          <button class="km-bb" [class.km-bb--on]="isStrike()"
                  (touchend)="cmd('strike'); $event.preventDefault()"><s>S</s></button>

          <span class="km-bsep"></span>

          <button class="km-bb" title="Highlight"
                  (touchend)="openHighlightSheet(); $event.preventDefault()">
            <span class="km-hl" [style.background]="currentHighlight()">A</span>
          </button>
          <button class="km-bb" title="Text color"
                  (touchend)="openTextColorSheet(); $event.preventDefault()">
            <span class="km-tc" [style.color]="currentTextColor()">A</span>
          </button>

          <span class="km-bsep"></span>

          <button class="km-bb km-bb--more"
                  (touchend)="openExtractSheet(); $event.preventDefault()">···</button>
        </div>

        <!-- Row divider -->
        <div class="km-bubble__divider"></div>

        <!-- Row 2 — compact block type + inline tools -->
        <div class="km-bubble__row km-bubble__row--type">

          <!-- Block type: icon badge + chevron only (compact) -->
          <button class="km-bb km-bb--type" (touchend)="openBlockSheet(); $event.preventDefault()">
            <span class="km-bb__block-icon km-bb__block-icon--{{ currentBlock() }}">{{ blockIcon() }}</span>
            <svg viewBox="0 0 10 6" fill="currentColor" width="6" height="4" style="opacity:.35; flex-shrink:0"><path d="M0 0l5 6 5-6z"/></svg>
          </button>

          <span class="km-bsep"></span>

          <!-- Superscript -->
          <button class="km-bb km-bb--sup" [class.km-bb--on]="isSuperscript()"
                  (touchend)="cmd('superscript'); $event.preventDefault()">x<sup>2</sup></button>

          <!-- Subscript -->
          <button class="km-bb km-bb--sub" [class.km-bb--on]="isSubscript()"
                  (touchend)="cmd('subscript'); $event.preventDefault()">x<sub>2</sub></button>

          <span class="km-bsep"></span>

          <!-- Link -->
          <button class="km-bb" [class.km-bb--on]="isLink()" title="Link"
                  (touchend)="openLinkSheet(); $event.preventDefault()">
            <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
              <path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"/>
            </svg>
          </button>

          <!-- Clear formatting -->
          <button class="km-bb" title="Clear"
                  (touchend)="clearFormatting(); $event.preventDefault()">
            <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13">
              <path d="M1 2.5A1.5 1.5 0 012.5 1h8.586a1.5 1.5 0 011.06.44l2.915 2.914A1.5 1.5 0 0115.5 5.5v1.086a1.5 1.5 0 01-.44 1.06L9.707 13H13.5a.5.5 0 010 1h-8a.5.5 0 010-1h2.293l-3.147-3.146A1.5 1.5 0 014.5 8.793V4.207A1.5 1.5 0 011 2.5z"/>
              <line x1="2" y1="14" x2="14" y2="2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    }

    @if (sheetOpen()) {
      <div class="km-sheet-backdrop" (click)="closeSheet()">
        <div class="km-sheet" (click)="$event.stopPropagation()">
          <div class="km-sheet__header">{{ sheetTitle() }}</div>

          @for (item of sheetItems(); track item.label) {
            <button class="km-sheet__item"
                    [class.km-sheet__item--danger]="item.tone === 'danger'"
                    (touchend)="runSheetItem(item); $event.preventDefault()"
                    (click)="runSheetItem(item)">
              {{ item.label }}
            </button>
          }

          <button class="km-sheet__item km-sheet__item--cancel"
                  (touchend)="closeSheet(); $event.preventDefault()"
                  (click)="closeSheet()">
            Cancel
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      top: 0; left: 0;
      width: 0; height: 0;
      z-index: 9999;
      pointer-events: none;
    }

    /* ── Floating bubble ─────────────────────────────────────────── */
    .km-bubble {
      position: fixed;
      display: flex;
      flex-direction: column;
      background: #1c1c1e;
      border: 1px solid rgba(255,255,255,0.11);
      border-radius: 14px;
      padding: 0;
      overflow: hidden;
      box-shadow: 0 8px 28px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.05);
      pointer-events: all;
      white-space: nowrap;
      animation: km-bub-in 0.16s cubic-bezier(0.22,1,0.36,1);
      min-width: 200px;
    }

    .km-bubble__row {
      display: flex;
      align-items: center;
      gap: 1px;
      padding: 3px 5px;
    }

    .km-bubble__row--type {
      padding: 2px 5px 4px;
    }

    .km-bubble__divider {
      height: 1px;
      background: rgba(255,255,255,0.08);
      margin: 0;
    }

    @keyframes km-bub-in {
      from { opacity: 0; transform: translateY(6px) scale(0.94); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }

    /* ── Buttons ─────────────────────────────────────────────────── */
    .km-bb {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      min-width: 32px;
      height: 32px;
      padding: 0 5px;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: rgba(255,255,255,0.78);
      font-size: 0.85rem;
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.1s, color 0.1s;
      flex-shrink: 0;

      &:active, &--on {
        background: rgba(201,168,76,0.18);
        color: #c9a84c;
      }

      &--type {
        gap: 4px;
        padding: 0 6px;
        flex-shrink: 0;
      }

      &--sup, &--sub {
        font-size: 0.78rem;
        font-weight: 700;
        min-width: 28px;
        sup, sub { font-size: 0.6em; }
      }

      &--more {
        font-size: 1rem;
        letter-spacing: 1px;
        opacity: 0.7;
        min-width: 30px;
      }
    }

    .km-bsep {
      width: 1px;
      height: 18px;
      background: rgba(255,255,255,0.1);
      margin: 0 2px;
      flex-shrink: 0;
    }

    /* Highlight swatch & text color */
    .km-hl {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      font-weight: 800;
      font-size: 0.78rem;
      color: rgba(255,255,255,0.9);
    }

    .km-tc {
      font-weight: 800;
      font-size: 0.88rem;
      text-decoration: underline 2px solid currentColor;
      text-underline-offset: 2px;
    }

    .km-bb__label { pointer-events: none; }

    /* Block type icon badge in row 2 */
    .km-bb__block-icon {
      pointer-events: none;
      font-weight: 800;
      font-size: 0.72rem;
      line-height: 1;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 20px;
      border-radius: 5px;
      background: rgba(255,255,255,0.07);
      padding: 0 4px;
      letter-spacing: -0.02em;
    }
    .km-bb__block-icon--heading1 { font-size: 0.82rem; color: #c9a84c; background: rgba(201,168,76,0.12); }
    .km-bb__block-icon--heading2 { font-size: 0.76rem; color: rgba(255,255,255,0.8); }
    .km-bb__block-icon--heading3 { font-size: 0.7rem;  color: rgba(255,255,255,0.65); }
    .km-bb__block-icon--blockquote { font-size: 0.9rem; color: rgba(201,168,76,0.7); background: rgba(201,168,76,0.08); }
    .km-bb__block-icon--codeBlock  { font-size: 0.64rem; font-family: monospace; color: #e8c96a; background: rgba(232,201,106,0.1); }
    .km-bb__block-icon--callout    { background: rgba(255,200,60,0.12); }


    .km-sheet-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.42);
      pointer-events: all;
      display: flex;
      align-items: flex-end;
      z-index: 10000;
    }

    .km-sheet {
      width: 100%;
      background: #1c1c1e;
      border-radius: 18px 18px 0 0;
      padding: 0 0 calc(env(safe-area-inset-bottom, 0px) + 14px);
      box-shadow: 0 -12px 40px rgba(0,0,0,0.55);
      border-top: 1px solid rgba(255,255,255,0.08);
    }

    .km-sheet__header {
      padding: 14px 20px 10px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.32);
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }

    .km-sheet__item {
      display: block;
      width: 100%;
      padding: 16px 20px;
      background: transparent;
      border: none;
      border-bottom: 1px solid rgba(255,255,255,0.055);
      color: rgba(255,255,255,0.84);
      text-align: left;
      font-size: 0.95rem;
      font-family: inherit;
      pointer-events: all;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: background 0.1s;
      &:active { background: rgba(255,255,255,0.05); }
    }

    .km-sheet__item--danger { color: rgba(255,82,82,0.92); }
    .km-sheet__item--cancel { font-weight: 600; color: #c9a84c; border-bottom: none; }
  `]
})
export class HighlightToolbarComponent implements OnDestroy {
  private editorSvc   = inject(DocEditorService);
  private extractSvc  = inject(DocExtractService);
  private cdr         = inject(ChangeDetectorRef);
  private zone        = inject(NgZone);

  visible    = signal(false);
  bubbleTop  = signal(0);
  bubbleLeft = signal(0);

  isBold          = signal(false);
  isItalic        = signal(false);
  isUnderline     = signal(false);
  isStrike        = signal(false);
  isLink          = signal(false);
  isSuperscript   = signal(false);
  isSubscript     = signal(false);
  currentBlock    = signal<BlockType>('paragraph');
  currentHighlight = signal('rgba(201,168,76,0.35)');
  currentTextColor = signal('rgba(255,255,255,0.82)');
  sheetOpen       = signal(false);
  sheetTitle      = signal('');
  sheetItems      = signal<ToolbarSheetItem[]>([]);

  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Tiptap selectionUpdate handler — runs outside Angular zone.
   * More reliable than document.selectionchange on iOS/WKWebView:
   * coordsAtPos() gives accurate viewport coords even when the DOM
   * selection API (getBoundingClientRect, isCollapsed) is inconsistent.
   */
  private readonly selUpdateFn = () => {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => this.evaluateFromEditor(), 50);
  };

  /** Track which editor instance we are currently registered with. */
  private registeredEditor: import('@tiptap/core').Editor | null = null;

  constructor() {
    // Re-register whenever the editor is created or recreated.
    effect(() => {
      const ready  = this.editorSvc.editorReady();
      const editor = ready ? this.editorSvc.editor : null;

      if (this.registeredEditor && this.registeredEditor !== editor) {
        this.registeredEditor.off('selectionUpdate', this.selUpdateFn);
        this.registeredEditor = null;
      }
      if (editor && editor !== this.registeredEditor) {
        editor.on('selectionUpdate', this.selUpdateFn);
        this.registeredEditor = editor;
      }
    });
  }

  ngOnDestroy(): void {
    this.registeredEditor?.off('selectionUpdate', this.selUpdateFn);
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
  }

  /**
   * Evaluate using ProseMirror's internal selection + coordsAtPos.
   * Runs outside Angular zone; re-enters zone once for all signal updates.
   */
  private evaluateFromEditor(): void {
    const editor = this.editorSvc.editor;
    if (!editor) { this.zone.run(() => this.hide()); return; }

    const { from, to } = editor.state.selection;
    if (from === to) { this.zone.run(() => this.hide()); return; }

    // coordsAtPos returns viewport-relative coordinates (no scroll offset issues)
    const fromCoords = editor.view.coordsAtPos(from);
    const toCoords   = editor.view.coordsAtPos(to);

    const BUBBLE_H = 88;  // 2-row: ~44px each
    const BUBBLE_W = 260; // approximate max width
    const MARGIN   = 8;

    const selTop    = Math.min(fromCoords.top,    toCoords.top);
    const selBottom = Math.max(fromCoords.bottom, toCoords.bottom);
    // Center bubble over selection midpoint, clamped to viewport edges
    const centerX   = (fromCoords.left + toCoords.left) / 2;

    let top  = selTop - BUBBLE_H - MARGIN;
    const vw = window.innerWidth;
    if (top < 60) top = selBottom + MARGIN;
    // Position left edge so bubble is centered on selection but stays on-screen
    const left = Math.max(8, Math.min(vw - BUBBLE_W - 8, centerX - BUBBLE_W / 2));

    const bold        = editor.isActive('bold');
    const italic      = editor.isActive('italic');
    const underline   = editor.isActive('underline');
    const strike      = editor.isActive('strike');
    const link        = editor.isActive('link');
    const superscript = editor.isActive('superscript');
    const subscript   = editor.isActive('subscript');
    const block       = this.resolveBlock(editor);

    this.zone.run(() => {
      this.bubbleTop.set(top);
      this.bubbleLeft.set(left);
      this.isBold.set(bold);
      this.isItalic.set(italic);
      this.isUnderline.set(underline);
      this.isStrike.set(strike);
      this.isLink.set(link);
      this.isSuperscript.set(superscript);
      this.isSubscript.set(subscript);
      this.currentBlock.set(block);
      this.visible.set(true);
      this.cdr.markForCheck();
    });
  }

  private resolveBlock(editor: import('@tiptap/core').Editor): BlockType {
    if      (editor.isActive('heading', { level: 1 })) return 'heading1';
    else if (editor.isActive('heading', { level: 2 })) return 'heading2';
    else if (editor.isActive('heading', { level: 3 })) return 'heading3';
    else if (editor.isActive('bulletList'))             return 'bulletList';
    else if (editor.isActive('orderedList'))            return 'orderedList';
    else if (editor.isActive('blockquote'))             return 'blockquote';
    else if (editor.isActive('codeBlock'))              return 'codeBlock';
    else if (editor.isActive('callout'))                return 'callout';
    return 'paragraph';
  }


  private hide(): void {
    if (this.visible()) {
      this.visible.set(false);
      this.cdr.markForCheck();
    }
  }

  private presentSheet(title: string, items: ToolbarSheetItem[]): void {
    this.sheetTitle.set(title);
    this.sheetItems.set(items);
    this.sheetOpen.set(true);
    this.cdr.markForCheck();
  }

  closeSheet(): void {
    if (!this.sheetOpen()) return;
    this.sheetOpen.set(false);
    this.sheetItems.set([]);
    this.cdr.markForCheck();
  }

  runSheetItem(item: ToolbarSheetItem): void {
    this.closeSheet();
    item.action();
  }

  blockIcon(): string {
    const MAP: Record<BlockType, string> = {
      paragraph:   '¶',
      heading1:    'H1',
      heading2:    'H2',
      heading3:    'H3',
      bulletList:  '•',
      orderedList: '1.',
      blockquote:  '❝',
      codeBlock:   '</>',
      callout:     '💡',
    };
    return MAP[this.currentBlock()] ?? '¶';
  }

  blockName(): string {
    const MAP: Record<BlockType, string> = {
      paragraph:   'Text',
      heading1:    'Heading 1',
      heading2:    'Heading 2',
      heading3:    'Heading 3',
      bulletList:  'Bullet List',
      orderedList: 'Numbered',
      blockquote:  'Blockquote',
      codeBlock:   'Code Block',
      callout:     'Callout',
    };
    return MAP[this.currentBlock()] ?? 'Text';
  }

  cmd(mark: string): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    switch (mark) {
      case 'bold':        e.chain().focus().toggleBold().run();        break;
      case 'italic':      e.chain().focus().toggleItalic().run();      break;
      case 'underline':   e.chain().focus().toggleUnderline().run();   break;
      case 'strike':      e.chain().focus().toggleStrike().run();      break;
      case 'superscript': e.chain().focus().toggleSuperscript().run(); break;
      case 'subscript':   e.chain().focus().toggleSubscript().run();   break;
    }
    this.isBold.set(e.isActive('bold'));
    this.isItalic.set(e.isActive('italic'));
    this.isUnderline.set(e.isActive('underline'));
    this.isStrike.set(e.isActive('strike'));
    this.isSuperscript.set(e.isActive('superscript'));
    this.isSubscript.set(e.isActive('subscript'));
    this.cdr.markForCheck();
  }

  openBlockSheet(): void {
    this.presentSheet('Turn into', [
      { label: '¶   Text',         action: () => this.setBlock('paragraph') },
      { label: 'H1  Heading 1',    action: () => this.setBlock('heading1') },
      { label: 'H2  Heading 2',    action: () => this.setBlock('heading2') },
      { label: 'H3  Heading 3',    action: () => this.setBlock('heading3') },
      { label: '•    Bullet List', action: () => this.setBlock('bulletList') },
      { label: '1.   Numbered',    action: () => this.setBlock('orderedList') },
      { label: '❝   Blockquote',   action: () => this.setBlock('blockquote') },
      { label: '</>  Code Block',  action: () => this.setBlock('codeBlock') },
      { label: '💡  Callout',      action: () => this.setBlock('callout') },
    ]);
  }

  openHighlightSheet(): void {
    this.presentSheet('Highlight', [
      ...HIGHLIGHT_COLORS.map(c => ({
        label: c.label,
        action: () => {
          this.editorSvc.editor?.chain().focus().setHighlight({ color: c.color }).run();
          this.currentHighlight.set(c.color);
        }
      })),
      {
        label: '✕  Clear highlight',
        action: () => {
          this.editorSvc.editor?.chain().focus().unsetHighlight().run();
          this.currentHighlight.set('rgba(201,168,76,0.35)');
        }
      },
    ]);
  }

  openTextColorSheet(): void {
    this.presentSheet('Text Color', TEXT_COLORS.map(c => ({
      label: c.label,
      action: () => {
        const e = this.editorSvc.editor;
        if (!e) return;
        if (c.color === null) {
          e.chain().focus().unsetColor().run();
          this.currentTextColor.set('rgba(255,255,255,0.82)');
        } else {
          e.chain().focus().setColor(c.color).run();
          this.currentTextColor.set(c.color);
        }
      },
    })));
  }

  openLinkSheet(): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    if (e.isActive('link')) {
      this.presentSheet('Link', [
        {
          label: '✏️  Edit link',
          action: () => {
            const url = prompt('URL:', (e.getAttributes('link') as { href?: string }).href ?? '');
            if (url !== null) e.chain().focus().setLink({ href: url }).run();
          },
        },
        {
          label: '✕  Remove link',
          action: () => e.chain().focus().unsetLink().run(),
          tone: 'danger',
        },
      ]);
    } else {
      const url = prompt('Enter URL:');
      if (url) e.chain().focus().setLink({ href: url }).run();
    }
  }

  clearFormatting(): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    e.chain().focus()
      .unsetBold().unsetItalic().unsetUnderline().unsetStrike()
      .unsetHighlight().unsetColor()
      .run();
    this.isBold.set(false);
    this.isItalic.set(false);
    this.isUnderline.set(false);
    this.isStrike.set(false);
    this.cdr.markForCheck();
  }

  openExtractSheet(): void {
    const text = this.selectedText();
    if (!text) return;
    this.presentSheet('Extract to K-MAPS', [
      { label: '🌍  WV Topic',   action: () => this.extractSvc.extractToWvTopic(text) },
      { label: 'ع  Vocabulary', action: () => this.extractSvc.extractToVocab(text) },
      { label: '☑  Task',       action: () => this.extractSvc.extractToTask(text) },
      { label: '🃏  SRS Card',  action: () => this.extractSvc.createSrsCard(text) },
    ]);
  }

  private setBlock(type: BlockType): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    switch (type) {
      case 'paragraph':   e.chain().focus().setParagraph().run(); break;
      case 'heading1':    e.chain().focus().setHeading({ level: 1 }).run(); break;
      case 'heading2':    e.chain().focus().setHeading({ level: 2 }).run(); break;
      case 'heading3':    e.chain().focus().setHeading({ level: 3 }).run(); break;
      case 'bulletList':  e.chain().focus().toggleBulletList().run(); break;
      case 'orderedList': e.chain().focus().toggleOrderedList().run(); break;
      case 'blockquote':  e.chain().focus().toggleBlockquote().run(); break;
      case 'codeBlock':   e.chain().focus().toggleCodeBlock().run(); break;
      case 'callout':     e.chain().focus().insertContent({ type: 'callout', attrs: { emoji: '💡' }, content: [{ type: 'paragraph' }] }).run(); break;
    }
  }

  private selectedText(): string {
    const editor = this.editorSvc.editor;
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  }
}
