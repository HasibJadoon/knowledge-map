import { Component, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import {
  GOAL_CADENCES,
  GOAL_METRICS,
  GOAL_TYPES,
  Goal,
  GoalCadence,
  GoalMetric,
  GoalType,
  goalProgress,
} from '../../../../shared/models/planner/planner-extras.models';
import { PlannerApiService } from '../../../../shared/services/planner/planner-api.service';

@Component({
  selector: 'app-planner-goals',
  standalone: false,
  templateUrl: './goals.page.html',
  styleUrl: './goals.page.scss',
  host: { class: 'ion-page' },
})
export class GoalsPage {
  private readonly api = inject(PlannerApiService);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly goals = signal<Goal[]>([]);
  readonly createOpen = signal(false);

  readonly goalTypes = GOAL_TYPES;
  readonly goalMetrics = GOAL_METRICS;
  readonly goalCadences = GOAL_CADENCES;

  readonly newTitle = new FormControl('', { nonNullable: true });
  readonly newTarget = new FormControl(10, { nonNullable: true });
  readonly newType = signal<GoalType>('quota');
  readonly newMetric = signal<GoalMetric>('sessions');
  readonly newCadence = signal<GoalCadence>('weekly');

  constructor() {
    void this.load();
  }

  progress(goal: Goal): number {
    return goalProgress(goal);
  }

  percent(goal: Goal): number {
    return Math.round(goalProgress(goal) * 100);
  }

  setNewType(value: string | number | null | undefined): void {
    if (GOAL_TYPES.includes(value as GoalType)) {
      this.newType.set(value as GoalType);
    }
  }

  setNewMetric(value: string | number | null | undefined): void {
    if (GOAL_METRICS.includes(value as GoalMetric)) {
      this.newMetric.set(value as GoalMetric);
    }
  }

  setNewCadence(value: string | number | null | undefined): void {
    if (GOAL_CADENCES.includes(value as GoalCadence)) {
      this.newCadence.set(value as GoalCadence);
    }
  }

  openCreate(): void {
    this.newTitle.setValue('');
    this.newTarget.setValue(10);
    this.newType.set('quota');
    this.newMetric.set('sessions');
    this.newCadence.set('weekly');
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
  }

  async submitCreate(): Promise<void> {
    const title = this.newTitle.value.trim();
    if (!title) {
      await this.presentToast('Add a goal title first.');
      return;
    }
    const target = Number(this.newTarget.value);
    this.saving.set(true);
    try {
      const goal = await firstValueFrom(this.api.createGoal({
        title,
        goal_type: this.newType(),
        metric: this.newMetric(),
        target_value: Number.isFinite(target) && target > 0 ? Math.round(target) : 1,
        cadence: this.newCadence(),
      }));
      this.goals.update((rows) => [goal, ...rows]);
      this.createOpen.set(false);
      await this.presentToast('Goal created.');
    } catch {
      await this.presentToast('Could not create the goal.');
    } finally {
      this.saving.set(false);
    }
  }

  async logProgress(goal: Goal, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.updateGoalValue(goal.id, goal.current_value + 1));
      this.replaceGoal(updated);
    } catch {
      await this.presentToast('Could not log progress.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleComplete(goal: Goal, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.patchGoal(goal.id, {
        status: goal.status === 'completed' ? 'active' : 'completed',
      }));
      this.replaceGoal(updated);
    } catch {
      await this.presentToast('Could not update the goal.');
    } finally {
      this.saving.set(false);
    }
  }

  private replaceGoal(updated: Goal): void {
    this.goals.update((rows) => {
      const index = rows.findIndex((row) => row.id === updated.id);
      if (index < 0) {
        return [updated, ...rows];
      }
      const next = [...rows];
      next[index] = updated;
      return next;
    });
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.goals.set(await firstValueFrom(this.api.listGoals()));
    } catch {
      await this.presentToast('Could not load goals.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1600, position: 'bottom' });
    await toast.present();
  }
}
