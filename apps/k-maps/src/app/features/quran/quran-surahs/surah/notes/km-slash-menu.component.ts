import {
  ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, OnChanges,
  Output, SimpleChanges, signal, computed,
} from '@angular/core';
import type { Editor } from '@tiptap/core';
import type { CalloutType } from './extensions/callout.extension';

// ── Item & Group types ────────────────────────────────────────────────────────

export interface SlashMenuItem {
  id: string;
  label: string;
  svg: string;      // rendered via [innerHTML]
  keywords: string[];
  run: (editor: Editor) => void;
}

export interface SlashMenuGroup {
  label: string;
  items: SlashMenuItem[];
}

// ── Compact inline SVGs (Notion-style glyph look) ─────────────────────────────

const IC = {
  text: `<svg viewBox="0 0 20 20" fill="currentColor"><text x="2" y="15" font-size="13" font-weight="700" font-family="Georgia,serif">T</text></svg>`,
  h1:   `<svg viewBox="0 0 20 20" fill="currentColor"><text x="1" y="14" font-size="10" font-weight="800">H</text><text x="10" y="15" font-size="7" font-weight="800">1</text></svg>`,
  h2:   `<svg viewBox="0 0 20 20" fill="currentColor"><text x="1" y="14" font-size="10" font-weight="800">H</text><text x="10" y="15" font-size="7" font-weight="800">2</text></svg>`,
  h3:   `<svg viewBox="0 0 20 20" fill="currentColor"><text x="1" y="14" font-size="10" font-weight="800">H</text><text x="10" y="15" font-size="7" font-weight="800">3</text></svg>`,
  ul:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="3.5" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="3.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="3.5" cy="15" r="1.5" fill="currentColor" stroke="none"/><path d="M7 6h11M7 10.5h11M7 15h11"/></svg>`,
  ol:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 6h11M7 10.5h11M7 15h11" stroke="currentColor"/><text x="1" y="8" font-size="5" font-weight="800" fill="currentColor" stroke="none">1.</text><text x="1" y="12.5" font-size="5" font-weight="800" fill="currentColor" stroke="none">2.</text><text x="1" y="17" font-size="5" font-weight="800" fill="currentColor" stroke="none">3.</text></svg>`,
  quote:`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 5h14v10H3z" stroke-dasharray="0 3 10 3"/><path d="M3 5v10" stroke-width="3" stroke-linecap="round"/></svg>`,
  code: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 7l-4 4 4 4M13 7l4 4-4 4M11 5l-2 10"/></svg>`,
  hr:   `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 10h16" stroke-dasharray="1 2"/></svg>`,
  callout:`<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="16" height="12" rx="2"/><path d="M6 8h8M6 11h5"/></svg>`,
  warn: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 3L1 17h18z"/><path d="M10 9v4M10 15v1"/></svg>`,
  tip:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7"/><path d="M10 7v4M10 13v1"/></svg>`,
  def:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 16V4h8l1.5 2H4M4 10h9M12 16l2.5-12h3"/></svg>`,
  rtl:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 5h12M2 10h8M2 15h12M16 3l3 3-3 3"/></svg>`,
};

// ── Groups ────────────────────────────────────────────────────────────────────

