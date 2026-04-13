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
            // If selection changed without explicit meta, close
            if (tr.selectionSet && prev.active) {
              return { active: false, query: '', range: null };
            }
            return prev;
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
          handleTextInput(view, _from, _to, text) {
            const { state, dispatch } = view;
            const { $from } = state.selection;

            // Only trigger slash at start of a paragraph or after a space
            const nodeBefore = $from.nodeBefore;
            const textBefore = nodeBefore?.text ?? '';
            const atStart = textBefore === '' || textBefore.endsWith(' ');

            if (text === '/' && atStart) {
              dispatch(state.tr.setMeta(SLASH_KEY, {
                active: true,
                query: '',
                range: { from: $from.pos, to: $from.pos + 1 },
              }));
              return false; // allow normal insert to happen
            }

            const pluginState = SLASH_KEY.getState(state);
            if (pluginState?.active) {
              const query = pluginState.query + text;
              dispatch(state.tr.setMeta(SLASH_KEY, {
                active: true,
                query,
                range: pluginState.range,
              }));
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
              const query = pluginState.query;
              if (query.length === 0) {
                // Close — user deleted the slash itself
                view.dispatch(view.state.tr.setMeta(SLASH_KEY, {
                  active: false, query: '', range: null,
                }));
              } else {
                view.dispatch(view.state.tr.setMeta(SLASH_KEY, {
                  active: true,
                  query: query.slice(0, -1),
                  range: pluginState.range,
                }));
              }
              return false;
            }

            return false;
          },
        },
      }),
    ];
  },
});
