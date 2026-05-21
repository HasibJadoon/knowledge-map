import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild,
  ViewEncapsulation, inject, signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { NavController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { HorizontalRule } from '@tiptap/extension-horizontal-rule';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { AutoDirection } from '../../../quran/surah-study/surah-notes-page/auto-direction.extension';
import { Callout } from '../../../docs/doc-editor/tiptap-extensions/callout.extension';
import { SlashCommandExtension } from '../../../docs/doc-editor/tiptap-extensions/slash-command.extension';
import { PageLink } from '../../../docs/doc-editor/tiptap-extensions/page-link.extension';
import { AyahEmbed } from '../../../docs/doc-editor/tiptap-extensions/ayah-embed.extension';
import { ImageBlock } from '../../../docs/doc-editor/tiptap-extensions/image.extension';
import {
  VocabBlock, MorphologyBlock, NahwBlock, RootAnalysisBlock,
} from '../../../docs/doc-editor/tiptap-extensions/arabic-blocks.extension';
import {
  ClaimBlock, EvidenceBlock, ReflectionBlock, TaskBlock, SceneBlock,
  TimelineBlock, ComprehensionBlock, ChildrenBlock, PassageEmbed,
} from '../../../docs/doc-editor/tiptap-extensions/worldview-blocks.extension';
import { TiptapJson } from '../../../../shared/models/planner/planner-extras.models';
import { CaptureNotesService } from '../../../../shared/services/planner/capture-notes.service';
import { AddToSrsService } from '../../../../shared/services/srs/add-to-srs.service';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type ComposerAction =
  | 'bold' | 'italic' | 'underline' | 'strike' | 'code'
  | 'paragraph' | 'h1' | 'h2' | 'h3'
  | 'bullet' | 'ordered' | 'checklist'
  | 'quote' | 'callout' | 'divider';

@Component({
  selector: 'app-planner-capture-note',
  standalone: false,
  templateUrl: './capture-note.page.html',
  styleUrl: './capture-note.page.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ion-page' },
})
export class CaptureNotePage implements AfterViewInit, OnDestroy {
  @ViewChild('editorHost') editorHost?: ElementRef<HTMLDivElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly navCtrl = inject(NavController);
  private readonly notes = inject(CaptureNotesService);
  private readonly addToSrsService = inject(AddToSrsService);

  readonly loading = signal(true);
  readonly editorError = signal(false);
  readonly saveState = signal<SaveState>('idle');
  /** Which formats apply at the caret — drives toolbar active highlighting. */
  readonly active = signal<Record<string, boolean>>({});
  /** Title input value (independent of the body editor). */
  readonly title = signal('');

