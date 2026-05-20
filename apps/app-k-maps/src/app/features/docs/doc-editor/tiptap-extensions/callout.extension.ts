import { Node, mergeAttributes } from '@tiptap/core';

// ── Callout variant config ───────────────────────────────────────────────────
const CALLOUT_VARIANTS: Record<string, { emoji: string; border: string; bg: string }> = {
  tip:     { emoji: '💡', border: '#c9a84c',                    bg: 'rgba(201,168,76,0.10)' },
  info:    { emoji: 'ℹ️',  border: '#3b82f6',                    bg: 'rgba(59,130,246,0.08)' },
  warning: { emoji: '⚠️', border: '#f59e0b',                    bg: 'rgba(245,158,11,0.08)' },
  danger:  { emoji: '🚨', border: '#ef4444',                    bg: 'rgba(239,68,68,0.08)'  },
  success: { emoji: '✅', border: '#22c55e',                    bg: 'rgba(34,197,94,0.08)'  },
  quote:   { emoji: '💬', border: 'rgba(255,255,255,0.12)',     bg: 'rgba(255,255,255,0.04)' },
};

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      type: {
        default: 'tip',
        parseHTML: el => el.getAttribute('data-callout-type') ?? 'tip',
        renderHTML: attrs => ({ 'data-callout-type': attrs['type'] }),
      },
      emoji: {
        default: '💡',
        parseHTML: el => el.getAttribute('data-callout-emoji') ?? '💡',
        renderHTML: attrs => ({ 'data-callout-emoji': attrs['emoji'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = CALLOUT_VARIANTS[node.attrs['type']] ?? CALLOUT_VARIANTS['tip'];
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'callout',
        'data-callout-type': node.attrs['type'],
        'data-callout-emoji': node.attrs['emoji'] ?? variant.emoji,
        class: `km-callout km-callout--${node.attrs['type']}`,
      }),
      0,
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      if (!document.getElementById('km-callout-styles')) {
        const style = document.createElement('style');
        style.id = 'km-callout-styles';
        style.textContent = `
          .km-callout {
            display: flex; gap: 12px;
            padding: 13px 16px 13px 14px; margin: 8px 0;
            border-left: none;
            border-radius: 10px;
            position: relative;
            box-shadow: 0 1px 4px rgba(0,0,0,0.18);
            transition: background 0.2s;
            touch-action: manipulation;
          }
          .km-callout::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0; width: 4px;
            border-radius: 10px 0 0 10px;
          }
          /* ── Variants ── */
          .km-callout--tip     { background: rgba(201,168,76,0.10); }
          .km-callout--tip::before     { background: #c9a84c; }
          .km-callout--info    { background: rgba(59,130,246,0.08); }
          .km-callout--info::before    { background: #3b82f6; }
          .km-callout--warning { background: rgba(245,158,11,0.08); }
          .km-callout--warning::before { background: #f59e0b; }
          .km-callout--danger  { background: rgba(239,68,68,0.08); }
          .km-callout--danger::before  { background: #ef4444; }
          .km-callout--success { background: rgba(34,197,94,0.08); }
          .km-callout--success::before { background: #22c55e; }
          .km-callout--quote   { background: rgba(255,255,255,0.04); font-style: italic; }
          .km-callout--quote::before   { background: rgba(255,255,255,0.18); }
          /* ── Emoji ── */
          .km-callout__emoji {
            font-size: 1.3rem; line-height: 1.5;
            cursor: pointer; user-select: none;
            flex-shrink: 0; min-width: 1.75rem;
            text-align: center;
            transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
            margin-top: 0;
            -webkit-tap-highlight-color: transparent;
          }
          .km-callout__emoji:active { transform: scale(1.25) rotate(-8deg); }
          .km-callout__content {
            flex: 1; min-width: 0; min-height: 2em;
            color: rgba(255,255,255,0.88);
            cursor: text;
            font-size: 0.975rem;
            line-height: 1.75;
            -webkit-user-select: text !important;
            user-select: text !important;
            touch-action: manipulation;
          }
          .km-callout__content .ProseMirror-trailingBreak { display: none; }
          /* ── Picker ── */
          .km-callout__picker {
            position: fixed; z-index: 15000;
            background: #1c1c1e;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 14px; padding: 8px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.3);
            animation: km-ep-in 0.12s cubic-bezier(0.22,1,0.36,1);
            min-width: 200px;
          }
          @keyframes km-ep-in {
            from { opacity: 0; transform: scale(0.92) translateY(-6px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          .km-callout__picker-section {
            padding: 4px 6px 2px;
            font-size: 0.65rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: rgba(255,255,255,0.3);
          }
          .km-callout__picker-row {
            display: flex; flex-wrap: wrap; gap: 3px; padding: 2px 0;
          }
          .km-callout__ep-btn {
            width: 34px; height: 34px; border: none;
            background: transparent; border-radius: 8px;
            cursor: pointer; font-size: 1.1rem;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.12s;
            -webkit-tap-highlight-color: transparent;
          }
          .km-callout__ep-btn:hover,
          .km-callout__ep-btn:active { background: rgba(255,255,255,0.1); }
          .km-callout__variant-btn {
            display: flex; align-items: center; gap: 8px;
            width: 100%; padding: 7px 8px;
            border: none; background: transparent;
            border-radius: 8px; cursor: pointer;
            color: rgba(255,255,255,0.78);
            font-size: 0.85rem; text-align: left;
            -webkit-tap-highlight-color: transparent;
            transition: background 0.12s;
          }
          .km-callout__variant-btn:hover,
          .km-callout__variant-btn:active { background: rgba(255,255,255,0.08); }
          .km-callout__variant-btn span { font-size: 1rem; }
          .km-callout__picker-sep {
            height: 1px; background: rgba(255,255,255,0.08); margin: 5px 0;
          }
        `;
        document.head.appendChild(style);
      }

      const VARIANTS = [
        { type: 'tip',     emoji: '💡', label: 'Tip'     },
        { type: 'info',    emoji: 'ℹ️',  label: 'Info'    },
        { type: 'warning', emoji: '⚠️', label: 'Warning' },
        { type: 'danger',  emoji: '🚨', label: 'Danger'  },
        { type: 'success', emoji: '✅', label: 'Success' },
        { type: 'quote',   emoji: '💬', label: 'Quote'   },
      ];
      const EXTRA_EMOJIS = ['📌','❌','🔥','📝','🎯','🌟','❓','💭','📚','🔍','⚡','🌙','🕌','📖','🌿','✨'];

      const currentType = node.attrs['type'] || 'tip';
      const currentEmoji = node.attrs['emoji'] || CALLOUT_VARIANTS[currentType]?.emoji || '💡';

      const dom = document.createElement('div');
      dom.className = `km-callout km-callout--${currentType}`;
      dom.setAttribute('data-type', 'callout');
      dom.setAttribute('data-callout-type', currentType);

      const emojiEl = document.createElement('span');
      emojiEl.className = 'km-callout__emoji';
      emojiEl.contentEditable = 'false';
      emojiEl.textContent = currentEmoji;

      const contentEl = document.createElement('div');
      contentEl.className = 'km-callout__content';

      dom.appendChild(emojiEl);
      dom.appendChild(contentEl);

      let pickerEl: HTMLElement | null = null;

      const closePicker = () => { pickerEl?.remove(); pickerEl = null; };

      const applyAttrs = (type: string, emoji: string) => {
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos !== null && pos !== undefined) {
          editor.chain().focus().command(({ tr }) => {
            tr.setNodeAttribute(pos, 'type', type);
            tr.setNodeAttribute(pos, 'emoji', emoji);
            return true;
          }).run();
        }
        // Eagerly update DOM so it feels instant
        dom.className = `km-callout km-callout--${type}`;
        dom.setAttribute('data-callout-type', type);
        emojiEl.textContent = emoji;
        closePicker();
      };

      // pointerup: fires immediately on touch-lift with no synthetic-click delay.
      // stopPropagation keeps the canvas pointerup handler from also firing.
      emojiEl.addEventListener('pointerup', (e: PointerEvent) => {
        if (!e.isPrimary) return;
        e.stopPropagation();
        e.preventDefault(); // suppress follow-up synthetic click
        if (pickerEl) { closePicker(); return; }

        pickerEl = document.createElement('div');
        pickerEl.className = 'km-callout__picker';

        // ── Variant section ──────────────────────────────────────────
        const variantLabel = document.createElement('div');
        variantLabel.className = 'km-callout__picker-section';
        variantLabel.textContent = 'Type';
        pickerEl.appendChild(variantLabel);

        VARIANTS.forEach(v => {
          const btn = document.createElement('button');
          btn.className = 'km-callout__variant-btn';
          btn.innerHTML = `<span>${v.emoji}</span>${v.label}`;
          // Single pointerdown handler covers touch and mouse; preventDefault
          // stops the editor from losing focus when the picker is tapped.
          btn.addEventListener('pointerdown', (ev) => { ev.preventDefault(); applyAttrs(v.type, v.emoji); });
          pickerEl!.appendChild(btn);
        });

        // ── Separator ────────────────────────────────────────────────
        const sep = document.createElement('div');
        sep.className = 'km-callout__picker-sep';
        pickerEl.appendChild(sep);

        // ── Extra emoji section ──────────────────────────────────────
        const emojiLabel = document.createElement('div');
        emojiLabel.className = 'km-callout__picker-section';
        emojiLabel.textContent = 'Emoji';
        pickerEl.appendChild(emojiLabel);

        const emojiRow = document.createElement('div');
        emojiRow.className = 'km-callout__picker-row';
        EXTRA_EMOJIS.forEach(em => {
          const btn = document.createElement('button');
          btn.className = 'km-callout__ep-btn';
          btn.textContent = em;
          btn.addEventListener('pointerdown', (ev) => {
            ev.preventDefault();
            const pos = typeof getPos === 'function' ? getPos() : null;
            if (pos !== null && pos !== undefined) {
              editor.chain().focus().command(({ tr }) => {
                tr.setNodeAttribute(pos, 'emoji', em);
                return true;
              }).run();
            }
            emojiEl.textContent = em;
            closePicker();
          });
          emojiRow.appendChild(btn);
        });
        pickerEl.appendChild(emojiRow);

        const rect = emojiEl.getBoundingClientRect();
        // Position above if near bottom of viewport
        const spaceBelow = window.innerHeight - rect.bottom;
        pickerEl.style.left = `${Math.min(rect.left, window.innerWidth - 220)}px`;
        if (spaceBelow < 280) {
          pickerEl.style.bottom = `${window.innerHeight - rect.top + 6}px`;
        } else {
          pickerEl.style.top  = `${rect.bottom + 6}px`;
        }
        document.body.appendChild(pickerEl);

        // Close picker when tapping anywhere outside it.
        // setTimeout(0) defers registration so the same pointerdown that
        // opened the picker doesn't immediately close it.
        setTimeout(() => {
          const handler = (ev: Event) => {
            if (!pickerEl?.contains(ev.target as globalThis.Node)) {
              closePicker();
              document.removeEventListener('pointerdown', handler);
            }
          };
          document.addEventListener('pointerdown', handler);
        }, 0);
      });

      // ── Focus routing ────────────────────────────────────────────────────
      // Two cases need manual help; everything else stays native so iOS's
      // tap-to-focus brings the keyboard up and the system Paste/Select
      // menu doesn't get triggered:
      //
      //  1. Tap landed OUTSIDE contentEl — the callout's outer padding /
      //     accent bar. No text there for ProseMirror to land on.
      //  2. Tap landed INSIDE contentEl but the callout is empty (just an
      //     auto-inserted blank paragraph). The visible target is too thin
      //     for iOS to focus reliably, so we route the caret ourselves.
      //
      // For a non-empty callout, taps on the content go to ProseMirror +
      // iOS native focus. Calling preventDefault on those breaks the focus
      // chain and triggers the iOS editing menu instead of placing a caret.
      dom.addEventListener('pointerup', (e: PointerEvent) => {
        if (!e.isPrimary) return;
        if (emojiEl.contains(e.target as globalThis.Node)) return;
        if (pickerEl?.contains(e.target as globalThis.Node)) return;

        const inContent = contentEl.contains(e.target as globalThis.Node);
        const calloutHasText = (contentEl.textContent ?? '').trim() !== '';
        if (inContent && calloutHasText) return;

        e.preventDefault();
        const nodePos = typeof getPos === 'function' ? getPos() : null;
        if (nodePos === null || nodePos === undefined) return;

        // Clamp the target position to inside this callout. posAtCoords
        // resolves to the nearest text run, which for a near-empty callout
        // is often a sibling paragraph below it — landing the caret outside
        // the callout and matching the "can't type in callout" report.
        const calloutNode = editor.state.doc.nodeAt(nodePos);
        const calloutEnd  = calloutNode ? nodePos + calloutNode.nodeSize : nodePos + 4;
        const resolved    = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
        const target = resolved && resolved.pos > nodePos && resolved.pos < calloutEnd
          ? resolved.pos
          : nodePos + 2;

        editor.chain().focus().setTextSelection(target).run();
      });

      return {
        dom,
        contentDOM: contentEl,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'callout') return false;
          const newType  = updatedNode.attrs['type']  || 'tip';
          const newEmoji = updatedNode.attrs['emoji'] || CALLOUT_VARIANTS[newType]?.emoji || '💡';
          dom.className = `km-callout km-callout--${newType}`;
          dom.setAttribute('data-callout-type', newType);
          emojiEl.textContent = newEmoji;
          return true;
        },
        destroy: () => closePicker(),
      };
    };
  },
});
