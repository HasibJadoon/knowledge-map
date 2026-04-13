import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener,
  inject, Input, OnDestroy, OnInit, signal,
} from '@angular/core';
import type { Editor } from '@tiptap/core';
import { HIGHLIGHT_COLORS, TEXT_COLORS } from './km-document-style-palette';

@Component({
  selector: 'km-bubble-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="km-bubble"
        [style.top.px]="top()"
        [style.left.px]="left()"
        (mousedown)="onBubbleMouseDown($event)">

        <button class="km-bubble__btn km-bubble__btn--label" [class.km-bubble__btn--active]="isActive('bold')"
          title="Bold" (click)="toggleBold()">B</button>
        <button class="km-bubble__btn km-bubble__btn--label km-bubble__btn--italic"
          [class.km-bubble__btn--active]="isActive('italic')"
          title="Italic" (click)="toggleItalic()">I</button>
        <button class="km-bubble__btn km-bubble__btn--label km-bubble__btn--underline"
          [class.km-bubble__btn--active]="isActive('underline')"
          title="Underline" (click)="toggleUnderline()">U</button>
        <button class="km-bubble__btn km-bubble__btn--label km-bubble__btn--strike"
          [class.km-bubble__btn--active]="isActive('strike')"
          title="Strikethrough" (click)="toggleStrike()">S</button>

        <span class="km-bubble__sep"></span>

        <button class="km-bubble__btn km-bubble__btn--label" [class.km-bubble__btn--active]="isActive('code')"
          title="Inline code" (click)="toggleCode()">&lt;/&gt;</button>
        <button class="km-bubble__btn" [class.km-bubble__btn--active]="isActive('link')"
          title="Link" (click)="toggleLink()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>

        <span class="km-bubble__sep"></span>

        <button class="km-bubble__btn km-bubble__btn--label" [class.km-bubble__btn--active]="isActive('heading', { level: 1 })"
          title="Heading 1" (click)="toggleHeading(1)">H1</button>
        <button class="km-bubble__btn km-bubble__btn--label" [class.km-bubble__btn--active]="isActive('heading', { level: 2 })"
          title="Heading 2" (click)="toggleHeading(2)">H2</button>
        <button class="km-bubble__btn" [class.km-bubble__btn--active]="isActive('blockquote')"
          title="Blockquote" (click)="toggleBlockquote()">
          <svg viewBox="0 0 24 24"><path d="M4.58 21C3.9 21 3 20.5 3 19.5V14c0-3.8 1.5-6.5 4-8l1 1.5C6.3 8.8 5 10.7 5 14h3v7H4.58zM15.58 21c-.68 0-1.58-.5-1.58-1.5V14c0-3.8 1.5-6.5 4-8l1 1.5c-1.7 1.3-3 3.2-3 6.5h3v7h-3.42z"/></svg>
        </button>

        <span class="km-bubble__sep"></span>

        <div class="km-bubble__menu-wrap">
          <button class="km-bubble__btn km-bubble__btn--color"
            [class.km-bubble__btn--active]="hasTextColor() || textColorMenuOpen()"
            title="Text color"
            (click)="toggleTextColorMenu($event)">
            <span class="km-bubble__color-glyph">A</span>
            <span class="km-bubble__color-line" [style.background]="currentTextColorDot()"></span>
          </button>
          @if (textColorMenuOpen()) {
            <div class="km-bubble__menu" (mousedown)="$event.stopPropagation()">
              <div class="km-bubble__menu-label">Text color</div>
              <div class="km-bubble__swatches">
                @for (c of textColors; track c.value) {
                  <button class="km-bubble__swatch"
                    [class.km-bubble__swatch--on]="isTextColorActive(c.value)"
                    [style.background]="c.dot"
                    [title]="c.label"
                    (click)="setTextColor(c.value)">
                  </button>
                }
              </div>
              <button class="km-bubble__menu-clear" (click)="clearTextColor()">Default text</button>
            </div>
          }
        </div>

        <div class="km-bubble__menu-wrap">
          <button class="km-bubble__btn km-bubble__btn--color"
            [class.km-bubble__btn--active]="hasHighlight() || highlightMenuOpen()"
            title="Background color"
            (click)="toggleHighlightMenu($event)">
            <svg viewBox="0 0 24 24"><path d="M4 16l5-5m0 0l6-6 4 4-6 6m-4-4l4 4m-8 1h10v3H5z"/></svg>
            <span class="km-bubble__color-chip" [style.background]="currentHighlightDot()"></span>
          </button>
          @if (highlightMenuOpen()) {
            <div class="km-bubble__menu" (mousedown)="$event.stopPropagation()">
              <div class="km-bubble__menu-label">Background</div>
              <div class="km-bubble__swatches">
                @for (c of highlightColors; track c.value) {
                  <button class="km-bubble__swatch"
                    [class.km-bubble__swatch--on]="isHighlightActive(c.value)"
                    [style.background]="c.dot"
                    [title]="c.label"
                    (click)="setHighlight(c.value)">
                  </button>
                }
              </div>
              <button class="km-bubble__menu-clear" (click)="clearHighlight()">Clear background</button>
            </div>
          }
        </div>

        <span class="km-bubble__sep"></span>

        <button class="km-bubble__btn km-bubble__btn--label" [class.km-bubble__btn--active]="isCurrentBlockRtl()"
          title="RTL (Arabic)" (click)="toggleRtl()">RTL</button>
      </div>
    }
  `,
  styles: [`
    .km-bubble {
      position: fixed;
      z-index: 9990;
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      background: rgba(28, 28, 32, 0.98);
      box-shadow: 0 18px 50px rgba(0,0,0,0.46);
      transform: translateX(-50%);
      pointer-events: all;
    }
    .km-bubble__sep {
      width: 1px;
      height: 18px;
      background: rgba(255,255,255,0.12);
      margin: 0 4px;
    }
    .km-bubble__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 34px;
      height: 34px;
      border: 1px solid transparent;
      border-radius: 10px;
      background: transparent;
      color: rgba(255,255,255,0.72);
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
      padding: 0;
      flex-shrink: 0;
    }
    .km-bubble__btn svg {
      width: 15px;
      height: 15px;
      fill: currentColor;
    }
    .km-bubble__btn:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    .km-bubble__btn--active {
      background: rgba(201,168,76,0.14);
      border-color: rgba(201,168,76,0.18);
      color: #d8bc6e;
    }
    .km-bubble__btn--label {
      width: auto;
      min-width: 34px;
      padding: 0 10px;
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1;
    }
    .km-bubble__btn--italic { font-style: italic; }
    .km-bubble__btn--underline { text-decoration: underline; text-underline-offset: 2px; }
    .km-bubble__btn--strike { text-decoration: line-through; }
    .km-bubble__menu-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .km-bubble__btn--color {
      width: auto;
      min-width: 40px;
      padding: 0 10px;
    }
    .km-bubble__color-glyph {
      font-size: 0.86rem;
      font-weight: 700;
      line-height: 1;
    }
    .km-bubble__color-line {
      width: 12px;
      height: 3px;
      border-radius: 999px;
      background: rgba(236,228,216,0.88);
    }
    .km-bubble__color-chip {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.14);
      background: transparent;
    }
    .km-bubble__menu {
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      min-width: 170px;
      padding: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      background: rgba(24, 24, 28, 0.98);
      box-shadow: 0 18px 40px rgba(0,0,0,0.45);
    }
    .km-bubble__menu-label {
      margin-bottom: 8px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.36);
    }
    .km-bubble__swatches {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .km-bubble__swatch {
      width: 24px;
      height: 24px;
      border: 2px solid transparent;
      border-radius: 999px;
      cursor: pointer;
      transition: transform 0.12s, border-color 0.12s;
    }
    .km-bubble__swatch:hover { transform: scale(1.08); }
    .km-bubble__swatch--on { border-color: rgba(255,255,255,0.72); }
    .km-bubble__menu-clear {
      margin-top: 10px;
      width: 100%;
      height: 32px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.72);
      font-size: 0.76rem;
      cursor: pointer;
    }
    .km-bubble__menu-clear:hover {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.92);
    }
  `],
})
export class KmBubbleMenuComponent implements OnInit, OnDestroy {
  @Input({ required: true }) editor!: Editor;

  private cdr = inject(ChangeDetectorRef);
  private savedSelection: { from: number; to: number } | null = null;

  readonly textColors = TEXT_COLORS;
  readonly highlightColors = HIGHLIGHT_COLORS;

  readonly visible = signal(false);
  readonly top = signal(0);
  readonly left = signal(0);
  readonly textColorMenuOpen = signal(false);
  readonly highlightMenuOpen = signal(false);

  private onUpdate = this.update.bind(this);
  private onBlur = () => {
    this.visible.set(false);
    this.textColorMenuOpen.set(false);
    this.highlightMenuOpen.set(false);
    this.cdr.markForCheck();
  };

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.km-bubble')) {
      this.textColorMenuOpen.set(false);
      this.highlightMenuOpen.set(false);
    }
  }

  ngOnInit(): void {
    this.editor.on('selectionUpdate', this.onUpdate);
    this.editor.on('transaction', this.onUpdate);
    this.editor.on('blur', this.onBlur);
  }

  ngOnDestroy(): void {
    this.editor.off('selectionUpdate', this.onUpdate);
    this.editor.off('transaction', this.onUpdate);
    this.editor.off('blur', this.onBlur);
  }

  onBubbleMouseDown(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  isActive(name: string, attrs?: Record<string, unknown>): boolean {
    return this.editor?.isActive(name, attrs) ?? false;
  }

  isTextColorActive(color: string): boolean {
    return this.currentTextColor() === color;
  }

  isHighlightActive(color: string): boolean {
    return this.editor?.isActive('highlight', { color }) ?? false;
  }

  hasTextColor(): boolean {
    return !!this.currentTextColor();
  }

  hasHighlight(): boolean {
    return !!this.currentHighlight();
  }

  currentTextColorDot(): string {
    return this.currentTextColor() || 'rgba(236,228,216,0.88)';
  }

  currentHighlightDot(): string {
    return this.currentHighlight() || 'rgba(255,255,255,0.16)';
  }

  private currentTextColor(): string {
    const color = this.editor?.getAttributes('textStyle')['color'];
    return typeof color === 'string' ? color : '';
  }

  private currentHighlight(): string {
    const color = this.editor?.getAttributes('highlight')['color'];
    return typeof color === 'string' ? color : '';
  }

  private closeMenus(): void {
    this.textColorMenuOpen.set(false);
    this.highlightMenuOpen.set(false);
  }

  private selectionRange(): { from: number; to: number } | null {
    const current = this.editor.state.selection;
    if (!current.empty) {
      return { from: current.from, to: current.to };
    }

    const remembered = (this.editor as any).__kmLastSelection as { from: number; to: number } | undefined;
    if (remembered && remembered.from < remembered.to) {
      return remembered;
    }

    return this.savedSelection;
  }

  private runOnSelection(run: (editor: Editor) => boolean): boolean {
    const range = this.selectionRange();
    if (range) {
      this.editor.commands.setTextSelection(range);
      (this.editor as any).__kmLastSelection = range;
    }

    return run(this.editor);
  }

  private collapseSelectionAfterApply(): void {
    const range = this.selectionRange();
    const position = range?.to;
    if (typeof position === 'number') {
      this.editor.commands.setTextSelection(position);
    }
    this.editor.commands.focus(position ?? undefined);
  }

  private chainWithSavedSelection(): any {
    let chain = this.editor.chain() as any;
    const range = this.selectionRange();
    if (range) {
      chain = chain.setTextSelection(range);
    }
    return chain;
  }

  toggleBold(): void { this.chainWithSavedSelection().toggleBold().run(); }
  toggleItalic(): void { this.chainWithSavedSelection().toggleItalic().run(); }
  toggleUnderline(): void { this.chainWithSavedSelection().toggleUnderline().run(); }
  toggleStrike(): void { this.chainWithSavedSelection().toggleStrike().run(); }
  toggleCode(): void { this.chainWithSavedSelection().toggleCode().run(); }
  toggleHeading(level: 1 | 2): void { this.chainWithSavedSelection().toggleHeading({ level }).run(); }
  toggleBlockquote(): void { this.chainWithSavedSelection().toggleBlockquote().run(); }

  toggleLink(): void {
    const existing = this.editor.getAttributes('link')['href'] as string ?? '';
    const url = prompt('Enter URL:', existing);
    if (url === null) return;
    if (!url) {
      this.chainWithSavedSelection().extendMarkRange('link').unsetLink().run();
      return;
    }
    this.chainWithSavedSelection().extendMarkRange('link')
      .setLink({ href: url.startsWith('http') ? url : `https://${url}` }).run();
  }

  toggleTextColorMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.highlightMenuOpen.set(false);
    this.textColorMenuOpen.update((open) => !open);
  }

  toggleHighlightMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.textColorMenuOpen.set(false);
    this.highlightMenuOpen.update((open) => !open);
  }

  setTextColor(color: string): void {
    this.runOnSelection((editor) => (editor.commands as any).setColor(color));
    this.collapseSelectionAfterApply();
    this.closeMenus();
  }

  clearTextColor(): void {
    this.runOnSelection((editor) => (editor.commands as any).unsetColor());
    this.collapseSelectionAfterApply();
    this.closeMenus();
  }

  setHighlight(color: string): void {
    this.runOnSelection((editor) => editor.isActive('highlight', { color })
      ? editor.commands.unsetHighlight()
      : (editor.commands as any).setHighlight({ color }));
    this.collapseSelectionAfterApply();
    this.closeMenus();
  }

  clearHighlight(): void {
    this.runOnSelection((editor) => editor.commands.unsetHighlight());
    this.collapseSelectionAfterApply();
    this.closeMenus();
  }

  isCurrentBlockRtl(): boolean {
    const { $from } = this.editor.state.selection;
    const node = $from.node($from.depth) ?? $from.node();
    return node?.attrs?.['dir'] === 'rtl';
  }

  toggleRtl(): void {
    const { $from } = this.editor.state.selection;
    const node = $from.node($from.depth) ?? $from.node();
    const isRtl = node?.attrs?.['dir'] === 'rtl';
    this.editor.chain().focus().updateAttributes($from.node($from.depth)?.type.name ?? 'paragraph', {
      dir: isRtl ? null : 'rtl',
      textAlign: isRtl ? null : 'right',
    }).run();
  }

  private update(): void {
    const { state, view } = this.editor;
    const { from, to, empty } = state.selection;

    if (empty || !view.hasFocus()) {
      this.visible.set(false);
      this.textColorMenuOpen.set(false);
      this.highlightMenuOpen.set(false);
      this.cdr.markForCheck();
      return;
    }

    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);
    const centerX = (start.left + end.right) / 2;
    const topY = Math.min(start.top, end.top) - 56;

    this.savedSelection = { from, to };
    this.top.set(Math.max(topY, 8));
    this.left.set(centerX);
    this.visible.set(true);
    this.cdr.markForCheck();
  }
}
