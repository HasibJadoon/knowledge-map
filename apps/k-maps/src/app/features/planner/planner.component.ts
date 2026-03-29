import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { Router } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../environments/environment';

type ViewMode = 'calendar' | 'kanban' | 'timeline';
type PlanStatus = 'active' | 'completed' | 'paused';
type PlanType = 'reading' | 'research' | 'memorisation' | 'mixed' | string;

interface Plan {
  id: string;
  title: string;
  type: PlanType;
  start_date?: string;
  end_date?: string;
  status: PlanStatus;
  description?: string;
}

interface CalendarDay {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  plans: Plan[];
}

const TYPE_COLORS: Record<string, string> = {
  reading: '#1a3a6e',
  research: '#3a1a6e',
  memorisation: '#1a6e3a',
  mixed: '#6e4a1a',
};

const TYPE_TEXT_COLORS: Record<string, string> = {
  reading: '#60a5fa',
  research: '#a78bfa',
  memorisation: '#4ade80',
  mixed: '#fbbf24',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Component({
  selector: 'km-planner',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
})
export class PlannerComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);

  @ViewChild('header') headerRef!: ElementRef<HTMLElement>;
  @ViewChild('main') mainRef!: ElementRef<HTMLElement>;

  readonly plans = signal<Plan[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeView = signal<ViewMode>('calendar');

  readonly calendarMonth = signal(new Date().getMonth());
  readonly calendarYear = signal(new Date().getFullYear());

  readonly particles = Array.from({ length: 12 }, (_, i) => i);

  readonly DAYS = DAYS;
  readonly MONTHS = MONTHS;

  readonly viewModes: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'calendar', label: 'Calendar', icon: '⊞' },
    { id: 'kanban', label: 'Kanban', icon: '▦' },
    { id: 'timeline', label: 'Timeline', icon: '◆' },
  ];

  readonly kanbanColumns: { status: PlanStatus; label: string }[] = [
    { status: 'active', label: 'Active' },
    { status: 'paused', label: 'Paused' },
    { status: 'completed', label: 'Completed' },
  ];

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const year = this.calendarYear();
    const month = this.calendarMonth();
    const today = new Date();
    const plansData = this.plans();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];

    // Fill leading blank days from previous month
    const startWeekday = firstDay.getDay();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isToday: false, isCurrentMonth: false, plans: [] });
    }

    // Fill current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;

      const dayPlans = plansData.filter((p) => {
        if (!p.start_date) return false;
        const sd = new Date(p.start_date);
        return sd.getFullYear() === year && sd.getMonth() === month && sd.getDate() === d;
      });

      days.push({ date, isToday, isCurrentMonth: true, plans: dayPlans });
    }

    // Fill trailing days to complete the grid (6 rows × 7 = 42)
    const total = 42;
    let nextDay = 1;
    while (days.length < total) {
      const date = new Date(year, month + 1, nextDay++);
      days.push({ date, isToday: false, isCurrentMonth: false, plans: [] });
    }

    return days;
  });

  readonly sortedPlans = computed(() =>
    [...this.plans()].sort((a, b) => {
      const da = a.start_date ? new Date(a.start_date).getTime() : 0;
      const db = b.start_date ? new Date(b.start_date).getTime() : 0;
      return da - db;
    })
  );

  ngOnInit(): void {
    void this.loadPlans();
  }

  ngAfterViewInit(): void {
    gsap.fromTo(
      this.headerRef.nativeElement,
      { opacity: 0, y: -24, filter: 'blur(6px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: .9, ease: 'power3.out', clearProps: 'filter' }
    );
    gsap.fromTo(
      this.mainRef.nativeElement,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: .7, ease: 'power3.out', delay: .4 }
    );
  }

  async loadPlans(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${environment.apiBase}/wv/plans?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { ok: boolean; plans: Plan[] };
      this.plans.set(data.plans ?? []);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      this.loading.set(false);
    }
  }

  plansByStatus(status: PlanStatus): Plan[] {
    return this.plans().filter((p) => p.status === status);
  }

  switchView(view: ViewMode): void {
    if (this.activeView() === view) return;
    const main = this.mainRef.nativeElement;
    gsap.fromTo(main, { opacity: .4 }, { opacity: 1, duration: .35, ease: 'power2.out' });
    this.activeView.set(view);
    setTimeout(() => {
      const viewEl = main.querySelector('.pl__calendar, .pl__kanban, .pl__timeline');
      if (viewEl) {
        gsap.fromTo(viewEl, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out' });
      }
    }, 0);
  }

  prevMonth(): void {
    const m = this.calendarMonth();
    const y = this.calendarYear();
    if (m === 0) {
      this.calendarMonth.set(11);
      this.calendarYear.set(y - 1);
    } else {
      this.calendarMonth.set(m - 1);
    }
  }

  nextMonth(): void {
    const m = this.calendarMonth();
    const y = this.calendarYear();
    if (m === 11) {
      this.calendarMonth.set(0);
      this.calendarYear.set(y + 1);
    } else {
      this.calendarMonth.set(m + 1);
    }
  }

  goBack(): void {
    void this.router.navigateByUrl('/landing');
  }

  addTask(): void {
    // Navigate to hub planner section for data entry
    void this.router.navigateByUrl('/hub/worldview/plans');
  }

  typeColor(type: PlanType): string {
    return TYPE_COLORS[type] ?? 'rgba(201,168,76,.15)';
  }

  typeTextColor(type: PlanType): string {
    return TYPE_TEXT_COLORS[type] ?? '#c9a84c';
  }

  formatShortDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  formatDayNum(dateStr: string): string {
    try {
      return String(new Date(dateStr).getDate()).padStart(2, '0');
    } catch {
      return '--';
    }
  }

  formatMonAbbr(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
    } catch {
      return '---';
    }
  }

  formatYear(dateStr: string): string {
    try {
      return String(new Date(dateStr).getFullYear());
    } catch {
      return '';
    }
  }
}
