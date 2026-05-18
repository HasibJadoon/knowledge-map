import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonItemSliding, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { CaptureNote } from '../../../../shared/models/planner/planner-extras.models';
import { Plan } from '../../../../shared/models/planner/plan.models';
import { CaptureNotesService } from '../../../../shared/services/planner/capture-notes.service';
import { PlannerApiService } from '../../../../shared/services/planner/planner-api.service';

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
  private readonly router = inject(Router);

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
      const stamp = Date.parse(note.updated_at ?? note.created_at);
      return Number.isFinite(stamp) && stamp >= cutoff;
    });
  });

  readonly triageOpen = signal(false);
  readonly triageNote = signal<CaptureNote | null>(null);
  readonly triagePlanId = signal<string>('');

  /** Refresh whenever the page is (re)entered — e.g. back from the editor. */
  ionViewWillEnter(): void {
    void this.load();
  }

  preview(note: CaptureNote): string {
    const body = (note.text ?? '').replace(/\s+/g, ' ').trim();
    const title = (note.title ?? '').trim();
    if (body && title && body.startsWith(title)) {
      return body.slice(title.length).trim() || 'No additional text';
    }
    return body || 'Empty note';
  }

  newNote(): void {
    void this.router.navigate(['/planner/capture/new']);
  }

  openNote(note: CaptureNote): void {
    void this.router.navigate(['/planner/capture', note.id]);
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
        title: note.title || 'Capture note',
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
        firstValueFrom(this.notes.list('inbox', 100)),
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

type CaptureRange = 'all' | 'today' | 'week' | 'month';

const RANGE_DAYS: Record<Exclude<CaptureRange, 'all'>, number> = {
  today: 1,
  week: 7,
  month: 30,
};
