import { Component, computed, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import {
  PLANNER_TASK_STATUSES,
  Plan,
  PlanTask,
  PlannerDomain,
  TASK_STATUS_LABELS,
  TaskPriority,
  TaskStatus,
  TaskType,
  domainConfig,
  planDomain,
} from '../../../../shared/models/planner/plan.models';
import { PlannerApiService } from '../../../../shared/services/planner/planner-api.service';

const TASK_TYPES: ReadonlyArray<TaskType> = [
  'read', 'memorize', 'revise', 'review', 'exercise',
  'note', 'listen', 'watch', 'translate', 'submit', 'other',
];

@Component({
  selector: 'app-planner-task-detail',
  standalone: false,
  templateUrl: './task-detail.page.html',
  styleUrl: './task-detail.page.scss',
  host: { class: 'ion-page' },
})
export class TaskDetailPage {
  private readonly api = inject(PlannerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly toastController = inject(ToastController);

  private readonly taskId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly task = signal<PlanTask | null>(null);
  readonly plan = signal<Plan | null>(null);

  readonly title = new FormControl('', { nonNullable: true });
  readonly description = new FormControl('', { nonNullable: true });
  readonly due = new FormControl('', { nonNullable: true });
  readonly estimate = new FormControl<number | null>(null);
  readonly actual = new FormControl<number | null>(null);
  readonly status = signal<TaskStatus>('pending');
  readonly type = signal<TaskType>('read');
  readonly priority = signal<TaskPriority>(3);

  readonly taskTypes = TASK_TYPES;
  readonly taskStatuses = PLANNER_TASK_STATUSES;
  readonly statusLabels = TASK_STATUS_LABELS;
  readonly priorities: ReadonlyArray<TaskPriority> = [1, 2, 3, 4, 5];

  readonly backHref = computed(() => {
    const plan = this.plan();
    return plan ? `/planner/plans/${plan.id}` : '/planner/plans';
  });
  readonly domain = computed<PlannerDomain>(() => {
    const plan = this.plan();
    return plan ? planDomain(plan) : 'general';
  });
  readonly domainColor = computed(() => domainConfig(this.domain()).color);
  readonly domainLabel = computed(() => domainConfig(this.domain()).label);

  constructor() {
    void this.load();
  }

  priorityLabelFor(priority: TaskPriority): string {
    return ['', 'Critical', 'High', 'Medium', 'Low', 'Lowest'][priority] ?? 'Medium';
  }

  setStatus(value: string | number | null | undefined): void {
    if (PLANNER_TASK_STATUSES.includes(value as TaskStatus)) {
      this.status.set(value as TaskStatus);
    }
  }

  setType(value: string | number | null | undefined): void {
    if (TASK_TYPES.includes(value as TaskType)) {
      this.type.set(value as TaskType);
    }
  }

  setPriority(value: string | number | null | undefined): void {
    const num = Number(value);
    if (num >= 1 && num <= 5) {
      this.priority.set(num as TaskPriority);
    }
  }

  async save(): Promise<void> {
    const current = this.task();
    if (!current || this.saving()) {
      return;
    }

    const title = this.title.value.trim();
    if (!title) {
      await this.presentToast('Task title cannot be empty.');
      return;
    }

    this.saving.set(true);
    try {
      const estimate = this.estimate.value;
      const actual = this.actual.value;
      const updated = await firstValueFrom(this.api.patchTask(current.id, {
        title,
        description_md: this.description.value.trim() || null,
        task_type: this.type(),
        status: this.status(),
        priority: this.priority(),
        due_date: this.due.value.trim() || null,
        estimated_mins: estimate && estimate > 0 ? Math.round(estimate) : null,
        actual_mins: actual && actual > 0 ? Math.round(actual) : null,
      }));
      this.applyTask(updated);
      await this.presentToast('Task saved.');
    } catch {
      await this.presentToast('Could not save the task.');
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
      const updated = await firstValueFrom(this.api.completeTask(current.id));
      this.applyTask(updated);
      await this.presentToast('Task completed.');
    } catch {
      await this.presentToast('Could not complete the task.');
    } finally {
      this.saving.set(false);
    }
  }

  private applyTask(task: PlanTask): void {
    this.task.set(task);
    this.title.setValue(task.title);
    this.description.setValue(task.description_md ?? '');
    this.due.setValue(task.due_date ?? '');
    this.estimate.setValue(task.estimated_mins);
    this.actual.setValue(task.actual_mins);
    this.status.set(task.status);
    this.type.set(task.task_type);
    this.priority.set(task.priority);
  }

  private async load(): Promise<void> {
    if (!this.taskId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const task = await firstValueFrom(this.api.getTask(this.taskId));
      this.applyTask(task);
      try {
        this.plan.set(await firstValueFrom(this.api.getPlan(task.plan_id)));
      } catch {
        /* plan context is optional */
      }
    } catch {
      await this.presentToast('Could not load the task.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1600, position: 'bottom' });
    await toast.present();
  }
}
