import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
} from '../../planner-extras.models';
import { PlannerApiService } from '../../planner-api.service';

@Component({
  selector: 'km-planner-goals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './goals.component.html',
})
export class GoalsComponent {
  private readonly api = inject(PlannerApiService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly goals = signal<Goal[]>([]);
  readonly createOpen = signal(false);

  readonly goalTypes = GOAL_TYPES;
  readonly goalMetrics = GOAL_METRICS;
  readonly goalCadences = GOAL_CADENCES;

  newTitle = '';
  newType: GoalType = 'quota';
  newMetric: GoalMetric = 'sessions';
  newCadence: GoalCadence = 'weekly';
  newTarget = 10;

  constructor() {
    void this.load();
  }

  percent(goal: Goal): number {
    return Math.round(goalProgress(goal) * 100);
  }

  openCreate(): void {
    this.newTitle = '';
    this.newType = 'quota';
    this.newMetric = 'sessions';
    this.newCadence = 'weekly';
    this.newTarget = 10;
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
  }

  async submitCreate(): Promise<void> {
    const title = this.newTitle.trim();
    if (!title || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      const goal = await firstValueFrom(this.api.createGoal({
        title,
        goal_type: this.newType,
        metric: this.newMetric,
        cadence: this.newCadence,
        target_value: this.newTarget > 0 ? Math.round(this.newTarget) : 1,
      }));
      this.goals.update((rows) => [goal, ...rows]);
      this.createOpen.set(false);
    } catch {
      this.error.set('Could not create the goal.');
    } finally {
      this.saving.set(false);
    }
  }

  async logProgress(goal: Goal): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      this.replaceGoal(await firstValueFrom(this.api.updateGoalValue(goal.id, goal.current_value + 1)));
    } catch {
      this.error.set('Could not log progress.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleComplete(goal: Goal): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      this.replaceGoal(await firstValueFrom(this.api.patchGoal(goal.id, {
        status: goal.status === 'completed' ? 'active' : 'completed',
      })));
    } catch {
      this.error.set('Could not update the goal.');
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
    this.error.set('');
    try {
      this.goals.set(await firstValueFrom(this.api.listGoals()));
    } catch {
      this.error.set('Could not load goals.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.load();
  }
}
