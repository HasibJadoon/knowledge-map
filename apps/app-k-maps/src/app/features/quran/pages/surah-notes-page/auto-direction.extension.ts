/**
 * AutoDirection — automatically adds dir="rtl" or dir="ltr" to block-level
 * DOM elements by inspecting their text content after every document change.
 *
 * Uses ProseMirror Decorations (view-only) so no schema changes are required —
 * works with the basic StarterKit without tiptap-text-direction.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DecorationSet, Decoration } from '@tiptap/pm/view';
import type { Node as PmNode } from '@tiptap/pm/model';

// Arabic Unicode ranges (basic + extended + presentation forms)
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN  = /[a-zA-Z]/;

function detectDir(text: string): 'rtl' | 'ltr' {
  let arabic = 0, latin = 0;
  for (const ch of text) {
    if (ARABIC.test(ch)) arabic++;
    else if (LATIN.test(ch))  latin++;
  }
  return arabic > 0 && arabic >= latin ? 'rtl' : 'ltr';
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'blockquote']);

function buildDecorations(doc: PmNode): DecorationSet {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!BLOCK_TYPES.has(node.type.name)) return;
    const text = node.textContent;
    if (!text.trim()) return;                     // leave empty blocks alone

    const dir = detectDir(text);
    decorations.push(
      Decoration.node(pos, pos + node.nodeSize, { dir })
    );
  });

  return DecorationSet.create(doc, decorations);
}

const autoDirectionKey = new PluginKey<DecorationSet>('autoDirection');

export const AutoDirection = Extension.create({
  name: 'autoDirection',

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: autoDirectionKey,

        state: {
          init(_, { doc }) { return buildDecorations(doc); },
          apply(tr, old)   { return tr.docChanged ? buildDecorations(tr.doc) : old; },
        },

        props: {
          decorations(state) { return autoDirectionKey.getState(state); },
        },
      }),
    ];
  },
});
