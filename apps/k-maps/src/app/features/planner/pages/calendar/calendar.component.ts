import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PlanTask } from '../../planner.models';
import {
  CALENDAR_ENTRY_LABELS,
  CALENDAR_ENTRY_TYPES,
  CalendarEntry,
  CalendarEntryType,
} from '../../planner-extras.models';
import { PlannerApiService } from '../../planner-api.service';

type CalendarMode = 'today' | 'week' | 'month' | 'quarter';

interface CalendarDay {
  date: string;
  isToday: boolean;
  entries: CalendarEntry[];
}

interface MonthCell {
  date: string;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  count: number;
}

const MODES: ReadonlyArray<{ id: CalendarMode; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: '3 Months' },
];

@Component({
  selector: 'km-planner-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './calendar.component.html',
})
export class CalendarComponent {
  private readonly api = inject(PlannerApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly mode = signal<CalendarMode>('today');
  readonly anchor = signal(isoDay(new Date()));
  readonly entries = signal<CalendarEntry[]>([]);
  readonly dueTasks = signal<PlanTask[]>([]);
  readonly createOpen = signal(false);

  readonly modes = MODES;
  readonly weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly entryTypes = CALENDAR_ENTRY_TYPES;
  readonly entryLabels = CALENDAR_ENTRY_LABELS;

  newTitle = '';
  newType: CalendarEntryType = 'scheduled_session';
  newDate = '';
  newTime = '';

  private readonly range = computed(() => rangeFor(this.mode(), this.anchor()));
  readonly rangeLabel = computed(() => labelFor(this.mode(), this.anchor()));
  readonly todayEntries = computed(() => this.entriesOn(this.anchor()));

  readonly days = computed<CalendarDay[]>(() => {
    const today = isoDay(new Date());
    const { start, end } = this.range();
    if (this.mode() === 'week') {
      return Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index);
        return { date, isToday: date === today, entries: this.entriesOn(date) };
      });
    }
    const dates = [...new Set(
      this.entries()
        .map((entry) => entry.start_datetime.slice(0, 10))
        .filter((date) => date >= start && date < end),
    )].sort();
    return dates.map((date) => ({ date, isToday: date === today, entries: this.entriesOn(date) }));
  });

  readonly monthCells = computed<MonthCell[]>(() => {
    const today = isoDay(new Date());
    const monthStart = firstOfMonth(this.anchor());
    const offset = (new Date(`${monthStart}T12:00:00Z`).getUTCDay() + 6) % 7;
    const gridStart = addDays(monthStart, -offset);
    const month = monthStart.slice(0, 7);
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      return {
        date,
        dayNum: Number(date.slice(8, 10)),
        inMonth: date.slice(0, 7) === month,
        isToday: date === today,
        count: this.entriesOn(date).length,
      };
    });
  });

  constructor() {
    void this.load();
  }

  private entriesOn(date: string): CalendarEntry[] {
    return this.entries()
      .filter((entry) => entry.start_datetime.slice(0, 10) === date)
      .sort((left, right) => left.start_datetime.localeCompare(right.start_datetime));
  }

  setMode(mode: CalendarMode): void {
    this.mode.set(mode);
    void this.load();
  }

  openMonthCell(cell: MonthCell): void {
    this.anchor.set(cell.date);
    this.mode.set('today');
    void this.load();
  }

  entryTime(entry: CalendarEntry): string {
    if (entry.all_day) {
      return 'All day';
    }
    return new Date(entry.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  prev(): void {
    this.anchor.update((value) => shift(this.mode(), value, -1));
    void this.load();
  }

  next(): void {
    this.anchor.update((value) => shift(this.mode(), value, 1));
    void this.load();
  }

  goToday(): void {
    this.anchor.set(isoDay(new Date()));
    void this.load();
  }

  openTask(task: PlanTask): void {
    void this.router.navigate(['/planner/tasks', task.id]);
  }

  openCreate(day?: CalendarDay): void {
    this.newTitle = '';
    this.newDate = day?.date ?? this.anchor();
    this.newTime = '';
    this.newType = 'scheduled_session';
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
  }

  async submitCreate(): Promise<void> {
    const title = this.newTitle.trim();
    const date = this.newDate.trim();
    if (!title || !date || this.saving()) {
      return;
    }
    const time = this.newTime.trim();
    this.saving.set(true);
    try {
      const entry = await firstValueFrom(this.api.createCalendarEntry({
        title,
        entry_type: this.newType,
        start_datetime: time ? `${date}T${time}:00` : `${date}T09:00:00`,
        all_day: !time,
      }));
      this.entries.update((rows) => [...rows, entry]);
      this.createOpen.set(false);
    } catch {
      this.error.set('Could not add the entry.');
    } finally {
      this.saving.set(false);
    }
  }

  async complete(entry: CalendarEntry): Promise<void> {
    if (this.saving() || entry.is_completed) {
      return;
    }
    this.saving.set(true);
    try {
      const updated = await firstValueFrom(this.api.completeCalendarEntry(entry.id));
      this.entries.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
    } catch {
      this.error.set('Could not update the entry.');
    } finally {
      this.saving.set(false);
    }
  }

  async completeTask(task: PlanTask): Promise<void> {
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
      const { start, end } = this.range();
      const [entries, due] = await Promise.all([
        firstValueFrom(this.api.listCalendar({ start: `${start}T00:00:00`, end: `${end}T00:00:00` })),
        this.mode() === 'today' ? firstValueFrom(this.api.reviewDue(50)) : Promise.resolve(this.dueTasks()),
      ]);
      this.entries.set(entries);
      this.dueTasks.set(due);
    } catch {
      this.error.set('Could not load the calendar.');
    } finally {
      this.loading.set(false);
    }
  }

  retry(): void {
    void this.load();
  }
}

function isoDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return iso10(date);
}

function addMonths(iso: string, months: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return iso10(date);
}

function iso10(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mondayOf(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  return addDays(iso, -offset);
}

function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function rangeFor(mode: CalendarMode, anchor: string): { start: string; end: string } {
  if (mode === 'today') {
    return { start: anchor, end: addDays(anchor, 1) };
  }
  if (mode === 'week') {
    const start = mondayOf(anchor);
    return { start, end: addDays(start, 7) };
  }
  const start = firstOfMonth(anchor);
  return { start, end: addMonths(start, mode === 'month' ? 1 : 3) };
}

function shift(mode: CalendarMode, anchor: string, direction: number): string {
  if (mode === 'today') {
    return addDays(anchor, direction);
  }
  if (mode === 'week') {
    return addDays(anchor, direction * 7);
  }
  return addMonths(firstOfMonth(anchor), direction * (mode === 'month' ? 1 : 3));
}

function labelFor(mode: CalendarMode, anchor: string): string {
  const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const compactFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

  if (mode === 'today') {
    return dayFmt.format(new Date(`${anchor}T12:00:00Z`));
  }
  if (mode === 'week') {
    const start = mondayOf(anchor);
    return `${compactFmt.format(new Date(`${start}T12:00:00Z`))} – ${compactFmt.format(new Date(`${addDays(start, 6)}T12:00:00Z`))}`;
  }
  const start = firstOfMonth(anchor);
  if (mode === 'month') {
    return monthFmt.format(new Date(`${start}T12:00:00Z`));
  }
  return `${compactFmt.format(new Date(`${start}T12:00:00Z`))} – ${compactFmt.format(new Date(`${addMonths(start, 2)}T12:00:00Z`))}`;
}
