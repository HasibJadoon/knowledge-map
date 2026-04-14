import { Node, mergeAttributes } from '@tiptap/core';

export interface AyahEmbedAttrs {
  id: string | null;
  surah: number | null;
  ayah: number | null;
  text_uthmani: string;
  translation: string;
  show_translation: boolean;
  highlight_color: string | null;
  tafsir_note: string | null;
  dir: 'rtl';
  lang: 'ar';
}

const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
</svg>`;

const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13">
  <polyline points="20 6 9 17 4 12"/>
</svg>`;

export const AyahEmbed = Node.create<object, object>({
  name: 'ayah_embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id:               { default: null },
      surah:            { default: null },
      ayah:             { default: null },
      text_uthmani:     { default: '' },
      translation:      { default: '' },
      show_translation: { default: true },
      highlight_color:  { default: null },
      tafsir_note:      { default: null },
      dir:              { default: 'rtl' },
      lang:             { default: 'ar' },
    };
  },

  parseHTML() {
    return [{ tag: 'km-ayah-embed' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['km-ayah-embed', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ({ node }) => {
      // ── Outer wrapper (atom — ProseMirror / we set contentEditable=false) ──
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--ayah';
      dom.setAttribute('dir', 'rtl');
      dom.contentEditable = 'false';

      // ── Content area (innerHTML updated on attrs change) ───────────────────
      const contentArea = document.createElement('div');
      contentArea.className = 'km-ayah-content';
      dom.appendChild(contentArea);

      // ── Copy button (LTR, positioned top-left physically / top-end for RTL) ─
      const copyBtn = document.createElement('button');
      copyBtn.className = 'km-ayah-copy';
      copyBtn.setAttribute('dir', 'ltr');
      copyBtn.setAttribute('title', 'Copy verse');
      copyBtn.innerHTML = COPY_ICON;

      copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const attrs = node.attrs as AyahEmbedAttrs;
        const lines = [attrs.text_uthmani, attrs.translation].filter(Boolean);
        if (attrs.surah && attrs.ayah) lines.push(`(${attrs.surah}:${attrs.ayah})`);
        navigator.clipboard.writeText(lines.join('\n')).then(() => {
          copyBtn.innerHTML = CHECK_ICON;
          copyBtn.classList.add('km-ayah-copy--done');
          setTimeout(() => {
            copyBtn.innerHTML = COPY_ICON;
            copyBtn.classList.remove('km-ayah-copy--done');
          }, 1800);
        }).catch(() => {/* clipboard unavailable */});
      });

      dom.appendChild(copyBtn);

      // ── Render content ─────────────────────────────────────────────────────
      const renderContent = (attrs: AyahEmbedAttrs) => {
        contentArea.innerHTML = `
          <div class="ayah-text">${attrs.text_uthmani ?? ''}</div>
          ${attrs.show_translation
            ? `<div class="ayah-translation">${attrs.translation ?? ''}</div>`
            : ''}
          <div class="ayah-ref">${attrs.surah ?? ''}:${attrs.ayah ?? ''}</div>
        `;
      };

      renderContent(node.attrs as AyahEmbedAttrs);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'ayah_embed') return false;
          renderContent(updatedNode.attrs as AyahEmbedAttrs);
          return true;
        },
      };
    };
  }
});
