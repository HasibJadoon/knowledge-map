import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, IonItemSliding, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import {
  CAPTURE_NOTE_STATUSES,
  CAPTURE_NOTE_STATUS_LABELS,
  CaptureNote,
  CaptureNoteStatus,
} from '../../../../shared/models/planner/planner-extras.models';
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
  private readonly actionSheetController = inject(ActionSheetController);
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

  /** Pull-to-refresh — reload without flashing the full-page skeleton. */
  async onRefresh(ev: CustomEvent): Promise<void> {
    await this.load(false);
    (ev.target as HTMLIonRefresherElement | null)?.complete();
  }

  titleOf(note: CaptureNote): string {
    return (note.title ?? '').trim() || 'New note';
  }

  statusLabel(status: CaptureNoteStatus): string {
    return CAPTURE_NOTE_STATUS_LABELS[status];
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

  /** Tap on the stage chip — present an action sheet to pick a new stage. */
  async changeStatus(event: Event, note: CaptureNote): Promise<void> {
    event.stopPropagation();
    const sheet = await this.actionSheetController.create({
      header: 'Move to stage',
      buttons: [
        ...CAPTURE_NOTE_STATUSES.map((status) => ({
          text: CAPTURE_NOTE_STATUS_LABELS[status],
          cssClass: status === note.status ? 'km-action-sheet-current' : undefined,
          handler: () => {
            if (status !== note.status) {
              void this.applyStatus(note, status);
            }
            return true;
          },
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async applyStatus(note: CaptureNote, status: CaptureNoteStatus): Promise<void> {
    // Optimistic update so the chip reflects the choice instantly.
    const previous = note.status;
    this.items.update((rows) => rows.map((row) =>
      row.id === note.id ? { ...row, status } : row,
    ));
    try {
      await firstValueFrom(this.notes.update(note.id, { status }));
    } catch {
      this.items.update((rows) => rows.map((row) =>
        row.id === note.id ? { ...row, status: previous } : row,
      ));
      await this.presentToast('Could not update the stage.');
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
        await firstValueFrom(this.notes.update(note.id, { status: 'done' }));
        this.items.update((rows) => rows.map((row) =>
          row.id === note.id ? { ...row, status: 'done' } : row,
        ));
      } catch {
        /* keep the capture as-is if the stage update fails */
      }
      this.closeTriage();
      await this.presentToast('Capture moved into the plan.');
    } catch {
      await this.presentToast('Could not triage the capture.');
    } finally {
      this.saving.set(false);
    }
  }

  // ── Data ─────────────────────────────────────────────────────────────────────

  private async load(showSkeleton = true): Promise<void> {
    if (showSkeleton) this.loading.set(true);
    try {
      // Wait for any in-flight autosave from the editor (e.g. the user swiped
      // back before the POST landed) so the list shows the freshly-saved note.
      await this.notes.whenIdle();
      const [notes, plans] = await Promise.all([
        firstValueFrom(this.notes.list(100)),
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
