import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component,
  inject, Input, OnDestroy, OnInit, signal,
} from '@angular/core';
import type { Editor } from '@tiptap/core';

export interface BubbleAction {
  id: string;
  sep: boolean;
  title: string;
  svg: string;
  active: () => boolean;
  run: () => void;
}

function sep(): BubbleAction {
  return { id: 'sep-' + Math.random(), sep: true, title: '', svg: '', active: () => false, run: () => {} };
}

@Component({
  selector: 'km-bubble-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="km-bubble"
        [style.top.px]="top()"
        [style.left.px]="left()"
        (mousedown)="$event.preventDefault()">
        @for (action of actions; track action.id) {
          @if (action.sep) {
            <span class="km-bubble__sep"></span>
          } @else {
            <button
              class="km-bubble__btn"
              [class.km-bubble__btn--active]="action.active()"
              [title]="action.title"
              (click)="action.run()"
              [innerHTML]="action.svg">
            </button>
          }
        }
      </div>
    }
  `,
  styles: [`
    .km-bubble {
      position: fixed; z-index: 9990;
      display: flex; align-items: center; gap: 2px;
      background: #1c1c20;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 5px 6px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4);
      animation: bubbleIn 0.1s ease;
      transform: translateX(-50%);
      pointer-events: all;
    }
    @keyframes bubbleIn {
      from { opacity: 0; transform: translateX(-50%) translateY(4px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    .km-bubble__sep {
      width: 1px; height: 16px;
      background: rgba(255,255,255,0.12);
      margin: 0 3px;
    }
    .km-bubble__btn {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px;
      border: none; background: transparent;
      color: rgba(255,255,255,0.7);
      border-radius: 5px; cursor: pointer;
      transition: background 0.12s, color 0.12s;
      padding: 0;
    }
    .km-bubble__btn svg { width: 14px; height: 14px; fill: currentColor; }
    .km-bubble__btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .km-bubble__btn--active { color: #c9a84c; background: rgba(201,168,76,0.15); }
    .km-bubble__label {
      font-size: 0.7rem; font-weight: 800;
      letter-spacing: -0.02em; line-height: 1;
    }
  `],
})
export class KmBubbleMenuComponent implements OnInit, OnDestroy {
  @Input({ required: true }) editor!: Editor;

  private cdr = inject(ChangeDetectorRef);

  visible = signal(false);
  top     = signal(0);
  left    = signal(0);

  private onUpdate = this.update.bind(this);
  private onBlur   = () => { this.visible.set(false); this.cdr.markForCheck(); };

  get actions(): BubbleAction[] {
    const ed = this.editor;
    return [
      {
        id: 'bold', sep: false, title: 'Bold',
        svg: `<svg viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 0 1 0 8H6V4zm0 8h9a4 4 0 0 1 0 8H6v-8z"/></svg>`,
        active: () => ed.isActive('bold'),
        run: () => ed.chain().focus().toggleBold().run(),
      },
      {
        id: 'italic', sep: false, title: 'Italic',
        svg: `<svg viewBox="0 0 24 24"><path d="M11.5 4h7v2h-2.5l-5 12H14v2H7v-2h2.5l5-12H12V4z"/></svg>`,
        active: () => ed.isActive('italic'),
        run: () => ed.chain().focus().toggleItalic().run(),
      },
      {
        id: 'underline', sep: false, title: 'Underline',
        svg: `<svg viewBox="0 0 24 24"><path d="M6 3h2v9a4 4 0 0 0 8 0V3h2v9a6 6 0 0 1-12 0V3zm-2 17h16v2H4v-2z"/></svg>`,
        active: () => ed.isActive('underline'),
        run: () => ed.chain().focus().toggleUnderline().run(),
      },
      {
        id: 'strike', sep: false, title: 'Strikethrough',
        svg: `<svg viewBox="0 0 24 24"><path d="M17.15 11A6 6 0 0 0 7 8h2.2a3.8 3.8 0 0 1 7.11 2H17zM3 12h18v1H3zm4.85 1A6 6 0 0 0 17 16h-2.2a3.8 3.8 0 0 1-7.11-2H7z"/></svg>`,
        active: () => ed.isActive('strike'),
        run: () => ed.chain().focus().toggleStrike().run(),
      },
      sep(),
      {
        id: 'code', sep: false, title: 'Code',
        svg: `<svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6z"/></svg>`,
        active: () => ed.isActive('code'),
        run: () => ed.chain().focus().toggleCode().run(),
      },
      {
        id: 'link', sep: false, title: 'Link',
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
        active: () => ed.isActive('link'),
        run: () => {
          const existing = ed.getAttributes('link')['href'] as string ?? '';
          const url = prompt('Enter URL:', existing);
          if (url === null) return;
          if (!url) { ed.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
          ed.chain().focus().extendMarkRange('link')
            .setLink({ href: url.startsWith('http') ? url : `https://${url}` }).run();
        },
      },
      sep(),
      {
        id: 'h1', sep: false, title: 'Heading 1',
        svg: `<span class="km-bubble__label">H1</span>`,
        active: () => ed.isActive('heading', { level: 1 }),
        run: () => ed.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: 'h2', sep: false, title: 'Heading 2',
        svg: `<span class="km-bubble__label">H2</span>`,
        active: () => ed.isActive('heading', { level: 2 }),
        run: () => ed.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      sep(),
      {
        id: 'quote', sep: false, title: 'Blockquote',
        svg: `<svg viewBox="0 0 24 24"><path d="M4.58 21C3.9 21 3 20.5 3 19.5V14c0-3.8 1.5-6.5 4-8l1 1.5C6.3 8.8 5 10.7 5 14h3v7H4.58zM15.58 21c-.68 0-1.58-.5-1.58-1.5V14c0-3.8 1.5-6.5 4-8l1 1.5c-1.7 1.3-3 3.2-3 6.5h3v7h-3.42z"/></svg>`,
        active: () => ed.isActive('blockquote'),
        run: () => ed.chain().focus().toggleBlockquote().run(),
      },
      sep(),
      {
        id: 'rtl', sep: false, title: 'RTL (Arabic)',
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h13M3 12h9M3 18h13M17 4l4 4-4 4"/></svg>`,
        active: () => {
          const { $from } = ed.state.selection;
          const node = $from.node($from.depth) ?? $from.node();
          return node?.attrs?.['dir'] === 'rtl';
        },
        run: () => {
          const { $from } = ed.state.selection;
          const node = $from.node($from.depth) ?? $from.node();
          const isRtl = node?.attrs?.['dir'] === 'rtl';
          ed.chain().focus().updateAttributes($from.node($from.depth)?.type.name ?? 'paragraph', {
            dir: isRtl ? null : 'rtl',
            textAlign: isRtl ? null : 'right',
          }).run();
        },
      },
    ];
  }

  ngOnInit(): void {
    this.editor.on('selectionUpdate', this.onUpdate);
    this.editor.on('transaction',     this.onUpdate);
    this.editor.on('blur',            this.onBlur);
  }

  ngOnDestroy(): void {
    this.editor.off('selectionUpdate', this.onUpdate);
    this.editor.off('transaction',     this.onUpdate);
    this.editor.off('blur',            this.onBlur);
  }

  private update(): void {
    const { state, view } = this.editor;
    const { from, to, empty } = state.selection;

    if (empty || !view.hasFocus()) {
      this.visible.set(false);
      this.cdr.markForCheck();
      return;
    }

    const start = view.coordsAtPos(from);
    const end   = view.coordsAtPos(to);
    const centerX = (start.left + end.right) / 2;
    const topY    = Math.min(start.top, end.top) - 48;

    this.top.set(Math.max(topY, 8));
    this.left.set(centerX);
    this.visible.set(true);
    this.cdr.markForCheck();
  }
}