function buildGroups(): SlashMenuGroup[] {
  return [
    {
      label: 'Style',
      items: [
        {
          id: 'text', label: 'Text', svg: IC.text,
          keywords: ['text', 'paragraph', 'p', 'body'],
          run: ed => ed.chain().focus().setParagraph().run(),
        },
        {
          id: 'h1', label: 'Heading 1', svg: IC.h1,
          keywords: ['h1', 'heading', 'title', '#'],
          run: ed => ed.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          id: 'h2', label: 'Heading 2', svg: IC.h2,
          keywords: ['h2', 'heading', 'sub', '##'],
          run: ed => ed.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          id: 'h3', label: 'Heading 3', svg: IC.h3,
          keywords: ['h3', 'heading', '###'],
          run: ed => ed.chain().focus().toggleHeading({ level: 3 }).run(),
        },
        {
          id: 'ul', label: 'Bullet List', svg: IC.ul,
          keywords: ['bullet', 'list', 'ul', '-'],
          run: ed => ed.chain().focus().toggleBulletList().run(),
        },
        {
          id: 'ol', label: 'Numbered List', svg: IC.ol,
          keywords: ['numbered', 'ordered', 'ol', '1.'],
          run: ed => ed.chain().focus().toggleOrderedList().run(),
        },
        {
          id: 'quote', label: 'Blockquote', svg: IC.quote,
          keywords: ['quote', 'blockquote', '>'],
          run: ed => ed.chain().focus().toggleBlockquote().run(),
        },
        {
          id: 'code', label: 'Code Block', svg: IC.code,
          keywords: ['code', 'block', 'pre', '```'],
          run: ed => ed.chain().focus().toggleCodeBlock().run(),
        },
      ],
    },
    {
      label: 'Insert',
      items: [
        {
          id: 'hr', label: 'Separator', svg: IC.hr,
          keywords: ['separator', 'divider', 'hr', '---', 'rule'],
          run: ed => ed.chain().focus().setHorizontalRule().run(),
        },
        {
          id: 'callout', label: 'Callout', svg: IC.callout,
          keywords: ['callout', 'info', 'note', 'box'],
          run: ed => (ed.commands as any).setCallout({ calloutType: 'info' as CalloutType }),
        },
        {
          id: 'tip', label: 'Tip', svg: IC.tip,
          keywords: ['tip', 'insight', 'callout'],
          run: ed => (ed.commands as any).setCallout({ calloutType: 'tip' as CalloutType }),
        },
        {
          id: 'warning', label: 'Warning', svg: IC.warn,
          keywords: ['warning', 'alert', 'caution'],
          run: ed => (ed.commands as any).setCallout({ calloutType: 'warning' as CalloutType }),
        },
        {
          id: 'definition', label: 'Definition', svg: IC.def,
          keywords: ['definition', 'term', 'arabic'],
          run: ed => (ed.commands as any).setCallout({ calloutType: 'definition' as CalloutType }),
        },
        {
          id: 'rtl', label: 'Arabic Block', svg: IC.rtl,
          keywords: ['arabic', 'rtl', 'quran', 'right'],
          run: ed => {
            ed.chain().focus().setParagraph().run();
            (ed.commands as any).setTextDirection('rtl');
          },
        },
      ],
    },
  ];
}