  private editor: Editor | null = null;
  private noteId: string | null = null;
  private dirty = false;
  private saveInFlight: Promise<void> | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id || id === 'new') {
      this.loading.set(false);
      this.mountEditor(null);
    } else {
      this.noteId = id;
      void this.loadNote(id);
    }
  }

  ngOnDestroy(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.savedTimer) clearTimeout(this.savedTimer);
    this.editor?.destroy();
    this.editor = null;
  }

  /** Ionic fires this before the page is left — flush any unsaved edits. */
  ionViewWillLeave(): void {
    void this.flush();
  }

  /**
   * Wait for the save to land before navigating back. Without this the
   * capture list reloads while the create/update request is still in flight
   * and the new note appears to "not save".
   */
  async goBack(): Promise<void> {
    await this.flush();
    void this.navCtrl.navigateBack('/planner/capture', { animated: true });
  }

  // ── Load ─────────────────────────────────────────────────────────────────────

  private async loadNote(id: string): Promise<void> {
    try {
      const note = await firstValueFrom(this.notes.get(id));
      this.title.set(note.title ?? '');
      this.mountEditor(note.doc);
    } catch {
      this.mountEditor(null);
    }
    this.loading.set(false);
  }

  /** ngModel hook on the title input — autosave after the same debounce. */
  onTitleInput(value: string): void {
    this.title.set(value);
    this.scheduleSave();
  }

  /** Turn the current note into an SRS flashcard via the deck picker. */
  async addToSrs(): Promise<void> {
    const body = (this.editor?.getText() ?? '').trim();
    const title = this.title().trim();
    const front = title || body.split('\n').map((l) => l.trim()).find(Boolean) || '';
    const back = title ? body : body.split('\n').slice(1).join('\n').trim();
    if (!front || !back) return;
    await this.addToSrsService.addToSrs({
      front,
      back,
      card_template: 'freeform',
      resource_ref: this.noteId ? `CM:${this.noteId}` : undefined,
      resource_type: 'other',
      module: 'other',
    });
  }

  // ── Editor ───────────────────────────────────────────────────────────────────

  private mountEditor(content: TiptapJson | null): void {
    setTimeout(() => {
      if (this.editor || !this.editorHost?.nativeElement) return;
      try {
        this.editor = new Editor({
          element: this.editorHost.nativeElement,
          editable: true,
          content: (content ?? undefined) as never,
          extensions: [
            StarterKit.configure({ horizontalRule: false }),
            HorizontalRule,
            Placeholder.configure({ placeholder: 'Catch a thought — type / for blocks' }),
            Link.configure({ openOnClick: false }),
            Underline,
            TextStyle,
            Color,
            Highlight.configure({ multicolor: true }),
            TaskList,
            TaskItem.configure({ nested: true }),
            AutoDirection,
            Callout,
            SlashCommandExtension,
            PageLink.configure({
              onOpen: (docId: string) => {
                void this.navCtrl.navigateForward(`/docs/${docId}`);
              },
            }),
            AyahEmbed,
            ImageBlock,
            VocabBlock, MorphologyBlock, NahwBlock, RootAnalysisBlock,
            ClaimBlock, EvidenceBlock, ReflectionBlock,
            TaskBlock, SceneBlock, TimelineBlock,
            ComprehensionBlock, ChildrenBlock, PassageEmbed,
          ],
          onUpdate: () => {
            this.scheduleSave();
            this.syncActive();
          },
          onSelectionUpdate: () => this.syncActive(),
        });
        this.editor.commands.focus('end');
        this.syncActive();
      } catch {
        this.editorError.set(true);
      }
    }, 60);
  }

  format(action: ComposerAction): void {
    const editor = this.editor;
    if (!editor) return;
    const chain = editor.chain().focus();
    switch (action) {
      case 'bold':      chain.toggleBold().run();                break;
      case 'italic':    chain.toggleItalic().run();              break;
      case 'underline': chain.toggleUnderline().run();           break;
      case 'strike':    chain.toggleStrike().run();              break;
      case 'code':      chain.toggleCode().run();                break;
      case 'paragraph': chain.setParagraph().run();              break;
      case 'h1':        chain.toggleHeading({ level: 1 }).run(); break;
      case 'h2':        chain.toggleHeading({ level: 2 }).run(); break;
      case 'h3':        chain.toggleHeading({ level: 3 }).run(); break;
      case 'bullet':    chain.toggleBulletList().run();          break;
      case 'ordered':   chain.toggleOrderedList().run();         break;
      case 'checklist': chain.toggleTaskList().run();            break;
      case 'quote':     chain.toggleBlockquote().run();          break;
      case 'divider':   chain.setHorizontalRule().run();         break;
      case 'callout':
        chain.insertContent({
          type: 'callout',
          attrs: { type: 'tip', emoji: '💡' },
          content: [{ type: 'paragraph' }],
        }).run();
        break;
    }
    this.syncActive();
  }

  /** Toolbar handler — preventDefault keeps editor focus (and the keyboard up). */
  onTool(event: Event, action: ComposerAction): void {
    event.preventDefault();
    this.format(action);
  }

  private syncActive(): void {
    const e = this.editor;
    if (!e) return;
    this.active.set({
      bold:      e.isActive('bold'),
      italic:    e.isActive('italic'),
      underline: e.isActive('underline'),
      strike:    e.isActive('strike'),
      code:      e.isActive('code'),
      h1:        e.isActive('heading', { level: 1 }),
      h2:        e.isActive('heading', { level: 2 }),
      h3:        e.isActive('heading', { level: 3 }),
      bullet:    e.isActive('bulletList'),
      ordered:   e.isActive('orderedList'),
      checklist: e.isActive('taskList'),
      quote:     e.isActive('blockquote'),
      callout:   e.isActive('callout'),
    });
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), 1000);
  }

  /** Persists pending edits and resolves only once the write has landed. */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.saveInFlight) {
      try { await this.saveInFlight; } catch { /* surfaced via saveState */ }
    }
    if (!this.dirty || !this.editor) return;
    this.saveInFlight = this.persist();
    try {
      await this.saveInFlight;
    } catch {
      /* persist() already set the error state */
    } finally {
      this.saveInFlight = null;
    }
  }

  private async persist(): Promise<void> {
    const editor = this.editor;
    if (!editor) return;
    const text = editor.getText().trim();
    const doc = editor.getJSON() as TiptapJson;
    const title = normalizeTitle(this.title());
    // A brand-new note is only created once it actually has content
    // (title or body), so empty-tap-back doesn't pollute the list.
    if (!this.noteId && !text && !title) {
      this.dirty = false;
      return;
    }

    this.dirty = false;
    this.saveState.set('saving');
    try {
      if (this.noteId) {
        await firstValueFrom(this.notes.update(this.noteId, { doc, text, title }));
      } else {
        const note = await firstValueFrom(this.notes.create({ doc, text, title }));
        this.noteId = note.id;
        this.location.replaceState(`/planner/capture/${note.id}`);
      }
      this.saveState.set('saved');
      if (this.savedTimer) clearTimeout(this.savedTimer);
      this.savedTimer = setTimeout(() => this.saveState.set('idle'), 2000);
    } catch (err) {
      this.dirty = true;
      this.saveState.set('error');
      throw err;
    }
  }
}

function normalizeTitle(raw: string): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  return trimmed.length <= 80 ? trimmed : `${trimmed.slice(0, 77).replace(/\s+$/, '')}...`;
}
