import { Extension } from '@tiptap/core';

/**
 * Adds `dir` and `lang` attributes to block nodes so Arabic paragraphs
 * render RTL with the correct font automatically.
 *
 * Usage:
 *   editor.chain().focus().setTextDirection('rtl').run()
 *   editor.chain().focus().setTextDirection('ltr').run()
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    textDirection: {
      setTextDirection: (dir: 'ltr' | 'rtl') => ReturnType;
      unsetTextDirection: () => ReturnType;
    };
  }
}

const BLOCK_NODES = ['paragraph', 'heading', 'blockquote', 'listItem', 'codeBlock'];

export const TextDirection = Extension.create({
  name: 'textDirection',

  addGlobalAttributes() {
    return [
      {
        types: BLOCK_NODES,
        attributes: {
          dir: {
            default: null,
            parseHTML: el => el.getAttribute('dir'),
            renderHTML: attrs => attrs['dir'] ? { dir: attrs['dir'] } : {},
          },
          lang: {
            default: null,
            parseHTML: el => el.getAttribute('lang'),
            renderHTML: attrs => attrs['lang'] ? { lang: attrs['lang'] } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setTextDirection: (dir) => ({ commands }) => {
        return BLOCK_NODES.every(type =>
          commands.updateAttributes(type, {
            dir,
            lang: dir === 'rtl' ? 'ar' : null,
          })
        );
      },
      unsetTextDirection: () => ({ commands }) => {
        return BLOCK_NODES.every(type =>
          commands.updateAttributes(type, { dir: null, lang: null })
        );
      },
    };
  },
});
