/**
 * AutoDirection — automatically sets dir="rtl" or dir="ltr" on each block
 * by examining its text content after every document change.
 *
 * Works together with the tiptap-text-direction extension which adds the
 * `dir` attribute to the ProseMirror schema for the configured node types.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Arabic Unicode ranges (basic + extended + presentation forms)
const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN  = /[a-zA-Z]/;

/** Returns 'rtl' when Arabic characters dominate (or tie), 'ltr' otherwise. */
function detectDir(text: string): 'rtl' | 'ltr' {
  let arabic = 0, latin = 0;
  for (const ch of text) {
    if (ARABIC.test(ch)) arabic++;
    else if (LATIN.test(ch)) latin++;
  }
  // Arabic dominates or ties → RTL
  return arabic > 0 && arabic >= latin ? 'rtl' : 'ltr';
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'blockquote']);

const autoDirectionKey = new PluginKey('autoDirection');

export const AutoDirection = Extension.create({
  name: 'autoDirection',

  addProseMirrorPlugins() {
    // Gate flag: true while a microtask scan is already queued.
    // Prevents scheduling multiple concurrent scans during a burst of
    // transactions (e.g. paste inserting many nodes at once).
    let pendingScan = false;
    const editor = this.editor;

    return [
      new Plugin({
        key: autoDirectionKey,

        appendTransaction(transactions, _oldState, _newState) {
          // Only act on transactions that changed the document
          if (!transactions.some(tr => tr.docChanged)) return null;

          // Defer the expensive node-scan to a microtask so it runs
          // after ProseMirror has finished its own render cycle.
          // This eliminates the synchronous CPU spike on every keystroke.
          if (!pendingScan) {
            pendingScan = true;
            queueMicrotask(() => {
              pendingScan = false;
              const view = editor?.view;
              if (!view || (view as unknown as { isDestroyed?: boolean }).isDestroyed) return;

              const state = view.state;
              const tr = state.tr;
              let changed = false;

              state.doc.descendants((node, pos) => {
                if (!BLOCK_TYPES.has(node.type.name)) return;
                const text = node.textContent;
                if (!text.trim()) return;
                const dir = detectDir(text);
                if (node.attrs['dir'] !== dir) {
                  tr.setNodeMarkup(pos, undefined, { ...node.attrs, dir });
                  changed = true;
                }
              });

              if (changed) view.dispatch(tr);
            });
          }

          // Always return null — direction is dispatched asynchronously above
          return null;
        },
      }),
    ];
  },
});
