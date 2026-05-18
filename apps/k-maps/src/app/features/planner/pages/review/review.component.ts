import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PlanTask } from '../../planner.models';
import { PlannerApiService } from '../../planner-api.service';

interface ScoreOption {
  label: string;
  quality: number;
}

const SCORE_OPTIONS: ReadonlyArray<ScoreOption> = [
  { label: 'Struggled', quality: 2 },
  { label: 'OK', quality: 3 },
  { label: 'Strong', quality: 5 },
];

@Component({
  selector: 'km-planner-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review.component.html',
})
export class ReviewComponent {
  private readonly api = inject(PlannerApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly tasks = signal<PlanTask[]>([]);

  readonly scoreOptions = SCORE_OPTIONS;
  readonly remaining = computed(() => this.tasks().length);

  constructor() {
    void this.load();
  }

  openTask(task: PlanTask): void {
    void this.router.navigate(['/planner/tasks', task.id]);
  }

  async score(task: PlanTask, option: ScoreOption): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.reviewFeedback(task.id, option.quality));
      this.tasks.update((rows) => rows.filter((row) => row.id !== task.id));
    } catch {
      this.error.set('Could not record the review.');
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.tasks.set(await firstValueFrom(this.api.reviewDue(50)));
    } catch {
      this.error.set('Could not load the review queue.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.load();
  }
}
