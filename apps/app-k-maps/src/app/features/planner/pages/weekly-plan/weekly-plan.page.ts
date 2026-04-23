import { Component, computed, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PlannerLane, PlannerTask, PlannerTaskRow, PlannerWeekPlan, PlannerWeekSummary } from '../../../../shared/models/planner/sprint.models';
import { PlannerService } from '../../../../shared/services/planner/planner.service';
import { computeWeekStartSydney, formatWeekRangeLabel } from '../../../../shared/utils/planner/week-start.util';
import { linkedPodcastEpisodeId } from '../../weekly-plan/planner-task-links.util';

type TaskStatus = PlannerTask['status'];

type LaneGroup = {
  lane: PlannerLane;
  tasks: PlannerTaskRow[];
};

const LANES: PlannerLane[] = ['lesson', 'podcast'];
const TASK_STATUS_OPTIONS: TaskStatus[] = ['planned', 'todo', 'doing', 'blocked', 'done', 'skipped'];

@Component({
  selector: 'app-weekly-plan',
  standalone: false,
  templateUrl: './weekly-plan.page.html',
  styleUrl: './weekly-plan.page.scss',
})
export class WeeklyPlanPage {
  private readonly planner = inject(PlannerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly weekStart = signal(computeWeekStartSydney(this.planner.currentWeekStart()));
  readonly weekLabel = computed(() => formatWeekRangeLabel(this.weekStart()));

  readonly weekPlan = signal<PlannerWeekPlan | null>(null);
  readonly summary = signal<PlannerWeekSummary>({
    tasks_done: 0,
    tasks_total: 0,
    minutes_spent: 0,
    inbox_count: 0,
    capture_notes: 0,
    promoted_notes: 0,
  });

  readonly tasks = signal<PlannerTaskRow[]>([]);
  readonly lanes = LANES;
  readonly taskStatusOptions = TASK_STATUS_OPTIONS;

  readonly titleControl = new FormControl('', { nonNullable: true });
  readonly laneControl = new FormControl<PlannerLane>('lesson', { nonNullable: true });
  readonly estimateControl = new FormControl(30, { nonNullable: true });

  readonly groupedTasks = computed<LaneGroup[]>(() => this.lanes.map((lane) => ({
    lane,
    tasks: this.tasks()
      .filter((task) => task.item_json.lane === lane)
      .sort((a, b) => {
        const orderA = typeof a.item_json.order_index === 'number' ? a.item_json.order_index : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.item_json.order_index === 'number' ? b.item_json.order_index : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }

        const updatedA = new Date(a.updated_at ?? a.created_at).getTime();
        const updatedB = new Date(b.updated_at ?? b.created_at).getTime();
        return updatedB - updatedA;
      }),
  })));

  readonly minuteTarget = computed(() => {
    const plan = this.weekPlan();
    if (!plan) {
      return 0;
    }

    return plan.time_budget.lesson_min + plan.time_budget.podcast_min + plan.time_budget.review_min;
  });

