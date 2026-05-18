import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { IonItemSliding, IonTextarea, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { CaptureNote, CaptureNoteMeta } from '../../../../shared/models/planner/sprint.models';
import { CaptureNotesService } from '../../../../shared/services/planner/capture-notes.service';
import { PlannerService } from '../../../../shared/services/planner/planner.service';

type CaptureArea = 'quran' | 'arabic' | 'worldview' | 'vocabulary' | 'english';

interface MarkTool {
  id: string;
  label: string;
  icon: string;
}

const AREA_LABELS: Record<CaptureArea, string> = {
  quran: 'Quran',
  arabic: 'Arabic',
  worldview: 'Worldview',
  vocabulary: 'Vocabulary',
  english: 'English',
};

@Component({
  selector: 'app-planner-capture-page',
  standalone: false,
  templateUrl: './planner-capture.page.html',
  styleUrl: './planner-capture.page.scss',
})
export class PlannerCapturePage {
  private readonly notes = inject(CaptureNotesService);
  private readonly planner = inject(PlannerService);
  private readonly toastController = inject(ToastController);

  private readonly bodyArea = viewChild<IonTextarea>('bodyArea');

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly weekStart = signal(this.planner.currentWeekStart());
  readonly items = signal<CaptureNote[]>([]);
  readonly area = signal<CaptureArea>('quran');

  readonly titleControl = new FormControl('', { nonNullable: true });
  readonly bodyControl = new FormControl('', { nonNullable: true });
  readonly quoteControl = new FormControl('', { nonNullable: true });
  readonly sourceControl = new FormControl('', { nonNullable: true });

  readonly areas: CaptureArea[] = ['quran', 'arabic', 'worldview', 'vocabulary', 'english'];
  readonly areaLabels = AREA_LABELS;
  readonly markTools: MarkTool[] = [
    { id: 'bold', label: 'Bold', icon: 'text-outline' },
    { id: 'italic', label: 'Italic', icon: 'pencil-outline' },
    { id: 'heading', label: 'Heading', icon: 'remove-outline' },
    { id: 'bullet', label: 'List', icon: 'list-outline' },
    { id: 'quote', label: 'Quote', icon: 'chatbox-ellipses-outline' },
  ];

  constructor() {
    void this.load();
  }

  setArea(value: string | number | null | undefined): void {
    if (value === 'quran' || value === 'arabic' || value === 'worldview' || value === 'vocabulary' || value === 'english') {
      this.area.set(value);
    }
  }

  areaLabel(area: CaptureArea): string {
    return AREA_LABELS[area];
  }

  async applyMark(tool: string): Promise<void> {
    const textarea = await this.bodyArea()?.getInputElement();
    if (!textarea) {
      return;
    }

    const value = textarea.value;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const selected = value.slice(start, end);

    const { text, caret } = transformMark(tool, value, start, end, selected);
    this.bodyControl.setValue(text);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(caret, caret);
    });
  }

  async save(): Promise<void> {
    const body = this.bodyControl.value.trim();
    const quote = this.quoteControl.value.trim();
    const source = this.sourceControl.value.trim();

    if (!body && !quote) {
      await this.presentToast('Write something before saving.');
      return;
    }

    const title = this.titleControl.value.trim() || summarize(body || quote);
    const text = composeMarkdown({ body, quote, source, area: this.area() });

    this.saving.set(true);
    try {
      const meta: CaptureNoteMeta = {
        schema_version: 1,
        kind: 'capture',
        week_start: this.weekStart(),
        source: 'weekly',
        related_type: 'sp_weekly_plans',
        related_id: this.weekStart(),
        task_type: this.area(),
      };

      const note = await firstValueFrom(this.notes.create({ text, title, meta }));
      this.items.update((rows) => [note, ...rows]);
      this.resetComposer();
      await this.presentToast('Capture saved.');
    } catch {
      await this.presentToast('Could not save the capture.');
    } finally {
      this.saving.set(false);
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
      await this.presentToast('Could not archive the capture.');
    } finally {
      this.saving.set(false);
    }
  }

  noteArea(note: CaptureNote): string {
    const tag = note.meta?.task_type;
    return tag && tag in AREA_LABELS ? AREA_LABELS[tag as CaptureArea] : 'Capture';
  }

  private resetComposer(): void {
    this.titleControl.setValue('');
    this.bodyControl.setValue('');
    this.quoteControl.setValue('');
    this.sourceControl.setValue('');
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const notes = await firstValueFrom(this.notes.list('inbox', 60));
      this.items.set(notes);
    } catch {
      await this.presentToast('Could not load captures.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1500, position: 'bottom' });
    await toast.present();
  }
}

function transformMark(
  tool: string,
  value: string,
  start: number,
  end: number,
  selected: string,
): { text: string; caret: number } {
  const inlineWrap = (marker: string): { text: string; caret: number } => {
    const inner = selected || 'text';
    const text = `${value.slice(0, start)}${marker}${inner}${marker}${value.slice(end)}`;
    return { text, caret: start + marker.length + inner.length + marker.length };
  };

  const linePrefix = (prefix: string): { text: string; caret: number } => {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const text = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    return { text, caret: end + prefix.length };
  };

  switch (tool) {
    case 'bold':
      return inlineWrap('**');
    case 'italic':
      return inlineWrap('_');
    case 'heading':
      return linePrefix('## ');
    case 'bullet':
      return linePrefix('- ');
    case 'quote':
      return linePrefix('> ');
    default:
      return { text: value, caret: end };
  }
}

function composeMarkdown(parts: { body: string; quote: string; source: string; area: CaptureArea }): string {
  const blocks: string[] = [];
  if (parts.body) {
    blocks.push(parts.body);
  }
  if (parts.quote) {
    blocks.push(parts.quote.split('\n').map((line) => `> ${line}`).join('\n'));
  }
  if (parts.source) {
    blocks.push(`Source: ${parts.source}`);
  }
  blocks.push(`#${parts.area}`);
  return blocks.join('\n\n');
}

function summarize(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'Capture note';
  }
  return normalized.length <= 60 ? normalized : `${normalized.slice(0, 57).replace(/\s+$/, '')}...`;
}
