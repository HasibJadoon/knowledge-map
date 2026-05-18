import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PlanTask } from '../../../../shared/models/planner/plan.models';
import { PlannerApiService } from '../../../../shared/services/planner/planner-api.service';

interface ScoreOption {
  label: string;
  quality: number;
  tone: string;
}

const SCORE_OPTIONS: ReadonlyArray<ScoreOption> = [
  { label: 'Struggled', quality: 2, tone: 'danger' },
  { label: 'OK', quality: 3, tone: 'medium' },
  { label: 'Strong', quality: 5, tone: 'success' },
];

@Component({
  selector: 'app-planner-review-queue',
  standalone: false,
  templateUrl: './review-queue.page.html',
  styleUrl: './review-queue.page.scss',
  host: { class: 'ion-page' },
})
export class ReviewQueuePage {
  private readonly api = inject(PlannerApiService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly tasks = signal<PlanTask[]>([]);

  readonly scoreOptions = SCORE_OPTIONS;
  readonly remaining = computed(() => this.tasks().length);

  constructor() {
    void this.load();
  }

  openTask(task: PlanTask): void {
    void this.router.navigate(['/planner/tasks', task.id]);
  }

  async score(task: PlanTask, option: ScoreOption, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.reviewFeedback(task.id, option.quality));
      this.tasks.update((rows) => rows.filter((row) => row.id !== task.id));
      await this.presentToast(`Reviewed — ${option.label}.`);
    } catch {
      await this.presentToast('Could not record the review.');
    } finally {
      this.saving.set(false);
    }
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    (event.target as HTMLIonRefresherElement | null)?.complete();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.tasks.set(await firstValueFrom(this.api.reviewDue(50)));
    } catch {
      await this.presentToast('Could not load the review queue.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1500, position: 'bottom' });
    await toast.present();
  }
}
