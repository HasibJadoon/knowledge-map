import {
  Component, OnDestroy, inject, signal, effect,
  ChangeDetectionStrategy, ChangeDetectorRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocEditorService } from '../../services/doc-editor.service';
import { DocExtractService } from '../../services/doc-extract.service';

type BlockType = 'paragraph' | 'heading1' | 'heading2' | 'heading3'
               | 'bulletList' | 'orderedList' | 'taskList'
               | 'blockquote' | 'codeBlock';

const BLOCK_LABELS: Record<BlockType, { icon: string; label: string }> = {
  paragraph:   { icon: 'T',   label: 'Text' },
  heading1:    { icon: 'H₁',  label: 'Heading 1' },
  heading2:    { icon: 'H₂',  label: 'Heading 2' },
  heading3:    { icon: 'H₃',  label: 'Heading 3' },
  bulletList:  { icon: '•≡',  label: 'Bullet List' },
  orderedList: { icon: '1≡',  label: 'Numbered List' },
  taskList:    { icon: '☑≡',  label: 'To-do List' },
  blockquote:  { icon: '❝',   label: 'Blockquote' },
  codeBlock:   { icon: '</>',  label: 'Code Block' },
};

const HIGHLIGHT_COLORS = [
  { color: 'rgba(201,168,76,0.35)',  label: 'Gold' },
  { color: 'rgba(100,180,255,0.35)', label: 'Blue' },
  { color: 'rgba(100,220,130,0.35)', label: 'Green' },
  { color: 'rgba(255,120,100,0.35)', label: 'Red' },
  { color: 'rgba(200,130,255,0.35)', label: 'Purple' },
  { color: 'rgba(255,200,80,0.35)',  label: 'Yellow' },
];

const TEXT_COLORS = [
  { color: '#c9a84c', label: 'Gold' },
  { color: '#64b4ff', label: 'Blue' },
  { color: '#64dc82', label: 'Green' },
  { color: '#ff7864', label: 'Red' },
  { color: '#c882ff', label: 'Purple' },
  { color: 'rgba(255,255,255,0.82)', label: 'Default' },
];

