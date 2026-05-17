import { Node, mergeAttributes } from '@tiptap/core';

// ─── ImageBlock ───────────────────────────────────────────────────────────────
// A block-level, atomic image node. The editor inserts it via insertContent
// (see DocEditorPage.onImageSelected); `src` is a data URL produced by
// DocsApiService.uploadImage. Maps to a CM `image` block via block-mapper.

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
