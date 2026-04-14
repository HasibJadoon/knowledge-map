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
            display: flex; align-items: center; gap: 10px;
            padding: 8px 12px; margin: 2px 0;
            border-radius: 8px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
            user-select: none;
          }
          .km-page-link:hover {
            background: rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.14);
          }
          .km-page-link__icon {
            font-size: 1rem; flex-shrink: 0;
            width: 24px; text-align: center;
          }
          .km-page-link__title {
            flex: 1; font-size: 0.92rem;
            color: rgba(255,255,255,0.85);
            font-weight: 500;
          }
          .km-page-link__arrow {
            font-size: 0.75rem;
            color: rgba(255,255,255,0.25);
          }
          .km-page-link__edit {
            font-size: 0.7rem; padding: 2px 7px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px; background: transparent;
            color: rgba(255,255,255,0.35); cursor: pointer;
            transition: color 0.1s, border-color 0.1s;
            display: none;
          }
          .km-page-link:hover .km-page-link__edit { display: inline-block; }
          .km-page-link__edit:hover { color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.3); }
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

      return { dom };
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
