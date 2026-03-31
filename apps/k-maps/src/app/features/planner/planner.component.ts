import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewChildren,
  QueryList,
  inject,
  signal,
  computed,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import gsap from 'gsap';
import { environment } from '../../../environments/environment';
import { HomePlaneButtonComponent } from '../../shared/components/home-plane-button/home-plane-button.component';

type ViewMode = 'calendar' | 'kanban' | 'timeline';
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
  imports: [HomePlaneButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
})
export class PlannerComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  @ViewChild('header') headerRef!: ElementRef<HTMLElement>;
  @ViewChild('main') mainRef!: ElementRef<HTMLElement>;
  @ViewChild('calModePill') calModePillRef?: ElementRef<HTMLElement>;
  @ViewChildren('calModeBtn') calModeButtonRefs?: QueryList<ElementRef<HTMLButtonElement>>;

  readonly plans = signal<Plan[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeView = signal<ViewMode>('calendar');
  readonly calendarMode = signal<CalendarMode>('month');
  readonly draggingPlanId = signal<Plan['id'] | null>(null);
  readonly dropTargetStatus = signal<PlanStatus | null>(null);
  readonly savingPlanId = signal<Plan['id'] | null>(null);

  readonly focusDate = signal(this.startOfDay(new Date()));

  readonly particles = Array.from({ length: 12 }, (_, i) => i);
  private cleanupCalendarCardTilts: Array<() => void> = [];

  readonly DAYS = DAYS;
  readonly MONTHS = MONTHS;

  readonly viewModes: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'calendar', label: 'Calendar', icon: '⊞' },
    { id: 'kanban', label: 'Kanban', icon: '▦' },
    { id: 'timeline', label: 'Timeline', icon: '◆' },
  ];

  readonly calendarModes: { id: CalendarMode; label: string; icon: string }[] = [
    { id: 'month', label: 'Month', icon: '▤' },
    { id: 'week', label: 'Week', icon: '☷' },
    { id: 'day', label: 'Day', icon: '◫' },
  ];

  readonly kanbanColumns: { status: PlanStatus; label: string; icon: string; caption: string }[] = [
    { status: 'to_do', label: 'To Do', icon: '◻', caption: 'Queued next' },
    { status: 'active', label: 'Active', icon: '◈', caption: 'Current focus' },
    { status: 'review', label: 'Review', icon: '✎', caption: 'Awaiting check' },
    { status: 'completed', label: 'Complete', icon: '✦', caption: 'Finished cleanly' },
  ];

  readonly calendarMonth = computed(() => this.focusDate().getMonth());
  readonly calendarYear = computed(() => this.focusDate().getFullYear());
  readonly calendarRangeLabel = computed(() => {
    const focus = this.focusDate();
    switch (this.calendarMode()) {
      case 'week': {
        const start = this.startOfWeek(focus);
        const end = this.addDays(start, 6);
        const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        return `${startLabel} - ${endLabel}`;
      }
      case 'day':
        return focus.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      case 'month':
      default:
        return `${MONTHS[focus.getMonth()]} ${focus.getFullYear()}`;
    }
  });

  readonly calendarDays = computed<CalendarDay[]>(() => {
    const focus = this.focusDate();
    const year = focus.getFullYear();
    const month = focus.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];

    // Fill leading blank days from previous month
    const startWeekday = firstDay.getDay();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d,
        isToday: this.isTodayDate(d),
        isCurrentMonth: false,
        plans: this.plansForDate(d),
      });
    }

    // Fill current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({
        date,
        isToday: this.isTodayDate(date),
        isCurrentMonth: true,
        plans: this.plansForDate(date),
      });
    }

    // Fill trailing days to complete the grid (6 rows × 7 = 42)
    const total = 42;
    let nextDay = 1;
    while (days.length < total) {
      const date = new Date(year, month + 1, nextDay++);
      days.push({
        date,
        isToday: this.isTodayDate(date),
        isCurrentMonth: false,
        plans: this.plansForDate(date),
      });
    }

    return days;
  });

  readonly weekDays = computed<CalendarDay[]>(() => {
    const start = this.startOfWeek(this.focusDate());
    return Array.from({ length: 7 }, (_, index) => {
      const date = this.addDays(start, index);
      return {
        date,
        isToday: this.isTodayDate(date),
        isCurrentMonth: date.getMonth() === this.focusDate().getMonth(),
        plans: this.plansForDate(date),
      };
    });
  });

  readonly dayPlans = computed(() => this.plansForDate(this.focusDate()));

  readonly sortedPlans = computed(() =>
    [...this.plans()].sort((a, b) => {
      const da = a.start_date ? new Date(a.start_date).getTime() : 0;
      const db = b.start_date ? new Date(b.start_date).getTime() : 0;
      return da - db;
    })
  );

  readonly kanbanPlans = computed<Record<PlanStatus, Plan[]>>(() => {
    const grouped: Record<PlanStatus, Plan[]> = {
      to_do: [],
      active: [],
      review: [],
      completed: [],
    };

    for (const plan of this.sortedPlans()) {
      grouped[this.normalizeStatus(plan.status)].push(plan);
    }

    return grouped;
  });

  ngOnInit(): void {
    const view = this.route.snapshot.queryParamMap.get('view');
    if (view === 'calendar' || view === 'kanban' || view === 'timeline') {
      this.activeView.set(view);
    }
    const calendar = this.route.snapshot.queryParamMap.get('calendar');
    if (calendar === 'month' || calendar === 'week' || calendar === 'day') {
      this.calendarMode.set(calendar);
    }
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
    setTimeout(() => {
      this.positionCalendarModePill();
      this.animateCalendarStage();
    }, 450);
  }

  ngOnDestroy(): void {
    this.clearCalendarCardTilts();
  }

  async loadPlans(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await fetch(`${environment.apiBase}/wv/plans?limit=50`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { ok: boolean; plans: Plan[] };
      this.plans.set((data.plans ?? []).map((plan) => ({
        ...plan,
        status: this.normalizeStatus(plan.status),
      })));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      this.loading.set(false);
    }
  }

  plansByStatus(status: PlanStatus): Plan[] {
    return this.kanbanPlans()[status];
  }

  switchView(view: ViewMode): void {
    if (this.activeView() === view) return;
    const main = this.mainRef.nativeElement;
    gsap.fromTo(main, { opacity: .4 }, { opacity: 1, duration: .35, ease: 'power2.out' });
    this.activeView.set(view);
    if (view !== 'calendar') {
      this.clearCalendarCardTilts();
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    setTimeout(() => {
      const viewEl = main.querySelector('.pl__calendar, .pl__kanban, .pl__timeline');
      if (viewEl) {
        gsap.fromTo(viewEl, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out' });
      }
      if (view === 'calendar') {
        this.positionCalendarModePill();
        this.animateCalendarStage();
      }
    }, 0);
  }

  prevMonth(): void {
    this.shiftCalendar(-1);
  }

  nextMonth(): void {
    this.shiftCalendar(1);
  }

  addTask(): void {
    // Navigate to hub planner section for data entry
    void this.router.navigateByUrl('/hub/worldview/plans');
  }

  switchCalendarMode(mode: CalendarMode): void {
    if (this.calendarMode() === mode) return;
    this.calendarMode.set(mode);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { calendar: mode },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.positionCalendarModePill();
    this.animateCalendarStage();
  }

  goToToday(): void {
    this.focusDate.set(this.startOfDay(new Date()));
    this.animateCalendarStage();
  }

  focusOnDate(date: Date): void {
    this.focusDate.set(this.startOfDay(date));
    this.animateCalendarStage();
  }

  openDay(date: Date): void {
    this.focusDate.set(this.startOfDay(date));
    this.calendarMode.set('day');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { calendar: 'day' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.positionCalendarModePill();
    this.animateCalendarStage();
  }

  onPlanDragStart(planId: Plan['id']): void {
    this.draggingPlanId.set(planId);
  }

  onPlanDragEnd(): void {
    this.draggingPlanId.set(null);
    this.dropTargetStatus.set(null);
  }

  onColumnDragOver(event: DragEvent, status: PlanStatus): void {
    event.preventDefault();
    this.dropTargetStatus.set(status);
  }

  onColumnDrop(event: DragEvent, status: PlanStatus): void {
    event.preventDefault();
    const planId = this.draggingPlanId();
    this.dropTargetStatus.set(null);
    if (planId === null) return;
    this.movePlanToStatus(planId, status);
    this.draggingPlanId.set(null);
  }

  clearDropTarget(): void {
    this.dropTargetStatus.set(null);
  }

  async movePlanToStatus(planId: Plan['id'], status: PlanStatus): Promise<void> {
    const current = this.plans().find((plan) => plan.id === planId);
    if (!current) return;

    const normalizedCurrent = this.normalizeStatus(current.status);
    if (normalizedCurrent === status) return;

    this.plans.update((plans) =>
      plans.map((plan) =>
        plan.id === planId ? { ...plan, status } : plan
      )
    );

    this.savingPlanId.set(planId);

    try {
      const res = await fetch(`${environment.apiBase}/wv/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (error) {
      console.warn('Planner status update failed; keeping local state.', error);
    } finally {
      this.savingPlanId.set(null);
    }
  }

  isDragging(planId: Plan['id']): boolean {
    return this.draggingPlanId() === planId;
  }

  isDropTarget(status: PlanStatus): boolean {
    return this.dropTargetStatus() === status;
  }

  typeLabel(type: PlanType): string {
    return String(type ?? 'mixed')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  typeGlyph(type: PlanType): string {
    switch ((type ?? '').toLowerCase()) {
      case 'reading':
        return '◫';
      case 'research':
        return '◎';
      case 'memorisation':
        return '◉';
      case 'mixed':
        return '✦';
      default:
        return '◆';
    }
  }

  statusLabel(status?: string): string {
    switch (this.normalizeStatus(status)) {
      case 'to_do':
        return 'Queued';
      case 'review':
        return 'Under review';
      case 'completed':
        return 'Done';
      case 'active':
      default:
        return 'In motion';
    }
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

  normalizeStatus(status?: string): PlanStatus {
    switch ((status ?? '').toLowerCase()) {
      case 'completed':
      case 'done':
      case 'published':
        return 'completed';
      case 'review':
      case 'reviewed':
      case 'paused':
      case 'on_hold':
      case 'on-hold':
        return 'review';
      case 'todo':
      case 'to_do':
      case 'to-do':
      case 'queued':
      case 'queue':
      case 'planning':
      case 'planned':
      case 'draft':
      case 'backlog':
        return 'to_do';
      case 'in_progress':
      case 'in-progress':
      case 'active':
      case 'current':
      case 'doing':
        return 'active';
      default:
        return 'to_do';
    }
  }

  private shiftCalendar(direction: -1 | 1): void {
    const root = this.mainRef?.nativeElement;
    const stage = root?.querySelector<HTMLElement>('.pl__calendar-stage');

    const applyShift = () => {
      const current = this.focusDate();
      const next = new Date(current);

      switch (this.calendarMode()) {
        case 'day':
          next.setDate(current.getDate() + direction);
          break;
        case 'week':
          next.setDate(current.getDate() + direction * 7);
          break;
        case 'month':
        default:
          next.setMonth(current.getMonth() + direction);
          break;
      }

      this.focusDate.set(this.startOfDay(next));
      this.animateCalendarStage(direction);
    };

    if (!stage) {
      applyShift();
      return;
    }

    gsap.to(stage, {
      opacity: 0,
      x: direction * -28,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: applyShift,
    });
  }

  private animateCalendarStage(direction = 0): void {
    setTimeout(() => {
      const root = this.mainRef?.nativeElement;
      if (!root || this.activeView() !== 'calendar') return;

      const toolbarItems = Array.from(
        root.querySelectorAll<HTMLElement>('.pl__calendar-toolbar > *')
      );
      const stageItems = Array.from(
        root.querySelectorAll<HTMLElement>(
          '.pl__cal-day-label, .pl__cal-cell, .pl__week-day, .pl__day-header, .pl__day-card'
        )
      );
      const weekCards = Array.from(root.querySelectorAll<HTMLElement>('.pl__week-card'));

      if (toolbarItems.length > 0) {
        gsap.fromTo(
          toolbarItems,
          { opacity: 0, y: -14, filter: 'blur(6px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.45,
            stagger: 0.06,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      if (stageItems.length > 0) {
        gsap.fromTo(
          stageItems,
          { opacity: 0, y: 26, x: direction * 20, scaleY: 0.97, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            x: 0,
            scaleY: 1,
            filter: 'blur(0px)',
            duration: 0.58,
            stagger: 0.04,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      if (weekCards.length > 0) {
        gsap.fromTo(
          weekCards,
          { opacity: 0, y: 14, scale: 0.985, filter: 'blur(6px)' },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.42,
            stagger: 0.035,
            delay: 0.14,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      this.bindCalendarCardTilts(root);
    }, 0);
  }

  private bindCalendarCardTilts(root: HTMLElement): void {
    this.clearCalendarCardTilts();

    const cards = Array.from(
      root.querySelectorAll<HTMLElement>('.pl__week-card, .pl__day-card')
    );

    cards.forEach((card) => {
      const onMove = (event: PointerEvent) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;

        card.style.setProperty('--pl-card-glow-x', `${(px + 0.5) * 100}%`);
        card.style.setProperty('--pl-card-glow-y', `${(py + 0.5) * 100}%`);

        gsap.to(card, {
          rotateX: py * -10,
          rotateY: px * 12,
          y: -8,
          scale: 1.018,
          duration: 0.32,
          ease: 'power2.out',
          transformPerspective: 1100,
          transformOrigin: 'center',
          overwrite: true,
        });
      };

      const onLeave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          y: 0,
          scale: 1,
          duration: 0.45,
          ease: 'power3.out',
          overwrite: true,
        });
      };

      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', onLeave);
      this.cleanupCalendarCardTilts.push(() => {
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerleave', onLeave);
        card.style.removeProperty('--pl-card-glow-x');
        card.style.removeProperty('--pl-card-glow-y');
        gsap.killTweensOf(card);
      });
    });
  }

  private clearCalendarCardTilts(): void {
    this.cleanupCalendarCardTilts.forEach((cleanup) => cleanup());
    this.cleanupCalendarCardTilts = [];
  }

  private positionCalendarModePill(): void {
    setTimeout(() => {
      const pill = this.calModePillRef?.nativeElement;
      const buttons = this.calModeButtonRefs?.toArray() ?? [];
      const target = buttons.find((buttonRef) => buttonRef.nativeElement.dataset['mode'] === this.calendarMode());

      if (!pill || !target) return;

      const buttonEl = target.nativeElement;
      gsap.to(pill, {
        x: buttonEl.offsetLeft,
        width: buttonEl.offsetWidth,
        duration: 0.42,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    }, 0);
  }

  private plansForDate(date: Date): Plan[] {
    return this.sortedPlans().filter((plan) => {
      if (!plan.start_date) return false;
      const start = new Date(plan.start_date);
      return this.isSameDay(start, date);
    });
  }

  private startOfWeek(date: Date): Date {
    const start = this.startOfDay(date);
    start.setDate(start.getDate() - start.getDay());
    return start;
  }

  private addDays(date: Date, amount: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  private isTodayDate(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private startOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }
}
