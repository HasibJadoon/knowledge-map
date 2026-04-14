import { Node, mergeAttributes } from '@tiptap/core';

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      emoji: { default: '💡' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout' }), 0];
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
            background: rgba(201,168,76,0.05);
            border: 1px solid rgba(201,168,76,0.16);
            border-left: none;
            border-radius: 10px;
            position: relative;
            box-shadow: 0 1px 4px rgba(0,0,0,0.18);
          }
          .km-callout::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0; width: 4px;
            background: rgba(201,168,76,0.8);
            border-radius: 10px 0 0 10px;
          }
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
            /* iOS: must override any parent user-select:none so text is tappable */
            -webkit-user-select: text !important;
            user-select: text !important;
          }
          .km-callout__content .ProseMirror-trailingBreak { display: none; }
          .km-callout__emoji-picker {
            position: fixed; z-index: 15000;
            background: #1c1c1e;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px; padding: 10px;
            display: flex; flex-wrap: wrap; gap: 4px;
            max-width: 252px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.3);
            animation: km-ep-in 0.12s cubic-bezier(0.22,1,0.36,1);
          }
          @keyframes km-ep-in {
            from { opacity: 0; transform: scale(0.92) translateY(-6px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          .km-callout__ep-btn {
            width: 34px; height: 34px; border: none;
            background: transparent; border-radius: 8px;
            cursor: pointer; font-size: 1.15rem;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.12s;
            -webkit-tap-highlight-color: transparent;
          }
          .km-callout__ep-btn:hover,
          .km-callout__ep-btn:active { background: rgba(255,255,255,0.1); }
        `;
        document.head.appendChild(style);
      }

      const EMOJIS = ['💡','📌','⚠️','✅','❌','🔥','📝','🎯','💬','🌟','❓','💭','📚','🔍','⚡','🌙','🕌','📖','🌿','✨'];

      const dom = document.createElement('div');
      dom.className = 'km-callout';
      dom.setAttribute('data-type', 'callout');

      const emojiEl = document.createElement('span');
      emojiEl.className = 'km-callout__emoji';
      emojiEl.contentEditable = 'false';
      emojiEl.textContent = node.attrs['emoji'] || '💡';

      const contentEl = document.createElement('div');
      contentEl.className = 'km-callout__content';

      dom.appendChild(emojiEl);
      dom.appendChild(contentEl);

      let pickerEl: HTMLElement | null = null;

      const closePicker = () => { pickerEl?.remove(); pickerEl = null; };

      emojiEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pickerEl) { closePicker(); return; }

        pickerEl = document.createElement('div');
        pickerEl.className = 'km-callout__emoji-picker';

        EMOJIS.forEach(em => {
          const btn = document.createElement('button');
          btn.className = 'km-callout__ep-btn';
          btn.textContent = em;
          btn.addEventListener('mousedown', (ev) => {
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
          pickerEl!.appendChild(btn);
        });

        const rect = emojiEl.getBoundingClientRect();
        pickerEl.style.top  = `${rect.bottom + 6}px`;
        pickerEl.style.left = `${rect.left}px`;
        document.body.appendChild(pickerEl);

        setTimeout(() => {
          document.addEventListener('mousedown', function handler(ev) {
            if (!pickerEl?.contains(ev.target as globalThis.Node)) {
              closePicker();
              document.removeEventListener('mousedown', handler);
            }
          });
        }, 0);
      });

      // ── Focus routing ────────────────────────────────────────────────────
      // Tapping the outer padding (not emoji, not content) moves cursor inside.
      // Also handles touchend so iOS keyboard activates on the first tap.
      const routeFocus = (e: Event) => {
        if (emojiEl.contains(e.target as globalThis.Node)) return;
        if (pickerEl?.contains(e.target as globalThis.Node)) return;
        if (contentEl.contains(e.target as globalThis.Node)) return;
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos !== null && pos !== undefined) {
          // pos+2 = start of first child paragraph inside the callout
          editor.chain().focus().setTextSelection(pos + 2).run();
        }
      };

      dom.addEventListener('click', routeFocus);

      // touchend: needed on iOS — without it the keyboard never opens when
      // tapping the callout padding on first touch.
      dom.addEventListener('touchend', (e) => {
        if (emojiEl.contains(e.target as globalThis.Node)) return;
        if (pickerEl?.contains(e.target as globalThis.Node)) return;
        if (contentEl.contains(e.target as globalThis.Node)) {
          // User tapped the text itself — just ensure the editor is focused.
          if (!editor.isFocused) editor.commands.focus();
          return;
        }
        e.preventDefault();
        routeFocus(e);
      });

      return {
        dom,
        contentDOM: contentEl,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'callout') return false;
          emojiEl.textContent = updatedNode.attrs['emoji'] || '💡';
          return true;
        },
        destroy: () => closePicker(),
      };
    };
  },
});
