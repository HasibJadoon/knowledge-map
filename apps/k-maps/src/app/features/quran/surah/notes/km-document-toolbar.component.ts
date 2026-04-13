import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, Output,
} from '@angular/core';
import type { Editor } from '@tiptap/core';

export const HIGHLIGHT_COLORS = [
  { label: 'Yellow',  value: 'rgba(255,212,0,0.35)',   dot: '#ffd400' },
  { label: 'Green',   value: 'rgba(0,214,120,0.28)',   dot: '#00d678' },
  { label: 'Blue',    value: 'rgba(45,170,255,0.28)',  dot: '#2daaff' },
  { label: 'Pink',    value: 'rgba(255,100,180,0.28)', dot: '#ff64b4' },
  { label: 'Purple',  value: 'rgba(168,110,255,0.28)', dot: '#a86eff' },
  { label: 'Orange',  value: 'rgba(255,160,50,0.30)',  dot: '#ffa032' },
];

@Component({
  selector: 'km-document-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="km-tb">

      <!-- Undo / Redo -->
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

      <!-- Inline marks -->
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

      <!-- Highlight swatches -->
      <div class="km-tb__group km-tb__group--hl">
        @for (c of hlColors; track c.value) {
          <button class="km-tb__swatch"
            [class.km-tb__swatch--on]="isHlActive(c.value)"
            [style.background]="c.dot"
            [title]="'Highlight: ' + c.label"
            (mousedown)="$event.preventDefault(); toggleHighlight(c.value)">
          </button>
        }
        <button class="km-tb__btn km-tb__btn--xs" title="Remove highlight"
          (mousedown)="$event.preventDefault(); removeHighlight()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6l18 12M3 18L21 6"/>
          </svg>
        </button>
      </div>

      <div class="km-tb__sep"></div>

      <!-- Block type -->
      <div class="km-tb__group">
        <button class="km-tb__lbl" [class.km-tb__btn--on]="isActive('paragraph')"
          title="Paragraph" (mousedown)="$event.preventDefault(); setParagraph()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7V5h16v2M9 5v14M15 5v14M9 19h6"/>
          </svg>
        </button>
        <button class="km-tb__lbl" [class.km-tb__btn--on]="isActive('heading',{level:1})"
          title="Heading 1" (mousedown)="$event.preventDefault(); toggleH(1)">H1</button>
        <button class="km-tb__lbl" [class.km-tb__btn--on]="isActive('heading',{level:2})"
          title="Heading 2" (mousedown)="$event.preventDefault(); toggleH(2)">H2</button>
        <button class="km-tb__lbl" [class.km-tb__btn--on]="isActive('heading',{level:3})"
          title="Heading 3" (mousedown)="$event.preventDefault(); toggleH(3)">H3</button>
      </div>

      <div class="km-tb__sep"></div>

      <!-- Block types -->
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

      <!-- Link / media -->
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
      display: flex; align-items: center; gap: 1px;
      padding: 5px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      background: rgba(15,15,18,0.98);
      height: 40px; flex-shrink: 0;
      overflow-x: auto; overflow-y: hidden;
      scrollbar-width: none;
    }
    .km-tb::-webkit-scrollbar { display: none; }

    .km-tb__group { display: flex; align-items: center; gap: 1px; flex-shrink: 0; }
    .km-tb__group--hl { gap: 4px; }

    .km-tb__sep {
      width: 1px; height: 16px;
      background: rgba(255,255,255,0.1);
      margin: 0 5px; flex-shrink: 0;
    }

    .km-tb__btn {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      border: none; background: transparent;
      color: rgba(255,255,255,0.55);
      border-radius: 5px; cursor: pointer;
      transition: background 0.1s, color 0.1s;
      padding: 0; flex-shrink: 0;
    }
    .km-tb__btn svg { width: 14px; height: 14px; fill: currentColor; }
    .km-tb__btn--xs { width: 22px; height: 22px; }
    .km-tb__btn--xs svg { width: 11px; height: 11px; }
    .km-tb__btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
    .km-tb__btn--on { color: #c9a84c; background: rgba(201,168,76,0.12); }

    .km-tb__lbl {
      display: flex; align-items: center; justify-content: center;
      min-width: 28px; height: 28px; padding: 0 5px;
      border: none; background: transparent;
      color: rgba(255,255,255,0.55);
      border-radius: 5px; cursor: pointer;
      font-size: 0.72rem; font-weight: 700; letter-spacing: 0.02em;
      transition: background 0.1s, color 0.1s; flex-shrink: 0;
    }
    .km-tb__lbl svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2; }
    .km-tb__lbl:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
    .km-tb__lbl.km-tb__btn--on { color: #c9a84c; background: rgba(201,168,76,0.12); }

    .km-tb__swatch {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid transparent; cursor: pointer;
      transition: transform 0.12s, border-color 0.12s; flex-shrink: 0;
    }
    .km-tb__swatch:hover { transform: scale(1.25); }
    .km-tb__swatch--on { border-color: rgba(255,255,255,0.6); transform: scale(1.15); }
  `],
})
export class KmDocumentToolbarComponent {
  @Input() editor: Editor | null = null;
  @Output() linkClick  = new EventEmitter<void>();
  @Output() imageClick = new EventEmitter<void>();
  @Output() audioClick = new EventEmitter<void>();

  readonly hlColors = HIGHLIGHT_COLORS;

  // ── Active state helpers ──────────────────────────────────────────────────
  isActive(name: string, attrs?: Record<string, unknown>): boolean {
    return this.editor?.isActive(name, attrs) ?? false;
  }
  isHlActive(color: string): boolean {
    return this.editor?.isActive('highlight', { color }) ?? false;
  }

  // ── Commands ──────────────────────────────────────────────────────────────
  private get e(): Editor | null { return this.editor; }

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

  toggleHighlight(color: string): void {
    if (!this.e) return;
    if (this.e.isActive('highlight', { color })) {
      this.e.chain().focus().unsetHighlight().run();
    } else {
      (this.e.chain().focus() as any).setHighlight({ color }).run();
    }
  }
  removeHighlight()  { this.e?.chain().focus().unsetHighlight().run(); }
}
