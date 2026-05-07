import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'tip' | 'quote' | 'definition';

const CALLOUT_ICONS: Record<CalloutType, string> = {
  info:       '💡',
  warning:    '⚠️',
  tip:        '✨',
  quote:      '❝',
  definition: '📖',
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { calloutType?: CalloutType }) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      calloutType: {
        default: 'info' as CalloutType,
        parseHTML: el => (el.getAttribute('data-callout-type') as CalloutType) ?? 'info',
        renderHTML: attrs => ({ 'data-callout-type': attrs['calloutType'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const type = (HTMLAttributes['data-callout-type'] as CalloutType) ?? 'info';
    const icon = CALLOUT_ICONS[type] ?? '💡';
    return [
      'div',
      mergeAttributes({ class: 'km-callout', ...HTMLAttributes }),
      ['span', { class: 'km-callout__icon', contenteditable: 'false' }, icon],
      ['div', { class: 'km-callout__body' }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout: (attrs = {}) => ({ commands }) => {
        return commands.wrapIn(this.name, { calloutType: attrs.calloutType ?? 'info' });
      },
    };
  },
});
