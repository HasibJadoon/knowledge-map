import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Plan, PlanTask } from '../../planner.models';
import { PlannerApiService } from '../../planner-api.service';

@Component({
  selector: 'km-planner-capture',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './capture.component.html',
})
export class CaptureComponent {
  private readonly api = inject(PlannerApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly plans = signal<Plan[]>([]);
  readonly recent = signal<PlanTask[]>([]);

  text = '';
  planId = '';

  constructor() {
    void this.load();
  }

  openTask(task: PlanTask): void {
    void this.router.navigate(['/planner/tasks', task.id]);
  }

  goPlans(): void {
    void this.router.navigate(['/planner/plans']);
  }

  async capture(): Promise<void> {
    const text = this.text.trim();
    if (!text || !this.planId || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const task = await firstValueFrom(this.api.createTask({
        plan_id: this.planId,
        title: firstLine(text),
        task_type: 'note',
        description_md: text,
      }));
      this.recent.update((rows) => [task, ...rows]);
      this.text = '';
    } catch {
      this.error.set('Could not capture into the plan.');
    } finally {
      this.saving.set(false);
    }
  }

  planTitle(planId: string): string {
    return this.plans().find((plan) => plan.id === planId)?.title ?? 'Plan';
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const plans = await firstValueFrom(this.api.listPlans({ status: 'active' }));
      this.plans.set(plans);
      if (plans.length) {
        this.planId = plans[0].id;
      }
    } catch {
      this.error.set('Could not load plans.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.load();
  }
}

function firstLine(text: string): string {
  const line = text.split('\n').map((part) => part.trim()).find(Boolean) ?? text.trim();
  return line.length <= 80 ? line : `${line.slice(0, 77)}...`;
}
