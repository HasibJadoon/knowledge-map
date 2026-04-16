/**
 * Native TipTap bubble-menu element.
 *
 * Returned from createBubbleMenuElement() and passed directly to
 * BubbleMenu.configure({ element }). TipTap / tippy.js handles all
 * show / hide / positioning — we never call preventDefault() on the
 * editor, so text selection and keyboard shortcuts are never blocked.
 */

import type { Editor } from '@tiptap/core';

export interface BubbleMenuCallbacks {
  extractToTopic: (text: string) => void;
  extractToVocab: (text: string) => void;
  extractToTask:  (text: string) => void;
  createSrsCard:  (text: string) => void;
}

export interface BubbleMenuRef {
  /** DOM element passed to BubbleMenu.configure({ element }). */
  element: HTMLElement;
  /** Call this on selectionUpdate to refresh active-state classes. */
  update: () => void;
}

// ── Colour palettes ───────────────────────────────────────────────────────

const HIGHLIGHT_COLORS = [
  { color: 'rgba(201,168,76,0.4)',  label: 'Gold' },
  { color: 'rgba(100,180,255,0.4)', label: 'Blue' },
  { color: 'rgba(100,220,130,0.4)', label: 'Green' },
  { color: 'rgba(255,120,100,0.4)', label: 'Red' },
  { color: 'rgba(200,130,255,0.4)', label: 'Purple' },
  { color: 'rgba(255,200,80,0.4)',  label: 'Yellow' },
];

const TEXT_COLORS = [
  { color: '#c9a84c',                label: 'Gold' },
  { color: '#64b4ff',                label: 'Blue' },
  { color: '#64dc82',                label: 'Green' },
  { color: '#ff7864',                label: 'Red' },
  { color: '#c882ff',                label: 'Purple' },
  { color: 'rgba(255,255,255,0.85)', label: 'Default' },
];

// ── Factory ───────────────────────────────────────────────────────────────

