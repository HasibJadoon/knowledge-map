import {
  Component, OnInit, OnDestroy, inject, signal,
  ChangeDetectionStrategy, ChangeDetectorRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionSheetController } from '@ionic/angular';
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

const TEXT_COLORS = [
  { color: '#c9a84c',                label: '🟡 Gold'    },
  { color: '#64b4ff',                label: '🔵 Blue'    },
  { color: '#64dc82',                label: '🟢 Green'   },
  { color: '#ff7864',                label: '🔴 Red'     },
  { color: '#c882ff',                label: '🟣 Purple'  },
  { color: 'rgba(255,255,255,0.82)', label: '⬜ Default' },
];

type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3'
               | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock';

@Component({
  selector: 'km-highlight-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <!-- Floating bubble positioned above selection -->
      <div class="km-bubble"
           [style.top.px]="bubbleTop()"
           [style.left.px]="bubbleLeft()"
           [style.transform]="bubbleTransform()">

        <!-- Block type pill -->
        <button class="km-bb km-bb--type" (touchend)="openBlockSheet(); $event.preventDefault()">
          <span class="km-bb__label">{{ blockLabel() }}</span>
          <svg viewBox="0 0 10 6" fill="currentColor" width="7" height="4" style="opacity:.4"><path d="M0 0l5 6 5-6z"/></svg>
        </button>

        <span class="km-bsep"></span>

        <!-- B / I / U / S / Code -->
        <button class="km-bb" [class.km-bb--on]="isBold()"
                (touchend)="cmd('bold'); $event.preventDefault()"><b>B</b></button>
        <button class="km-bb" [class.km-bb--on]="isItalic()"
                (touchend)="cmd('italic'); $event.preventDefault()"><i>I</i></button>
        <button class="km-bb" [class.km-bb--on]="isUnderline()"
                (touchend)="cmd('underline'); $event.preventDefault()"><u>U</u></button>
        <button class="km-bb" [class.km-bb--on]="isStrike()"
                (touchend)="cmd('strike'); $event.preventDefault()"><s>S</s></button>

        <span class="km-bsep"></span>

        <!-- Highlight -->
        <button class="km-bb" title="Highlight"
                (touchend)="openHighlightSheet(); $event.preventDefault()">
          <span class="km-hl" [style.background]="currentHighlight()">A</span>
        </button>

        <!-- Text color -->
        <button class="km-bb" title="Color"
                (touchend)="openTextColorSheet(); $event.preventDefault()">
          <span class="km-tc" [style.color]="currentTextColor()">A</span>
        </button>

        <span class="km-bsep"></span>

        <!-- More (extract) -->
        <button class="km-bb km-bb--more"
                (touchend)="openExtractSheet(); $event.preventDefault()">···</button>
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
      align-items: center;
      gap: 1px;
      background: #1e1e1e;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px;
      padding: 4px 6px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5);
      pointer-events: all;
      white-space: nowrap;
      overflow: visible;
      animation: km-bub-in 0.14s ease;
    }

    @keyframes km-bub-in {
      from { opacity: 0; transform: translateX(-50%) translateY(4px) scale(0.96); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0)   scale(1); }
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
        min-width: 44px;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0 6px;
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
  `]
})
export class HighlightToolbarComponent implements OnInit, OnDestroy {
  private editorSvc   = inject(DocEditorService);
  private extractSvc  = inject(DocExtractService);
  private actionSheet = inject(ActionSheetController);
  private cdr         = inject(ChangeDetectorRef);
  private zone        = inject(NgZone);

  visible         = signal(false);
  bubbleTop       = signal(0);
  bubbleLeft      = signal(0);
  bubbleTransform = signal('translateX(-50%)');

  isBold          = signal(false);
  isItalic        = signal(false);
  isUnderline     = signal(false);
  isStrike        = signal(false);
  currentBlock    = signal<BlockType>('paragraph');
  currentHighlight = signal('rgba(201,168,76,0.35)');
  currentTextColor = signal('rgba(255,255,255,0.82)');

  private selectionChangeHandler = () => this.zone.run(() => this.onSelectionChange());
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    document.addEventListener('selectionchange', this.selectionChangeHandler, { passive: true });
  }

  ngOnDestroy(): void {
    document.removeEventListener('selectionchange', this.selectionChangeHandler);
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
  }

  private onSelectionChange(): void {
    // Small delay — let the selection rect stabilise after touch
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => this.evaluateSelection(), 80);
  }

  private evaluateSelection(): void {
    const editor = this.editorSvc.editor;
    if (!editor) { this.hide(); return; }

    const domSel = window.getSelection();
    if (!domSel || domSel.isCollapsed || domSel.rangeCount === 0) {
      this.hide();
      return;
    }

    // Make sure the selection is inside the editor
    const range = domSel.getRangeAt(0);
    const editorEl = editor.options.element as HTMLElement | null;
    if (!editorEl || !(editorEl as HTMLElement).contains(range.commonAncestorContainer)) {
      this.hide();
      return;
    }

    const rect = range.getBoundingClientRect();
    if (!rect || rect.width === 0) { this.hide(); return; }

    // Position: centre-X of selection, above the top of the selection
    const BUBBLE_HEIGHT = 44;
    const MARGIN = 8;
    let top  = rect.top - BUBBLE_HEIGHT - MARGIN;
    let left = rect.left + rect.width / 2;

    // Clamp to viewport
    const vw = window.innerWidth;
    if (top < 60) top = rect.bottom + MARGIN; // flip below if too close to top
    left = Math.max(80, Math.min(vw - 80, left));

    this.bubbleTop.set(top);
    this.bubbleLeft.set(left);
    this.bubbleTransform.set('translateX(-50%)');

    // Sync mark state from ProseMirror
    const { from, to } = editor.state.selection;
    if (from !== to) {
      this.isBold.set(editor.isActive('bold'));
      this.isItalic.set(editor.isActive('italic'));
      this.isUnderline.set(editor.isActive('underline'));
      this.isStrike.set(editor.isActive('strike'));
      this.syncBlock(editor);
    }

    this.visible.set(true);
    this.cdr.markForCheck();
  }

  private syncBlock(editor: import('@tiptap/core').Editor): void {
    if      (editor.isActive('heading', { level: 1 })) this.currentBlock.set('heading1');
    else if (editor.isActive('heading', { level: 2 })) this.currentBlock.set('heading2');
    else if (editor.isActive('heading', { level: 3 })) this.currentBlock.set('heading3');
    else if (editor.isActive('bulletList'))             this.currentBlock.set('bulletList');
    else if (editor.isActive('orderedList'))            this.currentBlock.set('orderedList');
    else if (editor.isActive('blockquote'))             this.currentBlock.set('blockquote');
    else if (editor.isActive('codeBlock'))              this.currentBlock.set('codeBlock');
    else                                                this.currentBlock.set('paragraph');
  }

  private hide(): void {
    if (this.visible()) {
      this.visible.set(false);
      this.cdr.markForCheck();
    }
  }

  blockLabel(): string {
    const MAP: Record<BlockType, string> = {
      paragraph: 'Text', heading1: 'H1', heading2: 'H2', heading3: 'H3',
      bulletList: '•≡', orderedList: '1≡', blockquote: '❝', codeBlock: '</>'
    };
    return MAP[this.currentBlock()] ?? 'Text';
  }

  cmd(mark: string): void {
    const e = this.editorSvc.editor;
    if (!e) return;
    switch (mark) {
      case 'bold':      e.chain().focus().toggleBold().run();      break;
      case 'italic':    e.chain().focus().toggleItalic().run();    break;
      case 'underline': e.chain().focus().toggleUnderline().run(); break;
      case 'strike':    e.chain().focus().toggleStrike().run();    break;
    }
    // Refresh state after command
    this.isBold.set(e.isActive('bold'));
    this.isItalic.set(e.isActive('italic'));
    this.isUnderline.set(e.isActive('underline'));
    this.isStrike.set(e.isActive('strike'));
    this.cdr.markForCheck();
  }

  async openBlockSheet(): Promise<void> {
    const sheet = await this.actionSheet.create({
      header: 'Turn into',
      cssClass: 'km-action-sheet',
      buttons: [
        { text: '¶  Text',          handler: () => this.setBlock('paragraph')   },
        { text: 'H1  Heading 1',    handler: () => this.setBlock('heading1')    },
        { text: 'H2  Heading 2',    handler: () => this.setBlock('heading2')    },
        { text: 'H3  Heading 3',    handler: () => this.setBlock('heading3')    },
        { text: '•≡  Bullet List',  handler: () => this.setBlock('bulletList')  },
        { text: '1≡  Numbered',     handler: () => this.setBlock('orderedList') },
        { text: '❝  Blockquote',   handler: () => this.setBlock('blockquote')  },
        { text: '</>  Code Block',  handler: () => this.setBlock('codeBlock')   },
        { text: 'Cancel', role: 'cancel' },
      ]
    });
    await sheet.present();
  }

  async openHighlightSheet(): Promise<void> {
    const sheet = await this.actionSheet.create({
      header: 'Highlight',
      cssClass: 'km-action-sheet',
      buttons: [
        ...HIGHLIGHT_COLORS.map(c => ({
          text: c.label,
          handler: () => {
            this.editorSvc.editor?.chain().focus().setHighlight({ color: c.color }).run();
            this.currentHighlight.set(c.color);
          }
        })),
        { text: '✕  Clear highlight', handler: () => this.editorSvc.editor?.chain().focus().unsetHighlight().run() },
        { text: 'Cancel', role: 'cancel' },
      ]
    });
    await sheet.present();
  }

  async openTextColorSheet(): Promise<void> {
    const sheet = await this.actionSheet.create({
      header: 'Text Color',
      cssClass: 'km-action-sheet',
      buttons: [
        ...TEXT_COLORS.map(c => ({
          text: c.label,
          handler: () => {
            this.editorSvc.editor?.chain().focus().setColor(c.color).run();
            this.currentTextColor.set(c.color);
          }
        })),
        { text: '✕  Clear color', handler: () => this.editorSvc.editor?.chain().focus().unsetColor().run() },
        { text: 'Cancel', role: 'cancel' },
      ]
    });
    await sheet.present();
  }

  async openExtractSheet(): Promise<void> {
    const text = this.selectedText();
    if (!text) return;
    const sheet = await this.actionSheet.create({
      header: 'Extract to K-MAPS',
      cssClass: 'km-action-sheet',
      buttons: [
        { text: '🌍  WV Topic',    handler: () => this.extractSvc.extractToWvTopic(text) },
        { text: 'ع  Vocabulary',  handler: () => this.extractSvc.extractToVocab(text)    },
        { text: '☑  Task',        handler: () => this.extractSvc.extractToTask(text)     },
        { text: '🃏  SRS Card',   handler: () => this.extractSvc.createSrsCard(text)     },
        { text: 'Cancel', role: 'cancel' },
      ]
    });
    await sheet.present();
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
    }
  }

  private selectedText(): string {
    const editor = this.editorSvc.editor;
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  }
}
