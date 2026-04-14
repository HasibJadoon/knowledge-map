import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { filterCommands, SlashCommand } from '../slash-menu/slash-menu.config';

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }: { editor: any; range: any; props: SlashCommand }) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => filterCommands(query),
        render: () => {
          let container: HTMLDivElement | null = null;
          let selectedIndex = 0;
          let currentItems: SlashCommand[] = [];
          let currentCommand: ((item: SlashCommand) => void) | null = null;

          const rerender = () => {
            if (!container || !currentItems.length) return;
            container.innerHTML = '';
            container.style.display = 'block';

            const groups = [...new Set(currentItems.map(i => i.group))];
            groups.forEach(group => {
              const groupItems = currentItems.filter(i => i.group === group);

              const groupEl = document.createElement('div');
              groupEl.className = 'km-slash-group';

              const label = document.createElement('div');
              label.className = 'km-slash-group-label';
              label.textContent = group.toUpperCase();
              groupEl.appendChild(label);

              groupItems.forEach(item => {
                const idx = currentItems.indexOf(item);
                const el = document.createElement('button');
                el.className = 'km-slash-item' + (idx === selectedIndex ? ' km-slash-item--active' : '');
                el.innerHTML = `
                  <span class="km-slash-icon">${item.icon}</span>
                  <span class="km-slash-text">
                    <span class="km-slash-title">${item.title}</span>
                    <span class="km-slash-desc">${item.description}</span>
                  </span>
                  ${item.shortcut ? `<span class="km-slash-shortcut">${item.shortcut}</span>` : ''}
                `;
                el.addEventListener('mousedown', e => {
                  e.preventDefault();
                  currentCommand?.(item);
                });
                el.addEventListener('mouseenter', () => {
                  selectedIndex = idx;
                  rerender();
                });
                groupEl.appendChild(el);
              });
              container!.appendChild(groupEl);
            });
          };

          return {
            onStart: ({ items, command, clientRect }: any) => {
              selectedIndex = 0;
              currentItems = items;
              currentCommand = command;

              container = document.createElement('div');
              container.className = 'km-slash-menu';
              applyContainerStyles(container);
              document.body.appendChild(container);
              updatePosition(container, clientRect);
              rerender();
            },

            onUpdate: ({ items, command, clientRect }: any) => {
              if (!container) return;
              selectedIndex = 0;
              currentItems = items;
              currentCommand = command;
              updatePosition(container, clientRect);

              if (!items.length) {
                container.style.display = 'none';
              } else {
                rerender();
              }
            },

            onKeyDown: ({ event }: { event: KeyboardEvent }) => {
              if (!container || !currentItems.length) return false;

              if (event.key === 'ArrowDown') {
                event.preventDefault();
                selectedIndex = (selectedIndex + 1) % currentItems.length;
                rerender();
                scrollActiveIntoView(container);
                return true;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
                rerender();
                scrollActiveIntoView(container);
                return true;
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                const item = currentItems[selectedIndex];
                if (item) currentCommand?.(item);
                return true;
              }
              if (event.key === 'Escape') {
                container?.remove();
                container = null;
                return true;
              }
              return false;
            },

            onExit: () => {
              container?.remove();
              container = null;
              currentCommand = null;
              currentItems = [];
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options['suggestion'],
      }),
    ];
  },
});

function scrollActiveIntoView(container: HTMLElement) {
  const active = container.querySelector('.km-slash-item--active') as HTMLElement | null;
  active?.scrollIntoView({ block: 'nearest' });
}

function updatePosition(el: HTMLElement, clientRect: (() => DOMRect) | null): void {
  if (!clientRect) return;
  const rect = clientRect();
  let top = rect.bottom + window.scrollY + 6;
  let left = rect.left + window.scrollX;

  // Keep inside viewport
  requestAnimationFrame(() => {
    const menuRect = el.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight - 16) {
      el.style.top = `${rect.top + window.scrollY - menuRect.height - 6}px`;
    }
    if (menuRect.right > window.innerWidth - 8) {
      el.style.left = `${window.innerWidth - menuRect.width - 8}px`;
    }
  });

  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}

function applyContainerStyles(el: HTMLDivElement): void {
  Object.assign(el.style, {
    position: 'absolute',
    zIndex: '9999',
    background: '#1c1c1c',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '6px',
    minWidth: '280px',
    maxHeight: '400px',
    overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
    fontFamily: 'var(--km-font-body, system-ui)',
  });

  if (!document.getElementById('km-slash-styles')) {
    const style = document.createElement('style');
    style.id = 'km-slash-styles';
    style.textContent = `
      .km-slash-menu::-webkit-scrollbar { width: 4px; }
      .km-slash-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }

      .km-slash-group-label {
        font-size: 0.62rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.1em;
        color: rgba(255,255,255,0.28);
        padding: 6px 10px 2px;
      }
      .km-slash-item {
        display: flex; align-items: center; gap: 10px;
        width: 100%; padding: 6px 8px;
        background: transparent; border: none;
        border-radius: 7px; cursor: pointer;
        text-align: left; color: rgba(255,255,255,0.85);
      }
      .km-slash-item--active { background: rgba(255,255,255,0.07); }
      .km-slash-item:hover { background: rgba(255,255,255,0.07); }

      .km-slash-icon {
        font-size: 0.82rem; font-weight: 700;
        width: 30px; height: 30px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 7px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
        flex-shrink: 0; color: rgba(255,255,255,0.7);
      }
      .km-slash-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
      .km-slash-title { font-size: 0.84rem; font-weight: 600; }
      .km-slash-desc { font-size: 0.7rem; color: rgba(255,255,255,0.35); margin-top: 1px; }
      .km-slash-shortcut {
        font-size: 0.68rem; color: rgba(255,255,255,0.25);
        font-family: monospace; flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }
}
