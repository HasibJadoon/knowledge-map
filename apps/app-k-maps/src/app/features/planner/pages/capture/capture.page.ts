import { Component, computed, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { IonItemSliding, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { CaptureNote, CaptureNoteMeta } from '../../../../shared/models/planner/sprint.models';
import { Plan } from '../../../../shared/models/planner/plan.models';
import { CaptureNotesService } from '../../../../shared/services/planner/capture-notes.service';
import { PlannerApiService } from '../../../../shared/services/planner/planner-api.service';
import { computeWeekStartSydney } from '../../../../shared/utils/planner/week-start.util';

@Component({
  selector: 'app-planner-capture',
  standalone: false,
  templateUrl: './capture.page.html',
  styleUrl: './capture.page.scss',
  host: { class: 'ion-page' },
})
export class CapturePage {
  private readonly notes = inject(CaptureNotesService);
  private readonly api = inject(PlannerApiService);
  private readonly toastController = inject(ToastController);

  private readonly weekStart = computeWeekStartSydney();

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

  readonly captureControl = new FormControl('', { nonNullable: true });

  readonly triageOpen = signal(false);
  readonly triageNote = signal<CaptureNote | null>(null);
  readonly triagePlanId = signal<string>('');

  constructor() {
    void this.load();
  }

  setRange(value: string | number | null | undefined): void {
    if (value === 'all' || value === 'today' || value === 'week' || value === 'month') {
      this.range.set(value);
    }
  }

  async capture(): Promise<void> {
    const text = this.captureControl.value.trim();
    if (!text) {
      return;
    }

    this.saving.set(true);
    try {
      const meta: CaptureNoteMeta = {
        schema_version: 1,
        kind: 'capture',
        week_start: this.weekStart,
        source: 'weekly',
      };
      const note = await firstValueFrom(this.notes.create({ text, title: summarize(text), meta }));
      this.items.update((rows) => [note, ...rows]);
      this.captureControl.setValue('');
      await this.presentToast('Captured.');
    } catch {
      await this.presentToast('Could not capture the note.');
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
      await this.presentToast('Could not archive the note.');
    } finally {
      this.saving.set(false);
    }
  }

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

const RANGE_DAYS: Record<Exclude<CaptureRange, 'all'>, number> = {
  today: 1,
  week: 7,
  month: 30,
};
