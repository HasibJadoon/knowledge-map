import {
  Component, OnDestroy, inject, signal,
  effect, ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionSheetController } from '@ionic/angular';
import { DocEditorService } from '../../services/doc-editor.service';
import { DocExtractService } from '../../services/doc-extract.service';

const HIGHLIGHT_COLORS = [
  { color: 'rgba(201,168,76,0.35)',  label: 'Gold' },
  { color: 'rgba(100,180,255,0.35)', label: 'Blue' },
  { color: 'rgba(100,220,130,0.35)', label: 'Green' },
  { color: 'rgba(255,120,100,0.35)', label: 'Red' },
  { color: 'rgba(200,130,255,0.35)', label: 'Purple' },
  { color: 'rgba(255,200,80,0.35)',  label: 'Yellow' },
];

const TEXT_COLORS = [
  { color: '#c9a84c',               label: 'Gold' },
  { color: '#64b4ff',               label: 'Blue' },
  { color: '#64dc82',               label: 'Green' },
  { color: '#ff7864',               label: 'Red' },
  { color: '#c882ff',               label: 'Purple' },
  { color: 'rgba(255,255,255,0.82)', label: 'Default' },
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
      <div class="km-sel-bar" (touchstart)="$event.preventDefault()">

        <!-- Block type -->
        <button class="km-sel-btn" (click)="openBlockSheet()">
          <span>{{ blockLabel() }}</span>
          <svg viewBox="0 0 10 6" fill="currentColor" width="8" height="5"><path d="M0 0l5 6 5-6z"/></svg>
        </button>

        <div class="km-sel-sep"></div>

        <!-- Highlight -->
        <button class="km-sel-btn" title="Highlight" (click)="openHighlightSheet()">
          <span class="km-sel-hl" [style.background]="currentHighlight()">A</span>
        </button>

        <!-- Text color -->
        <button class="km-sel-btn" title="Text color" (click)="openTextColorSheet()">
          <span class="km-sel-tc" [style.color]="currentTextColor()">A</span>
        </button>

        <div class="km-sel-sep"></div>

        <!-- Inline marks -->
        <button class="km-sel-btn" [class.km-sel-btn--active]="isBold()"      (click)="cmd('bold')"><b>B</b></button>
        <button class="km-sel-btn" [class.km-sel-btn--active]="isItalic()"    (click)="cmd('italic')"><i>I</i></button>
        <button class="km-sel-btn" [class.km-sel-btn--active]="isUnderline()" (click)="cmd('underline')"><u>U</u></button>
        <button class="km-sel-btn" [class.km-sel-btn--active]="isStrike()"    (click)="cmd('strike')"><s>S</s></button>
        <button class="km-sel-btn" [class.km-sel-btn--active]="isCode()"      (click)="cmd('code')">&lt;/&gt;</button>

        <div class="km-sel-sep"></div>

        <!-- Extract -->
        <button class="km-sel-btn km-sel-btn--more" title="Extract" (click)="openExtractSheet()">···</button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .km-sel-bar {
      display: flex;
      align-items: center;
      gap: 1px;
      background: #1c1c1e;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding: 4px 10px;
      overflow-x: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
      animation: km-sel-in 0.15s ease;
    }

    @keyframes km-sel-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .km-sel-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 3px;
      min-width: 34px;
      height: 34px;
      padding: 0 6px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: rgba(255,255,255,0.75);
      font-size: 0.85rem;
      cursor: pointer;
      touch-action: manipulation;
      transition: background 0.1s, color 0.1s;

      &:active, &--active {
        background: rgba(201,168,76,0.15);
        color: #c9a84c;
      }

      &--more { font-size: 1rem; letter-spacing: 1px; opacity: 0.7; }

      svg { flex-shrink: 0; opacity: 0.4; }
    }

    .km-sel-sep {
      width: 1px;
      height: 20px;
      flex-shrink: 0;
      background: rgba(255,255,255,0.1);
      margin: 0 3px;
    }

    .km-sel-hl {
      display: inline-block;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      line-height: 18px;
      text-align: center;
      font-weight: 800;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.9);
    }

    .km-sel-tc {
      font-weight: 800;
      font-size: 0.9rem;
      text-decoration: underline 2px solid currentColor;
      text-underline-offset: 2px;
    }
  `]
})
export class HighlightToolbarComponent implements OnDestroy {
  private editorSvc   = inject(DocEditorService);
  private extractSvc  = inject(DocExtractService);
  private actionSheet = inject(ActionSheetController);
  readonly cdr        = inject(ChangeDetectorRef);

  private attachedEditor: import('@tiptap/core').Editor | null = null;

  visible         = signal(false);
  isBold          = signal(false);
  isItalic        = signal(false);
  isUnderline     = signal(false);
  isStrike        = signal(false);
  isCode          = signal(false);
  currentBlock    = signal<BlockType>('paragraph');
  currentHighlight = signal('rgba(201,168,76,0.35)');
  currentTextColor = signal('rgba(255,255,255,0.82)');

  private selHandler = () => this.onSelectionUpdate();

  constructor() {
    effect(() => {
      const ready = this.editorSvc.editorReady();
      if (this.attachedEditor) {
        this.attachedEditor.off('selectionUpdate', this.selHandler);
        this.attachedEditor.off('blur', this.blurHandler);
        this.attachedEditor = null;
      }
      if (ready && this.editorSvc.editor) {
        this.attachedEditor = this.editorSvc.editor;
        this.attachedEditor.on('selectionUpdate', this.selHandler);
        this.attachedEditor.on('blur', this.blurHandler);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.attachedEditor) {
      this.attachedEditor.off('selectionUpdate', this.selHandler);
      this.attachedEditor.off('blur', this.blurHandler);
    }
  }

  private blurHandler = () => {
    // Small delay so action sheet / button taps don't hide it prematurely
    setTimeout(() => {
      const editor = this.editorSvc.editor;
      if (!editor) { this.visible.set(false); this.cdr.markForCheck(); return; }
      const { from, to } = editor.state.selection;
      if (from === to) { this.visible.set(false); this.cdr.markForCheck(); }
    }, 200);
  };

  private onSelectionUpdate(): void {
    const editor = this.editorSvc.editor;
    if (!editor) { this.visible.set(false); return; }
    const { from, to } = editor.state.selection;
    if (from === to) { this.visible.set(false); this.cdr.markForCheck(); return; }

    this.isBold.set(editor.isActive('bold'));
    this.isItalic.set(editor.isActive('italic'));
    this.isUnderline.set(editor.isActive('underline'));
    this.isStrike.set(editor.isActive('strike'));
    this.isCode.set(editor.isActive('code'));

    if      (editor.isActive('heading', { level: 1 })) this.currentBlock.set('heading1');
    else if (editor.isActive('heading', { level: 2 })) this.currentBlock.set('heading2');
    else if (editor.isActive('heading', { level: 3 })) this.currentBlock.set('heading3');
    else if (editor.isActive('bulletList'))             this.currentBlock.set('bulletList');
    else if (editor.isActive('orderedList'))            this.currentBlock.set('orderedList');
    else if (editor.isActive('blockquote'))             this.currentBlock.set('blockquote');
    else if (editor.isActive('codeBlock'))              this.currentBlock.set('codeBlock');
    else                                                this.currentBlock.set('paragraph');

    this.visible.set(true);
    this.cdr.markForCheck();
  }

  blockLabel(): string {
    const MAP: Record<BlockType, string> = {
      paragraph: 'Text', heading1: 'H1', heading2: 'H2', heading3: 'H3',
      bulletList: '• List', orderedList: '1. List',
      blockquote: 'Quote', codeBlock: 'Code'
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
      case 'code':      e.chain().focus().toggleCode().run();      break;
    }
    this.onSelectionUpdate();
  }

  async openBlockSheet(): Promise<void> {
    const sheet = await this.actionSheet.create({
      header: 'Block Type',
      cssClass: 'km-action-sheet',
      buttons: [
        { text: 'Text',         handler: () => this.setBlock('paragraph')   },
        { text: 'Heading 1',    handler: () => this.setBlock('heading1')    },
        { text: 'Heading 2',    handler: () => this.setBlock('heading2')    },
        { text: 'Heading 3',    handler: () => this.setBlock('heading3')    },
        { text: 'Bullet List',  handler: () => this.setBlock('bulletList')  },
        { text: 'Numbered List',handler: () => this.setBlock('orderedList') },
        { text: 'Blockquote',   handler: () => this.setBlock('blockquote')  },
        { text: 'Code Block',   handler: () => this.setBlock('codeBlock')   },
        { text: 'Cancel', role: 'cancel' },
      ]
    });
    await sheet.present();
  }

  async openHighlightSheet(): Promise<void> {
    const sheet = await this.actionSheet.create({
      header: 'Highlight Color',
      cssClass: 'km-action-sheet',
      buttons: [
        ...HIGHLIGHT_COLORS.map(c => ({
          text: c.label,
          handler: () => {
            this.editorSvc.editor?.chain().focus().setHighlight({ color: c.color }).run();
            this.currentHighlight.set(c.color);
            this.cdr.markForCheck();
          }
        })),
        { text: 'Clear highlight', handler: () => { this.editorSvc.editor?.chain().focus().unsetHighlight().run(); } },
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
            this.cdr.markForCheck();
          }
        })),
        { text: 'Clear color', handler: () => { this.editorSvc.editor?.chain().focus().unsetColor().run(); } },
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
        { text: '🌍  WV Topic',   handler: () => this.extractSvc.extractToWvTopic(text) },
        { text: 'ع  Vocabulary', handler: () => this.extractSvc.extractToVocab(text)    },
        { text: '☑  Task',       handler: () => this.extractSvc.extractToTask(text)     },
        { text: '🃏  SRS Card',  handler: () => this.extractSvc.createSrsCard(text)     },
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
    this.cdr.markForCheck();
  }

  private selectedText(): string {
    const editor = this.editorSvc.editor;
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  }
}
