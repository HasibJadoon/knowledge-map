import { Node, mergeAttributes } from '@tiptap/core';

// ─── ImageBlock ───────────────────────────────────────────────────────────────
// A block-level, atomic image node. The desktop editor has no image-insert UI,
// but registering the node lets it render and round-trip images authored on
// other clients (mapped to a CM `image` block via block-mapper).

export const ImageBlock = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src:   { default: null },
      alt:   { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'img[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { class: 'km-doc-image' })];
  },
});
