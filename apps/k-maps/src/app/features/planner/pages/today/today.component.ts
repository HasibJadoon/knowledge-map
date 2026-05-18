import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  PLANNER_DOMAINS,
  Plan,
  PlanTask,
  PlannerDomain,
  domainConfig,
  planDomain,
} from '../../planner.models';
import { PlannerApiService } from '../../planner-api.service';

interface DomainCount {
  domain: PlannerDomain;
  label: string;
  color: string;
  count: number;
}

@Component({
  selector: 'km-planner-today',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './today.component.html',
})
export class TodayComponent {
  private readonly api = inject(PlannerApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly dueTasks = signal<PlanTask[]>([]);
  readonly plans = signal<Plan[]>([]);

  private readonly todayIso = isoDate(new Date());
  readonly todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  readonly overdue = computed(() => this.dueTasks().filter((task) => isBefore(task.due_date, this.todayIso)));
  readonly dueToday = computed(() => this.dueTasks().filter((task) => !isBefore(task.due_date, this.todayIso)));

  readonly domainCounts = computed<DomainCount[]>(() =>
    PLANNER_DOMAINS
      .map((entry) => ({
        domain: entry.id,
        label: entry.label,
        color: entry.color,
        count: this.plans().filter((plan) => planDomain(plan) === entry.id).length,
      }))
      .filter((entry) => entry.count > 0),
  );

  constructor() {
    void this.load();
  }

  planTitle(planId: string): string {
    return this.plans().find((plan) => plan.id === planId)?.title ?? 'Plan';
  }

  planDomainColor(plan: Plan): string {
    return domainConfig(planDomain(plan)).color;
  }

  openTask(task: PlanTask): void {
    void this.router.navigate(['/planner/tasks', task.id]);
  }

  openPlan(plan: Plan): void {
    void this.router.navigate(['/planner/plans', plan.id]);
  }

  goPlans(): void {
    void this.router.navigate(['/planner/plans']);
  }

  async completeTask(task: PlanTask, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.completeTask(task.id));
      this.dueTasks.update((rows) => rows.filter((row) => row.id !== task.id));
    } catch {
      this.error.set('Could not complete the task.');
    } finally {
      this.saving.set(false);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [due, plans] = await Promise.all([
        firstValueFrom(this.api.reviewDue(50)),
        firstValueFrom(this.api.listPlans({ status: 'active' })),
      ]);
      this.dueTasks.set(due);
      this.plans.set(plans);
    } catch {
      this.error.set('Could not load your day. Check your connection and retry.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.load();
  }
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isBefore(due: string | null, today: string): boolean {
  return Boolean(due) && (due as string).slice(0, 10) < today;
}
