import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Editor, Extension, InputRule } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import Placeholder from '@tiptap/extension-placeholder';
// CharacterCount removed — ran queueMicrotask on every keystroke causing slowness
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { TextDirection } from 'tiptap-text-direction';
import { AutoDirection } from '../doc-editor/tiptap-extensions/auto-direction.extension';
import { AyahEmbed } from '../doc-editor/tiptap-extensions/ayah-embed.extension';
import { VocabBlock, MorphologyBlock, NahwBlock, RootAnalysisBlock } from '../doc-editor/tiptap-extensions/arabic-blocks.extension';
import {
  ClaimBlock, EvidenceBlock, ReflectionBlock,
  TaskBlock, SceneBlock, TimelineBlock,
  ComprehensionBlock, ChildrenBlock, PassageEmbed
} from '../doc-editor/tiptap-extensions/worldview-blocks.extension';
import { SlashCommandExtension } from '../doc-editor/tiptap-extensions/slash-command.extension';
import { Callout } from '../doc-editor/tiptap-extensions/callout.extension';
import { PageLink } from '../doc-editor/tiptap-extensions/page-link.extension';
import { MobileBlockHandle } from '../doc-editor/tiptap-extensions/mobile-block-handle.extension';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { environment } from '../../../../environments/environment';

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

const API = `${environment.apiBase}/docs`;

/**
 * Custom HorizontalRule that fires on `--- ` (space after three dashes)
 * rather than only on Enter.  The StarterKit default changed in Tiptap 3
 * and no longer reliably triggers on mobile soft-keyboard input.
 */
const KmHorizontalRule = HorizontalRule.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|\u2014-|━━━)\s$/,   // --- , —-, ━━━ + space
        handler: ({ state, range, chain }) => {
          void state; // suppress unused-var lint
          chain().deleteRange(range).setHorizontalRule().run();
        },
      }),
    ];
  },
});

@Injectable({ providedIn: 'root' })
export class DocEditorService {
  private _editor: Editor | null = null;
  private _wordCountTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private http: HttpClient) {}
  get editor() { return this._editor; }

  readonly docId       = signal<string | null>(null);
  readonly title       = signal('Untitled');
  readonly isSaving    = signal(false);
  readonly isDirty     = signal(false);
  readonly wordCount   = signal(0);
  readonly editorReady = signal(false);
  /** True when editor has a non-collapsed text selection. Used by the accessory bar. */
  readonly hasSelection = signal(false);

  /** Set by DocEditorPage to trigger debounced save on content change. */
  saveFn: (() => void) | null = null;

  /**
   * Set to true while calling setContent() during initial document load.
   * Prevents onUpdate from marking the doc dirty or scheduling a save
   * for every TipTap transaction fired during content hydration.
   */
  isLoadingContent = false;

  readonly context = signal<DocContext>({
    domain: 'general', docType: 'note',
    surah: null, ayahFrom: null, ayahTo: null,
    sourceId: null, sourceUnitId: null,
    containerId: null, unitId: null,
    workspaceId: null
  });

  readonly hasQuranContext  = computed(() => this.context().surah != null);
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
    const domain = this.context().domain;

    // ── Domain-specific extensions (loaded only when needed) ─────────────────
    // Avoids registering 16 custom node schemas + their appendTransaction hooks
    // on every editor init — saves ~30% init time on iOS for general/quran docs.
    const domainExtensions = [
      ...(domain === 'quran' || domain === 'general' ? [AyahEmbed, PassageEmbed] : []),
      ...(domain === 'arabic' ? [VocabBlock, MorphologyBlock, NahwBlock, RootAnalysisBlock] : []),
      ...(domain === 'worldview' || domain === 'workspace'
        ? [ClaimBlock, EvidenceBlock, ReflectionBlock, TaskBlock,
           SceneBlock, TimelineBlock, ComprehensionBlock, ChildrenBlock]
        : []),
    ];

    this._editor = new Editor({
      element,
      // Exclude core textDirection — we use tiptap-text-direction for per-node RTL support
      enableCoreExtensions: { textDirection: false } as Record<string, boolean>,
      extensions: [
        StarterKit.configure({
          link: false,
          underline: false,
          // Disable StarterKit's built-in HR — we use KmHorizontalRule below
          // which adds a proper InputRule for "--- " (space-triggered, works on mobile)
          horizontalRule: false,
        }),
        KmHorizontalRule,
        ...domainExtensions,
        // Rich text formatting
        Underline,
        Superscript,
        Subscript,
        Highlight.configure({ multicolor: true }),
        Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
        TextStyle,
        Color,
        // Core UX
        Placeholder.configure({ placeholder: 'Start writing, or type / for commands…' }),
        TextDirection.configure({ types: ['heading', 'paragraph', 'blockquote', 'listItem'] }),
        AutoDirection,
        PageLink,
        Callout,
        TaskList,
        TaskItem.configure({ nested: true }),
        SlashCommandExtension,
        MobileBlockHandle,
        // Tab = indent list, Shift-Tab = outdent
        Extension.create({
          name: 'tabIndent',
          addKeyboardShortcuts() {
            return {
              'Tab':       () => this.editor.commands.sinkListItem('listItem'),
              'Shift-Tab': () => this.editor.commands.liftListItem('listItem'),
            };
          },
        }),
      ],
      onSelectionUpdate: ({ editor }) => {
        this.hasSelection.set(!editor.state.selection.empty);
      },
      onUpdate: () => {
        // Skip during initial setContent — avoids dirty/save on every hydration transaction
        if (this.isLoadingContent) return;
        this.isDirty.set(true);
        this.saveFn?.();
        // Word count deferred 2 s so it never competes with typing
        if (this._wordCountTimer) clearTimeout(this._wordCountTimer);
        this._wordCountTimer = setTimeout(() => {
          this._wordCountTimer = null;
          // Approximate word count from plain text (no CharacterCount extension)
          const text = this._editor?.getText() ?? '';
          this.wordCount.set(text.trim() ? text.trim().split(/\s+/).length : 0);
        }, 2000);
      }
    });

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
      workspace_id: ctx.workspaceId,
    };

    try {
      const res = await firstValueFrom(
        this.http.post<{ id: string; title: string }>(API, payload)
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
    if (this._wordCountTimer) { clearTimeout(this._wordCountTimer); this._wordCountTimer = null; }
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
