import {
  AfterViewInit, Component, ElementRef, OnDestroy, ViewChild,
  ViewEncapsulation, computed, inject, signal,
} from '@angular/core';
import { IonItemSliding, NavController, ToastController } from '@ionic/angular';
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
import { CaptureNote, TiptapJson } from '../../../../shared/models/planner/planner-extras.models';
import { Plan } from '../../../../shared/models/planner/plan.models';
import { CaptureNotesService } from '../../../../shared/services/planner/capture-notes.service';
import { PlannerApiService } from '../../../../shared/services/planner/planner-api.service';

@Component({
  selector: 'app-planner-capture',
  standalone: false,
  templateUrl: './capture.page.html',
  styleUrl: './capture.page.scss',
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ion-page' },
})
export class CapturePage implements AfterViewInit, OnDestroy {
  @ViewChild('composerHost') composerHost?: ElementRef<HTMLDivElement>;

  private readonly notes = inject(CaptureNotesService);
  private readonly api = inject(PlannerApiService);
  private readonly toastController = inject(ToastController);
  private readonly navCtrl = inject(NavController);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly items = signal<CaptureNote[]>([]);
  readonly plans = signal<Plan[]>([]);
  readonly range = signal<CaptureRange>('all');

  readonly ranges: ReadonlyArray<{ id: CaptureRange; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ];

  readonly visibleItems = computed<CaptureNote[]>(() => {
    const range = this.range();
    if (range === 'all') {
      return this.items();
    }
    const cutoff = Date.now() - RANGE_DAYS[range] * 86_400_000;
    return this.items().filter((note) => {
      const stamp = Date.parse(note.created_at ?? note.updated_at);
      return Number.isFinite(stamp) && stamp >= cutoff;
    });
  });

  readonly triageOpen = signal(false);
  readonly triageNote = signal<CaptureNote | null>(null);
  readonly triagePlanId = signal<string>('');

  private editor: Editor | null = null;

  constructor() {
    void this.load();
  }

  // ── Editor lifecycle ─────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    // Defer so Angular paints the host element before TipTap mounts into it.
    setTimeout(() => {
      if (this.editor || !this.composerHost?.nativeElement) return;
      this.editor = new Editor({
        element: this.composerHost.nativeElement,
        editable: true,
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
      });
    }, 60);
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.editor = null;
  }

  // ── Composer toolbar ─────────────────────────────────────────────────────────

  format(action: ComposerAction): void {
    const chain = this.editor?.chain().focus();
    if (!chain) return;
    switch (action) {
      case 'bold':      chain.toggleBold().run();                  break;
      case 'italic':    chain.toggleItalic().run();                break;
      case 'heading':   chain.toggleHeading({ level: 2 }).run();   break;
      case 'bullet':    chain.toggleBulletList().run();            break;
      case 'ordered':   chain.toggleOrderedList().run();           break;
      case 'checklist': chain.toggleTaskList().run();              break;
      case 'divider':   chain.setHorizontalRule().run();           break;
    }
  }

  // ── Capture ──────────────────────────────────────────────────────────────────

  async capture(): Promise<void> {
    if (!this.editor || this.saving()) return;
    const text = this.editor.getText().trim();
    if (!text) {
      await this.presentToast('Write something to capture.');
      return;
    }
    const doc = this.editor.getJSON() as TiptapJson;

    this.saving.set(true);
    try {
      const note = await firstValueFrom(this.notes.create({ doc, text, title: summarize(text) }));
      this.items.update((rows) => [note, ...rows]);
      this.editor.commands.clearContent(true);
      this.editor.commands.focus('start');
      await this.presentToast('Captured.');
    } catch {
      await this.presentToast('Could not capture the note.');
    } finally {
      this.saving.set(false);
    }
  }

  setRange(value: string | number | null | undefined): void {
    if (value === 'all' || value === 'today' || value === 'week' || value === 'month') {
      this.range.set(value);
    }
  }

  async archive(note: CaptureNote, sliding?: IonItemSliding | HTMLIonItemSlidingElement | null): Promise<void> {
    await sliding?.close();
    this.saving.set(true);
    try {
      await firstValueFrom(this.notes.archive(note.id));
      this.items.update((rows) => rows.filter((row) => row.id !== note.id));
      await this.presentToast('Archived.');
    } catch {
      await this.presentToast('Could not archive the note.');
    } finally {
      this.saving.set(false);
    }
  }

  // ── Triage into a plan ───────────────────────────────────────────────────────

  openTriage(note: CaptureNote, sliding?: IonItemSliding | HTMLIonItemSlidingElement | null): void {
    void sliding?.close();
    if (this.plans().length === 0) {
      void this.presentToast('Create a plan first to triage captures into.');
      return;
    }
    this.triageNote.set(note);
    this.triagePlanId.set(this.plans()[0].id);
    this.triageOpen.set(true);
  }

  closeTriage(): void {
    this.triageOpen.set(false);
    this.triageNote.set(null);
  }

  setTriagePlan(value: string | number | null | undefined): void {
    if (typeof value === 'string') {
      this.triagePlanId.set(value);
    }
  }

  async submitTriage(): Promise<void> {
    const note = this.triageNote();
    const planId = this.triagePlanId();
    if (!note || !planId || this.saving()) {
      return;
    }

    this.saving.set(true);
    try {
      await firstValueFrom(this.api.createTask({
        plan_id: planId,
        title: note.title || summarize(note.text),
        task_type: 'note',
        description_md: note.text || null,
      }));
      try {
        await firstValueFrom(this.notes.archive(note.id));
      } catch {
        /* keep the capture if archiving fails */
      }
      this.items.update((rows) => rows.filter((row) => row.id !== note.id));
      this.closeTriage();
      await this.presentToast('Capture moved into the plan.');
    } catch {
      await this.presentToast('Could not triage the capture.');
    } finally {
      this.saving.set(false);
    }
  }

  // ── Data ─────────────────────────────────────────────────────────────────────

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [notes, plans] = await Promise.all([
        firstValueFrom(this.notes.list('inbox', 60)),
        firstValueFrom(this.api.listPlans({ status: 'active' })),
      ]);
      this.items.set(notes);
      this.plans.set(plans);
    } catch {
      await this.presentToast('Could not load captures.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1600, position: 'bottom' });
    await toast.present();
  }
}

function summarize(text: string): string {
  const normalized = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'Capture note';
  }
  return normalized.length <= 60 ? normalized : `${normalized.slice(0, 57).replace(/\s+$/, '')}...`;
}

type CaptureRange = 'all' | 'today' | 'week' | 'month';
type ComposerAction = 'bold' | 'italic' | 'heading' | 'bullet' | 'ordered' | 'checklist' | 'divider';

const RANGE_DAYS: Record<Exclude<CaptureRange, 'all'>, number> = {
  today: 1,
  week: 7,
  month: 30,
};
