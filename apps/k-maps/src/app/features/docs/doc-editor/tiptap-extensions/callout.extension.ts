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
            display: flex; gap: 14px;
            padding: 14px 18px 14px 16px; margin: 6px 0;
            background: linear-gradient(135deg, rgba(201,168,76,0.07) 0%, rgba(201,168,76,0.02) 100%);
            border: 1px solid rgba(201,168,76,0.18);
            border-left: none;
            border-radius: 10px;
            position: relative;
          }
          .km-callout::before {
            content: '';
            position: absolute;
            left: 0; top: 0; bottom: 0; width: 3px;
            background: linear-gradient(180deg, rgba(201,168,76,0.95) 0%, rgba(201,168,76,0.3) 100%);
            border-radius: 10px 0 0 10px;
          }
          .km-callout__emoji {
            font-size: 1.25rem; line-height: 1.55;
            cursor: pointer; user-select: none;
            flex-shrink: 0; min-width: 1.6rem;
            text-align: center;
            transition: transform 0.15s;
            margin-top: 1px;
          }
          .km-callout__emoji:hover { transform: scale(1.2) rotate(-5deg); }
          .km-callout__content {
            flex: 1; min-width: 0; min-height: 1.6em;
            color: rgba(255,255,255,0.9);
            cursor: text;
          }
          .km-callout__content .ProseMirror-trailingBreak { display: none; }
          .km-callout__emoji-picker {
            position: fixed; z-index: 15000;
            background: #1e1e1e;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 10px; padding: 8px;
            display: flex; flex-wrap: wrap; gap: 4px;
            max-width: 240px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            animation: km-ep-in 0.1s ease;
          }
          @keyframes km-ep-in {
            from { opacity: 0; transform: scale(0.95) translateY(-4px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          .km-callout__ep-btn {
            width: 32px; height: 32px; border: none;
            background: transparent; border-radius: 6px;
            cursor: pointer; font-size: 1.1rem;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.1s;
          }
          .km-callout__ep-btn:hover { background: rgba(255,255,255,0.1); }
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

      // Clicking on the outer wrapper padding (not the emoji or content area)
      // should redirect the cursor inside the callout's paragraph content.
      // Uses 'click' (fires after mouseup) so ProseMirror's own positioning
      // has already settled; pos+2 = inside the first child paragraph.
      dom.addEventListener('click', (e) => {
        if (emojiEl.contains(e.target as globalThis.Node)) return;
        if (pickerEl?.contains(e.target as globalThis.Node)) return;
        if (contentEl.contains(e.target as globalThis.Node)) return;
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos !== null && pos !== undefined) {
          editor.chain().focus().setTextSelection(pos + 2).run();
        }
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
