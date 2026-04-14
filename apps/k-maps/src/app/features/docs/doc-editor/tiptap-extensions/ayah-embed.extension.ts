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
      const dom = document.createElement('div');
      dom.className = 'km-block km-block--ayah';
      dom.setAttribute('dir', 'rtl');
      dom.contentEditable = 'false';

      const renderDom = () => {
        const attrs = node.attrs as AyahEmbedAttrs;
        dom.innerHTML = `
          <div class="ayah-text">${attrs.text_uthmani ?? ''}</div>
          ${attrs.show_translation ? `<div class="ayah-translation">${attrs.translation ?? ''}</div>` : ''}
          <div class="ayah-ref">${attrs.surah ?? ''}:${attrs.ayah ?? ''}</div>
        `;
      };

      renderDom();
      return { dom };
    };
  }
});
