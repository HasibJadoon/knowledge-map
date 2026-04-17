import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import BubbleMenu from '@tiptap/extension-bubble-menu';
import DragHandle from '@tiptap/extension-drag-handle';
import { createBlockHandleElement, type EditorRef } from '../doc-editor/block-handle/block-handle';
import { createBubbleMenuElement } from '../doc-editor/bubble-menu/bubble-menu';
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
import { DocExtractService } from './doc-extract.service';

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

/** True on any touch-primary device (iPhone, iPad, Android). */
function isMobile(): boolean {
  return (
    typeof window !== 'undefined' &&
    (('ontouchstart' in window) ||
     navigator.maxTouchPoints > 1 ||
     /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  );
}

@Injectable({ providedIn: 'root' })
export class DocEditorService {
  private _editor: Editor | null = null;
  private _lastHoveredEl: HTMLElement | null = null;
  private _wordCountTimer: ReturnType<typeof setTimeout> | null = null;
  private _bubbleUpdateRaf: number | null = null;
  readonly isMobile = isMobile();

  private http       = inject(HttpClient);
  private router     = inject(Router);
  private extractSvc = inject(DocExtractService);

  get editor() { return this._editor; }

  readonly docId       = signal<string | null>(null);
  readonly title       = signal('Untitled');
  readonly isSaving    = signal(false);
  readonly isDirty     = signal(false);
  readonly wordCount   = signal(0);
  readonly rightPanel  = signal<'links' | 'metadata' | 'outline' | null>('outline');
  readonly leftOpen    = signal(true);
  readonly editorReady = signal(false);

  saveFn: (() => void) | null = null;

  readonly context = signal<DocContext>({
    domain: 'general', docType: 'note',
    surah: null, ayahFrom: null, ayahTo: null,
    sourceId: null, sourceUnitId: null,
    containerId: null, unitId: null,
    workspaceId: null,
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
    const mobile = this.isMobile;

    const editorRef: EditorRef = {
      current: null,
      hoveredBlockPos: null,
      hoveredBlockNodeSize: null,
    };

    // ── Desktop-only: drag handle ──────────────────────────────────────────
    // On mobile, DragHandle intercepts pointer/touch events and blocks typing.
    const handleEl = mobile
      ? null
      : createBlockHandleElement(editorRef, {
          onCreatePage: (afterPos) => this.createPageBlock(afterPos),
        });

    // ── Desktop-only: bubble menu ──────────────────────────────────────────
    // On iOS the native selection toolbar already handles text actions.
    // Our bubble menu fights it and can block the caret entirely.
    const bubbleRef = mobile
      ? null
      : createBubbleMenuElement(
          () => this._editor,
          {
            extractToTopic: (t) => this.extractSvc.extractToWvTopic(t),
            extractToVocab: (t) => this.extractSvc.extractToVocab(t),
            extractToTask:  (t) => this.extractSvc.extractToTask(t),
            createSrsCard:  (t) => this.extractSvc.createSrsCard(t),
          },
        );

    // Build extension list — drop heavy desktop-only extensions on mobile
    const desktopExtensions = mobile ? [] : [
      DragHandle.configure({
        render: () => handleEl!,
        onNodeChange: (data: { node: unknown; editor: Editor; pos?: number }) => {
          if (this._lastHoveredEl) {
            this._lastHoveredEl.classList.remove('km-block--hovered');
            this._lastHoveredEl = null;
          }
          const pos = typeof data.pos === 'number' && data.pos >= 0 ? data.pos : null;
          editorRef.hoveredBlockPos = pos;
          editorRef.hoveredBlockNodeSize = (data.node as { nodeSize?: number } | null)?.nodeSize ?? null;
          if (pos !== null && this._editor) {
            const domNode = this._editor.view.nodeDOM(pos);
            if (domNode instanceof HTMLElement) {
              domNode.classList.add('km-block--hovered');
              this._lastHoveredEl = domNode;
            }
          }
        },
      }),
      // Native bubble menu — TipTap handles all positioning + show/hide
      BubbleMenu.configure({
        element: bubbleRef!.element,
        updateDelay: 0,
        options: {
          placement: 'top',
          offset: 10,
        },
        shouldShow: ({ editor }) => {
          const { from, to } = editor.state.selection;
          return from !== to && !editor.isActive('image');
        },
      }),
      // UniqueId is expensive (appendTransaction on every block) — skip on mobile
      UniqueId.configure({ types: ['heading', 'paragraph', 'blockquote', 'listItem', 'codeBlock'] }),
      // CharacterCount adds overhead on every keystroke — skip on mobile
      CharacterCount,
    ];

    this._editor = new Editor({
      element,
      enableCoreExtensions: { textDirection: false } as Record<string, boolean>,
      extensions: [
        StarterKit.configure({ link: false, underline: false }),
        ...desktopExtensions,
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
        // Rich text
        Underline,
        Highlight.configure({ multicolor: true }),
        Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
        TextStyle,
        Color,
        // Core UX
        Placeholder.configure({ placeholder: 'Start writing, or type / for commands…' }),
        TextDirection.configure({ types: ['heading', 'paragraph', 'blockquote', 'listItem'] }),
        AutoDirection,
        PageLink.configure({
          onOpen: (docId: string) => {
            void this.router.navigate(['/docs', docId]);
          },
        }),
        Callout,
        SlashCommandExtension,
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
      onUpdate: ({ editor }) => {
        this.isDirty.set(true);
        this.saveFn?.();
        // Word count: debounced, skip entirely on mobile
        if (!mobile) {
          if (this._wordCountTimer) clearTimeout(this._wordCountTimer);
          this._wordCountTimer = setTimeout(() => {
            this._wordCountTimer = null;
            this.wordCount.set(editor.storage['characterCount']?.words() ?? 0);
          }, 500);
        }
      },
    });

    editorRef.current = this._editor;

    // rAF-debounced bubble active-state refresh — desktop only
    if (!mobile && bubbleRef) {
      const scheduleUpdate = () => {
        if (this._bubbleUpdateRaf !== null) cancelAnimationFrame(this._bubbleUpdateRaf);
        this._bubbleUpdateRaf = requestAnimationFrame(() => {
          this._bubbleUpdateRaf = null;
          bubbleRef.update();
        });
      };
      this._editor.on('selectionUpdate', scheduleUpdate);
      this._editor.on('transaction',     scheduleUpdate);
    }

    this.editorReady.set(true);
  }

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
    if (this._wordCountTimer)    { clearTimeout(this._wordCountTimer); this._wordCountTimer = null; }
    if (this._bubbleUpdateRaf !== null) { cancelAnimationFrame(this._bubbleUpdateRaf); this._bubbleUpdateRaf = null; }
    this._lastHoveredEl = null;
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
        dir: 'rtl', lang: 'ar',
      },
    });
  }
}
