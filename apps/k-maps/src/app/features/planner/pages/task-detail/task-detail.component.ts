import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  PLANNER_TASK_STATUSES,
  PLANNER_TASK_TYPES,
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

@Component({
  selector: 'km-planner-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-detail.component.html',
})
export class TaskDetailComponent {
  private readonly api = inject(PlannerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly taskId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly task = signal<PlanTask | null>(null);
  readonly plan = signal<Plan | null>(null);

  readonly taskTypes = PLANNER_TASK_TYPES;
  readonly taskStatuses = PLANNER_TASK_STATUSES;
  readonly statusLabels = TASK_STATUS_LABELS;
  readonly priorities: ReadonlyArray<TaskPriority> = [1, 2, 3, 4, 5];

  title = '';
  description = '';
  status: TaskStatus = 'pending';
  type: TaskType = 'read';
  priority: TaskPriority = 3;
  due = '';
  estimate: number | null = null;
  actual: number | null = null;

  readonly domain = computed<PlannerDomain>(() => {
    const plan = this.plan();
    return plan ? planDomain(plan) : 'general';
  });
  readonly domainColor = computed(() => domainConfig(this.domain()).color);
  readonly domainLabel = computed(() => domainConfig(this.domain()).label);

  constructor() {
    void this.load();
  }

  priorityLabelFor(value: TaskPriority): string {
    return priorityLabel(value);
  }

  back(): void {
    const plan = this.plan();
    void this.router.navigate(plan ? ['/planner/plans', plan.id] : ['/planner/plans']);
  }

  async save(): Promise<void> {
    const current = this.task();
    const title = this.title.trim();
    if (!current || !title || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.patchTask(current.id, {
        title,
        description_md: this.description.trim() || null,
        task_type: this.type,
        status: this.status,
        priority: this.priority,
        due_date: this.due.trim() || null,
        estimated_mins: this.estimate && this.estimate > 0 ? Math.round(this.estimate) : null,
        actual_mins: this.actual && this.actual > 0 ? Math.round(this.actual) : null,
      }));
      this.applyTask(updated);
    } catch {
      this.error.set('Could not save the task.');
    } finally {
      this.saving.set(false);
    }
  }

  async markComplete(): Promise<void> {
    const current = this.task();
    if (!current || this.saving()) {
      return;
    }
    this.saving.set(true);
    try {
      this.applyTask(await firstValueFrom(this.api.completeTask(current.id)));
    } catch {
      this.error.set('Could not complete the task.');
    } finally {
      this.saving.set(false);
    }
  }

  private applyTask(task: PlanTask): void {
    this.task.set(task);
    this.title = task.title;
    this.description = task.description_md ?? '';
    this.status = task.status;
    this.type = task.task_type;
    this.priority = task.priority;
    this.due = task.due_date ?? '';
    this.estimate = task.estimated_mins;
    this.actual = task.actual_mins;
  }

  private async load(): Promise<void> {
    if (!this.taskId) {
      this.loading.set(false);
      this.error.set('Missing task id.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const task = await firstValueFrom(this.api.getTask(this.taskId));
      this.applyTask(task);
      try {
        this.plan.set(await firstValueFrom(this.api.getPlan(task.plan_id)));
      } catch {
        /* plan context is optional */
      }
    } catch {
      this.error.set('Could not load the task.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.load();
  }
}
