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
  svg: string;
  shortcut: string;
  keywords: string[];
  run: (editor: Editor) => void;
}

export interface SlashMenuGroup {
  label: string;
  items: SlashMenuItem[];
}

// ── SVGs ───────────────────────────────────────────────────────────────────────

const SVG = {
  text: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V5h16v2M9 5v14M15 5v14M9 19h6"/></svg>`,
  h1:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h2v7h5V4h2v16h-2v-7H5v7H3zM15 8l2-1v13h-2zm4-1h-5v2h2v12h2V9h1z"/></svg>`,
  h2:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h2v7h5V4h2v16h-2v-7H5v7H3zm14 8c0-2.2 1.8-4 4-4v2c-1.1 0-2 .9-2 2s.9 2 2 2l-2 4h-2l1.5-3A4 4 0 0 1 17 12z"/></svg>`,
  h3:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h2v7h5V4h2v16h-2v-7H5v7H3zm14 4c1.7 0 3 1.3 3 3 0 .9-.4 1.7-1 2.2.6.5 1 1.3 1 2.2 0 1.7-1.3 3-3 3h-3v-2h3c.6 0 1-.4 1-1s-.4-1-1-1h-2v-2h2c.6 0 1-.4 1-1s-.4-1-1-1h-3V8h3z"/></svg>`,
  h4:   `<svg viewBox="0 0 24 24" fill="currentColor"><text x="2" y="18" font-size="15" font-weight="700">H4</text></svg>`,
  ul:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="7" r="1.5" fill="currentColor" stroke="none"/><path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="5" cy="17" r="1.5" fill="currentColor" stroke="none"/></svg>`,
  ol:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 7h11M9 12h11M9 17h11"/><text x="2" y="9" font-size="6" fill="currentColor" stroke="none" font-weight="700">1.</text><text x="2" y="14" font-size="6" fill="currentColor" stroke="none" font-weight="700">2.</text><text x="2" y="19" font-size="6" fill="currentColor" stroke="none" font-weight="700">3.</text></svg>`,
  quote:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>`,
  code: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></svg>`,
  hr:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h4M17 6h4M3 18h4M17 18h4"/></svg>`,
  callout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M9 9h6M9 13h4"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 19h20z"/><path d="M12 10v5M12 17v1"/></svg>`,
  tip:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 15v1"/></svg>`,
  definition: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5h10l1 2H4M4 12h11M13 19l3-14h4"/></svg>`,
  rtl:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h13M3 12h9M3 19h13M19 3l3 3-3 3"/></svg>`,
};

// ── Items & Groups ─────────────────────────────────────────────────────────────

