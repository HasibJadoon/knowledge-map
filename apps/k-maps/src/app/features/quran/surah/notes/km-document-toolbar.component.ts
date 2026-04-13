import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, Output,
} from '@angular/core';
import type { Editor } from '@tiptap/core';

interface ToolbarAction {
  id: string;
  label: string;
  title: string;
  svg: string;
  active?: () => boolean;
  run: () => void;
}

@Component({
  selector: 'km-document-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="km-toolbar">
      <div class="km-toolbar__group">
        @for (action of textActions; track action.id) {
          <button
            class="km-toolbar__btn"
            [class.km-toolbar__btn--active]="action.active && action.active()"
            [title]="action.title"
            (mousedown)="$event.preventDefault(); action.run()"
            [innerHTML]="action.svg">
          </button>
        }
      </div>
      <div class="km-toolbar__sep"></div>
      <div class="km-toolbar__group">
        @for (action of headingActions; track action.id) {
          <button
            class="km-toolbar__btn km-toolbar__btn--label"
            [class.km-toolbar__btn--active]="action.active && action.active()"
            [title]="action.title"
            (mousedown)="$event.preventDefault(); action.run()">
            {{ action.label }}
          </button>
        }
      </div>
      <div class="km-toolbar__sep"></div>
      <div class="km-toolbar__group">
        @for (action of blockActions; track action.id) {
          <button
            class="km-toolbar__btn"
            [class.km-toolbar__btn--active]="action.active && action.active()"
            [title]="action.title"
            (mousedown)="$event.preventDefault(); action.run()"
            [innerHTML]="action.svg">
          </button>
        }
      </div>
      <div class="km-toolbar__sep"></div>
      <div class="km-toolbar__group">
        <button class="km-toolbar__btn" title="Insert link" (mousedown)="$event.preventDefault(); linkClick.emit()"
          [innerHTML]="svgLink"></button>
        <button class="km-toolbar__btn" title="Upload image" (mousedown)="$event.preventDefault(); imageClick.emit()"
          [innerHTML]="svgImage"></button>
        <button class="km-toolbar__btn" title="Upload audio" (mousedown)="$event.preventDefault(); audioClick.emit()"
          [innerHTML]="svgAudio"></button>
      </div>
    </div>
  `,
  styles: [`
    .km-toolbar {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 6px 12px;
      border-bottom: 1px solid var(--km-border);
      background: var(--km-surface);
      flex-wrap: wrap;
      min-height: 42px;
      flex-shrink: 0;
    }
    .km-toolbar__group { display: flex; align-items: center; gap: 2px; }
    .km-toolbar__sep {
      width: 1px; height: 18px;
      background: var(--km-border);
      margin: 0 6px;
    }
    .km-toolbar__btn {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px;
      border: none; background: transparent;
      color: var(--km-text-2);
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
      padding: 0;
      font-size: 0.78rem;
      font-weight: 500;
    }
    .km-toolbar__btn--label { width: auto; padding: 0 8px; }
    .km-toolbar__btn svg { width: 15px; height: 15px; fill: currentColor; }
    .km-toolbar__btn:hover { background: rgba(255,255,255,0.06); color: var(--km-text); }
    .km-toolbar__btn--active { color: var(--km-gold); background: rgba(201,168,76,0.1); }
  `],
})
export class KmDocumentToolbarComponent {
  @Input() editor: Editor | null = null;
  @Output() linkClick  = new EventEmitter<void>();
  @Output() imageClick = new EventEmitter<void>();
  @Output() audioClick = new EventEmitter<void>();

  get textActions(): ToolbarAction[] {
    const ed = this.editor;
    if (!ed) return [];
    return [
      {
        id: 'bold', label: 'B', title: 'Bold (Ctrl+B)',
        svg: `<svg viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 0 1 0 8H6V4zm0 8h9a4 4 0 0 1 0 8H6v-8z"/></svg>`,
        active: () => ed.isActive('bold'),
        run: () => ed.chain().focus().toggleBold().run(),
      },
      {
        id: 'italic', label: 'I', title: 'Italic (Ctrl+I)',
        svg: `<svg viewBox="0 0 24 24"><path d="M11.5 4h7v2h-2.5l-5 12H14v2H7v-2h2.5l5-12H12V4z"/></svg>`,
        active: () => ed.isActive('italic'),
        run: () => ed.chain().focus().toggleItalic().run(),
      },
      {
        id: 'underline', label: 'U', title: 'Underline (Ctrl+U)',
        svg: `<svg viewBox="0 0 24 24"><path d="M6 3h2v9a4 4 0 0 0 8 0V3h2v9a6 6 0 0 1-12 0V3zm-2 17h16v2H4v-2z"/></svg>`,
        active: () => ed.isActive('underline'),
        run: () => ed.chain().focus().toggleUnderline().run(),
      },
      {
        id: 'strike', label: 'S', title: 'Strikethrough',
        svg: `<svg viewBox="0 0 24 24"><path d="M17.15 11A6 6 0 0 0 7 8h2.2a3.8 3.8 0 0 1 7.11 2H17zM3 12h18v1H3zm4.85 1A6 6 0 0 0 17 16h-2.2a3.8 3.8 0 0 1-7.11-2H7z"/></svg>`,
        active: () => ed.isActive('strike'),
        run: () => ed.chain().focus().toggleStrike().run(),
      },
      {
        id: 'code', label: '<>', title: 'Inline code',
        svg: `<svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6z"/></svg>`,
        active: () => ed.isActive('code'),
        run: () => ed.chain().focus().toggleCode().run(),
      },
    ];
  }

  get headingActions(): ToolbarAction[] {
    const ed = this.editor;
    if (!ed) return [];
    return [
      {
        id: 'h1', label: 'H1', title: 'Heading 1', svg: '',
        active: () => ed.isActive('heading', { level: 1 }),
        run: () => ed.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: 'h2', label: 'H2', title: 'Heading 2', svg: '',
        active: () => ed.isActive('heading', { level: 2 }),
        run: () => ed.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: 'h3', label: 'H3', title: 'Heading 3', svg: '',
        active: () => ed.isActive('heading', { level: 3 }),
        run: () => ed.chain().focus().toggleHeading({ level: 3 }).run(),
      },
    ];
  }

  get blockActions(): ToolbarAction[] {
    const ed = this.editor;
    if (!ed) return [];
    return [
      {
        id: 'ul', label: '', title: 'Bullet list',
        svg: `<svg viewBox="0 0 24 24"><circle cx="4" cy="6" r="1.5"/><path d="M8 5h13v2H8zm0 6h13v2H8zm0 6h13v2H8z"/><circle cx="4" cy="12" r="1.5"/><circle cx="4" cy="18" r="1.5"/></svg>`,
        active: () => ed.isActive('bulletList'),
        run: () => ed.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'ol', label: '', title: 'Ordered list',
        svg: `<svg viewBox="0 0 24 24"><path d="M2 7h2V3H3L1 4v1h1zm-1 8h3v-1H3v-.5h1.5v-1H3V12H4v-1H2v4zm0 5h3v-1H3.5l1.5-1.5V16H2v1h1.5L2 18.5V20zm5-15h13v2H6zm0 6h13v2H6zm0 6h13v2H6z"/></svg>`,
        active: () => ed.isActive('orderedList'),
        run: () => ed.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'blockquote', label: '', title: 'Quote',
        svg: `<svg viewBox="0 0 24 24"><path d="M4.58 21C3.9 21 3 20.5 3 19.5V14c0-3.8 1.5-6.5 4-8l1 1.5C6.3 8.8 5 10.7 5 14h3v7H4.58zM15.58 21c-.68 0-1.58-.5-1.58-1.5V14c0-3.8 1.5-6.5 4-8l1 1.5c-1.7 1.3-3 3.2-3 6.5h3v7h-3.42z"/></svg>`,
        active: () => ed.isActive('blockquote'),
        run: () => ed.chain().focus().toggleBlockquote().run(),
      },
      {
        id: 'codeblock', label: '', title: 'Code block',
        svg: `<svg viewBox="0 0 24 24"><path d="M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm1 2v14h16V5H4zm4 3l-3 4 3 4 1.4-1.4L7.83 12l1.57-2.6L8 8zm8 0l-1.4 1.4L16.17 12l-1.57 2.6L16 16l3-4-3-4z"/></svg>`,
        active: () => ed.isActive('codeBlock'),
        run: () => ed.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: 'hr', label: '', title: 'Divider',
        svg: `<svg viewBox="0 0 24 24"><path d="M3 11h18v2H3z"/></svg>`,
        active: () => false,
        run: () => ed.chain().focus().setHorizontalRule().run(),
      },
    ];
  }

  svgLink = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
  svgImage = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  svgAudio = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
}