  readonly completionPercent = computed(() => {
    const stats = this.summary();
    if (stats.tasks_total === 0) {
      return 0;
    }

    return Math.round((stats.tasks_done / stats.tasks_total) * 100);
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const nextWeekStart = computeWeekStartSydney(
        params.get('weekStart')
          ?? this.route.snapshot.paramMap.get('weekStart')
          ?? this.planner.currentWeekStart()
      );
      this.weekStart.set(nextWeekStart);
      void this.loadWeek(nextWeekStart);
    });
  }

  laneLabel(lane: PlannerLane): string {
    if (lane === 'lesson') {
      return 'Lessons';
    }
    return 'Podcast';
  }

  statusLabel(status: TaskStatus): string {
    if (status === 'todo') {
      return 'To Do';
    }
    if (status === 'doing') {
      return 'Doing';
    }
    if (status === 'done') {
      return 'Done';
    }
    if (status === 'blocked') {
      return 'Blocked';
    }
    if (status === 'skipped') {
      return 'Skipped';
    }
    return 'Planned';
  }

  assignmentSummary(task: PlannerTaskRow): string {
    const assignment = task.item_json.assignment;
    if (task.item_json.lane === 'lesson' && assignment.ar_lesson_id) {
      return `Lesson ${assignment.ar_lesson_id} · ${task.item_json.estimate_min} min`;
    }
    if (task.item_json.lane === 'podcast' && assignment.topic) {
      return `${assignment.topic} · ${task.item_json.estimate_min} min`;
    }
    return `${task.item_json.estimate_min} min`;
  }

  async addTask(): Promise<void> {
    const title = this.titleControl.value.trim();
    const lane = this.laneControl.value;
    const estimate = Number(this.estimateControl.value);

    if (!title) {
      await this.presentToast('Add a task title first.');
      return;
    }

    if (!Number.isFinite(estimate) || estimate <= 0) {
      await this.presentToast('Estimate must be a positive number.');
      return;
    }

    this.saving.set(true);
    try {
      const task = this.buildTask(title, lane, estimate);
      const created = await firstValueFrom(this.planner.createTask({
        week_start: this.weekStart(),
        item_json: task,
        related_type: null,
        related_id: null,
      }));

      this.tasks.update((items) => [created, ...items]);
      this.refreshSummaryFromTasks();

      this.titleControl.setValue('', { emitEvent: false });
      this.laneControl.setValue(lane, { emitEvent: false });
      this.estimateControl.setValue(estimate, { emitEvent: false });

      await this.presentToast('Task added.');
    } catch {
      await this.presentToast('Could not add task.');
    } finally {
      this.saving.set(false);
    }
  }

  onTaskStatusChanged(task: PlannerTaskRow, value: string | number | null | undefined): void {
    if (!isTaskStatus(value)) {
      return;
    }
    void this.persistStatus(task, value);
  }

  hasPodcastEpisodeLink(task: PlannerTaskRow): boolean {
    return Boolean(linkedPodcastEpisodeId(task));
  }

  openTask(task: PlannerTaskRow): void {
    const episodeId = linkedPodcastEpisodeId(task);
    if (!episodeId) {
      return;
    }

    void this.router.navigate(['/podcast', episodeId]);
  }

  private async persistStatus(task: PlannerTaskRow, nextStatus: TaskStatus): Promise<void> {
    if (this.saving()) {
      return;
    }

    if (task.item_json.status === nextStatus) {
      return;
    }

    const previousTask = structuredClone(task);
    const optimisticTask: PlannerTaskRow = {
      ...task,
      item_json: {
        ...task.item_json,
        status: nextStatus,
      },
      updated_at: new Date().toISOString(),
    };

    this.replaceTask(optimisticTask);
    this.refreshSummaryFromTasks();

    this.saving.set(true);
    try {
      const updated = nextStatus === 'done'
        ? (await firstValueFrom(this.planner.completeTask(task.id, {
            actual_min: task.item_json.actual_min ?? task.item_json.estimate_min,
          }))).task
        : await firstValueFrom(this.planner.updateTask(task.id, {
            item_json: {
              ...task.item_json,
              status: nextStatus,
            },
            related_type: task.related_type,
            related_id: task.related_id,
          }));

      this.replaceTask(updated);
      this.refreshSummaryFromTasks();
      await this.presentToast(`Moved to ${this.statusLabel(nextStatus)}.`);
    } catch {
      this.replaceTask(previousTask);
      this.refreshSummaryFromTasks();
      await this.presentToast('Could not update status.');
    } finally {
      this.saving.set(false);
    }
  }

  private buildTask(title: string, lane: PlannerLane, estimate: number): PlannerTask {
    const assignmentKind: PlannerTask['assignment']['kind'] = lane === 'lesson'
      ? 'lesson'
      : lane === 'podcast'
        ? 'podcast'
        : 'none';

    return {
      schema_version: 1,
      lane,
      anchor: false,
      title,
      priority: 'P2',
      status: 'planned',
      estimate_min: Math.max(5, Math.round(estimate)),
      actual_min: null,
      assignment: {
        kind: assignmentKind,
        ar_lesson_id: null,
        unit_id: null,
        topic: null,
        episode_no: null,
        recording_at: null,
      },
      tags: [lane],
      checklist: [],
      note: '',
      links: [],
      capture_on_done: {
        create_capture_note: true,
        template: 'quick',
      },
      meta: {
        anchor_key: null,
        week_start: this.weekStart(),
      },
      order_index: this.tasks().length + 1,
    };
  }

  private async loadWeek(weekStart: string): Promise<void> {
    this.loading.set(true);
    try {
      const week = await firstValueFrom(this.planner.ensureWeekAnchors(weekStart));
      this.weekPlan.set(week.weekPlan?.item_json ?? null);
      this.summary.set(week.summary);
      this.tasks.set(week.tasks);
      this.refreshSummaryFromTasks();
    } catch {
      await this.presentToast('Could not load planner week.');
    } finally {
      this.loading.set(false);
    }
  }

  private replaceTask(updated: PlannerTaskRow): void {
    this.tasks.update((items) => {
      const index = items.findIndex((item) => item.id === updated.id);
      if (index < 0) {
        return [updated, ...items];
      }

      const next = [...items];
      next[index] = updated;
      return next;
    });
  }

  private refreshSummaryFromTasks(): void {
    const tasks = this.tasks();
    const doneStatuses: TaskStatus[] = ['done'];

    const tasksDone = tasks.filter((task) => doneStatuses.includes(task.item_json.status)).length;
    const minutesSpent = tasks.reduce((total, task) => {
      if (task.item_json.status !== 'done') {
        return total;
      }

      const minutes = task.item_json.actual_min ?? task.item_json.estimate_min;
      return Number.isFinite(minutes) ? total + minutes : total;
    }, 0);

    this.summary.update((value) => ({
      ...value,
      tasks_done: tasksDone,
      tasks_total: tasks.length,
      minutes_spent: minutesSpent,
    }));
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1500,
      position: 'bottom',
    });
    await toast.present();
  }
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === 'planned'
    || value === 'todo'
    || value === 'doing'
    || value === 'blocked'
    || value === 'done'
    || value === 'skipped';
}