function buildGroups(): SlashMenuGroup[] {
  return [
    {
      label: 'Basic blocks',
      items: [
        {
          id: 'text', label: 'Text', description: 'Plain paragraph', svg: SVG.text, shortcut: '',
          keywords: ['text', 'paragraph', 'p'],
          run: ed => ed.chain().focus().setParagraph().run(),
        },
        {
          id: 'h1', label: 'Heading 1', description: 'Big section title', svg: SVG.h1, shortcut: '#',
          keywords: ['h1', 'heading', 'title'],
          run: ed => ed.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          id: 'h2', label: 'Heading 2', description: 'Section subtitle', svg: SVG.h2, shortcut: '##',
          keywords: ['h2', 'heading', 'sub'],
          run: ed => ed.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          id: 'h3', label: 'Heading 3', description: 'Small section heading', svg: SVG.h3, shortcut: '###',
          keywords: ['h3', 'heading'],
          run: ed => ed.chain().focus().toggleHeading({ level: 3 }).run(),
        },
        {
          id: 'ul', label: 'Bulleted list', description: 'Unordered bullet points', svg: SVG.ul, shortcut: '-',
          keywords: ['bullet', 'list', 'ul', 'unordered'],
          run: ed => ed.chain().focus().toggleBulletList().run(),
        },
        {
          id: 'ol', label: 'Numbered list', description: 'Ordered numbered list', svg: SVG.ol, shortcut: '1.',
          keywords: ['numbered', 'ordered', 'list', 'ol'],
          run: ed => ed.chain().focus().toggleOrderedList().run(),
        },
        {
          id: 'quote', label: 'Quote', description: 'Highlighted blockquote', svg: SVG.quote, shortcut: '>',
          keywords: ['quote', 'blockquote'],
          run: ed => ed.chain().focus().toggleBlockquote().run(),
        },
        {
          id: 'divider', label: 'Divider', description: 'Horizontal separator line', svg: SVG.hr, shortcut: '---',
          keywords: ['divider', 'hr', 'rule', 'line'],
          run: ed => ed.chain().focus().setHorizontalRule().run(),
        },
      ],
    },
    {
      label: 'Advanced blocks',
      items: [
        {
          id: 'code', label: 'Code block', description: 'Monospace code snippet', svg: SVG.code, shortcut: '```',
          keywords: ['code', 'block', 'pre', 'mono'],
          run: ed => ed.chain().focus().toggleCodeBlock().run(),
        },
        {
          id: 'callout-info', label: 'Callout', description: 'Info or note highlight box', svg: SVG.callout, shortcut: '',
          keywords: ['callout', 'info', 'note', 'box', 'highlight'],
          run: ed => (ed.commands as unknown as { setCallout: (a: { calloutType: CalloutType }) => void }).setCallout({ calloutType: 'info' }),
        },
        {
          id: 'callout-tip', label: 'Tip', description: 'Tip or insight callout', svg: SVG.tip, shortcut: '',
          keywords: ['tip', 'callout', 'insight'],
          run: ed => (ed.commands as unknown as { setCallout: (a: { calloutType: CalloutType }) => void }).setCallout({ calloutType: 'tip' }),
        },
        {
          id: 'callout-warning', label: 'Warning', description: 'Caution or alert callout', svg: SVG.warning, shortcut: '',
          keywords: ['warning', 'callout', 'alert', 'caution'],
          run: ed => (ed.commands as unknown as { setCallout: (a: { calloutType: CalloutType }) => void }).setCallout({ calloutType: 'warning' }),
        },
        {
          id: 'definition', label: 'Definition', description: 'Arabic term definition box', svg: SVG.definition, shortcut: '',
          keywords: ['definition', 'term', 'arabic', 'callout'],
          run: ed => (ed.commands as unknown as { setCallout: (a: { calloutType: CalloutType }) => void }).setCallout({ calloutType: 'definition' }),
        },
      ],
    },
    {
      label: 'Arabic',
      items: [
        {
          id: 'rtl', label: 'Arabic block', description: 'RTL paragraph with Arabic font', svg: SVG.rtl, shortcut: '',
          keywords: ['arabic', 'rtl', 'quran', 'right'],
          run: ed => {
            ed.chain().focus().setParagraph().run();
            (ed.commands as unknown as { setTextDirection: (d: 'rtl') => void }).setTextDirection('rtl');
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
      <div class="km-slash" [style.top.px]="top()" [style.left.px]="left()">

        <!-- Search input -->
        <div class="km-slash__search">
          <svg class="km-slash__search-icon" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span class="km-slash__search-label">{{ query() || 'Type to search…' }}</span>
          <span class="km-slash__esc" (mousedown)="$event.preventDefault(); closed.emit()">esc</span>
        </div>

        <!-- Groups -->
        <div class="km-slash__list">
          @if (query()) {
            <!-- Flat filtered list -->
            @for (item of filtered(); track item.id; let i = $index) {
              <button
                class="km-slash__item"
                [class.km-slash__item--active]="i === selectedIndex()"
                (mousedown)="$event.preventDefault(); select(item)">
                <span class="km-slash__ico" [innerHTML]="item.svg"></span>
                <span class="km-slash__body">
                  <span class="km-slash__label">{{ item.label }}</span>
                  <span class="km-slash__desc">{{ item.description }}</span>
                </span>
                @if (item.shortcut) {
                  <kbd class="km-slash__shortcut">{{ item.shortcut }}</kbd>
                }
              </button>
            }
            @if (filtered().length === 0) {
              <div class="km-slash__empty">No blocks matching "{{ query() }}"</div>
            }
          } @else {
            <!-- Grouped list -->
            @for (group of ALL_GROUPS; track group.label) {
              <div class="km-slash__group-label">{{ group.label }}</div>
              @for (item of group.items; track item.id; let i = $index) {
                <button
                  class="km-slash__item"
                  [class.km-slash__item--active]="flatIndex(group, i) === selectedIndex()"
                  (mousedown)="$event.preventDefault(); select(item)">
                  <span class="km-slash__ico" [innerHTML]="item.svg"></span>
                  <span class="km-slash__body">
                    <span class="km-slash__label">{{ item.label }}</span>
                    <span class="km-slash__desc">{{ item.description }}</span>
                  </span>
                  @if (item.shortcut) {
                    <kbd class="km-slash__shortcut">{{ item.shortcut }}</kbd>
                  }
                </button>
              }
            }
          }
        </div>

        <!-- Footer -->
        <div class="km-slash__footer">
          <span>↑↓ navigate</span><span class="km-slash__footer-sep">·</span>
          <span>↵ select</span><span class="km-slash__footer-sep">·</span>
          <span>esc close</span>
        </div>

      </div>
    }
  `,
  styles: [`
    .km-slash {
      position: fixed; z-index: 9999;
      background: #18181c;
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 10px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4);
      width: 300px;
      overflow: hidden;
      animation: slashIn 0.13s cubic-bezier(0.16,1,0.3,1);
      user-select: none;
    }
    @keyframes slashIn {
      from { opacity: 0; transform: translateY(-8px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Search bar */
    .km-slash__search {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .km-slash__search-icon {
      width: 14px; height: 14px; flex-shrink: 0;
      color: rgba(255,255,255,0.3);
    }
    .km-slash__search-label {
      flex: 1; font-size: 0.8rem;
      color: rgba(255,255,255,0.4);
      font-family: var(--km-font-body, system-ui);
      letter-spacing: 0.01em;
    }
    .km-slash__esc {
      font-size: 0.65rem; font-weight: 600;
      padding: 2px 5px;
      background: rgba(255,255,255,0.07);
      border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.35);
      cursor: pointer; letter-spacing: 0.05em;
    }
    .km-slash__esc:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.6); }

    /* Scrollable list */
    .km-slash__list { max-height: 300px; overflow-y: auto; padding: 6px 0; }
    .km-slash__list::-webkit-scrollbar { width: 4px; }
    .km-slash__list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

    /* Group label */
    .km-slash__group-label {
      padding: 8px 14px 4px;
      font-size: 0.66rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: rgba(255,255,255,0.28);
    }

    /* Item */
    .km-slash__item {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 6px 10px;
      border: none; background: transparent;
      cursor: pointer; border-radius: 0;
      text-align: left; color: var(--km-text, rgba(236,228,216,0.9));
      transition: background 0.08s;
      margin: 0 4px; width: calc(100% - 8px); border-radius: 6px;
    }
    .km-slash__item:hover { background: rgba(255,255,255,0.05); }
    .km-slash__item--active { background: rgba(201,168,76,0.12) !important; }
    .km-slash__item--active .km-slash__label { color: #c9a84c; }

    /* Icon box */
    .km-slash__ico {
      width: 32px; height: 32px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      color: rgba(255,255,255,0.6);
    }
    .km-slash__ico svg { width: 15px; height: 15px; }
    .km-slash__item--active .km-slash__ico {
      background: rgba(201,168,76,0.1);
      border-color: rgba(201,168,76,0.2);
      color: #c9a84c;
    }

    /* Text */
    .km-slash__body { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .km-slash__label { font-size: 0.82rem; font-weight: 500; line-height: 1.3; }
    .km-slash__desc  { font-size: 0.68rem; color: rgba(255,255,255,0.35); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Shortcut */
    .km-slash__shortcut {
      font-size: 0.65rem; font-weight: 600;
      padding: 2px 5px;
      background: rgba(255,255,255,0.06);
      border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.3);
      font-family: 'JetBrains Mono', monospace;
      flex-shrink: 0; white-space: nowrap;
    }

    /* Empty */
    .km-slash__empty {
      padding: 16px 14px; font-size: 0.78rem;
      color: rgba(255,255,255,0.3); text-align: center;
    }

    /* Footer */
    .km-slash__footer {
      display: flex; align-items: center; gap: 4px;
      padding: 7px 12px;
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 0.65rem; color: rgba(255,255,255,0.25);
    }
    .km-slash__footer-sep { color: rgba(255,255,255,0.12); }
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

  /** When in grouped mode, returns the flat index of item[i] in group g. */
  flatIndex(group: SlashMenuGroup, itemIdx: number): number {
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
