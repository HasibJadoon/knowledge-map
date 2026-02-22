import { Component, computed, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RefresherCustomEvent, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PlannerTaskRow, PlannerWeekSummary, SprintReview } from '../../sprint/models/sprint.models';
import { PlannerService } from '../../sprint/services/planner.service';
import { computeWeekStartSydney, formatWeekRangeLabel } from '../../sprint/utils/week-start.util';

@Component({
  selector: 'app-planner-review-page',
  standalone: false,
  templateUrl: './planner-review.page.html',
  styleUrl: './planner-review.page.scss',
})
export class PlannerReviewPage {
  private readonly planner = inject(PlannerService);
  private readonly toastController = inject(ToastController);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly weekStart = signal(computeWeekStartSydney(this.planner.currentWeekStart()));
  readonly weekLabel = computed(() => formatWeekRangeLabel(this.weekStart()));

  readonly metrics = signal<PlannerWeekSummary>({
    tasks_done: 0,
    tasks_total: 0,
    minutes_spent: 0,
    inbox_count: 0,
    capture_notes: 0,
    promoted_notes: 0,
  });

  readonly whatWorkedControl = new FormControl('', { nonNullable: true });
  readonly whatBlockedControl = new FormControl('', { nonNullable: true });
  readonly nextFocusControl = new FormControl('', { nonNullable: true });

  readonly availableCarryOverTasks = signal<PlannerTaskRow[]>([]);
  readonly carryOverTaskIds = signal<string[]>([]);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const nextWeekStart = computeWeekStartSydney(params.get('weekStart') ?? this.planner.currentWeekStart());
      this.weekStart.set(nextWeekStart);
      void this.load();
    });
  }

  async onRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.load();
    event.target.complete();
  }

  isCarryOver(taskId: string): boolean {
    return this.carryOverTaskIds().includes(taskId);
  }

  toggleCarryOver(taskId: string, checked: boolean): void {
    if (checked) {
      if (this.isCarryOver(taskId)) {
        return;
      }

      this.carryOverTaskIds.update((ids) => [...ids, taskId]);
      return;
    }

    this.carryOverTaskIds.update((ids) => ids.filter((id) => id !== taskId));
  }

  taskTitle(task: PlannerTaskRow): string {
    return task.item_json.title || 'Untitled task';
  }

  taskContext(task: PlannerTaskRow): string {
    const lane = task.item_json.lane.toUpperCase();
    return `${lane} · ${task.item_json.estimate_min} min`;
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const stats = this.metrics();
      const payload: SprintReview = {
        schema_version: 1,
        title: `Sprint Review - ${this.weekStart()}`,
        outcomes: [],
        metrics: {
          tasks_done: stats.tasks_done,
          tasks_total: stats.tasks_total,
          minutes_spent: stats.minutes_spent,
          capture_notes: stats.capture_notes,
          promoted_notes: stats.promoted_notes,
        },
        what_worked: splitLines(this.whatWorkedControl.value),
        what_blocked: splitLines(this.whatBlockedControl.value),
        carry_over_task_ids: [...this.carryOverTaskIds()],
        next_week_focus: splitLines(this.nextFocusControl.value),
      };

      await firstValueFrom(this.planner.upsertReview(this.weekStart(), payload));
      await this.presentToast('Review saved.');
    } catch {
      await this.presentToast('Could not save review.');
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const week = await firstValueFrom(this.planner.ensureWeekAnchors(this.weekStart()));
      this.metrics.set(week.summary);

      const pending = week.tasks.filter((task) => task.item_json.status !== 'done' && task.item_json.status !== 'skipped');
      this.availableCarryOverTasks.set(pending.length ? pending : week.tasks);

      const review = week.review?.item_json ?? null;
      this.whatWorkedControl.setValue(readLines(review?.what_worked), { emitEvent: false });
      this.whatBlockedControl.setValue(readLines(review?.what_blocked), { emitEvent: false });
      this.nextFocusControl.setValue(readLines(review?.next_week_focus), { emitEvent: false });
      this.carryOverTaskIds.set(readStringArray(review?.carry_over_task_ids));
    } catch {
      await this.presentToast('Could not load review.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1500,
      position: 'bottom',
    });
    await toast.present();
  }
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readLines(value: unknown): string {
  if (!Array.isArray(value)) {
    return '';
  }

  const rows = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return rows.join('\n');
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}
