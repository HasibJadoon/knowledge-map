import { Component, computed, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PlannerTask, PlannerTaskRow } from '../../../../shared/models/planner/sprint.models';
import { PlannerService } from '../../../../shared/services/planner/planner.service';
import { computeWeekStartSydney, formatWeekRangeLabel } from '../../../../shared/utils/planner/week-start.util';
import { addDays, groupByDate, isoDate, scheduleTasks } from '../../weekly-plan/planner-schedule.util';

type TaskStatus = PlannerTask['status'];

interface TimelineDay {
  date: string;
  isToday: boolean;
  tasks: PlannerTaskRow[];
  totalMinutes: number;
}

@Component({
  selector: 'app-planner-timeline-page',
  standalone: false,
  templateUrl: './planner-timeline.page.html',
  styleUrl: './planner-timeline.page.scss',
})
export class PlannerTimelinePage {
  private readonly planner = inject(PlannerService);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly weekStart = signal(computeWeekStartSydney(this.planner.currentWeekStart()));
  readonly weekLabel = computed(() => formatWeekRangeLabel(this.weekStart()));
  readonly tasks = signal<PlannerTaskRow[]>([]);

  readonly days = computed<TimelineDay[]>(() => {
    const today = isoDate(new Date());
    const grouped = groupByDate(scheduleTasks(this.tasks(), this.weekStart()));
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, tasks]) => ({
        date,
        isToday: date === today,
        tasks,
        totalMinutes: tasks.reduce(
          (total, task) => total + (task.item_json.actual_min ?? task.item_json.estimate_min ?? 0),
          0,
        ),
      }));
  });

  readonly totalTasks = computed(() => this.tasks().length);
  readonly doneTasks = computed(() => this.tasks().filter((task) => task.item_json.status === 'done').length);

  constructor() {
    void this.load();
  }

  prevWeek(): void {
    this.weekStart.update((value) => addDays(value, -7));
    void this.load();
  }

  nextWeek(): void {
    this.weekStart.update((value) => addDays(value, 7));
    void this.load();
  }

  goToday(): void {
    const today = computeWeekStartSydney(this.planner.currentWeekStart());
    if (today !== this.weekStart()) {
      this.weekStart.set(today);
      void this.load();
    }
  }

  statusClass(status: TaskStatus): string {
    if (status === 'done') {
      return 'done';
    }
    if (status === 'doing') {
      return 'doing';
    }
    if (status === 'blocked') {
      return 'blocked';
    }
    if (status === 'skipped') {
      return 'skipped';
    }
    return 'planned';
  }

  statusLabel(status: TaskStatus): string {
    return STATUS_LABELS[status] ?? 'Planned';
  }

  laneGlyph(lane: PlannerTask['lane']): string {
    return lane === 'lesson' ? 'L' : lane === 'podcast' ? 'P' : lane === 'notes' ? 'N' : 'A';
  }

  laneLabel(lane: PlannerTask['lane']): string {
    return lane === 'lesson' ? 'Lesson' : lane === 'podcast' ? 'Podcast' : lane === 'notes' ? 'Notes' : 'Admin';
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const week = await firstValueFrom(this.planner.ensureWeekAnchors(this.weekStart()));
      this.tasks.set(week.tasks);
    } catch {
      await this.presentToast('Could not load the timeline.');
    } finally {
      this.loading.set(false);
    }
  }

  private async presentToast(message: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 1500, position: 'bottom' });
    await toast.present();
  }
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  planned: 'Planned',
  todo: 'To Do',
  doing: 'Doing',
  blocked: 'Blocked',
  done: 'Done',
  skipped: 'Skipped',
};
