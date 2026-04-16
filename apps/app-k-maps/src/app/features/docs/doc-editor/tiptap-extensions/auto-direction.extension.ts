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

        appendTransaction(transactions, _oldState, newState) {
          // Only act on transactions that changed the document
          const changingTrs = transactions.filter(tr => tr.docChanged);
          if (changingTrs.length === 0) return null;

          // Defer the node-scan to a microtask so it runs after ProseMirror
          // has finished its own render cycle, eliminating the synchronous
          // CPU spike on every keystroke.
          if (!pendingScan) {
            pendingScan = true;

            // Collect the affected ranges from all changing transactions
            // BEFORE the microtask fires (state may advance by then).
            // We union all step-mapped ranges so we only scan changed nodes,
            // not the whole document — O(changed) instead of O(total).
            const ranges: Array<{ from: number; to: number }> = [];
            for (const tr of changingTrs) {
              let mapping = tr.mapping;
              tr.steps.forEach((step, i) => {
                const stepMap = mapping.slice(i, i + 1);
                stepMap.ranges.forEach((_offset, oldFrom, oldTo) => {
                  // Map old positions forward to the post-transaction doc
                  const from = tr.mapping.map(oldFrom, -1);
                  const to   = tr.mapping.map(oldTo,    1);
                  ranges.push({ from: Math.max(0, from - 1), to: Math.min(newState.doc.content.size, to + 1) });
                });
              });
            }

            queueMicrotask(() => {
              pendingScan = false;
              const view = editor?.view;
              if (!view || (view as unknown as { isDestroyed?: boolean }).isDestroyed) return;

              const state = view.state;
              const docTr = state.tr;
              let changed = false;

              // Scan only the nodes within the changed ranges
              for (const { from, to } of ranges) {
                const safeFrom = Math.max(0, from);
                const safeTo   = Math.min(state.doc.content.size, to);
                if (safeFrom >= safeTo) continue;

                state.doc.nodesBetween(safeFrom, safeTo, (node, pos) => {
                  if (!BLOCK_TYPES.has(node.type.name)) return;
                  const text = node.textContent;
                  if (!text.trim()) return;
                  const dir = detectDir(text);
                  if (node.attrs['dir'] !== dir) {
                    docTr.setNodeMarkup(pos, undefined, { ...node.attrs, dir });
                    changed = true;
                  }
                });
              }

              if (changed) view.dispatch(docTr);
            });
          }

          // Always return null — direction is dispatched asynchronously above
          return null;
        },
      }),
    ];
  },
});
