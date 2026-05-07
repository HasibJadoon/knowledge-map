import {
  ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output, signal,
} from '@angular/core';
import type { Editor } from '@tiptap/core';
import { HIGHLIGHT_COLORS, TEXT_COLORS } from './km-document-style-palette';

@Component({
  selector: 'km-document-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="km-tb" (mousedown)="$event.stopPropagation()">

      <div class="km-tb__group">
        <button class="km-tb__btn" title="Undo (⌘Z)" (mousedown)="$event.preventDefault(); undo()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
          </svg>
        </button>
        <button class="km-tb__btn" title="Redo (⌘⇧Z)" (mousedown)="$event.preventDefault(); redo()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
          </svg>
        </button>
      </div>

      <div class="km-tb__sep"></div>

      <div class="km-tb__group">
        <button class="km-tb__btn" [class.km-tb__btn--on]="isActive('bold')"
          title="Bold (⌘B)" (mousedown)="$event.preventDefault(); toggleBold()">
          <svg viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 0 1 0 8H6V4zm0 8h9a4 4 0 0 1 0 8H6v-8z"/></svg>
        </button>
        <button class="km-tb__btn" [class.km-tb__btn--on]="isActive('italic')"
          title="Italic (⌘I)" (mousedown)="$event.preventDefault(); toggleItalic()">
          <svg viewBox="0 0 24 24"><path d="M11.5 4h7v2h-2.5l-5 12H14v2H7v-2h2.5l5-12H12V4z"/></svg>
        </button>
        <button class="km-tb__btn" [class.km-tb__btn--on]="isActive('underline')"
          title="Underline (⌘U)" (mousedown)="$event.preventDefault(); toggleUnderline()">
          <svg viewBox="0 0 24 24"><path d="M6 3h2v9a4 4 0 0 0 8 0V3h2v9a6 6 0 0 1-12 0V3zm-2 17h16v2H4v-2z"/></svg>
        </button>
        <button class="km-tb__btn" [class.km-tb__btn--on]="isActive('strike')"
          title="Strikethrough" (mousedown)="$event.preventDefault(); toggleStrike()">
          <svg viewBox="0 0 24 24"><path d="M17.15 11A6 6 0 0 0 7 8h2.2a3.8 3.8 0 0 1 7.11 2H17zM3 12h18v1H3zm4.85 1A6 6 0 0 0 17 16h-2.2a3.8 3.8 0 0 1-7.11-2H7z"/></svg>
        </button>
        <button class="km-tb__btn" [class.km-tb__btn--on]="isActive('code')"
          title="Inline code" (mousedown)="$event.preventDefault(); toggleCode()">
          <svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6z"/></svg>
        </button>
      </div>

      <div class="km-tb__sep"></div>

      <div class="km-tb__group">
        <button class="km-tb__lbl" [class.km-tb__btn--on]="isActive('paragraph')"
          title="Paragraph" (mousedown)="$event.preventDefault(); setParagraph()">Text</button>
        <button class="km-tb__lbl" [class.km-tb__btn--on]="isActive('heading',{level:1})"
          title="Heading 1" (mousedown)="$event.preventDefault(); toggleH(1)">H1</button>
        <button class="km-tb__lbl" [class.km-tb__btn--on]="isActive('heading',{level:2})"
          title="Heading 2" (mousedown)="$event.preventDefault(); toggleH(2)">H2</button>
        <button class="km-tb__lbl" [class.km-tb__btn--on]="isActive('heading',{level:3})"
          title="Heading 3" (mousedown)="$event.preventDefault(); toggleH(3)">H3</button>
      </div>

      <div class="km-tb__sep"></div>

      <div class="km-tb__group">
        <div class="km-tb__menu-wrap">
          <button class="km-tb__combo"
            [class.km-tb__combo--on]="hasTextColor() || textColorMenuOpen()"
            title="Text color"
            (mousedown)="toggleTextColorMenu($event)">
            <span class="km-tb__combo-glyph">A</span>
            <span class="km-tb__combo-line" [style.background]="currentTextColorDot()"></span>
          </button>
          @if (textColorMenuOpen()) {
            <div class="km-tb__menu" (mousedown)="$event.stopPropagation()">
              <div class="km-tb__menu-label">Text color</div>
              <div class="km-tb__swatches">
                @for (c of textColors; track c.value) {
                  <button class="km-tb__swatch"
                    [class.km-tb__swatch--on]="isTextColorActive(c.value)"
                    [style.background]="c.dot"
                    [title]="c.label"
                    (mousedown)="setTextColor($event, c.value)">
                  </button>
                }
              </div>
              <button class="km-tb__menu-clear" (mousedown)="clearTextColor($event)">Default text</button>
            </div>
          }
        </div>

        <div class="km-tb__menu-wrap">
          <button class="km-tb__combo"
            [class.km-tb__combo--on]="hasHighlight() || highlightMenuOpen()"
            title="Background color"
            (mousedown)="toggleHighlightMenu($event)">
            <svg viewBox="0 0 24 24"><path d="M4 16l5-5m0 0l6-6 4 4-6 6m-4-4l4 4m-8 1h10v3H5z"/></svg>
            <span class="km-tb__combo-chip" [style.background]="currentHighlightDot()"></span>
          </button>
          @if (highlightMenuOpen()) {
            <div class="km-tb__menu" (mousedown)="$event.stopPropagation()">
              <div class="km-tb__menu-label">Background</div>
              <div class="km-tb__swatches">
                @for (c of highlightColors; track c.value) {
                  <button class="km-tb__swatch"
                    [class.km-tb__swatch--on]="isHighlightActive(c.value)"
                    [style.background]="c.dot"
                    [title]="c.label"
                    (mousedown)="setHighlight($event, c.value)">
                  </button>
                }
              </div>
              <button class="km-tb__menu-clear" (mousedown)="clearHighlight($event)">Clear background</button>
            </div>
          }
        </div>
      </div>

      <div class="km-tb__sep"></div>

      <div class="km-tb__group">
        <button class="km-tb__btn" [class.km-tb__btn--on]="isActive('bulletList')"
          title="Bullet list" (mousedown)="$event.preventDefault(); toggleBulletList()">
          <svg viewBox="0 0 24 24"><circle cx="4" cy="6" r="1.5"/><path d="M8 5h13v2H8zm0 6h13v2H8zm0 6h13v2H8z"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>
        </button>
        <button class="km-tb__btn" [class.km-tb__btn--on]="isActive('orderedList')"
          title="Numbered list" (mousedown)="$event.preventDefault(); toggleOrderedList()">
          <svg viewBox="0 0 24 24"><path d="M2 7h2V3H3L1 4v1h1zm-1 8h3v-1H3v-.5h1.5v-1H3V12H4v-1H2v4zm0 5h3v-1H3.5l1.5-1.5V16H2v1h1.5L2 18.5V20zm5-15h13v2H6zm0 6h13v2H6zm0 6h13v2H6z"/></svg>
        </button>
        <button class="km-tb__btn" [class.km-tb__btn--on]="isActive('blockquote')"
          title="Blockquote" (mousedown)="$event.preventDefault(); toggleBlockquote()">
          <svg viewBox="0 0 24 24"><path d="M4.58 21C3.9 21 3 20.5 3 19.5V14c0-3.8 1.5-6.5 4-8l1 1.5C6.3 8.8 5 10.7 5 14h3v7H4.58zM15.58 21c-.68 0-1.58-.5-1.58-1.5V14c0-3.8 1.5-6.5 4-8l1 1.5c-1.7 1.3-3 3.2-3 6.5h3v7h-3.42z"/></svg>
        </button>
        <button class="km-tb__btn" [class.km-tb__btn--on]="isActive('codeBlock')"
          title="Code block" (mousedown)="$event.preventDefault(); toggleCodeBlock()">
          <svg viewBox="0 0 24 24"><path d="M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm4 8l-3 4 3 4 1.4-1.4L6.83 15l1.57-2.6L8 11zm8 0l-1.4 1.4L17.17 15l-1.57 2.6L17 19l3-4-3-4z"/></svg>
        </button>
        <button class="km-tb__btn" title="Divider"
          (mousedown)="$event.preventDefault(); setHr()">
          <svg viewBox="0 0 24 24"><path d="M3 11h18v2H3z"/></svg>
        </button>
      </div>

      <div class="km-tb__sep"></div>

      <div class="km-tb__group">
        <button class="km-tb__btn" [class.km-tb__btn--on]="isActive('link')"
          title="Link" (mousedown)="$event.preventDefault(); linkClick.emit()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>
        <button class="km-tb__btn" title="Image" (mousedown)="$event.preventDefault(); imageClick.emit()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <button class="km-tb__btn" title="Audio" (mousedown)="$event.preventDefault(); audioClick.emit()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .km-tb {
      position: sticky;
      top: 0;
      z-index: 30;
      display: flex;
      align-items: center;
      gap: 1px;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      background: rgba(13, 13, 15, 0.96);
      backdrop-filter: blur(12px);
      min-height: 48px;
      overflow-x: auto;
      overflow-y: visible;
      scrollbar-width: none;
    }
    .km-tb::-webkit-scrollbar { display: none; }

    .km-tb__group { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .km-tb__sep {
      width: 1px;
      height: 18px;
      background: rgba(255,255,255,0.1);
      margin: 0 6px;
      flex-shrink: 0;
    }

    .km-tb__btn,
    .km-tb__lbl,
    .km-tb__combo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 32px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: rgba(255,255,255,0.64);
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
      flex-shrink: 0;
    }
    .km-tb__btn {
      width: 32px;
      padding: 0;
    }
    .km-tb__btn svg { width: 15px; height: 15px; fill: currentColor; }
    .km-tb__btn:hover,
    .km-tb__lbl:hover,
    .km-tb__combo:hover {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.96);
    }
    .km-tb__btn--on,
    .km-tb__combo--on,
    .km-tb__lbl.km-tb__btn--on {
      background: rgba(201,168,76,0.14);
      border-color: rgba(201,168,76,0.18);
      color: #d8bc6e;
    }

    .km-tb__lbl {
      min-width: 38px;
      padding: 0 10px;
      font-size: 0.74rem;
      font-weight: 700;
      letter-spacing: 0.03em;
    }

    .km-tb__menu-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .km-tb__combo {
      gap: 8px;
      min-width: 44px;
      padding: 0 10px;
    }
    .km-tb__combo svg {
      width: 15px;
      height: 15px;
      fill: currentColor;
    }
    .km-tb__combo-glyph {
      font-size: 0.88rem;
      font-weight: 700;
      line-height: 1;
    }
    .km-tb__combo-line {
      width: 12px;
      height: 3px;
      border-radius: 999px;
      background: rgba(236,228,216,0.88);
    }
    .km-tb__combo-chip {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.14);
      background: transparent;
    }

    .km-tb__menu {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      min-width: 170px;
      padding: 10px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      background: rgba(24, 24, 28, 0.98);
      box-shadow: 0 18px 40px rgba(0,0,0,0.45);
    }
    .km-tb__menu-label {
      margin-bottom: 8px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.36);
    }
    .km-tb__swatches {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .km-tb__swatch {
      width: 24px;
      height: 24px;
      border: 2px solid transparent;
      border-radius: 999px;
      cursor: pointer;
      transition: transform 0.12s, border-color 0.12s;
    }
    .km-tb__swatch:hover { transform: scale(1.08); }
    .km-tb__swatch--on { border-color: rgba(255,255,255,0.72); }
    .km-tb__menu-clear {
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
    .km-tb__menu-clear:hover {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.92);
    }
  `],
})
export class KmDocumentToolbarComponent {
  @Input() editor: Editor | null = null;
  @Output() linkClick = new EventEmitter<void>();
  @Output() imageClick = new EventEmitter<void>();
  @Output() audioClick = new EventEmitter<void>();

  readonly textColors = TEXT_COLORS;
  readonly highlightColors = HIGHLIGHT_COLORS;

  readonly textColorMenuOpen = signal(false);
  readonly highlightMenuOpen = signal(false);
  private savedSelection: { from: number; to: number } | null = null;

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.km-tb__menu-wrap')) {
      this.closeMenus();
    }
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

  private get e(): Editor | null { return this.editor; }

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

  private rememberSelection(): void {
    const selection = this.e?.state.selection;
    if (selection && !selection.empty) {
      this.savedSelection = { from: selection.from, to: selection.to };
    }
  }

  private selectionRange(): { from: number; to: number } | null {
    const current = this.e?.state.selection;
    if (current && !current.empty) {
      return { from: current.from, to: current.to };
    }

    const remembered = (this.e as any)?.__kmLastSelection as { from: number; to: number } | undefined;
    if (remembered && remembered.from < remembered.to) {
      return remembered;
    }

    return this.savedSelection;
  }

  private runOnSelection(run: (editor: Editor) => boolean): boolean {
    if (!this.e) return false;

    const range = this.selectionRange();
    if (range) {
      this.e.commands.setTextSelection(range);
      (this.e as any).__kmLastSelection = range;
    }

    return run(this.e);
  }

  private collapseSelectionAfterApply(): void {
    if (!this.e) return;

    const range = this.selectionRange();
    const position = range?.to;
    if (typeof position === 'number') {
      this.e.commands.setTextSelection(position);
    }
    this.e.commands.focus(position ?? undefined);
  }

  toggleTextColorMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.rememberSelection();
    this.highlightMenuOpen.set(false);
    this.textColorMenuOpen.update((open) => !open);
  }

  toggleHighlightMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.rememberSelection();
    this.textColorMenuOpen.set(false);
    this.highlightMenuOpen.update((open) => !open);
  }

  setTextColor(event: MouseEvent, color: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.runOnSelection((editor) => (editor.commands as any).setColor(color));
    this.collapseSelectionAfterApply();
    this.closeMenus();
  }

  clearTextColor(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.runOnSelection((editor) => (editor.commands as any).unsetColor());
    this.collapseSelectionAfterApply();
    this.closeMenus();
  }

  setHighlight(event: MouseEvent, color: string): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.e) return;
    this.runOnSelection((editor) => editor.isActive('highlight', { color })
      ? editor.commands.unsetHighlight()
      : (editor.commands as any).setHighlight({ color }));
    this.collapseSelectionAfterApply();
    this.closeMenus();
  }

  clearHighlight(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.runOnSelection((editor) => editor.commands.unsetHighlight());
    this.collapseSelectionAfterApply();
    this.closeMenus();
  }

  undo()             { this.e?.chain().focus().undo().run(); }
  redo()             { this.e?.chain().focus().redo().run(); }
  toggleBold()       { this.e?.chain().focus().toggleBold().run(); }
  toggleItalic()     { this.e?.chain().focus().toggleItalic().run(); }
  toggleUnderline()  { this.e?.chain().focus().toggleUnderline().run(); }
  toggleStrike()     { this.e?.chain().focus().toggleStrike().run(); }
  toggleCode()       { this.e?.chain().focus().toggleCode().run(); }
  setParagraph()     { this.e?.chain().focus().setParagraph().run(); }
  toggleH(level: 1 | 2 | 3) { this.e?.chain().focus().toggleHeading({ level }).run(); }
  toggleBulletList() { this.e?.chain().focus().toggleBulletList().run(); }
  toggleOrderedList(){ this.e?.chain().focus().toggleOrderedList().run(); }
  toggleBlockquote() { this.e?.chain().focus().toggleBlockquote().run(); }
  toggleCodeBlock()  { this.e?.chain().focus().toggleCodeBlock().run(); }
  setHr()            { this.e?.chain().focus().setHorizontalRule().run(); }
}
