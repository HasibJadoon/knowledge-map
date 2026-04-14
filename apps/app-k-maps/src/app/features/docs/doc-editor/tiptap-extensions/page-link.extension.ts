import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageLink: {
      insertPageLink: (attrs: { doc_id: string; title: string }) => ReturnType;
    };
  }
}

export const PageLink = Node.create({
  name: 'page_link',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      doc_id: { default: null },
      title:  { default: 'Untitled' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page_link"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page_link' })];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      if (!document.getElementById('km-page-link-styles')) {
        const style = document.createElement('style');
        style.id = 'km-page-link-styles';
        style.textContent = `
          .km-page-link {
            display: flex; align-items: center; gap: 12px;
            padding: 10px 14px; margin: 4px 0;
            border-radius: 9px;
            background: linear-gradient(90deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 100%);
            border: 1px solid rgba(201,168,76,0.18);
            cursor: pointer;
            transition: background 0.18s, border-color 0.18s, box-shadow 0.18s;
            user-select: none;
          }
          .km-page-link:hover {
            background: linear-gradient(90deg, rgba(201,168,76,0.11) 0%, rgba(201,168,76,0.04) 100%);
            border-color: rgba(201,168,76,0.38);
            box-shadow: 0 2px 16px rgba(201,168,76,0.08);
          }
          .km-page-link__icon {
            font-size: 1rem; flex-shrink: 0;
            width: 26px; height: 26px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(201,168,76,0.1);
            border-radius: 6px;
            border: 1px solid rgba(201,168,76,0.18);
          }
          .km-page-link__title {
            flex: 1; font-size: 0.92rem;
            color: rgba(201,168,76,0.9);
            font-weight: 500;
            letter-spacing: 0.01em;
          }
          .km-page-link__arrow {
            font-size: 0.8rem;
            color: rgba(201,168,76,0.4);
            transition: transform 0.15s, color 0.15s;
          }
          .km-page-link:hover .km-page-link__arrow {
            transform: translateX(3px);
            color: rgba(201,168,76,0.8);
          }
          .km-page-link__edit {
            font-size: 0.68rem; padding: 2px 8px;
            border: 1px solid rgba(201,168,76,0.2);
            border-radius: 4px; background: transparent;
            color: rgba(201,168,76,0.5); cursor: pointer;
            transition: color 0.12s, border-color 0.12s, background 0.12s;
            display: none; font-family: inherit;
          }
          .km-page-link:hover .km-page-link__edit { display: inline-block; }
          .km-page-link__edit:hover {
            color: rgba(201,168,76,1);
            border-color: rgba(201,168,76,0.5);
            background: rgba(201,168,76,0.08);
          }
        `;
        document.head.appendChild(style);
      }

      const dom = document.createElement('div');
      dom.className = 'km-page-link';
      dom.contentEditable = 'false';

      const icon  = document.createElement('span');
      icon.className = 'km-page-link__icon';
      icon.textContent = '📄';

      const title = document.createElement('span');
      title.className = 'km-page-link__title';
      title.textContent = node.attrs['title'] || 'Untitled';

      const arrow = document.createElement('span');
      arrow.className = 'km-page-link__arrow';
      arrow.textContent = '→';

      const editBtn = document.createElement('button');
      editBtn.className = 'km-page-link__edit';
      editBtn.textContent = 'Open';

      dom.appendChild(icon);
      dom.appendChild(title);
      dom.appendChild(arrow);
      dom.appendChild(editBtn);

      const navigate = () => {
        const id = node.attrs['doc_id'];
        if (id) window.location.href = `/docs/${id}`;
      };

      dom.addEventListener('click', navigate);
      editBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); navigate(); });

      /*
       * Sync latest title from the API — guarded by AbortController so the
       * fetch is cancelled when the node is destroyed (e.g. editor teardown,
       * setContent replacing content). Without this the pending request holds
       * one of the browser's 6 per-origin connections open, stalling all
       * other requests (lazy chunks, fonts, API calls) on localhost:4300.
       *
       * Only fire if the stored attr title looks stale (placeholder "Untitled")
       * to avoid a fetch on every single render of an up-to-date block.
       */
      const docId = node.attrs['doc_id'];
      const controller = new AbortController();

      if (docId && title.textContent === 'Untitled') {
        // Defer by one frame so we don't fire during setContent hydration
        const tid = setTimeout(() => {
          if (controller.signal.aborted) return;
          fetch(`/api/docs/${docId}`, { signal: controller.signal })
            .then(r => r.json() as Promise<{ title?: string }>)
            .then(data => {
              if (editor.isDestroyed || controller.signal.aborted) return;
              if (data.title && data.title !== title.textContent) {
                title.textContent = data.title;
                const pos = typeof getPos === 'function' ? getPos() : null;
                if (pos != null && !editor.isDestroyed) {
                  editor.chain().command(({ tr }) => {
                    tr.setNodeAttribute(pos, 'title', data.title);
                    return true;
                  }).run();
                }
              }
            })
            .catch(() => {/* aborted or network error — silent */});
        }, 800); // wait 800ms so initial page load settles first

        controller.signal.addEventListener('abort', () => clearTimeout(tid));
      }

      return {
        dom,
        destroy() {
          // Cancel any in-flight fetch so the connection is released immediately
          controller.abort();
        },
      };
    };
  },

  addCommands() {
    return {
      insertPageLink: (attrs) => ({ commands }) => {
        return commands.insertContent({ type: 'page_link', attrs });
      },
    };
  },
});
