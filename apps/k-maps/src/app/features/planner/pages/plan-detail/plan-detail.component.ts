import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  PLANNER_TASK_STATUSES,
  PLANNER_TASK_TYPES,
  PLAN_STATUS_LABELS,
  Plan,
  PlanTask,
  PlannerDomain,
  TASK_STATUS_LABELS,
  TaskPriority,
  TaskStatus,
  TaskType,
  domainConfig,
  planDomain,
  priorityLabel,
} from '../../planner.models';
import { PlannerApiService } from '../../planner-api.service';

type PlanView = 'list' | 'board';
const BOARD_COLUMNS: ReadonlyArray<TaskStatus> = ['pending', 'in_progress', 'blocked', 'done'];

@Component({
  selector: 'km-planner-plan-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-detail.component.html',
})
export class PlanDetailComponent {
  private readonly api = inject(PlannerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly planId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly plan = signal<Plan | null>(null);
  readonly tasks = signal<PlanTask[]>([]);
  readonly view = signal<PlanView>('list');
  readonly addOpen = signal(false);

  readonly taskTypes = PLANNER_TASK_TYPES;
  readonly taskStatuses = PLANNER_TASK_STATUSES;
  readonly boardColumns = BOARD_COLUMNS;
  readonly statusLabels = TASK_STATUS_LABELS;
  readonly planStatusLabels = PLAN_STATUS_LABELS;
  readonly priorities: ReadonlyArray<TaskPriority> = [1, 2, 3, 4, 5];

  newTitle = '';
  newType: TaskType = 'read';
  newPriority: TaskPriority = 3;
  newDue = '';
  newEstimate: number | null = null;

  readonly domain = computed<PlannerDomain>(() => {
    const plan = this.plan();
    return plan ? planDomain(plan) : 'general';
  });
  readonly domainColor = computed(() => domainConfig(this.domain()).color);
  readonly domainLabel = computed(() => domainConfig(this.domain()).label);

  readonly sortedTasks = computed<PlanTask[]>(() => {
    const order: Record<TaskStatus, number> = {
      in_progress: 0, blocked: 1, pending: 2, done: 3, skipped: 4,
    };
    return [...this.tasks()].sort((left, right) => {
      if (order[left.status] !== order[right.status]) {
        return order[left.status] - order[right.status];
      }
      return left.sort_order - right.sort_order;
    });
  });

  readonly progress = computed(() => {
    const all = this.tasks();
    const done = all.filter((task) => task.status === 'done').length;
    return { done, total: all.length, percent: all.length ? done / all.length : 0 };
  });

  constructor() {
    void this.load();
  }

  priorityLabelFor(priority: TaskPriority): string {
    return priorityLabel(priority);
  }

  columnTasks(status: TaskStatus): PlanTask[] {
    return this.sortedTasks().filter((task) => task.status === status);
  }

  setView(view: PlanView): void {
    this.view.set(view);
  }

  back(): void {
    void this.router.navigate(['/planner/plans']);
  }

  openTask(task: PlanTask): void {
    void this.router.navigate(['/planner/tasks', task.id]);
  }

  onTaskStatus(task: PlanTask, value: string): void {
    if (isTaskStatus(value)) {
      void this.setTaskStatus(task, value);
    }
  }

  openAdd(): void {
    this.newTitle = '';
    this.newType = 'read';
    this.newPriority = 3;
    this.newDue = '';
    this.newEstimate = null;
    this.addOpen.set(true);
  }

  closeAdd(): void {
    this.addOpen.set(false);
  }

  async submitAdd(): Promise<void> {
    const title = this.newTitle.trim();
    if (!title || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      const task = await firstValueFrom(this.api.createTask({
        plan_id: this.planId,
        title,
        task_type: this.newType,
        priority: this.newPriority,
        due_date: this.newDue.trim() || null,
        estimated_mins: this.newEstimate && this.newEstimate > 0 ? Math.round(this.newEstimate) : null,
        sort_order: this.tasks().length,
      }));
      this.tasks.update((rows) => [...rows, task]);
      this.addOpen.set(false);
    } catch {
      this.error.set('Could not add the task.');
    } finally {
      this.saving.set(false);
    }
  }

  private async setTaskStatus(task: PlanTask, status: TaskStatus): Promise<void> {
    if (this.saving() || task.status === status) {
      return;
    }
    const previous = structuredClone(task);
    this.replaceTask({ ...task, status });
    this.saving.set(true);
    try {
      const updated = status === 'done'
        ? await firstValueFrom(this.api.completeTask(task.id))
        : await firstValueFrom(this.api.patchTask(task.id, { status }));
      this.replaceTask(updated);
    } catch {
      this.replaceTask(previous);
      this.error.set('Could not update the task.');
    } finally {
      this.saving.set(false);
    }
  }

  private replaceTask(updated: PlanTask): void {
    this.tasks.update((rows) => {
      const index = rows.findIndex((row) => row.id === updated.id);
      if (index < 0) {
        return [...rows, updated];
      }
      const next = [...rows];
      next[index] = updated;
      return next;
    });
  }

  private async load(): Promise<void> {
    if (!this.planId) {
      this.loading.set(false);
      this.error.set('Missing plan id.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const [plan, tasks] = await Promise.all([
        firstValueFrom(this.api.getPlan(this.planId)),
        firstValueFrom(this.api.getPlanTasks(this.planId)),
      ]);
      this.plan.set(plan);
      this.tasks.set(tasks);
    } catch {
      this.error.set('Could not load the plan.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.load();
  }
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return PLANNER_TASK_STATUSES.includes(value as TaskStatus);
}
