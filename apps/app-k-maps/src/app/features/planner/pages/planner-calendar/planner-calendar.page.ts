import { Component, computed, inject, signal } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { PlannerTask, PlannerTaskRow } from '../../../../shared/models/planner/sprint.models';
import { PlannerService } from '../../../../shared/services/planner/planner.service';
import { computeWeekStartSydney, formatWeekRangeLabel } from '../../../../shared/utils/planner/week-start.util';
import { addDays, groupByDate, isoDate, parseIsoDate, scheduleTasks, weekDates } from '../../weekly-plan/planner-schedule.util';

type CalendarMode = 'month' | 'week' | 'day';
type TaskStatus = PlannerTask['status'];

const CALENDAR_MODES: CalendarMode[] = ['month', 'week', 'day'];
const TASK_STATUS_OPTIONS: TaskStatus[] = ['planned', 'todo', 'doing', 'blocked', 'done', 'skipped'];

interface CalendarCell {
  date: string;
  dayNum: number;
  inMonth: boolean;
  inWeek: boolean;
  isToday: boolean;
  isFocused: boolean;
  tasks: PlannerTaskRow[];
}

@Component({
  selector: 'app-planner-calendar-page',
  standalone: false,
  templateUrl: './planner-calendar.page.html',
  styleUrl: './planner-calendar.page.scss',
})
export class PlannerCalendarPage {
  private readonly planner = inject(PlannerService);
  private readonly toastController = inject(ToastController);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly weekStart = signal(computeWeekStartSydney(this.planner.currentWeekStart()));
  readonly weekLabel = computed(() => formatWeekRangeLabel(this.weekStart()));

  readonly mode = signal<CalendarMode>('week');
  readonly focusDate = signal(isoDate(new Date()));
  readonly tasks = signal<PlannerTaskRow[]>([]);

  readonly modes = CALENDAR_MODES;
  readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly taskStatusOptions = TASK_STATUS_OPTIONS;

  private readonly byDate = computed(() => groupByDate(scheduleTasks(this.tasks(), this.weekStart())));

  readonly weekCells = computed<CalendarCell[]>(() => {
    const today = isoDate(new Date());
    return weekDates(this.weekStart()).map((date) => this.toCell(date, today, true));
  });

  readonly monthCells = computed<CalendarCell[]>(() => {
    const today = isoDate(new Date());
    const weekDays = new Set(weekDates(this.weekStart()));
    const focus = parseIsoDate(this.focusDate());
    const monthStart = new Date(Date.UTC(focus.getUTCFullYear(), focus.getUTCMonth(), 1, 12));
    const offset = (monthStart.getUTCDay() + 6) % 7;
    const gridStart = isoDate(new Date(monthStart.getTime() - offset * 86_400_000));
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      const inMonth = parseIsoDate(date).getUTCMonth() === focus.getUTCMonth();
      return this.toCell(date, today, weekDays.has(date), inMonth);
    });
  });

  readonly dayTasks = computed(() => this.byDate().get(this.focusDate()) ?? []);
  readonly dayLabel = computed(() => formatLongDate(this.focusDate()));
  readonly totalTasks = computed(() => this.tasks().length);

  constructor() {
    void this.load();
  }

  setMode(mode: string | number | null | undefined): void {
    if (mode === 'month' || mode === 'week' || mode === 'day') {
      this.mode.set(mode);
    }
  }

  openDay(cell: CalendarCell): void {
    this.focusDate.set(cell.date);
    this.mode.set('day');
  }

  prevWeek(): void {
    this.shiftWeek(-7);
  }

  nextWeek(): void {
    this.shiftWeek(7);
  }

  goToday(): void {
    const today = computeWeekStartSydney(this.planner.currentWeekStart());
    this.focusDate.set(isoDate(new Date()));
    if (today !== this.weekStart()) {
      this.weekStart.set(today);
      void this.load();
    }
  }

  statusLabel(status: TaskStatus): string {
    return STATUS_LABELS[status] ?? 'Planned';
  }

  laneLabel(lane: PlannerTask['lane']): string {
    return lane === 'lesson' ? 'Lesson' : lane === 'podcast' ? 'Podcast' : lane === 'notes' ? 'Notes' : 'Admin';
  }

  onTaskStatusChanged(task: PlannerTaskRow, value: string | number | null | undefined): void {
    if (isTaskStatus(value)) {
      void this.persistStatus(task, value);
    }
  }

  private shiftWeek(days: number): void {
    const next = addDays(this.weekStart(), days);
    this.weekStart.set(next);
    this.focusDate.set(next);
    void this.load();
  }

  private toCell(date: string, today: string, inWeek: boolean, inMonth = true): CalendarCell {
    return {
      date,
      dayNum: parseIsoDate(date).getUTCDate(),
      inMonth,
      inWeek,
      isToday: date === today,
      isFocused: date === this.focusDate(),
      tasks: inWeek ? (this.byDate().get(date) ?? []) : [],
    };
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const week = await firstValueFrom(this.planner.ensureWeekAnchors(this.weekStart()));
      this.tasks.set(week.tasks);
    } catch {
      await this.presentToast('Could not load the calendar.');
    } finally {
      this.loading.set(false);
    }
  }

  private async persistStatus(task: PlannerTaskRow, nextStatus: TaskStatus): Promise<void> {
    if (this.saving() || task.item_json.status === nextStatus) {
      return;
    }

    const previous = structuredClone(task);
    this.replaceTask({
      ...task,
      item_json: { ...task.item_json, status: nextStatus },
      updated_at: new Date().toISOString(),
    });

    this.saving.set(true);
    try {
      const updated = nextStatus === 'done'
        ? (await firstValueFrom(this.planner.completeTask(task.id, {
            actual_min: task.item_json.actual_min ?? task.item_json.estimate_min,
          }))).task
        : await firstValueFrom(this.planner.updateTask(task.id, {
            item_json: { ...task.item_json, status: nextStatus },
            related_type: task.related_type,
            related_id: task.related_id,
          }));
      this.replaceTask(updated);
    } catch {
      this.replaceTask(previous);
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

function formatLongDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return TASK_STATUS_OPTIONS.includes(value as TaskStatus);
}
