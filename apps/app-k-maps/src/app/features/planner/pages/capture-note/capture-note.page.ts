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

type SaveState = 'idle' | 'saving' | 'saved';

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

  readonly loading = signal(true);
  readonly saveState = signal<SaveState>('idle');

  private editor: Editor | null = null;
  private noteId: string | null = null;
  private dirty = false;
  private savingNow = false;
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
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.dirty) void this.doSave();
  }

  goBack(): void {
    void this.navCtrl.navigateBack('/planner/capture', { animated: true });
  }

  // ── Load ─────────────────────────────────────────────────────────────────────

  private async loadNote(id: string): Promise<void> {
    try {
      const note = await firstValueFrom(this.notes.get(id));
      this.mountEditor(note.doc);
    } catch {
      this.mountEditor(null);
    }
    this.loading.set(false);
  }

  // ── Editor ───────────────────────────────────────────────────────────────────

  private mountEditor(content: TiptapJson | null): void {
    setTimeout(() => {
      if (this.editor || !this.editorHost?.nativeElement) return;
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
        onUpdate: () => this.scheduleSave(),
      });
      this.editor.commands.focus('end');
    }, 60);
  }

  format(action: ComposerAction): void {
    const chain = this.editor?.chain().focus();
    if (!chain) return;
    switch (action) {
      case 'bold':      chain.toggleBold().run();                break;
      case 'italic':    chain.toggleItalic().run();              break;
      case 'heading':   chain.toggleHeading({ level: 2 }).run(); break;
      case 'bullet':    chain.toggleBulletList().run();          break;
      case 'ordered':   chain.toggleOrderedList().run();         break;
      case 'checklist': chain.toggleTaskList().run();            break;
      case 'divider':   chain.setHorizontalRule().run();         break;
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.doSave(), 1000);
  }

  private async doSave(): Promise<void> {
    if (!this.editor) return;
    if (this.savingNow) {
      this.scheduleSave();
      return;
    }
    const text = this.editor.getText().trim();
    const doc = this.editor.getJSON() as TiptapJson;
    // A brand-new note is only created once it actually has content.
    if (!this.noteId && !text) {
      this.dirty = false;
      return;
    }

    this.savingNow = true;
    this.dirty = false;
    this.saveState.set('saving');
    try {
      const title = deriveTitle(text);
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
    } catch {
      this.dirty = true;
      this.saveState.set('idle');
    } finally {
      this.savingNow = false;
    }
  }
}

function deriveTitle(text: string): string | null {
  const firstLine = (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return null;
  return firstLine.length <= 80 ? firstLine : `${firstLine.slice(0, 77).replace(/\s+$/, '')}...`;
}

type ComposerAction = 'bold' | 'italic' | 'heading' | 'bullet' | 'ordered' | 'checklist' | 'divider';
