import {
  ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, OnChanges,
  Output, SimpleChanges, signal, computed,
} from '@angular/core';
import type { Editor } from '@tiptap/core';
import type { CalloutType } from './extensions/callout.extension';

export interface SlashMenuItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
  run: (editor: Editor) => void;
}

function buildItems(): SlashMenuItem[] {
  return [
    {
      id: 'h1', label: 'Heading 1', description: 'Large section heading', icon: 'H1', keywords: ['h1', 'heading', 'title'],
      run: ed => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'h2', label: 'Heading 2', description: 'Medium section heading', icon: 'H2', keywords: ['h2', 'heading'],
      run: ed => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'h3', label: 'Heading 3', description: 'Small section heading', icon: 'H3', keywords: ['h3', 'heading'],
      run: ed => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'ul', label: 'Bullet List', description: 'Unordered list', icon: '•—', keywords: ['bullet', 'list', 'ul'],
      run: ed => ed.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'ol', label: 'Numbered List', description: 'Ordered list', icon: '1.', keywords: ['number', 'ordered', 'list', 'ol'],
      run: ed => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'quote', label: 'Quote', description: 'Blockquote text', icon: '❝', keywords: ['quote', 'blockquote'],
      run: ed => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'code', label: 'Code Block', description: 'Monospace code block', icon: '<>', keywords: ['code', 'block', 'pre'],
      run: ed => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'callout-info', label: 'Callout — Info', description: 'Highlighted info box', icon: '💡', keywords: ['callout', 'info', 'note', 'box'],
      run: ed => (ed.commands as unknown as { setCallout: (a: { calloutType: CalloutType }) => void }).setCallout({ calloutType: 'info' }),
    },
    {
      id: 'callout-tip', label: 'Callout — Tip', description: 'Tip or insight box', icon: '✨', keywords: ['callout', 'tip'],
      run: ed => (ed.commands as unknown as { setCallout: (a: { calloutType: CalloutType }) => void }).setCallout({ calloutType: 'tip' }),
    },
    {
      id: 'callout-warning', label: 'Callout — Warning', description: 'Warning or caution box', icon: '⚠️', keywords: ['callout', 'warning'],
      run: ed => (ed.commands as unknown as { setCallout: (a: { calloutType: CalloutType }) => void }).setCallout({ calloutType: 'warning' }),
    },
    {
      id: 'callout-definition', label: 'Definition', description: 'Arabic term definition box', icon: '📖', keywords: ['definition', 'term', 'arabic'],
      run: ed => (ed.commands as unknown as { setCallout: (a: { calloutType: CalloutType }) => void }).setCallout({ calloutType: 'definition' }),
    },
    {
      id: 'divider', label: 'Divider', description: 'Horizontal rule', icon: '—', keywords: ['divider', 'hr', 'rule', 'line'],
      run: ed => ed.chain().focus().setHorizontalRule().run(),
    },
  ];
}

const ALL_ITEMS = buildItems();

@Component({
  selector: 'km-slash-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      <div class="km-slash-menu" [style.top.px]="top()" [style.left.px]="left()">
        <div class="km-slash-menu__query">/ {{ query() }}</div>
        <div class="km-slash-menu__list">
          @for (item of filtered(); track item.id; let i = $index) {
            <button
              class="km-slash-menu__item"
              [class.km-slash-menu__item--active]="i === selectedIndex()"
              (mousedown)="$event.preventDefault(); select(item)">
              <span class="km-slash-menu__icon">{{ item.icon }}</span>
              <span class="km-slash-menu__text">
                <span class="km-slash-menu__label">{{ item.label }}</span>
                <span class="km-slash-menu__desc">{{ item.description }}</span>
              </span>
            </button>
          }
          @if (filtered().length === 0) {
            <div class="km-slash-menu__empty">No results for "{{ query() }}"</div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .km-slash-menu {
      position: fixed; z-index: 9999;
      background: var(--km-surface-2, #1e1e22);
      border: 1px solid var(--km-border);
      border-radius: 8px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      width: 280px;
      overflow: hidden;
      animation: slashIn 0.15s ease;
    }
    @keyframes slashIn { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform:none; } }
    .km-slash-menu__query {
      padding: 8px 12px 6px;
      font-size: 0.72rem;
      color: var(--km-text-3, rgba(255,255,255,0.35));
      border-bottom: 1px solid var(--km-border);
      font-family: 'JetBrains Mono', monospace;
    }
    .km-slash-menu__list { max-height: 280px; overflow-y: auto; padding: 4px; }
    .km-slash-menu__item {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 7px 10px;
      border: none; background: transparent;
      cursor: pointer; border-radius: 5px;
      text-align: left; color: var(--km-text);
    }
    .km-slash-menu__item:hover,
    .km-slash-menu__item--active { background: rgba(201,168,76,0.1); }
    .km-slash-menu__icon {
      width: 28px; height: 28px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.06);
      border-radius: 5px;
      font-size: 0.78rem; font-weight: 700;
      color: var(--km-gold);
    }
    .km-slash-menu__text { display: flex; flex-direction: column; }
    .km-slash-menu__label { font-size: 0.82rem; font-weight: 500; }
    .km-slash-menu__desc  { font-size: 0.7rem; color: var(--km-text-3, rgba(255,255,255,0.4)); }
    .km-slash-menu__empty { padding: 12px; font-size: 0.78rem; color: var(--km-text-3); text-align: center; }
  `],
})
export class KmSlashMenuComponent implements OnChanges {
  @Input() editor: Editor | null = null;
  @Input() open = false;
  @Input() queryText = '';
  @Input() anchorTop = 0;
  @Input() anchorLeft = 0;
  @Output() closed = new EventEmitter<void>();

  show     = signal(false);
  query    = signal('');
  top      = signal(0);
  left     = signal(0);
  selectedIndex = signal(0);

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return ALL_ITEMS;
    return ALL_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    );
  });

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['open'])        this.show.set(this.open);
    if (ch['queryText'])   { this.query.set(this.queryText); this.selectedIndex.set(0); }
    if (ch['anchorTop'])   this.top.set(this.anchorTop);
    if (ch['anchorLeft'])  this.left.set(this.anchorLeft);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.show()) return;
    const items = this.filtered();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex.update(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex.update(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[this.selectedIndex()];
      if (item) this.select(item);
    } else if (e.key === 'Escape') {
      this.closed.emit();
    }
  }

  select(item: SlashMenuItem): void {
    if (!this.editor) return;
    // Delete the slash + query from the document before inserting block
    const { state, dispatch } = this.editor.view;
    const { $from } = state.selection;
    const slashPos = $from.pos - this.query().length - 1; // -1 for the slash itself
    dispatch(state.tr.delete(Math.max(0, slashPos), $from.pos));
    item.run(this.editor);
    this.closed.emit();
  }
}