export function createBubbleMenuElement(
  getEditor: () => Editor | null,
  callbacks?: BubbleMenuCallbacks,
): BubbleMenuRef {
  injectStyles();

  const root = document.createElement('div');
  root.className = 'km-bm';

  // ── Type button ─────────────────────────────────────────────────────────
  const typeBtn   = btn('km-bm__type');
  const typeLabel = document.createElement('span');
  typeLabel.textContent = 'T';
  const typeChevron = chevron();
  typeBtn.append(typeLabel, typeChevron);

  // ── Formatting buttons ──────────────────────────────────────────────────
  const boldBtn      = btn('km-bm__btn km-bm__btn--bold',      'B');
  const italicBtn    = btn('km-bm__btn km-bm__btn--italic',    'I');
  const underlineBtn = btn('km-bm__btn km-bm__btn--underline', 'U');
  const strikeBtn    = btn('km-bm__btn km-bm__btn--strike',    'S');
  const codeBtn      = btn('km-bm__btn');
  codeBtn.innerHTML  = '<span style="font-size:.75rem">&lt;/&gt;</span>';
  const linkBtn      = btn('km-bm__btn');
  linkBtn.innerHTML  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>`;

  boldBtn.title      = 'Bold (⌘B)';
  italicBtn.title    = 'Italic (⌘I)';
  underlineBtn.title = 'Underline (⌘U)';
  strikeBtn.title    = 'Strikethrough';
  codeBtn.title      = 'Inline code';
  linkBtn.title      = 'Link';

  // ── Colour pickers ──────────────────────────────────────────────────────
  const hlBtn  = colorWrap('Highlight');
  const hlA    = document.createElement('span');
  hlA.className = 'km-bm__color-a km-bm__color-a--hl';
  hlA.textContent = 'A';
  hlBtn.prepend(hlA);

  const tcBtn = colorWrap('Text color');
  const tcA   = document.createElement('span');
  tcA.className = 'km-bm__color-a';
  tcA.textContent = 'A';
  tcBtn.prepend(tcA);

  // ── More button ─────────────────────────────────────────────────────────
  const moreBtn = btn('km-bm__btn km-bm__btn--more', '···');

  // ── Assemble ────────────────────────────────────────────────────────────
  root.append(
    typeBtn, sep(),
    boldBtn, italicBtn, underlineBtn, strikeBtn, codeBtn, linkBtn,
    sep(),
    hlBtn, tcBtn,
    sep(),
    moreBtn,
  );

  // ── Active-state updater ─────────────────────────────────────────────────
  function update(): void {
    const ed = getEditor();
    if (!ed) return;

    toggle(boldBtn,      ed.isActive('bold'));
    toggle(italicBtn,    ed.isActive('italic'));
    toggle(underlineBtn, ed.isActive('underline'));
    toggle(strikeBtn,    ed.isActive('strike'));
    toggle(codeBtn,      ed.isActive('code'));
    toggle(linkBtn,      ed.isActive('link'));

    if      (ed.isActive('heading', { level: 1 })) typeLabel.textContent = 'H₁';
    else if (ed.isActive('heading', { level: 2 })) typeLabel.textContent = 'H₂';
    else if (ed.isActive('heading', { level: 3 })) typeLabel.textContent = 'H₃';
    else if (ed.isActive('bulletList'))             typeLabel.textContent = '•≡';
    else if (ed.isActive('orderedList'))            typeLabel.textContent = '1≡';
    else if (ed.isActive('blockquote'))             typeLabel.textContent = '❝';
    else if (ed.isActive('codeBlock'))              typeLabel.textContent = '</>';
    else                                            typeLabel.textContent = 'T';
  }

  // ── Dropdown state ───────────────────────────────────────────────────────
  let activeMenu: HTMLElement | null = null;

  function closeMenu(): void {
    activeMenu?.remove();
    activeMenu = null;
    document.removeEventListener('mousedown', onOutside, true);
  }

  function onOutside(e: MouseEvent): void {
    if (!root.contains(e.target as Node) && !activeMenu?.contains(e.target as Node)) {
      closeMenu();
    }
  }

  function openMenu(anchor: HTMLElement, menu: HTMLElement): void {
    closeMenu();
    menu.className = menu.className || 'km-bm__dropdown';
    document.body.appendChild(menu);
    const ar = anchor.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    menu.style.cssText = `position:fixed;z-index:10001;top:${rr.bottom + 6}px;left:${ar.left}px`;
    requestAnimationFrame(() => {
      const mr = menu.getBoundingClientRect();
      if (mr.right > window.innerWidth - 8) {
        menu.style.left = `${window.innerWidth - mr.width - 8}px`;
      }
    });
    activeMenu = menu;
    document.addEventListener('mousedown', onOutside, true);
  }

  // ── Type dropdown ────────────────────────────────────────────────────────
  typeBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    const ed = getEditor(); if (!ed) return;
    const menu = dropdown();
    const types: Array<{ icon: string; label: string; run: () => void }> = [
      { icon: 'T',   label: 'Text',         run: () => ed.chain().focus().setParagraph().run() },
      { icon: 'H₁',  label: 'Heading 1',    run: () => ed.chain().focus().setHeading({ level: 1 }).run() },
      { icon: 'H₂',  label: 'Heading 2',    run: () => ed.chain().focus().setHeading({ level: 2 }).run() },
      { icon: 'H₃',  label: 'Heading 3',    run: () => ed.chain().focus().setHeading({ level: 3 }).run() },
      { icon: '•≡',  label: 'Bullet List',  run: () => ed.chain().focus().toggleBulletList().run() },
      { icon: '1≡',  label: 'Numbered',     run: () => ed.chain().focus().toggleOrderedList().run() },
      { icon: '❝',   label: 'Blockquote',   run: () => ed.chain().focus().setBlockquote().run() },
      { icon: '</>',  label: 'Code Block',   run: () => ed.chain().focus().toggleCodeBlock().run() },
    ];
    for (const t of types) {
      const b = ddItem(t.icon, t.label);
      b.addEventListener('mousedown', ev => { ev.preventDefault(); t.run(); closeMenu(); update(); });
      menu.appendChild(b);
    }
    openMenu(typeBtn, menu);
  });

  // ── Format buttons ───────────────────────────────────────────────────────
  boldBtn.addEventListener('mousedown', e => {
    e.preventDefault(); getEditor()?.chain().focus().toggleBold().run(); update();
  });
  italicBtn.addEventListener('mousedown', e => {
    e.preventDefault(); getEditor()?.chain().focus().toggleItalic().run(); update();
  });
  underlineBtn.addEventListener('mousedown', e => {
    e.preventDefault(); getEditor()?.chain().focus().toggleUnderline().run(); update();
  });
  strikeBtn.addEventListener('mousedown', e => {
    e.preventDefault(); getEditor()?.chain().focus().toggleStrike().run(); update();
  });
  codeBtn.addEventListener('mousedown', e => {
    e.preventDefault(); getEditor()?.chain().focus().toggleCode().run(); update();
  });
  linkBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    const ed = getEditor(); if (!ed) return;
    const prev = (ed.getAttributes('link')['href'] as string) ?? '';
    const url = window.prompt('URL', prev);
    if (url === null) return;
    url ? ed.chain().focus().setLink({ href: url }).run()
        : ed.chain().focus().unsetLink().run();
    update();
  });

  // ── Highlight dropdown ───────────────────────────────────────────────────
  hlBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    const ed = getEditor(); if (!ed) return;
    const menu = dropdown('km-bm__dropdown km-bm__dropdown--colors');
    menu.appendChild(ddLabel('Highlight'));
    const row = swatchRow();
    for (const c of HIGHLIGHT_COLORS) {
      const s = swatch(c.color, c.label);
      s.addEventListener('mousedown', ev => {
        ev.preventDefault(); ed.chain().focus().setHighlight({ color: c.color }).run(); closeMenu();
      });
      row.appendChild(s);
    }
    const clr = clearSwatch();
    clr.addEventListener('mousedown', ev => {
      ev.preventDefault(); ed.chain().focus().unsetHighlight().run(); closeMenu();
    });
    row.appendChild(clr);
    menu.appendChild(row);
    openMenu(hlBtn, menu);
  });

  // ── Text color dropdown ──────────────────────────────────────────────────
  tcBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    const ed = getEditor(); if (!ed) return;
    const menu = dropdown('km-bm__dropdown km-bm__dropdown--colors');
    menu.appendChild(ddLabel('Text color'));
    const row = swatchRow();
    for (const c of TEXT_COLORS) {
      const s = swatch(c.color, c.label);
      s.addEventListener('mousedown', ev => {
        ev.preventDefault(); ed.chain().focus().setColor(c.color).run(); closeMenu();
      });
      row.appendChild(s);
    }
    const clr = clearSwatch();
    clr.addEventListener('mousedown', ev => {
      ev.preventDefault(); ed.chain().focus().unsetColor().run(); closeMenu();
    });
    row.appendChild(clr);
    menu.appendChild(row);
    openMenu(tcBtn, menu);
  });

  // ── More dropdown ────────────────────────────────────────────────────────
  moreBtn.addEventListener('mousedown', e => {
    e.preventDefault();
    if (!callbacks) return;
    const ed = getEditor(); if (!ed) return;
    const menu = dropdown();
    menu.appendChild(ddLabel('Extract to K-MAPS'));
    const actions = [
      { icon: '🌍', label: 'WV Topic',   fn: callbacks.extractToTopic },
      { icon: 'ع',  label: 'Vocabulary', fn: callbacks.extractToVocab },
      { icon: '☑',  label: 'Task',       fn: callbacks.extractToTask },
      { icon: '🃏', label: 'SRS Card',   fn: callbacks.createSrsCard },
    ];
    for (const a of actions) {
      const b = ddItem(a.icon, a.label);
      b.addEventListener('mousedown', ev => {
        ev.preventDefault();
        const { from, to } = ed.state.selection;
        a.fn(ed.state.doc.textBetween(from, to, ' '));
        closeMenu();
      });
      menu.appendChild(b);
    }
    openMenu(moreBtn, menu);
  });

  return { element: root, update };
}

// ── DOM helpers ──────────────────────────────────────────────────────────

function btn(cls: string, text?: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = cls;
  if (text) b.textContent = text;
  return b;
}

function sep(): HTMLElement {
  const d = document.createElement('div');
  d.className = 'km-bm__sep';
  return d;
}

function chevron(): SVGSVGElement {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 10 6');
  s.setAttribute('class', 'km-bm__chevron');
  s.innerHTML = '<path d="M0 0l5 6 5-6z" fill="currentColor"/>';
  return s;
}

function colorWrap(title: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'km-bm__color-wrap';
  b.title = title;
  b.appendChild(chevron());
  return b;
}

function toggle(el: HTMLElement, on: boolean): void {
  el.classList.toggle('km-bm__btn--active', on);
}

function dropdown(cls = 'km-bm__dropdown'): HTMLElement {
  const d = document.createElement('div');
  d.className = cls;
  return d;
}

function ddLabel(text: string): HTMLElement {
  const d = document.createElement('div');
  d.className = 'km-bm__dd-label';
  d.textContent = text;
  return d;
}

function ddItem(icon: string, label: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'km-bm__dd-item';
  b.innerHTML = `<span class="km-bm__dd-icon">${icon}</span><span>${label}</span>`;
  return b;
}

function swatchRow(): HTMLElement {
  const d = document.createElement('div');
  d.className = 'km-bm__swatches';
  return d;
}

function swatch(color: string, label: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'km-bm__swatch';
  b.style.background = color;
  b.title = label;
  return b;
}

function clearSwatch(): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'km-bm__swatch km-bm__swatch--clear';
  b.textContent = '✕';
  b.title = 'Clear';
  return b;
}

// ── Styles ───────────────────────────────────────────────────────────────

function injectStyles(): void {
  if (document.getElementById('km-bm-styles')) return;
  const s = document.createElement('style');
  s.id = 'km-bm-styles';
  s.textContent = `
    .km-bm {
      display: flex; align-items: center; gap: 1px;
      background: #1e1e1e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 3px 5px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4);
      white-space: nowrap;
      font-family: var(--km-font-body, system-ui);
      user-select: none;
    }

    .km-bm__type {
      display: flex; align-items: center; gap: 4px;
      padding: 3px 8px; border-radius: 6px;
      background: transparent; border: none;
      color: rgba(255,255,255,0.85);
      font-size: 0.78rem; font-weight: 700;
      cursor: pointer; min-width: 36px; height: 28px;
    }
    .km-bm__type:hover { background: rgba(255,255,255,0.08); }

    .km-bm__btn {
      background: transparent; border: none;
      color: rgba(255,255,255,0.82);
      padding: 0 5px; border-radius: 6px; cursor: pointer;
      font-size: 0.8rem; font-family: inherit;
      display: flex; align-items: center; justify-content: center;
      min-width: 28px; height: 28px;
    }
    .km-bm__btn:hover { background: rgba(255,255,255,0.09); color: #fff; }
    .km-bm__btn--active { background: rgba(201,168,76,0.18); color: #c9a84c; }
    .km-bm__btn--bold      { font-weight: 700; }
    .km-bm__btn--italic    { font-style: italic; }
    .km-bm__btn--underline { text-decoration: underline; text-underline-offset: 2px; }
    .km-bm__btn--strike    { text-decoration: line-through; }
    .km-bm__btn--more      { font-size: 1rem; letter-spacing: 1px; opacity: .7; }
    .km-bm__btn--more:hover { opacity: 1; }

    .km-bm__color-wrap {
      display: flex; align-items: center; gap: 3px;
      padding: 3px 6px; border-radius: 6px; cursor: pointer;
      background: transparent; border: none; height: 28px;
    }
    .km-bm__color-wrap:hover { background: rgba(255,255,255,0.08); }

    .km-bm__color-a {
      font-size: .9rem; font-weight: 800;
      color: rgba(255,255,255,0.85);
      text-decoration: none;
    }
    .km-bm__color-a--hl {
      text-decoration: underline 2.5px solid rgba(201,168,76,0.65);
      text-underline-offset: 2px;
    }

    .km-bm__chevron { width: 7px; height: 4px; opacity: .4; }

    .km-bm__sep {
      width: 1px; height: 18px;
      background: rgba(255,255,255,0.1);
      margin: 0 3px; flex-shrink: 0;
    }

    .km-bm__dropdown {
      background: #1e1e1e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 5px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      min-width: 160px;
      animation: km-bm-dd 0.1s ease;
    }
    @keyframes km-bm-dd {
      from { opacity: 0; transform: translateY(-4px) scale(.97); }
      to   { opacity: 1; transform: none; }
    }
    .km-bm__dropdown--colors { min-width: 0; }

    .km-bm__dd-label {
      font-size: .6rem; font-weight: 700; letter-spacing: .08em;
      text-transform: uppercase; color: rgba(255,255,255,0.28);
      padding: 4px 8px 3px;
    }
    .km-bm__dd-item {
      display: flex; align-items: center; gap: 9px;
      width: 100%; padding: 6px 8px;
      background: transparent; border: none;
      border-radius: 6px; color: rgba(255,255,255,0.82);
      font-size: .82rem; cursor: pointer; text-align: left;
      font-family: var(--km-font-body, system-ui);
    }
    .km-bm__dd-item:hover { background: rgba(255,255,255,0.07); }
    .km-bm__dd-icon { font-size: .8rem; font-weight: 700; width: 22px; text-align: center; flex-shrink: 0; }

    .km-bm__swatches { display: flex; gap: 5px; padding: 2px 4px 4px; }
    .km-bm__swatch {
      width: 22px; height: 22px; border-radius: 5px;
      border: 1.5px solid rgba(255,255,255,0.12);
      cursor: pointer; flex-shrink: 0;
    }
    .km-bm__swatch:hover { outline: 2px solid rgba(255,255,255,0.4); outline-offset: 1px; }
    .km-bm__swatch--clear {
      background: rgba(255,255,255,0.06) !important;
      color: rgba(255,255,255,0.4); font-size: .65rem;
      display: flex; align-items: center; justify-content: center;
    }
  `;
  document.head.appendChild(s);
}
