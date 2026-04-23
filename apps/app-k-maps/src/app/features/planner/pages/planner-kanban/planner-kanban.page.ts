import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PlannerLane, PlannerTask, PlannerTaskRow } from '../../../../shared/models/planner/sprint.models';
import { PlannerService } from '../../../../shared/services/planner/planner.service';
import { formatWeekRangeLabel } from '../../../../shared/utils/planner/week-start.util';
import { linkedPodcastEpisodeId } from '../../weekly-plan/planner-task-links.util';

type BoardStatus = 'planned' | 'doing' | 'done';
type TaskStatus = PlannerTask['status'];

type KanbanLaneGroup = {
  lane: PlannerLane;
  tasks: PlannerTaskRow[];
};

const BOARD_STATUSES: BoardStatus[] = ['planned', 'doing', 'done'];
const LANES: PlannerLane[] = ['lesson', 'podcast'];
const TASK_STATUS_OPTIONS: TaskStatus[] = ['planned', 'todo', 'doing', 'blocked', 'done', 'skipped'];

@Component({
  selector: 'app-planner-kanban-page',
  standalone: false,
  templateUrl: './planner-kanban.page.html',
  styleUrl: './planner-kanban.page.scss',
})
export class PlannerKanbanPage {
  private readonly planner = inject(PlannerService);
  private readonly router = inject(Router);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly weekStart = signal(this.planner.currentWeekStart());
  readonly weekLabel = computed(() => formatWeekRangeLabel(this.weekStart()));

  readonly activeStatus = signal<BoardStatus>('planned');
  readonly tasks = signal<PlannerTaskRow[]>([]);

  readonly boardStatuses = BOARD_STATUSES;
  readonly taskStatusOptions = TASK_STATUS_OPTIONS;

  readonly grouped = computed<KanbanLaneGroup[]>(() => {
    const boardStatus = this.activeStatus();
    const visibleTasks = this.tasks().filter((task) => this.toBoardStatus(task.item_json.status) === boardStatus);
    return LANES.map((lane) => ({
      lane,
      tasks: visibleTasks
        .filter((task) => task.item_json.lane === lane)
        .sort((a, b) => {
          const updatedA = new Date(a.updated_at ?? a.created_at).getTime();
          const updatedB = new Date(b.updated_at ?? b.created_at).getTime();
          return updatedB - updatedA;
        }),
    }));
  });

  constructor() {
    void this.load();
  }

  boardStatusLabel(status: BoardStatus): string {
    if (status === 'planned') {
      return 'To Do';
    }
    if (status === 'doing') {
      return 'Doing';
    }
    return 'Done';
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

  onBoardStatusChanged(value: string | number | null | undefined): void {
    if (isBoardStatus(value)) {
      this.activeStatus.set(value);
    }
  }

  onTaskStatusChanged(task: PlannerTaskRow, value: string | number | null | undefined): void {
    if (!isTaskStatus(value)) {
      return;
    }

    void this.setTaskStatus(task, value);
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

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const week = await firstValueFrom(this.planner.ensureWeekAnchors(this.weekStart()));
      this.tasks.set(week.tasks);
    } catch {
      await this.presentToast('Could not load Kanban board.');
    } finally {
      this.loading.set(false);
    }
  }

  private async setTaskStatus(task: PlannerTaskRow, nextStatus: TaskStatus): Promise<void> {
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
        actual_min: nextStatus === 'done'
          ? (task.item_json.actual_min ?? task.item_json.estimate_min)
          : task.item_json.actual_min,
      },
      updated_at: new Date().toISOString(),
    };

    this.replaceTask(optimisticTask);
    this.activeStatus.set(this.toBoardStatus(nextStatus));

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
      await this.presentToast(`Moved to ${this.statusLabel(nextStatus)}.`);
    } catch {
      this.replaceTask(previousTask);
      await this.presentToast('Could not update task.');
    } finally {
      this.saving.set(false);
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

  private toBoardStatus(status: TaskStatus): BoardStatus {
    if (status === 'done') {
      return 'done';
    }
    if (status === 'doing' || status === 'blocked') {
      return 'doing';
    }
    return 'planned';
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

function isBoardStatus(value: unknown): value is BoardStatus {
  return value === 'planned' || value === 'doing' || value === 'done';
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === 'planned'
    || value === 'todo'
    || value === 'doing'
    || value === 'blocked'
    || value === 'done'
    || value === 'skipped';
}
