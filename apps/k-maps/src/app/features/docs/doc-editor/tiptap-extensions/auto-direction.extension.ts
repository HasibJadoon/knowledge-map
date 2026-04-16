/**
 * AutoDirection — automatically sets dir="rtl" or dir="ltr" on each block
 * by examining its text content after every document change.
 *
 * Works together with the tiptap-text-direction extension which adds the
 * `dir` attribute to the ProseMirror schema for the configured node types.
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Arabic Unicode ranges — compiled once, reused across calls
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LATIN_RE  = /[a-zA-Z]/g;

/** Returns 'rtl' when Arabic characters dominate or tie, 'ltr' otherwise.
 *  Uses matchAll-length instead of per-character regex to avoid O(n·regex) cost. */
function detectDir(text: string): 'rtl' | 'ltr' {
  const arabic = text.match(ARABIC_RE)?.length ?? 0;
  if (arabic === 0) return 'ltr';
  const latin = text.match(LATIN_RE)?.length ?? 0;
  return arabic >= latin ? 'rtl' : 'ltr';
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'blockquote']);

const autoDirectionKey = new PluginKey('autoDirection');

export const AutoDirection = Extension.create({
  name: 'autoDirection',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: autoDirectionKey,

        appendTransaction(transactions, _oldState, newState) {
          // Only act on transactions that changed the document
          if (!transactions.some(t => t.docChanged)) return null;

          // ── Find the bounding range of all changed content ──────────────
          // Using step maps is O(steps) instead of O(all nodes), so we only
          // scan the paragraph(s) that actually changed.
          let scanFrom = newState.doc.content.size;
          let scanTo   = 0;

          for (const t of transactions) {
            if (!t.docChanged) continue;
            for (let i = 0; i < t.steps.length; i++) {
              t.mapping.maps[i].forEach((_oF, _oT, nF, nT) => {
                if (nF < scanFrom) scanFrom = nF;
                if (nT > scanTo)   scanTo   = nT;
              });
            }
          }

          if (scanFrom > scanTo) return null;

          // Expand to surrounding block boundaries (+/- 2 keeps us in the
          // same top-level block even for insertions at the very start/end)
          scanFrom = Math.max(0, scanFrom - 2);
          scanTo   = Math.min(newState.doc.content.size, scanTo + 2);

          // ── Check only nodes within the changed range ───────────────────
          const tr = newState.tr;
          let changed = false;

          newState.doc.nodesBetween(scanFrom, scanTo, (node, pos) => {
            if (!BLOCK_TYPES.has(node.type.name)) return;
            const text = node.textContent;
            if (!text.trim()) return;
            const dir = detectDir(text);
            if (node.attrs['dir'] !== dir) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, dir });
              changed = true;
            }
          });

          return changed ? tr : null;
        },
      }),
    ];
  },
});
