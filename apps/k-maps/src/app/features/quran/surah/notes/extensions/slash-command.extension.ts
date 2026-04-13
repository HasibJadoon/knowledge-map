import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface SlashCommandState {
  active: boolean;
  query: string;
  range: { from: number; to: number } | null;
}

export const SLASH_KEY = new PluginKey<SlashCommandState>('slashCommand');

/**
 * Detects `/` typed at the start of a paragraph (or after whitespace),
 * then emits a `km-slash-open` custom event on the editor's host element
 * and a `km-slash-close` event when the menu should close.
 *
 * No @tiptap/suggestion dependency required.
 */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: SLASH_KEY,

        state: {
          init(): SlashCommandState {
            return { active: false, query: '', range: null };
          },
          apply(tr, prev): SlashCommandState {
            const meta = tr.getMeta(SLASH_KEY);
            if (meta !== undefined) return meta as SlashCommandState;
            if (!prev.active || !prev.range) {
              return prev;
            }

            const slashFrom = tr.mapping.map(prev.range.from);
            const cursorPos = tr.selection.from;

            if (cursorPos <= slashFrom) {
              return { active: false, query: '', range: null };
            }

            const text = tr.doc.textBetween(slashFrom, cursorPos, '\n', '\0');
            if (!text.startsWith('/')) {
              return { active: false, query: '', range: null };
            }

            const query = text.slice(1);
            if (/\s/.test(query)) {
              return { active: false, query: '', range: null };
            }

            return {
              active: true,
              query,
              range: { from: slashFrom, to: cursorPos },
            };
          },
        },

        view(editorView) {
          function dispatchSlashEvent(state: SlashCommandState) {
            const host = editorView.dom;
            if (state.active) {
              host.dispatchEvent(new CustomEvent('km-slash-open', {
                bubbles: true,
                detail: { query: state.query, range: state.range },
              }));
            } else {
              host.dispatchEvent(new CustomEvent('km-slash-close', { bubbles: true }));
            }
          }

          return {
            update(view, prevState) {
              const state = SLASH_KEY.getState(view.state);
              const prev  = SLASH_KEY.getState(prevState);
              if (state && (state.active !== prev?.active || state.query !== prev?.query)) {
                dispatchSlashEvent(state);
              }
            },
          };
        },

        props: {
          handleTextInput(view, from, to, text) {
            const { state, dispatch } = view;
            const { $from } = state.selection;

            const textBefore = $from.parent.textBetween(0, $from.parentOffset, '\n', '\0');
            const atStart = textBefore.length === 0 || /\s$/.test(textBefore);

            if (text === '/' && atStart) {
              dispatch(state.tr.insertText('/', from, to).setMeta(SLASH_KEY, {
                active: true,
                query: '',
                range: { from, to: from + 1 },
              }));
              return true;
            }

            return false;
          },

          handleKeyDown(view, event) {
            const pluginState = SLASH_KEY.getState(view.state);
            if (!pluginState?.active) return false;

            if (event.key === 'Escape' || event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Enter') {
              // Let Angular component handle these
              return false;
            }

            if (event.key === 'Backspace') {
              if (pluginState.range && view.state.selection.from <= pluginState.range.from + 1) {
                view.dispatch(view.state.tr.setMeta(SLASH_KEY, {
                  active: false,
                  query: '',
                  range: null,
                }));
                return false;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
