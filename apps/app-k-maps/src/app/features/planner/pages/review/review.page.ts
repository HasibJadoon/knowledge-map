import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { SprintReview } from '../../../../shared/models/planner/sprint.models';
import { PlannerService } from '../../../../shared/services/planner/planner.service';
import { computeWeekStartSydney } from '../../../../shared/utils/planner/week-start.util';

@Component({
  selector: 'app-review-page',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  templateUrl: './review.page.html',
  styleUrl: './review.page.scss',
})
export class ReviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly planner = inject(PlannerService);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly weekStart = signal(computeWeekStartSydney());

  metrics = {
    tasks_done: 0,
    tasks_total: 0,
    minutes_spent: 0,
    capture_notes: 0,
    promoted_notes: 0,
  };

  whatWorkedText = '';
  whatBlockedText = '';
  nextFocusText = '';

  constructor() {
    this.route.paramMap.subscribe(() => {
      const value = this.route.snapshot.paramMap.get('weekStart') ?? computeWeekStartSydney();
      const weekStart = computeWeekStartSydney(value);
      this.weekStart.set(weekStart);
      void this.load(weekStart);
    });
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      const payload: SprintReview = {
        schema_version: 1,
        title: `Sprint Review — Week of ${this.weekStart()}`,
        outcomes: [],
        metrics: { ...this.metrics },
        what_worked: splitLines(this.whatWorkedText),
        what_blocked: splitLines(this.whatBlockedText),
        carry_over_task_ids: [],
        next_week_focus: splitLines(this.nextFocusText),
      };
      await firstValueFrom(this.planner.upsertReview(this.weekStart(), payload));
      await this.presentToast('Review saved.');
    } catch {
      await this.presentToast('Could not save review.');
    } finally {
      this.saving.set(false);
    }
  }

  private async load(weekStart: string): Promise<void> {
    this.loading.set(true);
    try {
      const week = await firstValueFrom(this.planner.loadWeek(weekStart));
      this.metrics = {
        tasks_done: week.summary.tasks_done,
        tasks_total: week.summary.tasks_total,
        minutes_spent: week.summary.minutes_spent,
        capture_notes: week.summary.capture_notes,
        promoted_notes: week.summary.promoted_notes,
      };

      const review = week.review?.item_json ?? null;
      this.whatWorkedText = Array.isArray(review?.what_worked) ? review.what_worked.join('\n') : '';
      this.whatBlockedText = Array.isArray(review?.what_blocked) ? review.what_blocked.join('\n') : '';
      this.nextFocusText = Array.isArray(review?.next_week_focus) ? review.next_week_focus.join('\n') : '';
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
