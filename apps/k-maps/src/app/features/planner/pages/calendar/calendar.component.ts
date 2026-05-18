import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  CALENDAR_ENTRY_LABELS,
  CALENDAR_ENTRY_TYPES,
  CalendarEntry,
  CalendarEntryType,
} from '../../planner-extras.models';
import { PlannerApiService } from '../../planner-api.service';

interface CalendarDay {
  date: string;
  isToday: boolean;
  entries: CalendarEntry[];
}

@Component({
  selector: 'km-planner-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
})
export class CalendarComponent {
  private readonly api = inject(PlannerApiService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly weekStart = signal(mondayOf(new Date()));
  readonly entries = signal<CalendarEntry[]>([]);
  readonly createOpen = signal(false);

  readonly entryTypes = CALENDAR_ENTRY_TYPES;
  readonly entryLabels = CALENDAR_ENTRY_LABELS;

  newTitle = '';
  newType: CalendarEntryType = 'scheduled_session';
  newDate = '';
  newTime = '';

  readonly weekLabel = computed(() => {
    const start = new Date(`${this.weekStart()}T12:00:00Z`);
    const end = new Date(start.getTime() + 6 * 86_400_000);
    const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return `${fmt.format(start)} – ${fmt.format(end)}`;
  });

  readonly days = computed<CalendarDay[]>(() => {
    const today = isoDay(new Date());
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(this.weekStart(), index);
      return {
        date,
        isToday: date === today,
        entries: this.entries()
          .filter((entry) => entry.start_datetime.slice(0, 10) === date)
          .sort((left, right) => left.start_datetime.localeCompare(right.start_datetime)),
      };
    });
  });

  constructor() {
    void this.load();
  }

  entryTime(entry: CalendarEntry): string {
    if (entry.all_day) {
      return 'All day';
    }
    return new Date(entry.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
    this.weekStart.set(mondayOf(new Date()));
    void this.load();
  }

  openCreate(day?: CalendarDay): void {
    this.newTitle = '';
    this.newDate = day?.date ?? this.weekStart();
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

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const start = `${this.weekStart()}T00:00:00`;
      const end = `${addDays(this.weekStart(), 7)}T00:00:00`;
      this.entries.set(await firstValueFrom(this.api.listCalendar({ start, end })));
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

function mondayOf(date: Date): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return isoDay(copy);
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
