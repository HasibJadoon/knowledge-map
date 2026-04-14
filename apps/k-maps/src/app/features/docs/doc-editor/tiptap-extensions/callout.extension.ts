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
            padding: 12px 16px; margin: 4px 0;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-left: 3px solid rgba(201,168,76,0.5);
            border-radius: 8px;
          }
          .km-callout__emoji {
            font-size: 1.2rem; line-height: 1.6;
            cursor: pointer; user-select: none;
            flex-shrink: 0; min-width: 1.5rem;
            text-align: center;
            transition: transform 0.15s;
          }
          .km-callout__emoji:hover { transform: scale(1.2); }
          .km-callout__content { flex: 1; min-width: 0; }
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