const ALL_GROUPS = buildGroups();
const ALL_ITEMS  = ALL_GROUPS.flatMap(g => g.items);

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'km-slash-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (show()) {
      <div class="km-sm" [style.top.px]="top()" [style.left.px]="left()">

        <!-- Filter bar -->
        <div class="km-sm__filter">
          <span class="km-sm__slash">/</span>
          <span class="km-sm__query">{{ query() || 'Filter…' }}</span>
        </div>

        <!-- List -->
        <div class="km-sm__list">
          @if (query()) {
            <!-- Flat filtered -->
            @for (item of filtered(); track item.id; let i = $index) {
              <button class="km-sm__item"
                [class.km-sm__item--active]="i === selectedIndex()"
                (mousedown)="$event.preventDefault(); select(item)">
                <span class="km-sm__ico" [innerHTML]="item.svg"></span>
                <span class="km-sm__label">{{ item.label }}</span>
              </button>
            }
            @if (filtered().length === 0) {
              <div class="km-sm__empty">No results for "{{ query() }}"</div>
            }
          } @else {
            <!-- Grouped -->
            @for (group of ALL_GROUPS; track group.label) {
              <div class="km-sm__group">{{ group.label }}</div>
              @for (item of group.items; track item.id; let i = $index) {
                <button class="km-sm__item"
                  [class.km-sm__item--active]="flatIdx(group, i) === selectedIndex()"
                  (mousedown)="$event.preventDefault(); select(item)">
                  <span class="km-sm__ico" [innerHTML]="item.svg"></span>
                  <span class="km-sm__label">{{ item.label }}</span>
                </button>
              }
            }
          }
        </div>

      </div>
    }
  `,
  styles: [`
    .km-sm {
      position: fixed; z-index: 9999;
      background: #1a1a1e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.65), 0 2px 12px rgba(0,0,0,0.4);
      width: 240px;
      overflow: hidden;
      animation: smIn 0.12s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes smIn {
      from { opacity:0; transform: translateY(-6px) scale(0.97); }
      to   { opacity:1; transform: translateY(0) scale(1); }
    }

    /* Filter bar */
    .km-sm__filter {
      display: flex; align-items: center; gap: 4px;
      padding: 9px 12px 8px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .km-sm__slash {
      font-size: 0.82rem; font-weight: 600;
      color: rgba(255,255,255,0.25);
    }
    .km-sm__query {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.35);
      font-family: var(--km-font-body, system-ui);
    }

    /* Scroll list */
    .km-sm__list {
      max-height: 290px; overflow-y: auto;
      padding: 4px 4px;
    }
    .km-sm__list::-webkit-scrollbar { width: 3px; }
    .km-sm__list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

    /* Group label */
    .km-sm__group {
      padding: 8px 10px 3px;
      font-size: 0.63rem; font-weight: 700;
      letter-spacing: 0.09em; text-transform: uppercase;
      color: rgba(255,255,255,0.25);
      user-select: none;
    }

    /* Item row */
    .km-sm__item {
      display: flex; align-items: center; gap: 9px;
      width: 100%; padding: 5px 8px;
      border: none; background: transparent;
      cursor: pointer; border-radius: 6px;
      text-align: left;
      transition: background 0.07s;
      color: rgba(255,255,255,0.82);
    }
    .km-sm__item:hover  { background: rgba(255,255,255,0.06); }
    .km-sm__item--active { background: rgba(201,168,76,0.13); }
    .km-sm__item--active .km-sm__label { color: #c9a84c; }
    .km-sm__item--active .km-sm__ico   { color: #c9a84c; }

    /* Icon */
    .km-sm__ico {
      width: 28px; height: 28px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      color: rgba(255,255,255,0.55);
    }
    .km-sm__ico svg { width: 14px; height: 14px; }

    /* Label */
    .km-sm__label {
      font-size: 0.83rem; font-weight: 450;
      line-height: 1.2;
    }

    /* Empty */
    .km-sm__empty {
      padding: 14px 12px; font-size: 0.76rem;
      color: rgba(255,255,255,0.3); text-align: center;
    }
  `],
})
export class KmSlashMenuComponent implements OnChanges {
  @Input() editor: Editor | null = null;
  @Input() open = false;
  @Input() queryText = '';
  @Input() anchorTop = 0;
  @Input() anchorLeft = 0;
  @Output() closed = new EventEmitter<void>();

  readonly ALL_GROUPS = ALL_GROUPS;

  show          = signal(false);
  query         = signal('');
  top           = signal(0);
  left          = signal(0);
  selectedIndex = signal(0);

  filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return ALL_ITEMS;
    return ALL_ITEMS.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    );
  });

  flatIdx(group: SlashMenuGroup, itemIdx: number): number {
    let offset = 0;
    for (const g of ALL_GROUPS) {
      if (g === group) return offset + itemIdx;
      offset += g.items.length;
    }
    return itemIdx;
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['open'])       this.show.set(this.open);
    if (ch['queryText'])  { this.query.set(this.queryText); this.selectedIndex.set(0); }
    if (ch['anchorTop'])  this.top.set(this.anchorTop);
    if (ch['anchorLeft']) this.left.set(this.anchorLeft);
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if (!this.show()) return;
    const items = this.query() ? this.filtered() : ALL_ITEMS;

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
    const { state, dispatch } = this.editor.view;
    const { $from } = state.selection;
    const slashPos = Math.max(0, $from.pos - this.query().length - 1);
    dispatch(state.tr.delete(slashPos, $from.pos));
    item.run(this.editor);
    this.closed.emit();
  }
}
