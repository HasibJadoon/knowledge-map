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
import { Subscription } from 'rxjs';
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
  private queryParamSubscription?: Subscription;
  private hasViewInitialized = false;

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
    this.queryParamSubscription = this.route.queryParamMap.subscribe((params) => {
      const previousView = this.activeView();
      const previousCalendarMode = this.calendarMode();
      const nextView = this.parseViewMode(params.get('view'));
      const nextCalendarMode = this.parseCalendarMode(params.get('calendar'));

      this.activeView.set(nextView);
      this.calendarMode.set(nextCalendarMode);

      if (!this.hasViewInitialized) {
        return;
      }

      if (previousView !== nextView) {
        if (nextView !== 'calendar' && nextView !== 'timeline') {
          this.clearCalendarCardTilts();
        }

        setTimeout(() => {
          if (nextView === 'calendar') {
            this.positionCalendarModePill();
            this.animateCalendarStage();
          } else if (nextView === 'timeline') {
            this.animateTimelineStage();
          }
        }, 0);
        return;
      }

      if (nextView === 'calendar' && previousCalendarMode !== nextCalendarMode) {
        this.positionCalendarModePill();
        this.animateCalendarStage();
      }
    });
    void this.loadPlans();
  }

  ngAfterViewInit(): void {
    this.hasViewInitialized = true;
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
      if (this.activeView() === 'calendar') {
        this.animateCalendarStage();
      } else if (this.activeView() === 'timeline') {
        this.animateTimelineStage();
      }
    }, 450);
  }

  ngOnDestroy(): void {
    this.queryParamSubscription?.unsubscribe();
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
    if (view !== 'calendar' && view !== 'timeline') {
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
      } else if (view === 'timeline') {
        this.animateTimelineStage();
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
    this.openDay(new Date());
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

  moveActionLabel(status: PlanStatus): string {
    switch (status) {
      case 'to_do':
        return 'To Do';
      case 'completed':
        return 'Done';
      case 'review':
        return 'Review';
      case 'active':
      default:
        return 'Active';
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

  formatAgendaDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  formatTimelineRange(plan: Plan): string {
    if (plan.start_date && plan.end_date) {
      return `${this.formatShortDate(plan.start_date)} → ${this.formatShortDate(plan.end_date)}`;
    }

    if (plan.start_date) {
      return `Starts ${this.formatShortDate(plan.start_date)}`;
    }

    if (plan.end_date) {
      return `Open until ${this.formatShortDate(plan.end_date)}`;
    }

    return 'Open schedule';
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

  private parseViewMode(view: string | null): ViewMode {
    if (view === 'calendar' || view === 'kanban' || view === 'timeline') {
      return view;
    }

    return 'calendar';
  }

  private parseCalendarMode(mode: string | null): CalendarMode {
    if (mode === 'month' || mode === 'week' || mode === 'day') {
      return mode;
    }

    return 'month';
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
          {
            const currentDay = current.getDate();
            next.setDate(1);
            next.setMonth(current.getMonth() + direction);
            const lastDayOfTargetMonth = new Date(
              next.getFullYear(),
              next.getMonth() + 1,
              0
            ).getDate();
            next.setDate(Math.min(currentDay, lastDayOfTargetMonth));
          }
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

      const stage = root.querySelector<HTMLElement>('.pl__calendar-stage');
      const toolbarItems = Array.from(
        root.querySelectorAll<HTMLElement>('.pl__calendar-toolbar > *')
      );
      const stageItems = Array.from(
        root.querySelectorAll<HTMLElement>(
          '.pl__cal-day-label, .pl__cal-cell, .pl__week-day, .pl__day-card, .pl__day-empty'
        )
      );
      const weekCards = Array.from(root.querySelectorAll<HTMLElement>('.pl__week-card'));
      const ambientDetails = Array.from(
        root.querySelectorAll<HTMLElement>(
          '.pl__cal-date, .pl__cal-date-meta, .pl__cal-empty, .pl__week-empty, .pl__day-empty > *'
        )
      );

      if (stage) {
        gsap.fromTo(
          stage,
          { opacity: 0, x: direction * 18 },
          {
            opacity: 1,
            x: 0,
            duration: 0.32,
            ease: 'power2.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform',
          }
        );
      }

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

      if (ambientDetails.length > 0) {
        gsap.fromTo(
          ambientDetails,
          { opacity: 0, y: 10, filter: 'blur(5px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.42,
            stagger: 0.018,
            delay: 0.12,
            ease: 'power2.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      this.bindCalendarCardTilts(root);
    }, 0);
  }

  private animateTimelineStage(): void {
    setTimeout(() => {
      const root = this.mainRef?.nativeElement;
      if (!root || this.activeView() !== 'timeline') return;

      const headItems = Array.from(
        root.querySelectorAll<HTMLElement>('.pl__timeline-head > *')
      );
      const items = Array.from(
        root.querySelectorAll<HTMLElement>('.pl__timeline-item')
      );
      const railItems = Array.from(
        root.querySelectorAll<HTMLElement>('.pl__timeline-date-panel, .pl__timeline-dot, .pl__timeline-line')
      );
      const cards = Array.from(
        root.querySelectorAll<HTMLElement>('.pl__timeline-card')
      );

      if (headItems.length > 0) {
        gsap.fromTo(
          headItems,
          { opacity: 0, y: -14, filter: 'blur(6px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.48,
            stagger: 0.06,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 26, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.58,
            stagger: 0.08,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      if (railItems.length > 0) {
        gsap.fromTo(
          railItems,
          { opacity: 0, scaleY: 0.84, y: 12 },
          {
            opacity: 1,
            scaleY: 1,
            y: 0,
            duration: 0.48,
            stagger: 0.03,
            delay: 0.1,
            ease: 'power2.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform',
          }
        );
      }

      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 18, scale: 0.985, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.52,
            stagger: 0.06,
            delay: 0.12,
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
      root.querySelectorAll<HTMLElement>('.pl__cal-cell, .pl__week-card, .pl__day-card, .pl__timeline-card')
    );

    cards.forEach((card) => {
      const onMove = (event: PointerEvent) => {
        const rect = card.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        const isMonthCell = card.classList.contains('pl__cal-cell');
        const isTimelineCard = card.classList.contains('pl__timeline-card');
        const tiltX = isMonthCell ? py * -7 : isTimelineCard ? py * -8 : py * -10;
        const tiltY = isMonthCell ? px * 8 : isTimelineCard ? px * 10 : px * 12;
        const lift = isMonthCell ? -5 : isTimelineCard ? -6 : -8;
        const scale = isMonthCell ? 1.012 : isTimelineCard ? 1.014 : 1.018;

        card.style.setProperty('--pl-card-glow-x', `${(px + 0.5) * 100}%`);
        card.style.setProperty('--pl-card-glow-y', `${(py + 0.5) * 100}%`);

        gsap.to(card, {
          rotateX: tiltX,
          rotateY: tiltY,
          y: lift,
          scale,
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
