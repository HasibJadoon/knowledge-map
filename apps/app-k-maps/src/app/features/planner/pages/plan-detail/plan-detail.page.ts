import { Component, computed, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import {
  PLANNER_TASK_STATUSES,
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
} from '../../../../shared/models/planner/plan.models';
import { PlannerApiService } from '../../../../shared/services/planner/planner-api.service';

type PlanView = 'list' | 'board';

const TASK_TYPES: ReadonlyArray<TaskType> = [
  'read', 'memorize', 'revise', 'review', 'exercise',
  'note', 'listen', 'watch', 'translate', 'submit', 'other',
];
const BOARD_COLUMNS: ReadonlyArray<TaskStatus> = ['pending', 'in_progress', 'blocked', 'done'];

@Component({
  selector: 'app-planner-plan-detail',
  standalone: false,
  templateUrl: './plan-detail.page.html',
  styleUrl: './plan-detail.page.scss',
  host: { class: 'ion-page' },
})
export class PlanDetailPage {
  private readonly api = inject(PlannerApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  private readonly planId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly plan = signal<Plan | null>(null);
  readonly tasks = signal<PlanTask[]>([]);
  readonly view = signal<PlanView>('list');

  readonly taskTypes = TASK_TYPES;
  readonly taskStatuses = PLANNER_TASK_STATUSES;
  readonly boardColumns = BOARD_COLUMNS;
  readonly statusLabels = TASK_STATUS_LABELS;
  readonly planStatusLabels = PLAN_STATUS_LABELS;
  readonly priorities: ReadonlyArray<TaskPriority> = [1, 2, 3, 4, 5];

  readonly addOpen = signal(false);
  readonly newTitle = new FormControl('', { nonNullable: true });
  readonly newType = signal<TaskType>('read');
  readonly newPriority = signal<TaskPriority>(3);
  readonly newDue = new FormControl('', { nonNullable: true });
  readonly newEstimate = new FormControl<number | null>(null);

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
    return {
      done,
      total: all.length,
      percent: all.length ? done / all.length : 0,
    };
  });

  constructor() {
    void this.load();
  }

  columnTasks(status: TaskStatus): PlanTask[] {
    return this.sortedTasks().filter((task) => task.status === status);
  }

  priorityLabelFor(priority: TaskPriority): string {
    return ['', 'Critical', 'High', 'Medium', 'Low', 'Lowest'][priority] ?? 'Medium';
  }

  setView(value: string | number | null | undefined): void {
    if (value === 'list' || value === 'board') {
      this.view.set(value);
    }
  }

  setNewType(value: string | number | null | undefined): void {
    if (TASK_TYPES.includes(value as TaskType)) {
      this.newType.set(value as TaskType);
    }
  }

  setNewPriority(value: string | number | null | undefined): void {
    const num = Number(value);
    if (num >= 1 && num <= 5) {
      this.newPriority.set(num as TaskPriority);
    }
  }

  openTask(task: PlanTask): void {
    void this.router.navigate(['/planner/tasks', task.id]);
  }

  onTaskStatusChanged(task: PlanTask, value: string | number | null | undefined): void {
    if (isTaskStatus(value)) {
      void this.setTaskStatus(task, value);
    }
  }

  openAdd(): void {
    this.newTitle.setValue('');
    this.newDue.setValue('');
    this.newEstimate.setValue(null);
    this.newType.set('read');
    this.newPriority.set(3);
    this.addOpen.set(true);
  }

  closeAdd(): void {
    this.addOpen.set(false);
  }

  async submitAdd(): Promise<void> {
    const title = this.newTitle.value.trim();
    if (!title) {
      await this.presentToast('Add a task title first.');
      return;
    }

    this.saving.set(true);
    try {
      const estimate = this.newEstimate.value;
      const task = await firstValueFrom(this.api.createTask({
        plan_id: this.planId,
        title,
        task_type: this.newType(),
        priority: this.newPriority(),
        due_date: this.newDue.value.trim() || null,
        estimated_mins: estimate && estimate > 0 ? Math.round(estimate) : null,
        sort_order: this.tasks().length,
      }));
      this.tasks.update((rows) => [...rows, task]);
      this.addOpen.set(false);
      await this.presentToast('Task added.');
    } catch {
      await this.presentToast('Could not add the task.');
    } finally {
      this.saving.set(false);
    }
  }

  private async setTaskStatus(task: PlanTask, status: TaskStatus): Promise<void> {
    if (this.saving() || task.status === status) {
      return;
    }

    const previous = structuredClone(task);
    this.replaceTask({ ...task, status, updated_at: new Date().toISOString() });

    this.saving.set(true);
    try {
      const updated = status === 'done'
        ? await firstValueFrom(this.api.completeTask(task.id))
        : await firstValueFrom(this.api.patchTask(task.id, { status }));
      this.replaceTask(updated);
    } catch {
      this.replaceTask(previous);
      await this.presentToast('Could not update the task.');
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
      return;
    }
    this.loading.set(true);
    try {
      const [plan, tasks] = await Promise.all([
        firstValueFrom(this.api.getPlan(this.planId)),
        firstValueFrom(this.api.getPlanTasks(this.planId)),
      ]);
      this.plan.set(plan);
      this.tasks.set(tasks);
    } catch {
      await this.presentToast('Could not load the plan.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1600, position: 'bottom' });
    await toast.present();
  }
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return PLANNER_TASK_STATUSES.includes(value as TaskStatus);
}
