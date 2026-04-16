/**
 * AutoDirection — automatically sets dir="rtl" or dir="ltr" on each block
 * by examining its text content after document changes.
 *
 * Works together with the tiptap-text-direction extension which adds the
 * `dir` attribute to the ProseMirror schema for the configured node types.
 *
 * iOS performance strategy:
 *   • Direction-correction transactions are tagged with a meta-flag so the
 *     plugin never schedules a re-scan for its own dispatches (eliminates the
 *     previously wasted second microtask after every direction change).
 *   • On iOS the scan is debounced to 300 ms instead of a microtask, so
 *     continuous typing coalesces into at most ~3 scans/sec rather than one
 *     per keystroke.  Direction still updates after any pause in typing,
 *     and immediately after paste (meta 'paste' bypasses the debounce).
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
  return arabic > 0 && arabic >= latin ? 'rtl' : 'ltr';
}

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'blockquote']);

const autoDirectionKey = new PluginKey<boolean>('autoDirection');

// On iOS/iPadOS use a coarser debounce so rapid typing doesn't scan every frame.
const isIOS = typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

const SCAN_DELAY = isIOS ? 300 : 0; // ms — 0 → queueMicrotask equivalent via setTimeout(0)

export const AutoDirection = Extension.create({
  name: 'autoDirection',

  addProseMirrorPlugins() {
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;
    const editor = this.editor;

    return [
      new Plugin({
        key: autoDirectionKey,

        appendTransaction(transactions, _oldState, newState) {
          const changingTrs = transactions.filter(tr => tr.docChanged);
          if (changingTrs.length === 0) return null;

          // Skip if this batch already contains our own direction-correction
          // transaction — prevents the correction dispatch from triggering
          // a redundant re-scan of the same nodes.
          if (changingTrs.some(tr => tr.getMeta(autoDirectionKey))) return null;

          // On iOS: paste transactions bypass the debounce so direction updates
          // immediately after pasting mixed-language content.
          const isPaste = changingTrs.some(tr => tr.getMeta('paste'));
          const delay   = (isIOS && !isPaste) ? SCAN_DELAY : 0;

          // Collect affected ranges before the timer fires (state may advance).
          // Union step-mapped ranges so we scan only changed nodes — O(changed).
          const ranges: Array<{ from: number; to: number }> = [];
          for (const tr of changingTrs) {
            tr.steps.forEach((step) => {
              const stepMap = step.getMap();
              stepMap.forEach((oldFrom: number, oldTo: number) => {
                const from = tr.mapping.map(oldFrom, -1);
                const to   = tr.mapping.map(oldTo,    1);
                ranges.push({
                  from: Math.max(0, from - 1),
                  to:   Math.min(newState.doc.content.size, to + 1),
                });
              });
            });
          }

          // Debounce: cancel any queued scan and reschedule.
          if (pendingTimer !== null) clearTimeout(pendingTimer);
          pendingTimer = setTimeout(() => {
            pendingTimer = null;
            const view = editor?.view;
            if (!view || (view as unknown as { isDestroyed?: boolean }).isDestroyed) return;

            const state   = view.state;
            const docTr   = state.tr;
            let   changed = false;

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

            if (changed) {
              // Tag so the plugin ignores this correction transaction.
              docTr.setMeta(autoDirectionKey, true);
              view.dispatch(docTr);
            }
          }, delay);

          return null;
        },
      }),
    ];
  },
});
