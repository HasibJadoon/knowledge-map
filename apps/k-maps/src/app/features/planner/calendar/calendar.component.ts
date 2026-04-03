import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import gsap from 'gsap';

type CalendarMode = 'month' | 'week' | 'day';
type PlanStatus = 'to_do' | 'active' | 'review' | 'completed';
type PlanType = 'reading' | 'research' | 'memorisation' | 'mixed' | string;

interface Plan {
  id: string | number;
  title: string;
  type: PlanType;
  start_date?: string;
  end_date?: string;
  status: PlanStatus | string;
  description?: string;
}

interface CalendarDay {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  plans: Plan[];
}

@Component({
  selector: 'km-calendar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class PlannerCalendarComponent implements AfterViewInit, OnChanges {
  @Input({ required: true }) calendarMode!: CalendarMode;
  @Input({ required: true }) calendarModes!: { id: CalendarMode; label: string; icon: string }[];
  @Input({ required: true }) days!: string[];
  @Input({ required: true }) calendarRangeLabel!: string;
  @Input({ required: true }) calendarDays!: CalendarDay[];
  @Input({ required: true }) weekDays!: CalendarDay[];
  @Input({ required: true }) dayPlans!: Plan[];
  @Input({ required: true }) focusDate!: Date;

  @Output() calendarModeChange = new EventEmitter<CalendarMode>();
  @Output() previousRequested = new EventEmitter<void>();
  @Output() nextRequested = new EventEmitter<void>();
  @Output() todayRequested = new EventEmitter<void>();
  @Output() dayOpened = new EventEmitter<Date>();

  @ViewChild('calModePill') private calModePillRef?: ElementRef<HTMLElement>;
  @ViewChildren('calModeBtn') private calModeButtonRefs?: QueryList<ElementRef<HTMLButtonElement>>;

  ngAfterViewInit(): void {
    this.positionModePill();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['calendarMode'] || changes['calendarModes']) {
      this.positionModePill();
    }
  }

  requestMode(mode: CalendarMode): void {
    this.calendarModeChange.emit(mode);
  }

  openDay(date: Date): void {
    this.dayOpened.emit(date);
  }

  typeLabel(type: PlanType): string {
    return String(type ?? 'mixed')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  statusLabel(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'completed':
      case 'done':
      case 'published':
        return 'Done';
      case 'review':
      case 'reviewed':
      case 'paused':
      case 'on_hold':
      case 'on-hold':
        return 'Under review';
      case 'in_progress':
      case 'in-progress':
      case 'active':
      case 'current':
      case 'doing':
        return 'In motion';
      case 'todo':
      case 'to_do':
      case 'to-do':
      case 'queued':
      case 'queue':
      case 'planning':
      case 'planned':
      case 'draft':
      case 'backlog':
      default:
        return 'Queued';
    }
  }

  typeColor(type: PlanType): string {
    switch (type) {
      case 'reading':
        return '#1a3a6e';
      case 'research':
        return '#3a1a6e';
      case 'memorisation':
        return '#1a6e3a';
      case 'mixed':
        return '#6e4a1a';
      default:
        return 'rgba(201,168,76,.15)';
    }
  }

  typeTextColor(type: PlanType): string {
    switch (type) {
      case 'reading':
        return '#60a5fa';
      case 'research':
        return '#a78bfa';
      case 'memorisation':
        return '#4ade80';
      case 'mixed':
        return '#fbbf24';
      default:
        return '#c9a84c';
    }
  }

  formatShortDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  formatWeekdayShort(date: Date): string {
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  }

  formatMonthDay(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  formatDayTitle(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  formatAgendaDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  formatCalendarCellMeta(date: Date, isCurrentMonth: boolean): string {
    if (!isCurrentMonth || date.getDate() === 1) {
      return date
        .toLocaleDateString('en-GB', { month: 'short' })
        .toUpperCase();
    }

    return date
      .toLocaleDateString('en-GB', { weekday: 'short' })
      .toUpperCase();
  }

  isFocusedDay(day: CalendarDay): boolean {
    return day.date.getTime() === this.focusDate.getTime();
  }

  private positionModePill(): void {
    window.requestAnimationFrame(() => {
      const pill = this.calModePillRef?.nativeElement;
      const buttons = this.calModeButtonRefs?.toArray() ?? [];
      const target = buttons.find((buttonRef) => buttonRef.nativeElement.dataset['mode'] === this.calendarMode);

      if (!pill || !target) {
        return;
      }

      const buttonEl = target.nativeElement;
      gsap.to(pill, {
        x: buttonEl.offsetLeft,
        width: buttonEl.offsetWidth,
        duration: 0.42,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    });
  }
}
