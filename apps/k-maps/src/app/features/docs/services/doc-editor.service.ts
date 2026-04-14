import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import DragHandle from '@tiptap/extension-drag-handle';
import { createBlockHandleElement, type EditorRef } from '../doc-editor/block-handle/block-handle';
import { PageLink } from '../doc-editor/tiptap-extensions/page-link.extension';
import UniqueId from '@tiptap/extension-unique-id';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { TextDirection } from 'tiptap-text-direction';
import { AyahEmbed } from '../doc-editor/tiptap-extensions/ayah-embed.extension';
import { VocabBlock, MorphologyBlock, NahwBlock, RootAnalysisBlock } from '../doc-editor/tiptap-extensions/arabic-blocks.extension';
import {
  ClaimBlock, EvidenceBlock, ReflectionBlock,
  TaskBlock, SceneBlock, TimelineBlock,
  ComprehensionBlock, ChildrenBlock, PassageEmbed
} from '../doc-editor/tiptap-extensions/worldview-blocks.extension';
import { SlashCommandExtension } from '../doc-editor/tiptap-extensions/slash-command.extension';
import { Callout } from '../doc-editor/tiptap-extensions/callout.extension';

export interface DocContext {
  domain: 'general' | 'quran' | 'arabic' | 'worldview' | 'workspace';
  docType: string;
  surah: number | null;
  ayahFrom: number | null;
  ayahTo: number | null;
  sourceId: number | null;
  sourceUnitId: number | null;
  containerId: number | null;
  unitId: number | null;
  workspaceId: number | null;
}

@Injectable({ providedIn: 'root' })
export class DocEditorService {
  private _editor: Editor | null = null;

  constructor(private http: HttpClient) {}
  get editor() { return this._editor; }

  readonly docId      = signal<string | null>(null);
  readonly title      = signal('Untitled');
  readonly isSaving   = signal(false);
  readonly isDirty    = signal(false);
  readonly wordCount  = signal(0);
  readonly rightPanel  = signal<'links' | 'metadata' | 'outline' | null>('outline');
  readonly leftOpen    = signal(true);
  readonly editorReady = signal(false);

  /** Set by DocEditorComponent to trigger debounced save on content change. */
  saveFn: (() => void) | null = null;

  readonly context = signal<DocContext>({
    domain: 'general', docType: 'note',
    surah: null, ayahFrom: null, ayahTo: null,
    sourceId: null, sourceUnitId: null,
    containerId: null, unitId: null,
    workspaceId: null
  });

  readonly hasQuranContext  = computed(() => this.context().surah != null);
  readonly hasSourceContext = computed(() => this.context().sourceId != null);
  readonly canonicalRef     = computed(() => {
    const c = this.context();
    if (!c.surah) return null;
    const from = c.ayahFrom ?? 1;
    const to   = c.ayahTo   ?? from;
    return from === to ? `${c.surah}:${from}` : `${c.surah}:${from}-${to}`;
  });

  applyContext(ctx: Partial<DocContext>): void {
    this.context.update(c => ({ ...c, ...ctx }));
  }

  initEditor(element: HTMLElement): void {
    // Use a mutable ref so render() can be called during Editor construction
    // but button handlers still get the editor when they fire (after init)
    const editorRef: EditorRef = {
      current: null,
      hoveredBlockPos: null,
      hoveredBlockNodeSize: null,
    };
    const handleEl = createBlockHandleElement(editorRef, {
      onCreatePage: (afterPos) => this.createPageBlock(afterPos),
    });

    this._editor = new Editor({
      element,
      extensions: [
        StarterKit,
        DragHandle.configure({
          render: () => handleEl,
          onNodeChange: (data: { node: unknown; editor: Editor; pos?: number }) => {
            // Remove previous hover highlight
            this._editor?.view.dom
              .querySelectorAll('.km-block--hovered')
              .forEach(el => el.classList.remove('km-block--hovered'));

            const pos = typeof data.pos === 'number' && data.pos >= 0 ? data.pos : null;
            editorRef.hoveredBlockPos = pos;
            editorRef.hoveredBlockNodeSize = (data.node as { nodeSize?: number } | null)?.nodeSize ?? null;

            // Add hover highlight to newly hovered block DOM element
            if (pos !== null && this._editor) {
              const domNode = this._editor.view.nodeDOM(pos);
              if (domNode instanceof HTMLElement) {
                domNode.classList.add('km-block--hovered');
              }
            }
          },
        }),
        // Quran
        AyahEmbed,
        PassageEmbed,
        // Arabic
        VocabBlock,
        MorphologyBlock,
        NahwBlock,
        RootAnalysisBlock,
        // Worldview + Production + Learning
        ClaimBlock,
        EvidenceBlock,
        ReflectionBlock,
        TaskBlock,
        SceneBlock,
        TimelineBlock,
        ComprehensionBlock,
        ChildrenBlock,
        // Rich text formatting
        Underline,
        Highlight.configure({ multicolor: true }),
        Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
        TextStyle,
        Color,
        // Core UX
        UniqueId.configure({ types: ['heading', 'paragraph', 'blockquote', 'listItem', 'codeBlock'] }),
        Placeholder.configure({ placeholder: 'Start writing, or type / for commands…' }),
        CharacterCount,
        TextDirection.configure({ types: ['heading', 'paragraph', 'blockquote', 'listItem'] }),
        PageLink,
        Callout,
        SlashCommandExtension,
      ],
      onUpdate: ({ editor }) => {
        this.isDirty.set(true);
        this.wordCount.set(editor.storage['characterCount']?.words() ?? 0);
        this.saveFn?.();
      }
    });

    // Wire up the ref so button handlers can access the now-ready editor
    editorRef.current = this._editor;
    this.editorReady.set(true);
  }

  /** Creates a new child document and inserts a PageLink block at afterPos. */
  async createPageBlock(afterPos: number): Promise<void> {
    const ctx = this.context();
    const payload = {
      title: 'Untitled',
      domain: ctx.domain,
      doc_type: 'note',
      parent_doc_id: this.docId(),
      surah: ctx.surah,
      ayah_from: ctx.ayahFrom,
      ayah_to: ctx.ayahTo,
      source_id: ctx.sourceId,
      workspace_id: ctx.workspaceId,
    };

    try {
      const res = await firstValueFrom(
        this.http.post<{ id: string; title: string }>('/api/docs', payload)
      );
      this._editor?.chain()
        .focus()
        .insertContentAt(afterPos, { type: 'page_link', attrs: { doc_id: res.id, title: res.title || 'Untitled' } })
        .run();
    } catch (err) {
      console.error('Failed to create page block', err);
    }
  }

  destroyEditor(): void {
    this.editorReady.set(false);
    this._editor?.destroy();
    this._editor = null;
  }

  getJSON(): object {
    return this._editor?.getJSON() ?? { type: 'doc', content: [] };
  }

  insertAyah(surah: number, ayah: number, textUthmani: string, translation: string): void {
    this._editor?.commands.insertContent({
      type: 'ayah_embed',
      attrs: {
        id: crypto.randomUUID(),
        surah, ayah,
        text_uthmani: textUthmani,
        translation,
        show_translation: true,
        dir: 'rtl', lang: 'ar'
      }
    });
  }
}