@Component({
  selector: 'km-highlight-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div class="km-bubble"
           [style.top.px]="top()"
           [style.left.px]="left()"
           (mousedown)="$event.preventDefault()">

        <!-- Block type selector -->
        <div class="km-bubble__type" (click)="toggleTypeMenu($event)">
          <span class="km-bubble__type-icon">{{ currentBlockIcon() }}</span>
          <svg class="km-bubble__chevron" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
        </div>

        <div class="km-bubble__sep"></div>

        <!-- Highlight color -->
        <div class="km-bubble__color-wrap" title="Highlight color" (click)="toggleColorMenu($event)">
          <span class="km-bubble__color-a" [style.text-decoration-color]="currentHighlight()">A</span>
          <svg class="km-bubble__chevron" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
        </div>

        <!-- Text color -->
        <div class="km-bubble__color-wrap" title="Text color" (click)="toggleTextColorMenu($event)">
          <span class="km-bubble__color-a" [style.color]="currentTextColor()" style="text-decoration:none">A</span>
          <svg class="km-bubble__chevron" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z"/></svg>
        </div>

        <div class="km-bubble__sep"></div>

        <!-- Formatting -->
        <button class="km-bubble__btn km-bubble__btn--bold" [class.km-bubble__btn--active]="isBold()"
                title="Bold (⌘B)" (click)="cmd('bold')">B</button>
        <button class="km-bubble__btn km-bubble__btn--italic" [class.km-bubble__btn--active]="isItalic()"
                title="Italic (⌘I)" (click)="cmd('italic')">I</button>
        <button class="km-bubble__btn km-bubble__btn--underline" [class.km-bubble__btn--active]="isUnderline()"
                title="Underline (⌘U)" (click)="cmd('underline')">U</button>
        <button class="km-bubble__btn km-bubble__btn--strike" [class.km-bubble__btn--active]="isStrike()"
                title="Strikethrough" (click)="cmd('strike')">S</button>
        <button class="km-bubble__btn" [class.km-bubble__btn--active]="isCode()"
                title="Inline Code" (click)="cmd('code')">&lt;/&gt;</button>
        <button class="km-bubble__btn" [class.km-bubble__btn--active]="isLink()"
                title="Link" (click)="setLink()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>

        <!-- Indent/Outdent (list context) -->
        @if (currentBlock() === 'bulletList' || currentBlock() === 'orderedList') {
          <div class="km-bubble__sep"></div>
          <button class="km-bubble__btn" title="Outdent (Shift+Tab)" (click)="outdent()">⇤</button>
          <button class="km-bubble__btn" title="Indent (Tab)" (click)="indent()">⇥</button>
        }

        <div class="km-bubble__sep"></div>

        <!-- More (K-MAPS extract) -->
        <button class="km-bubble__btn km-bubble__btn--more"
                title="More options" (click)="toggleMoreMenu($event)">···</button>
      </div>
    }

    <!-- Block type dropdown -->
    @if (typeMenuOpen()) {
      <div class="km-bubble__dropdown"
           [style.top.px]="dropdownTop()"
           [style.left.px]="dropdownLeft()">
        @for (entry of blockTypes; track entry.key) {
          <button class="km-bubble__dd-item"
                  [class.km-bubble__dd-item--active]="currentBlock() === entry.key"
                  (mousedown)="setBlock(entry.key, $event)">
            <span class="km-bubble__dd-icon">{{ entry.icon }}</span>
            <span>{{ entry.label }}</span>
          </button>
        }
      </div>
    }

    <!-- Highlight color dropdown -->
    @if (colorMenuOpen()) {
      <div class="km-bubble__dropdown km-bubble__dropdown--colors"
           [style.top.px]="dropdownTop()"
           [style.left.px]="dropdownLeft()">
        <div class="km-bubble__dd-label">Highlight</div>
        <div class="km-bubble__colors">
          @for (c of highlightColors; track c.color) {
            <button class="km-bubble__color-swatch"
                    [style.background]="c.color"
                    [title]="c.label"
                    (mousedown)="applyHighlight(c.color, $event)">
            </button>
          }
          <button class="km-bubble__color-swatch km-bubble__color-swatch--clear"
                  title="Clear" (mousedown)="clearHighlight($event)">✕</button>
        </div>
      </div>
    }

    <!-- Text color dropdown -->
    @if (textColorMenuOpen()) {
      <div class="km-bubble__dropdown km-bubble__dropdown--colors"
           [style.top.px]="dropdownTop()"
           [style.left.px]="dropdownLeft()">
        <div class="km-bubble__dd-label">Text color</div>
        <div class="km-bubble__colors">
          @for (c of textColors; track c.color) {
            <button class="km-bubble__color-swatch"
                    [style.background]="c.color"
                    [title]="c.label"
                    (mousedown)="applyTextColor(c.color, $event)">
            </button>
          }
          <button class="km-bubble__color-swatch km-bubble__color-swatch--clear"
                  title="Clear" (mousedown)="clearTextColor($event)">✕</button>
        </div>
      </div>
    }

    <!-- More menu dropdown -->
    @if (moreMenuOpen()) {
      <div class="km-bubble__dropdown"
           [style.top.px]="dropdownTop()"
           [style.left.px]="dropdownLeft()">
        <div class="km-bubble__dd-label">Extract to K-MAPS</div>
        <button class="km-bubble__dd-item" (mousedown)="toTopic($event)">
          <span class="km-bubble__dd-icon">🌍</span><span>WV Topic</span>
        </button>
        <button class="km-bubble__dd-item" (mousedown)="toVocab($event)">
          <span class="km-bubble__dd-icon">ع</span><span>Vocabulary</span>
        </button>
        <button class="km-bubble__dd-item" (mousedown)="toTask($event)">
          <span class="km-bubble__dd-icon">☑</span><span>Task</span>
        </button>
        <button class="km-bubble__dd-item" (mousedown)="toSrs($event)">
          <span class="km-bubble__dd-icon">🃏</span><span>SRS Card</span>
        </button>
      </div>
    }
  `,
  styles: [`
    :host { position: fixed; z-index: 10000; pointer-events: none; }

    .km-bubble {
      position: fixed;
      display: flex;
      align-items: center;
      gap: 1px;
      background: #1e1e1e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 3px 5px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);
      transform: translateX(-50%) translateY(calc(-100% - 10px));
      pointer-events: all;
      white-space: nowrap;
      flex-wrap: nowrap;
      animation: km-bubble-in 0.12s ease;
    }
    @keyframes km-bubble-in {
      from { opacity: 0; transform: translateX(-50%) translateY(calc(-100% - 4px)) scale(0.97); }
      to   { opacity: 1; transform: translateX(-50%) translateY(calc(-100% - 10px)) scale(1); }
    }

    .km-bubble__type {
      display: flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 6px; cursor: pointer;
      color: var(--km-text, #e0e0e0);
      font-size: 0.78rem; font-weight: 700;
      transition: background 0.12s; user-select: none;
      min-width: 36px; height: 28px;
    }
    .km-bubble__type:hover { background: rgba(255,255,255,0.08); }

    .km-bubble__color-wrap {
      display: flex; align-items: center; gap: 3px;
      padding: 3px 6px; border-radius: 6px; cursor: pointer;
      transition: background 0.12s; user-select: none; height: 28px;
    }
    .km-bubble__color-wrap:hover { background: rgba(255,255,255,0.08); }
    .km-bubble__color-a {
      font-size: 0.9rem; font-weight: 800;
      color: var(--km-text, #e0e0e0);
      text-decoration: underline 2.5px solid;
      text-underline-offset: 2px;
    }

    .km-bubble__chevron {
      width: 7px; height: 4px; opacity: 0.45;
    }

    .km-bubble__sep {
      width: 1px; height: 18px;
      background: rgba(255,255,255,0.1);
      margin: 0 3px; flex-shrink: 0;
    }

    .km-bubble__btn {
      background: transparent; border: none;
      color: rgba(255,255,255,0.82);
      padding: 0 5px; border-radius: 6px;
      cursor: pointer; font-size: 0.8rem;
      display: flex; align-items: center; justify-content: center;
      min-width: 28px; height: 28px;
      transition: background 0.1s, color 0.1s;
      font-family: var(--km-font-body, system-ui);
    }
    .km-bubble__btn:hover { background: rgba(255,255,255,0.09); color: #fff; }
    .km-bubble__btn--active {
      background: rgba(201,168,76,0.18);
      color: var(--km-gold, #c9a84c);
    }
    .km-bubble__btn--bold      { font-weight: 700; }
    .km-bubble__btn--italic    { font-style: italic; font-family: Georgia, serif; }
    .km-bubble__btn--underline { text-decoration: underline; }
    .km-bubble__btn--strike    { text-decoration: line-through; }
    .km-bubble__btn--more      { font-size: 1rem; letter-spacing: 1px; opacity: 0.7; }
    .km-bubble__btn--more:hover { opacity: 1; }

    /* Dropdown */
    .km-bubble__dropdown {
      position: fixed;
      background: #1e1e1e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 5px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      pointer-events: all;
      min-width: 170px;
      z-index: 10001;
      animation: km-dd-in 0.1s ease;
    }
    @keyframes km-dd-in {
      from { opacity: 0; transform: translateY(-4px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .km-bubble__dd-label {
      font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: rgba(255,255,255,0.28);
      padding: 4px 8px 3px;
    }
    .km-bubble__dd-item {
      display: flex; align-items: center; gap: 9px;
      width: 100%; padding: 6px 8px;
      background: transparent; border: none;
      border-radius: 6px; color: rgba(255,255,255,0.82);
      font-size: 0.82rem; cursor: pointer; text-align: left;
      transition: background 0.1s;
    }
    .km-bubble__dd-item:hover { background: rgba(255,255,255,0.07); }
    .km-bubble__dd-item--active { color: var(--km-gold, #c9a84c); }
    .km-bubble__dd-icon {
      font-size: 0.8rem; font-weight: 700;
      width: 22px; text-align: center; flex-shrink: 0;
    }

    /* Color swatches */
    .km-bubble__dropdown--colors { min-width: 0; }
    .km-bubble__colors { display: flex; gap: 5px; padding: 2px 4px 4px; }
    .km-bubble__color-swatch {
      width: 22px; height: 22px; border-radius: 5px;
      border: 1.5px solid rgba(255,255,255,0.12);
      cursor: pointer; transition: transform 0.1s, border-color 0.1s;
      flex-shrink: 0;
    }
    .km-bubble__color-swatch:hover { transform: scale(1.18); border-color: rgba(255,255,255,0.4); }
    .km-bubble__color-swatch--clear {
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.4);
      font-size: 0.65rem;
      display: flex; align-items: center; justify-content: center;
    }
  `]
})
export class HighlightToolbarComponent implements OnDestroy {
  private editorSvc  = inject(DocEditorService);
  private extractSvc = inject(DocExtractService);
  private cdr        = inject(ChangeDetectorRef);
  private attachedEditor: import('@tiptap/core').Editor | null = null;

  visible     = signal(false);
  top         = signal(0);
  left        = signal(0);
  dropdownTop = signal(0);
  dropdownLeft = signal(0);

  typeMenuOpen      = signal(false);
  colorMenuOpen     = signal(false);
  textColorMenuOpen = signal(false);
  moreMenuOpen      = signal(false);

  isBold      = signal(false);
  isItalic    = signal(false);
  isUnderline = signal(false);
  isStrike    = signal(false);
  isCode      = signal(false);
  isLink      = signal(false);
  currentBlock      = signal<BlockType>('paragraph');
  currentHighlight  = signal<string>('rgba(201,168,76,0.6)');
  currentTextColor  = signal<string>('rgba(255,255,255,0.82)');

  blockTypes = Object.entries(BLOCK_LABELS).map(([key, val]) => ({ key: key as BlockType, ...val }));
  highlightColors = HIGHLIGHT_COLORS;
  textColors = TEXT_COLORS;

  private raf: number | null = null;

  // rAF-debounced: getBoundingClientRect + 10x isActive() run at most once
  // per animation frame (≤16 ms) instead of once per keystroke transaction.
  private selectionHandler = () => {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      this.raf = null;
      this.onSelection();
    });
  };

  constructor() {
    // Re-subscribe whenever the editor is (re)initialized
    effect(() => {
      const ready = this.editorSvc.editorReady();

      // Detach from previous editor instance
      if (this.attachedEditor) {
        this.attachedEditor.off('selectionUpdate', this.selectionHandler);
        this.attachedEditor.off('transaction',     this.selectionHandler);
        this.attachedEditor = null;
      }

      if (ready && this.editorSvc.editor) {
        this.attachedEditor = this.editorSvc.editor;
        // 'selectionUpdate' covers cursor moves and range selections.
        // 'transaction' covers mark changes while selection stays the same
        // (e.g. clicking Bold while text is selected).
        this.attachedEditor.on('selectionUpdate', this.selectionHandler);
        this.attachedEditor.on('transaction',     this.selectionHandler);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    if (this.attachedEditor) {
      this.attachedEditor.off('selectionUpdate', this.selectionHandler);
      this.attachedEditor.off('transaction',     this.selectionHandler);
    }
  }

  private onSelection(): void {
    const editor = this.editorSvc.editor;
    if (!editor) { this.visible.set(false); return; }

    const { from, to } = editor.state.selection;
    if (from === to) {
      this.visible.set(false);
      this.typeMenuOpen.set(false);
      this.colorMenuOpen.set(false);
      this.textColorMenuOpen.set(false);
      this.moreMenuOpen.set(false);
      this.cdr.markForCheck();
      return;
    }

    const domSel = window.getSelection();
    if (!domSel || domSel.rangeCount === 0) { this.visible.set(false); return; }

    const rect = domSel.getRangeAt(0).getBoundingClientRect();
    this.top.set(rect.top + window.scrollY);
    this.left.set(rect.left + rect.width / 2 + window.scrollX);

    // Active marks
    this.isBold.set(editor.isActive('bold'));
    this.isItalic.set(editor.isActive('italic'));
    this.isUnderline.set(editor.isActive('underline'));
    this.isStrike.set(editor.isActive('strike'));
    this.isCode.set(editor.isActive('code'));
    this.isLink.set(editor.isActive('link'));

    // Current block type
    if (editor.isActive('heading', { level: 1 })) this.currentBlock.set('heading1');
    else if (editor.isActive('heading', { level: 2 })) this.currentBlock.set('heading2');
    else if (editor.isActive('heading', { level: 3 })) this.currentBlock.set('heading3');
    else if (editor.isActive('bulletList')) this.currentBlock.set('bulletList');
    else if (editor.isActive('orderedList')) this.currentBlock.set('orderedList');
    else if (editor.isActive('taskList')) this.currentBlock.set('taskList');
    else if (editor.isActive('blockquote')) this.currentBlock.set('blockquote');
    else if (editor.isActive('codeBlock')) this.currentBlock.set('codeBlock');
    else this.currentBlock.set('paragraph');

    this.visible.set(true);
    this.cdr.markForCheck();
  }

  currentBlockIcon(): string {
    return BLOCK_LABELS[this.currentBlock()]?.icon ?? 'T';
  }

  // ── Block type menu ──────────────────────────────────────────────────────

  toggleTypeMenu(e: MouseEvent): void {
    e.stopPropagation();
    this.colorMenuOpen.set(false);
    this.moreMenuOpen.set(false);
    const open = !this.typeMenuOpen();
    if (open) this.positionDropdown(e);
    this.typeMenuOpen.set(open);
    this.cdr.markForCheck();
  }

  toggleColorMenu(e: MouseEvent): void {
    e.stopPropagation();
    this.typeMenuOpen.set(false);
    this.moreMenuOpen.set(false);
    this.textColorMenuOpen.set(false);
    const open = !this.colorMenuOpen();
    if (open) this.positionDropdown(e);
    this.colorMenuOpen.set(open);
    this.cdr.markForCheck();
  }

  toggleTextColorMenu(e: MouseEvent): void {
    e.stopPropagation();
    this.typeMenuOpen.set(false);
    this.colorMenuOpen.set(false);
    this.moreMenuOpen.set(false);
    const open = !this.textColorMenuOpen();
    if (open) this.positionDropdown(e);
    this.textColorMenuOpen.set(open);
    this.cdr.markForCheck();
  }

  toggleMoreMenu(e: MouseEvent): void {
    e.stopPropagation();
    this.typeMenuOpen.set(false);
    this.colorMenuOpen.set(false);
    this.textColorMenuOpen.set(false);
    const open = !this.moreMenuOpen();
    if (open) this.positionDropdown(e);
    this.moreMenuOpen.set(open);
    this.cdr.markForCheck();
  }

  private positionDropdown(e: MouseEvent): void {
    const el = (e.currentTarget as HTMLElement).closest('.km-bubble') as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      this.dropdownTop.set(rect.bottom + 6 + window.scrollY);
      this.dropdownLeft.set(this.left());
    }
  }

  setBlock(type: BlockType, e: MouseEvent): void {
    e.preventDefault();
    const editor = this.editorSvc.editor;
    if (!editor) return;
    const chain = editor.chain().focus();
    switch (type) {
      case 'paragraph':   chain.setParagraph().run(); break;
      case 'heading1':    chain.setHeading({ level: 1 }).run(); break;
      case 'heading2':    chain.setHeading({ level: 2 }).run(); break;
      case 'heading3':    chain.setHeading({ level: 3 }).run(); break;
      case 'bulletList':  chain.toggleBulletList().run(); break;
      case 'orderedList': chain.toggleOrderedList().run(); break;
      case 'blockquote':  chain.toggleBlockquote().run(); break;
      case 'codeBlock':   chain.toggleCodeBlock().run(); break;
    }
    this.typeMenuOpen.set(false);
    this.cdr.markForCheck();
  }

  // ── Format commands ──────────────────────────────────────────────────────

  cmd(mark: string): void {
    const editor = this.editorSvc.editor;
    if (!editor) return;
    switch (mark) {
      case 'bold':      editor.chain().focus().toggleBold().run(); break;
      case 'italic':    editor.chain().focus().toggleItalic().run(); break;
      case 'underline': editor.chain().focus().toggleUnderline().run(); break;
      case 'strike':    editor.chain().focus().toggleStrike().run(); break;
      case 'code':      editor.chain().focus().toggleCode().run(); break;
    }
    this.cdr.markForCheck();
  }

  setLink(): void {
    const editor = this.editorSvc.editor;
    if (!editor) return;
    const prev = (editor.getAttributes('link')['href'] as string) ?? '';
    const url = window.prompt('Enter URL', prev);
    if (url === null) return;
    if (!url) { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
    this.cdr.markForCheck();
  }

  // ── Text color ────────────────────────────────────────────────────────────

  applyTextColor(color: string, e: MouseEvent): void {
    e.preventDefault();
    this.editorSvc.editor?.chain().focus().setColor(color).run();
    this.currentTextColor.set(color);
    this.textColorMenuOpen.set(false);
    this.cdr.markForCheck();
  }

  clearTextColor(e: MouseEvent): void {
    e.preventDefault();
    this.editorSvc.editor?.chain().focus().unsetColor().run();
    this.currentTextColor.set('rgba(255,255,255,0.82)');
    this.textColorMenuOpen.set(false);
    this.cdr.markForCheck();
  }

  // ── Highlight ─────────────────────────────────────────────────────────────

  applyHighlight(color: string, e: MouseEvent): void {
    e.preventDefault();
    this.editorSvc.editor?.chain().focus().setHighlight({ color }).run();
    this.currentHighlight.set(color);
    this.colorMenuOpen.set(false);
    this.cdr.markForCheck();
  }

  clearHighlight(e: MouseEvent): void {
    e.preventDefault();
    this.editorSvc.editor?.chain().focus().unsetHighlight().run();
    this.colorMenuOpen.set(false);
    this.cdr.markForCheck();
  }

  // ── Indent / Outdent ─────────────────────────────────────────────────────

  indent(): void {
    this.editorSvc.editor?.chain().focus().sinkListItem('listItem').run();
    this.cdr.markForCheck();
  }

  outdent(): void {
    this.editorSvc.editor?.chain().focus().liftListItem('listItem').run();
    this.cdr.markForCheck();
  }

  // ── K-MAPS extract ────────────────────────────────────────────────────────

  private selectedText(): string {
    const editor = this.editorSvc.editor;
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  }

  toTopic(e: MouseEvent): void { e.preventDefault(); this.moreMenuOpen.set(false); this.extractSvc.extractToWvTopic(this.selectedText()); }
  toVocab(e: MouseEvent): void { e.preventDefault(); this.moreMenuOpen.set(false); this.extractSvc.extractToVocab(this.selectedText()); }
  toTask(e: MouseEvent):  void { e.preventDefault(); this.moreMenuOpen.set(false); this.extractSvc.extractToTask(this.selectedText()); }
  toSrs(e: MouseEvent):   void { e.preventDefault(); this.moreMenuOpen.set(false); this.extractSvc.createSrsCard(this.selectedText()); }

  // ── Close dropdowns on outside click ────────────────────────────────────

  @HostListener('document:click')
  onDocClick(): void {
    if (this.typeMenuOpen() || this.colorMenuOpen() || this.textColorMenuOpen() || this.moreMenuOpen()) {
      this.typeMenuOpen.set(false);
      this.colorMenuOpen.set(false);
      this.textColorMenuOpen.set(false);
      this.moreMenuOpen.set(false);
      this.cdr.markForCheck();
    }
  }
}
