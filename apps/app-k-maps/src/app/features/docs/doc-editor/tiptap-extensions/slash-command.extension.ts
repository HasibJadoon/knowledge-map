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
        command: ({ editor, range, props }: { editor: unknown; range: unknown; props: SlashCommand }) => {
          props.command({ editor: editor as never, range: range as never });
        },
        items: ({ query }: { query: string }) => filterCommands(query),
        render: () => {
          let container: HTMLDivElement | null = null;
          let selectedIndex = 0;
          let currentItems: SlashCommand[] = [];
          let currentCommand: ((item: SlashCommand) => void) | null = null;
          let currentClientRect: (() => DOMRect) | null = null;
          let vpResizeHandler: (() => void) | null = null;

          const rerender = () => {
            if (!container || !currentItems.length) return;
            container.innerHTML = '';

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
                `;

                // mousedown: works for mouse + iOS synthetic mouse events
                el.addEventListener('mousedown', e => {
                  e.preventDefault();
                  currentCommand?.(item);
                });

                // touchend + preventDefault: fires instantly on tap-lift,
                // prevents the follow-up mousedown/click from double-firing.
                el.addEventListener('touchend', e => {
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
            onStart: ({ items, command, clientRect }: { items: SlashCommand[]; command: (item: SlashCommand) => void; clientRect: (() => DOMRect) | null }) => {
              selectedIndex = 0;
              currentItems = items;
              currentCommand = command;
              currentClientRect = clientRect;

              container = document.createElement('div');
              container.className = 'km-slash-menu';
              applyContainerStyles(container);
              document.body.appendChild(container);
              updatePosition(container, clientRect);
              rerender();

              // Reposition when the keyboard finishes animating in/out.
              // On iOS the visualViewport resize fires after the keyboard
              // animation completes, giving us the final usable height.
              vpResizeHandler = () => { if (container) updatePosition(container, currentClientRect); };
              window.visualViewport?.addEventListener('resize', vpResizeHandler);
              window.visualViewport?.addEventListener('scroll', vpResizeHandler);
            },

            onUpdate: ({ items, command, clientRect }: { items: SlashCommand[]; command: (item: SlashCommand) => void; clientRect: (() => DOMRect) | null }) => {
              if (!container) return;
              selectedIndex = 0;
              currentItems = items;
              currentCommand = command;
              currentClientRect = clientRect;
              updatePosition(container, clientRect);

              if (!items.length) {
                container.style.display = 'none';
              } else {
                container.style.display = 'block';
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
              if (vpResizeHandler) {
                window.visualViewport?.removeEventListener('resize', vpResizeHandler);
                window.visualViewport?.removeEventListener('scroll', vpResizeHandler);
                vpResizeHandler = null;
              }
              container?.remove();
              container = null;
              currentCommand = null;
              currentItems = [];
              currentClientRect = null;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function scrollActiveIntoView(container: HTMLElement) {
  const active = container.querySelector('.km-slash-item--active') as HTMLElement | null;
  active?.scrollIntoView({ block: 'nearest' });
}

/**
 * Position the slash menu so it never hides behind the iOS keyboard.
 *
 * On iOS Capacitor with KeyboardResize.Ionic:
 *   - position:fixed top=0 is the top of the WKWebView frame
 *   - getBoundingClientRect() coords are visual-viewport-relative
 *   - visualViewport.offsetTop bridges the two coordinate spaces
 *   - visualViewport.height is the visible area above the keyboard
 *
 * Our custom km-bar (ion-footer, ~52 px) sits inside visualViewport.height,
 * so we subtract it from the safe-bottom boundary to avoid overlap.
 */
function updatePosition(el: HTMLElement, clientRect: (() => DOMRect) | null): void {
  if (!clientRect) return;
  const rect  = clientRect();
  const vv    = window.visualViewport;

  // Visual viewport dimensions — correctly shrunk when keyboard is open
  const vpH   = vv ? vv.height    : window.innerHeight;
  const vpW   = vv ? vv.width     : window.innerWidth;
  // offsetTop: distance from layout-viewport top to visual-viewport top.
  // Usually 0 on iOS with keyboard; non-zero when the page is zoomed/scrolled.
  const vvTop = vv ? vv.offsetTop : 0;

  // Our ion-footer accessory bar consumes ~52 px at the bottom of the
  // visual viewport. Menu must stay above it.
  const KM_BAR_H = 52;
  const MENU_MAX_H = 240;
  const MARGIN = 8;

  // Coordinate conversion: rect is in visual-viewport space (0 = top of vv).
  // For position:fixed, 0 = top of layout viewport.
  // Offset by vvTop to align the two spaces.
  const caretTop    = rect.top    + vvTop;
  const caretBottom = rect.bottom + vvTop;

  // Safe bottom: above the keyboard AND above our accessory bar
  const safeBottom = vvTop + vpH - KM_BAR_H - MARGIN;

  const spaceBelow = safeBottom - caretBottom;
  const spaceAbove = caretTop   - vvTop - MARGIN;

  let top: number;
  if (spaceBelow >= MENU_MAX_H && spaceBelow >= spaceAbove) {
    // Open downward — clamp so bottom doesn't exceed safe area
    top = Math.min(caretBottom + 4, safeBottom - MENU_MAX_H);
  } else {
    // Open upward — preferred when keyboard is visible
    top = Math.max(caretTop - MENU_MAX_H - 4, vvTop + MARGIN);
  }

  const left = Math.max(MARGIN, Math.min(rect.left, vpW - 292 - MARGIN));

  el.style.top  = `${top}px`;
  el.style.left = `${left}px`;

  // Fine-tune once the menu's real rendered height is known
  requestAnimationFrame(() => {
    if (!el.isConnected) return;
    const m = el.getBoundingClientRect();
    // m coords are in visual-viewport space — convert for fixed comparison
    const mBottom = m.bottom + vvTop;
    if (mBottom > safeBottom) {
      el.style.top = `${Math.max(vvTop + MARGIN, caretTop - m.height - 4)}px`;
    }
    if (m.right > vpW - MARGIN) {
      el.style.left = `${vpW - m.width - MARGIN}px`;
    }
  });
}

function applyContainerStyles(el: HTMLDivElement): void {
  Object.assign(el.style, {
    position:   'fixed',   // fixed = visual-viewport-relative; never scrolls under keyboard
    zIndex:     '9999',
    background: '#161616',
    border:     '1px solid rgba(255,255,255,0.09)',
    borderRadius: '14px',
    padding:    '6px',
    minWidth:   '280px',
    maxHeight:  '240px',
    overflowY:  'auto',
    overscrollBehavior: 'contain',
    boxShadow:  '0 8px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)',
    fontFamily: "var(--km-font-body, 'Poppins', system-ui)",
    WebkitOverflowScrolling: 'touch',
  });

  if (!document.getElementById('km-slash-styles')) {
    const style = document.createElement('style');
    style.id = 'km-slash-styles';
    style.textContent = `
      .km-slash-menu::-webkit-scrollbar { width: 3px; }
      .km-slash-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

      .km-slash-group-label {
        font-size: 0.6rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.1em;
        color: rgba(255,255,255,0.25);
        padding: 6px 10px 2px;
      }

      /* Mobile-first tap targets: 44px min height */
      .km-slash-item {
        display: flex; align-items: center; gap: 10px;
        width: 100%; min-height: 44px; padding: 8px 10px;
        background: transparent; border: none;
        border-radius: 9px; cursor: pointer;
        text-align: left; color: rgba(255,255,255,0.85);
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
      .km-slash-item--active { background: rgba(255,255,255,0.07); }
      .km-slash-item:hover   { background: rgba(255,255,255,0.06); }

      .km-slash-icon {
        font-size: 0.8rem; font-weight: 700;
        width: 32px; height: 32px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.07);
        color: rgba(255,255,255,0.65);
      }
      .km-slash-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
      .km-slash-title { font-size: 0.84rem; font-weight: 600; }
      .km-slash-desc  { font-size: 0.68rem; color: rgba(255,255,255,0.32); margin-top: 1px; }
    `;
    document.head.appendChild(style);
  }
}
