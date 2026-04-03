import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewChildren,
  QueryList,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import gsap from 'gsap';
import { environment } from '../../../environments/environment';
import { HomePlaneButtonComponent } from '../../shared/components/home-plane-button/home-plane-button.component';
import { PlannerCalendarComponent } from './calendar/calendar.component';
import { PlannerCaptureModalComponent } from './capture-modal/capture-modal.component';
import { CaptureComponent as PlannerCaptureWorkspaceComponent } from './capture/capture.component';
import { ExecuteKanbanComponent as PlannerKanbanComponent } from './execute-kanban/execute-kanban.component';
import { EMPTY_PLAN_STATE, PLANNER_ACCORDION_BLUEPRINT, PLANNER_SECTION_BLUEPRINT } from './models/planner.mock-data';
import { PlanComponent as PlannerPlanBoardComponent } from './plan/plan.component';
import { ReviewComponent as PlannerReviewComponent, type PlannerReviewPayload } from './review/review.component';
import { PlannerStripMenuComponent } from './strip-menu/strip-menu.component';
import { PlannerTimelineComponent } from './timeline/timeline.component';
import type {
  CaptureDomain,
  CaptureDraft,
  CaptureItem,
  CapturePayloadSnapshot,
  CaptureStage,
  CaptureStatus,
  PlannerAccordionNote,
  PlannerExecutionView,
  PlannerPlanState,
  PlannerSection,
  PlannerStripItem,
  PlannerWorkspace,
} from './models/planner.models';

type ViewMode = PlannerWorkspace | 'calendar' | 'timeline' | 'sprint';
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

interface CaptureDomainOption {
  id: CaptureDomain;
  label: string;
  icon: string;
  description: string;
  accent: string;
  accentSoft: string;
}

type CaptureFilter = 'all' | CaptureStage | CaptureDomain;
type CaptureStudioMode = 'overview' | 'composer';
type CaptureStudioTileId = 'new' | CaptureFilter;

interface CaptureStudioTile {
  id: CaptureStudioTileId;
  label: string;
  icon: string;
  caption: string;
  count?: number;
  accent: string;
  accentSoft: string;
  kind: 'action' | 'summary' | 'stage' | 'domain';
}

type SprintTaskLane = 'lesson' | 'podcast' | 'notes' | 'admin';
type SprintTaskPriority = 'P1' | 'P2' | 'P3';
type SprintTaskStatus = 'planned' | 'todo' | 'doing' | 'blocked' | 'done' | 'skipped';
type SprintBoardState = 'backlog' | 'in_progress' | 'review' | 'done';

interface SprintWeekSummary {
  tasks_done: number;
  tasks_total: number;
  minutes_spent: number;
  inbox_count: number;
  capture_notes: number;
  promoted_notes: number;
}

interface SprintWeekPlanData {
  id: string;
  created_at: string;
  updated_at: string | null;
  item_json: {
    title: string;
    intent: string;
    fixed_rhythm: {
      lessons: number;
      podcasts: number;
    };
    planning_state: {
      is_planned: boolean;
      planned_at: string | null;
      defer_until: string | null;
    };
    time_budget: {
      lesson_min: number;
      podcast_min: number;
      review_min: number;
      study_minutes: number;
      podcast_minutes: number;
      review_minutes: number;
    };
    weekly_goals: Array<{ id: string; label: string; done: boolean }>;
    definition_of_done: string[];
    metrics: {
      tasks_done_target: number;
      minutes_target: number;
    };
  };
}

interface SprintTaskData {
  id: string;
  created_at: string;
  updated_at: string | null;
  week_start: string;
  title: string;
  task_type: string;
  kanban_state: SprintBoardState;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  points: number | null;
  due_date: string | null;
  order_index: number;
  related_node_id: string | null;
  related_node_title: string | null;
  source_task_id: string | null;
  item_json: {
    lane: SprintTaskLane;
    anchor: boolean;
    title: string;
    priority: SprintTaskPriority;
    status: SprintTaskStatus;
    estimate_min: number;
    actual_min: number | null;
    assignment: {
      kind: 'lesson' | 'podcast' | 'none';
      ar_lesson_id: number | null;
      unit_id: string | null;
      topic: string | null;
      episode_no: number | null;
      recording_at: string | null;
    };
    tags: string[];
    checklist: Array<{ id: string; label: string; done: boolean }>;
    note: string;
    capture_on_done: {
      create_capture_note: boolean;
      template: string;
    };
    meta: {
      anchor_key: string | null;
      week_start: string | null;
    };
    order_index?: number;
  };
}

interface SprintReviewData {
  id: string;
  created_at: string;
  updated_at: string | null;
  period_start: string;
  period_end: string;
  item_json: {
    title: string;
    outcomes: Array<{ label: string; status: 'partial' | 'done' | 'missed' }>;
    metrics: {
      tasks_done: number;
      tasks_total: number;
      minutes_spent: number;
      capture_notes: number;
      promoted_notes: number;
    };
    what_worked: string[];
    what_blocked: string[];
    carry_over_task_ids: string[];
    next_week_focus: string[];
    appreciations?: string[];
    comments?: string[];
    final_thoughts?: string[];
    retro_rows?: SprintReviewRetroRow[];
  };
}

interface SprintReviewRetroRow {
  category_id: 'quran' | 'arabic' | 'world' | 'srs_review';
  category_label: string;
  worked_well: string;
  needs_improvement: string;
  whats_next: string;
  appreciations: string;
}

interface SprintLaneData {
  id: string;
  lane_key: SprintBoardState;
  title: string;
  order_index: number;
  color: string | null;
  is_done_lane: boolean;
}

interface SprintWeekResponse {
  ok: boolean;
  week_start: string;
  weekPlan: SprintWeekPlanData | null;
  tasks: SprintTaskData[];
  review: SprintReviewData | null;
  summary: SprintWeekSummary;
  lanes: SprintLaneData[];
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface SprintTaskDraft {
  title: string;
  lane: SprintTaskLane;
  estimateMin: number;
}

interface SprintReviewDraft {
  retroRows: SprintReviewRetroRow[];
  comments: string;
  finalThoughts: string;
  carryOverIds: string[];
}

const TYPE_COLORS: Record<string, string> = {
  reading: '#1a3a6e',
  research: '#3a1a6e',
  memorisation: '#1a6e3a',
  mixed: '#6e4a1a',
  lesson: 'rgba(79, 129, 235, 0.24)',
  podcast: 'rgba(111, 207, 151, 0.22)',
  notes: 'rgba(245, 158, 11, 0.2)',
  admin: 'rgba(168, 85, 247, 0.18)',
};

const TYPE_TEXT_COLORS: Record<string, string> = {
  reading: '#60a5fa',
  research: '#a78bfa',
  memorisation: '#4ade80',
  mixed: '#fbbf24',
  lesson: '#8fb7ff',
  podcast: '#7be3b3',
  notes: '#f7c768',
  admin: '#d5b2ff',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const CAPTURE_AUTOSAVE_DELAY_MS = 650;
const DEFAULT_SPRINT_BOARD: SprintLaneData[] = [
  { id: 'backlog', lane_key: 'backlog', title: 'Backlog', order_index: 0, color: '#6B7280', is_done_lane: false },
  { id: 'in_progress', lane_key: 'in_progress', title: 'In Progress', order_index: 1, color: '#2563EB', is_done_lane: false },
  { id: 'review', lane_key: 'review', title: 'Review', order_index: 2, color: '#D97706', is_done_lane: false },
  { id: 'done', lane_key: 'done', title: 'Done', order_index: 3, color: '#059669', is_done_lane: true },
];
const CAPTURE_DOMAINS: CaptureDomainOption[] = [
  {
    id: 'arabic_media',
    label: 'Arabic Media',
    icon: '◉',
    description: 'YouTube, browser clips, books, podcasts, and any Arabic media note.',
    accent: '#5ea0ff',
    accentSoft: 'rgba(94, 160, 255, 0.16)',
  },
  {
    id: 'arabic_linguistics',
    label: 'Arabic Linguistics',
    icon: '✦',
    description: 'Grammar, balagha, idioms, poetry, rhetoric, and language structure.',
    accent: '#b985ff',
    accentSoft: 'rgba(185, 133, 255, 0.16)',
  },
  {
    id: 'quranic_concepts',
    label: 'Quranic Concepts',
    icon: '◇',
    description: 'Vocabulary, idioms, tafsir, concepts, and semantic patterns from the Qur’an.',
    accent: '#46d48f',
    accentSoft: 'rgba(70, 212, 143, 0.16)',
  },
  {
    id: 'worldview',
    label: 'Worldview',
    icon: '◆',
    description: 'Books, thinkers, arguments, and any thought connected to worldview formation.',
    accent: '#f0b85d',
    accentSoft: 'rgba(240, 184, 93, 0.16)',
  },
  {
    id: 'english_expression',
    label: 'English Expression',
    icon: '◌',
    description: 'Vocabulary, expressions, phrasing, and sharper ways to think and speak.',
    accent: '#ff7c7c',
    accentSoft: 'rgba(255, 124, 124, 0.16)',
  },
];

@Component({
  selector: 'km-planner',
  standalone: true,
  imports: [
    FormsModule,
    HomePlaneButtonComponent,
    PlannerStripMenuComponent,       // km-strip-menu
    PlannerCaptureWorkspaceComponent, // km-capture
    PlannerCaptureModalComponent,    // km-capture-modal
    PlannerPlanBoardComponent,       // km-plan
PlannerCalendarComponent,        // km-calendar
    PlannerKanbanComponent,          // km-execute-kanban
    PlannerReviewComponent,          // km-review
    PlannerTimelineComponent,        // km-timeline
  ],
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
  readonly activeView = signal<ViewMode>('plan');
  readonly executionView = signal<PlannerExecutionView>('board');
  readonly calendarMode = signal<CalendarMode>('month');
  readonly draggingPlanId = signal<Plan['id'] | null>(null);
  readonly dropTargetStatus = signal<PlanStatus | null>(null);
  readonly savingPlanId = signal<Plan['id'] | null>(null);
  readonly captureItems = signal<CaptureItem[]>([]);
  readonly captureLoading = signal(true);
  readonly captureError = signal<string | null>(null);
  readonly captureSaving = signal(false);
  readonly captureSaveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly captureStudioMode = signal<CaptureStudioMode>('overview');
  readonly captureFilter = signal<CaptureFilter>('all');
  readonly selectedCaptureId = signal<string | null>(null);
  readonly plannerWeekStart = signal(this.computePlannerWeekStart(new Date()));
  readonly plannerWeekPlan = signal<SprintWeekPlanData | null>(null);
  readonly plannerTasks = signal<SprintTaskData[]>([]);
  readonly plannerReview = signal<SprintReviewData | null>(null);
  readonly plannerSummary = signal<SprintWeekSummary>({
    tasks_done: 0,
    tasks_total: 0,
    minutes_spent: 0,
    inbox_count: 0,
    capture_notes: 0,
    promoted_notes: 0,
  });
  readonly plannerLanes = signal<SprintLaneData[]>(DEFAULT_SPRINT_BOARD);
  readonly plannerSaving = signal(false);
  readonly selectedPlanId = signal<string | null>(null);
  readonly planEditorBusy = signal(false);

  readonly focusDate = signal(this.startOfDay(new Date()));
  captureDraft: CaptureDraft = this.createEmptyCaptureDraft();
  taskDraft: SprintTaskDraft = this.createEmptyTaskDraft();
  reviewDraft: SprintReviewDraft = this.createEmptyReviewDraft();
  planEditorTitle = '';
  planEditorDraft: PlannerPlanState = this.createEmptyPlanState();

  readonly particles = Array.from({ length: 12 }, (_, i) => i);
  private cleanupCalendarCardTilts: Array<() => void> = [];
  private queryParamSubscription?: Subscription;
  private hasViewInitialized = false;
  stripLayoutReady = false;
  private captureDraftId: string | null = null;
  private captureAutosaveTimer: number | null = null;
  private workspaceTransitionTimeline: gsap.core.Timeline | null = null;
  private workspaceTransitioning = false;

  readonly DAYS = DAYS;
  readonly MONTHS = MONTHS;

  readonly stripMenuItems: PlannerStripItem[] = [
    { id: 'capture', indexLabel: '01', label: 'Capture', badge: 'INTAKE', caption: 'raw notes', accent: '#7c9185' },
    { id: 'plan', indexLabel: '02', label: 'Plan', badge: 'REFINE', caption: 'stage + shape', accent: '#8b6674' },
    { id: 'kanban', indexLabel: '03', label: 'Kanban', badge: 'EXECUTE', caption: 'board + calendar + timeline', accent: '#9a7c52' },
    { id: 'review', indexLabel: '04', label: 'Review', badge: 'RETRO', caption: 'close the cycle', accent: '#66758a' },
  ];
  readonly executionModes: { id: PlannerExecutionView; label: string }[] = [
    { id: 'board', label: 'Board' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'timeline', label: 'Timeline' },
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
  readonly captureDomains = CAPTURE_DOMAINS;
  readonly headerActionLabel = computed(() => {
    if (this.activeView() === 'capture') {
      return this.captureStudioMode() === 'composer' ? 'Store Note' : '＋ New Note';
    }
    if (this.activeView() === 'review') {
      return 'Save Review';
    }
    return '＋ Add Task';
  });

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

  readonly captureGrouped = computed<Record<CaptureStage, CaptureItem[]>>(() => {
    const grouped: Record<CaptureStage, CaptureItem[]> = {
      inbox: [],
      review: [],
      done: [],
    };

    for (const item of this.captureItems()) {
      grouped[item.stage].push(item);
    }

    return grouped;
  });
  readonly filteredCaptureItems = computed(() => {
    const filter = this.captureFilter();
    const items = this.captureItems();
    if (filter === 'all') {
      return items;
    }

    return items.filter((item) => item.stage === filter || item.domain === filter);
  });
  readonly selectedCapture = computed(() => {
    const items = this.filteredCaptureItems();
    const selectedId = this.selectedCaptureId();
    return items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  });
  readonly captureRecentItems = computed(() => this.captureItems().slice(0, 5));
  readonly captureStudioTiles = computed<CaptureStudioTile[]>(() => {
    const items = this.captureItems();
    const stageCount = (stage: CaptureStage) => items.filter((item) => item.stage === stage).length;
    const domainCount = (domain: CaptureDomain) => items.filter((item) => item.domain === domain).length;

    return [
      {
        id: 'new',
        label: 'New',
        icon: '＋',
        caption: 'Open the capture pane',
        accent: '#f3ede2',
        accentSoft: 'rgba(243, 237, 226, 0.16)',
        kind: 'action',
      },
      {
        id: 'all',
        label: 'All notes',
        icon: '◎',
        caption: `${items.length} stored`,
        count: items.length,
        accent: '#c9a84c',
        accentSoft: 'rgba(201, 168, 76, 0.16)',
        kind: 'summary',
      },
      {
        id: 'inbox',
        label: 'Inbox',
        icon: '◇',
        caption: `${stageCount('inbox')} waiting`,
        count: stageCount('inbox'),
        accent: '#5ea0ff',
        accentSoft: 'rgba(94, 160, 255, 0.16)',
        kind: 'stage',
      },
      {
        id: 'review',
        label: 'Review',
        icon: '✎',
        caption: `${stageCount('review')} shaping`,
        count: stageCount('review'),
        accent: '#f0b85d',
        accentSoft: 'rgba(240, 184, 93, 0.16)',
        kind: 'stage',
      },
      {
        id: 'done',
        label: 'Done',
        icon: '✦',
        caption: `${stageCount('done')} resolved`,
        count: stageCount('done'),
        accent: '#46d48f',
        accentSoft: 'rgba(70, 212, 143, 0.16)',
        kind: 'stage',
      },
      ...this.captureDomains.map((domain) => ({
        id: domain.id,
        label: domain.label,
        icon: domain.icon,
        caption: `${domainCount(domain.id)} mapped`,
        count: domainCount(domain.id),
        accent: domain.accent,
        accentSoft: domain.accentSoft,
        kind: 'domain' as const,
      })),
    ];
  });
  readonly captureJsonPreview = computed(() => {
    if (this.captureStudioMode() === 'composer') {
      return JSON.stringify(this.buildCapturePayload('draft'), null, 2);
    }

    const selected = this.selectedCapture();
    if (selected) {
      return JSON.stringify(selected.payload, null, 2);
    }

    return JSON.stringify({
      filter: this.captureFilter(),
      total_notes: this.filteredCaptureItems().length,
      pane: this.captureStudioMode(),
    }, null, 2);
  });
  private readonly captureSelectionEffect = effect(() => {
    const items = this.filteredCaptureItems();
    const selectedId = this.selectedCaptureId();

    if (items.length === 0) {
      if (selectedId !== null) {
        this.selectedCaptureId.set(null);
      }
      return;
    }

    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      this.selectedCaptureId.set(items[0].id);
    }
  }, { allowSignalWrites: true });
  readonly plannerWeekLabel = computed(() => this.formatPlannerWeekLabel(this.plannerWeekStart()));
  readonly plannerMinuteTarget = computed(() => {
    const plan = this.plannerWeekPlan()?.item_json;
    if (!plan) {
      return 0;
    }
    return plan.time_budget.lesson_min + plan.time_budget.podcast_min + plan.time_budget.review_min;
  });
  readonly plannerCompletionPercent = computed(() => {
    const summary = this.plannerSummary();
    if (summary.tasks_total === 0) {
      return 0;
    }
    return Math.round((summary.tasks_done / summary.tasks_total) * 100);
  });
  readonly plannerLaneGroups = computed(() => ['lesson', 'podcast', 'notes', 'admin']
    .map((lane) => ({
      lane: lane as SprintTaskLane,
      tasks: this.plannerTasks()
        .filter((task) => task.item_json.lane === lane)
        .sort((left, right) => {
          const orderDelta = (left.order_index ?? 0) - (right.order_index ?? 0);
          if (orderDelta !== 0) {
            return orderDelta;
          }
          return left.title.localeCompare(right.title);
        }),
    }))
    .filter((group) => group.tasks.length > 0 || group.lane === 'lesson' || group.lane === 'podcast')
  );
  readonly plannerKanbanColumns = computed(() => {
    const lanes = this.plannerLanes();
    return (lanes.length > 0 ? lanes : DEFAULT_SPRINT_BOARD)
      .slice()
      .sort((left, right) => left.order_index - right.order_index);
  });
  readonly plannerReviewTasks = computed(() =>
    this.plannerTasks().filter((task) => task.item_json.status !== 'done' && task.item_json.status !== 'skipped')
  );
  readonly planBoardItems = computed(() =>
    this.captureItems().filter((item) => item.status !== 'archived')
  );
  readonly selectedPlanItem = computed(() => {
    const selectedId = this.selectedPlanId();
    if (!selectedId) {
      return null;
    }

    return this.planBoardItems().find((item) => item.id === selectedId) ?? null;
  });

  ngOnInit(): void {
    this.queryParamSubscription = this.route.queryParamMap.subscribe((params) => {
      const previousView = this.activeView();
      const previousExecutionView = this.executionView();
      const previousCalendarMode = this.calendarMode();
      const previousWeekStart = this.plannerWeekStart();
      const viewParam = params.get('view');
      const nextView = this.parseViewMode(viewParam);
      const nextExecutionView = this.parseExecutionView(viewParam, params.get('mode'));
      const nextCalendarMode = this.parseCalendarMode(params.get('calendar'));
      const nextWeekStart = this.parsePlannerWeek(params.get('week'));

      this.activeView.set(nextView);
      this.executionView.set(nextExecutionView);
      this.calendarMode.set(nextCalendarMode);
      this.plannerWeekStart.set(nextWeekStart);

      if (!this.hasViewInitialized) {
        return;
      }

      if (previousView !== nextView || previousExecutionView !== nextExecutionView) {
        this.animateWorkspaceChange(nextView, nextExecutionView);
        return;
      }

      if (this.isCalendarSurfaceActive() && previousCalendarMode !== nextCalendarMode) {
        this.positionCalendarModePill();
        this.animateCalendarStage();
      }

      if (previousWeekStart !== nextWeekStart) {
        void this.loadPlans();
      }
    });
    void this.loadCaptures();
    void this.loadPlans();
  }

  ngAfterViewInit(): void {
    this.hasViewInitialized = true;
    this.syncPlannerShellLayout(true);
    this.stripLayoutReady = true;
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
    const strips = Array.from(this.mainRef.nativeElement.querySelectorAll<HTMLElement>('.planner-strip'));
    if (strips.length > 0) {
      gsap.fromTo(
        strips,
        {
          y: 100,
          autoAlpha: 0,
          scale: 0.985,
          transformOrigin: '50% 100%',
        },
        {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          duration: 1.55,
          stagger: 0.08,
          delay: 0.26,
          ease: 'power4.out',
          clearProps: 'opacity,visibility',
          onComplete: () => this.syncPlannerShellLayout(true),
        }
      );
    }
    setTimeout(() => {
      this.animateWorkspaceChange(this.activeView(), this.executionView());
    }, 450);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncPlannerShellLayout(true);
  }

  ngOnDestroy(): void {
    this.queryParamSubscription?.unsubscribe();
    this.clearCalendarCardTilts();
    this.clearCaptureAutosaveTimer();
  }

  async loadPlans(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const weekStart = this.plannerWeekStart();
      const params = new URLSearchParams({
        week_start: weekStart,
        user_id: '1',
      });
      const plannerRes = await fetch(`${environment.apiBase}/planner/week?${params.toString()}`);
      if (!plannerRes.ok) {
        throw new Error(`HTTP ${plannerRes.status}`);
      }

      const data = await plannerRes.json() as SprintWeekResponse;
      this.plannerWeekPlan.set(data.weekPlan ?? null);
      const normalizedTasks = (data.tasks ?? []).map((task) => this.normalizeSprintTask(task));
      this.plannerTasks.set(normalizedTasks);
      const calendarPlans = this.buildCalendarTaskPlans(normalizedTasks);
      this.plans.set(calendarPlans);
      if (this.isCalendarSurfaceActive() && this.calendarMode() === 'day') {
        const firstTaskDate = this.firstCalendarTaskDate(calendarPlans);
        if (firstTaskDate && !calendarPlans.some((plan) => this.isSameDay(new Date(`${plan.start_date}T12:00:00Z`), this.focusDate()))) {
          this.focusDate.set(firstTaskDate);
        }
      }
      this.plannerReview.set(data.review ?? null);
      this.plannerSummary.set(data.summary ?? {
        tasks_done: 0,
        tasks_total: 0,
        minutes_spent: 0,
        inbox_count: 0,
        capture_notes: 0,
        promoted_notes: 0,
      });
      this.plannerLanes.set((data.lanes ?? DEFAULT_SPRINT_BOARD).map((lane) => this.normalizeSprintLane(lane)));
      this.reviewDraft = this.createReviewDraftFromApi(data.review);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Failed to load plans');
      // Fallback mock data so the kanban renders during local dev / offline
      this.plans.set([
        { id: 'mock-1', title: 'Lesson Session 1 (with kid)', type: 'reading', status: 'to_do', description: 'lesson unit task', start_date: '2026-04-01', end_date: '2026-04-07' },
        { id: 'mock-2', title: 'Lesson Session 2 (with kid)', type: 'reading', status: 'to_do', description: 'lesson unit task', start_date: '2026-04-02', end_date: '2026-04-07' },
        { id: 'mock-3', title: 'Podcast Research Block', type: 'research', status: 'to_do', description: 'Deep research session', start_date: '2026-04-03', end_date: '2026-04-07' },
        { id: 'mock-4', title: 'Memorise Surah Al-Mulk (v1–15)', type: 'memorisation', status: 'to_do', description: 'Spaced repetition review', start_date: '2026-04-04', end_date: '2026-04-07' },
        { id: 'mock-5', title: 'Mixed Study: Worldview Notes', type: 'mixed', status: 'to_do', description: 'Cross-reference notes', start_date: '2026-04-05', end_date: '2026-04-07' },
        { id: 'mock-6', title: 'Arabic Grammar Review', type: 'research', status: 'active', description: 'Study balagha chapter 4', start_date: '2026-04-01', end_date: '2026-04-05' },
        { id: 'mock-7', title: 'Tafsir Reading — Ibn Kathir', type: 'reading', status: 'review', description: 'Notes to finalise', start_date: '2026-03-28', end_date: '2026-04-02' },
        { id: 'mock-8', title: 'Podcast Episode 1 Outline', type: 'mixed', status: 'completed', description: 'Script fully drafted', start_date: '2026-03-25', end_date: '2026-03-31' },
      ]);
    } finally {
      this.loading.set(false);
    }
  }

  async loadCaptures(): Promise<void> {
    this.captureLoading.set(true);
    this.captureError.set(null);

    try {
      const res = await fetch(`${environment.apiBase}/captures?limit=200`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { ok: boolean; captures?: CaptureItem[] };
      this.captureItems.set(
        this.sortCaptureItems((data.captures ?? []).map((item) => this.normalizeCaptureItem(item)))
      );
    } catch (error) {
      this.captureError.set(error instanceof Error ? error.message : 'Failed to load captures');
    } finally {
      this.captureLoading.set(false);
    }
  }

  captureItemsByStage(stage: CaptureStage): CaptureItem[] {
    return this.captureGrouped()[stage];
  }

  captureDomainLabel(domain: CaptureDomain): string {
    return this.captureDomainMeta(domain).label;
  }

  captureDomainDescription(domain: CaptureDomain): string {
    return this.captureDomainMeta(domain).description;
  }

  captureDomainIcon(domain: CaptureDomain): string {
    return this.captureDomainMeta(domain).icon;
  }

  captureDomainAccent(domain: CaptureDomain): string {
    return this.captureDomainMeta(domain).accent;
  }

  captureDomainAccentSoft(domain: CaptureDomain): string {
    return this.captureDomainMeta(domain).accentSoft;
  }

  captureStatusLabel(status: CaptureStatus): string {
    return status === 'draft' ? 'Draft' : status === 'archived' ? 'Archived' : 'Live';
  }

  formatCaptureTimestamp(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }

  resourcesLabel(resources: string[]): string {
    if (resources.length === 0) {
      return 'No resources';
    }

    return `${resources.length} ${resources.length === 1 ? 'resource' : 'resources'}`;
  }

  compactedCaptureContext(item: CaptureItem): string {
    if (item.compact_context.trim()) {
      return item.compact_context;
    }

    return this.compactText(
      [this.captureNoteText(item.note), item.quote, ...item.resources].filter((segment) => segment.trim().length > 0).join(' '),
      180,
    );
  }

  captureStageLabel(stage: CaptureStage): string {
    switch (stage) {
      case 'review':
        return 'Review';
      case 'done':
        return 'Done';
      case 'inbox':
      default:
        return 'Inbox';
    }
  }

  captureFilterHeading(): string {
    const filter = this.captureFilter();
    if (filter === 'all') {
      return 'All Notes';
    }

    if (filter === 'inbox' || filter === 'review' || filter === 'done') {
      return `${this.captureStageLabel(filter)} Notes`;
    }

    return this.captureDomainLabel(filter);
  }

  captureFilterCopy(): string {
    const filter = this.captureFilter();
    if (filter === 'all') {
      return 'Every stored capture, newest first, ready to inspect or reopen.';
    }

    if (filter === 'inbox' || filter === 'review' || filter === 'done') {
      return `${this.captureStageLabel(filter)} notes on the left. Click any row to load it into the workspace.`;
    }

    return `${this.captureDomainDescription(filter)} Filtering the left pane to this domain only.`;
  }

  captureWorkspaceTitle(): string {
    if (this.captureStudioMode() === 'composer') {
      return this.captureDraft.title.trim() || 'Capture new note';
    }

    return this.selectedCapture()?.title ?? 'Choose a note';
  }

  captureWorkspaceCopy(): string {
    if (this.captureStudioMode() === 'composer') {
      return 'Draft on the right, full note in the middle, and the exact JSON snapshot below.';
    }

    const item = this.selectedCapture();
    if (!item) {
      return 'Pick a node tile on the right to filter the notes list, or open a new note.';
    }

    return `${this.captureDomainLabel(item.domain)} · ${this.captureStageLabel(item.stage)} · Updated ${this.formatCaptureTimestamp(item.updatedAt)}`;
  }

  captureStudioHeading(): string {
    return this.captureStudioMode() === 'composer' ? 'Capture New' : 'Studio';
  }

  captureStudioCopy(): string {
    return this.captureStudioMode() === 'composer'
      ? 'Write the note, autosave to the database, then store it into the workspace.'
      : 'Use the grid like nodes: New opens the composer, any other tile filters the notes list on the left.';
  }

  captureTileActive(tileId: CaptureStudioTileId): boolean {
    if (tileId === 'new') {
      return this.captureStudioMode() === 'composer';
    }

    return this.captureStudioMode() !== 'composer' && this.captureFilter() === tileId;
  }

  captureComposerSubmitLabel(): string {
    return this.captureDraftId ? 'Save Note' : 'Store In Inbox';
  }

  selectCaptureItem(id: string): void {
    this.selectedCaptureId.set(id);
    this.animateCaptureWorkspaceFocus();
  }

  activateCaptureTile(tileId: CaptureStudioTileId): void {
    if (tileId === 'new') {
      this.openNewCapturePane(true);
      return;
    }

    this.captureFilter.set(tileId);
    this.captureStudioMode.set('overview');
    const next = this.captureItems().find((item) => item.stage === tileId || item.domain === tileId);
    this.selectedCaptureId.set(next?.id ?? null);
    this.animateCaptureWorkspaceFocus();
  }

  openNewCapturePane(resetDraft = false): void {
    if (resetDraft) {
      this.captureDraft = this.createEmptyCaptureDraft();
      this.captureDraftId = null;
      this.captureSaveState.set('idle');
      this.clearCaptureAutosaveTimer();
    }

    this.captureStudioMode.set('composer');
    this.animateCaptureWorkspaceFocus();
  }

  showCaptureOverview(): void {
    this.captureStudioMode.set('overview');
    this.animateCaptureWorkspaceFocus();
  }

  editCapture(id: string): void {
    const item = this.captureItems().find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    this.loadCaptureIntoDraft(item);
    this.selectedCaptureId.set(id);
    this.captureStudioMode.set('composer');
    this.animateCaptureWorkspaceFocus();
  }

  onCaptureDraftChanged(): void {
    if (!this.captureHasContent()) {
      this.captureSaveState.set('idle');
      if (!this.captureDraftId) {
        this.clearCaptureAutosaveTimer();
      }
      return;
    }

    this.captureSaveState.set('idle');
    this.clearCaptureAutosaveTimer();
    this.captureAutosaveTimer = window.setTimeout(() => {
      void this.persistCaptureDraft('draft');
    }, CAPTURE_AUTOSAVE_DELAY_MS);
  }

  async finalizeCaptureDraft(): Promise<void> {
    const saved = await this.persistCaptureDraft('active');
    if (!saved) {
      return;
    }

    const storedId = this.captureDraftId;
    this.captureDraft = this.createEmptyCaptureDraft();
    this.captureDraftId = null;
    this.captureStudioMode.set('overview');
    this.captureFilter.set('all');
    this.selectedCaptureId.set(storedId);
    this.captureSaveState.set('idle');
    this.animateCaptureWorkspaceFocus();
  }

  async moveCaptureToStage(id: string, stage: CaptureStage): Promise<void> {
    const current = this.captureItems().find((item) => item.id === id);
    if (!current || current.stage === stage) {
      return;
    }

    const optimistic: CaptureItem = {
      ...current,
      stage,
      status: stage === 'done' ? 'active' : current.status === 'archived' ? 'active' : current.status,
      updatedAt: new Date().toISOString(),
    };

    this.upsertCaptureItem(optimistic);
    this.selectedCaptureId.set(id);

    try {
      const res = await fetch(`${environment.apiBase}/captures/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, status: 'active' }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { ok: boolean; capture?: CaptureItem };
      if (data.capture) {
        this.upsertCaptureItem(this.normalizeCaptureItem(data.capture));
      }
      this.animateCaptureWorkspaceFocus();
    } catch (error) {
      console.warn('Capture stage update failed.', error);
      this.upsertCaptureItem(current);
    }
  }

  async archiveCapture(id: string): Promise<void> {
    const existing = this.captureItems().find((item) => item.id === id);
    if (!existing) {
      return;
    }

    this.captureItems.set(this.captureItems().filter((item) => item.id !== id));

    try {
      const res = await fetch(`${environment.apiBase}/captures/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (error) {
      console.warn('Capture archive failed.', error);
      this.upsertCaptureItem(existing);
    } finally {
      if (this.captureDraftId === id) {
        this.captureDraft = this.createEmptyCaptureDraft();
        this.captureDraftId = null;
        this.captureStudioMode.set('overview');
      }
      this.animateCaptureWorkspaceFocus();
    }
  }

  updateCaptureDraft(nextDraft: CaptureDraft): void {
    this.captureDraft = nextDraft;
    this.onCaptureDraftChanged();
  }

  openPlanEditor(id: string): void {
    const item = this.planBoardItems().find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    this.selectedPlanId.set(id);
    this.planEditorTitle = item.title;
    this.planEditorDraft = this.buildPlanStateForItem(item);
    this.switchView('plan');
    this.animatePlanEditorOpen();
  }

  closePlanEditor(): void {
    this.selectedPlanId.set(null);
  }

  updatePlanTitle(value: string): void {
    this.planEditorTitle = value;
  }

  updatePlanSummary(value: string): void {
    this.planEditorDraft = {
      ...this.planEditorDraft,
      summary: value,
    };
  }

  updatePlanSection(index: number, key: keyof PlannerSection, value: string): void {
    this.planEditorDraft = {
      ...this.planEditorDraft,
      sections: this.planEditorDraft.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [key]: value } : section
      ),
    };
  }

  updatePlanAccordionNote(index: number, value: string): void {
    this.planEditorDraft = {
      ...this.planEditorDraft,
      accordion_notes: this.planEditorDraft.accordion_notes.map((note, noteIndex) =>
        noteIndex === index ? { ...note, content: value } : note
      ),
    };
  }

  addPlanSection(): void {
    this.planEditorDraft = {
      ...this.planEditorDraft,
      sections: [
        ...this.planEditorDraft.sections,
        {
          id: `section-${crypto.randomUUID?.() ?? Date.now()}`,
          title: `Section ${this.planEditorDraft.sections.length + 1}`,
          body: '',
        },
      ],
    };
  }

  switchExecutionView(mode: PlannerExecutionView): void {
    if (this.activeView() !== 'kanban') {
      this.switchView('kanban');
    }
    if (this.executionView() === mode) {
      return;
    }

    this.executionView.set(mode);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    setTimeout(() => {
      if (mode === 'calendar') {
        this.positionCalendarModePill();
        this.animateCalendarStage();
      } else if (mode === 'timeline') {
        this.animateTimelineStage();
      } else {
        this.animateKanbanBoardStage();
      }
    }, 0);
  }

  async savePlanDraft(): Promise<void> {
    const item = this.selectedPlanItem();
    if (!item) {
      return;
    }

    await this.persistPlanItem(item, this.planEditorDraft);
  }

  async archivePlanItem(): Promise<void> {
    const item = this.selectedPlanItem();
    if (!item) {
      return;
    }

    this.closePlanEditor();
    await this.archiveCapture(item.id);
  }

  async pushPlanToFeed(): Promise<void> {
    const item = this.selectedPlanItem();
    if (!item) {
      return;
    }

    this.planEditorBusy.set(true);

    try {
      const saved = await this.persistPlanItem(item, this.planEditorDraft);
      if (!saved) {
        return;
      }

      const res = await fetch(`${environment.apiBase}/planner/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,
          source_capture_id: item.id,
          title: this.planEditorTitle.trim() || item.title,
          summary: this.planEditorDraft.summary,
          plan_state: this.planEditorDraft,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { ok: boolean; item?: { id: string; created_at: string } };
      const pushedAt = data.item?.created_at ?? new Date().toISOString();
      this.planEditorDraft = {
        ...this.planEditorDraft,
        pushed_to_feed_at: pushedAt,
        feed_item_id: data.item?.id ?? null,
      };
      await this.persistPlanItem(item, this.planEditorDraft);
    } catch (error) {
      console.warn('Feed routing failed.', error);
    } finally {
      this.planEditorBusy.set(false);
    }
  }

  async pushPlanToKanban(): Promise<void> {
    const item = this.selectedPlanItem();
    if (!item) {
      return;
    }

    this.planEditorBusy.set(true);

    try {
      const saved = await this.persistPlanItem(item, this.planEditorDraft);
      if (!saved) {
        return;
      }

      const lane = this.captureDomainToTaskLane(item.domain);
      const itemJson = {
        lane,
        anchor: false,
        title: this.planEditorTitle.trim() || item.title,
        priority: lane === 'lesson' ? 'P1' : lane === 'podcast' ? 'P2' : 'P3',
        status: 'planned',
        estimate_min: 45,
        actual_min: null,
        assignment: {
          kind: lane === 'lesson' ? 'lesson' : lane === 'podcast' ? 'podcast' : 'none',
          ar_lesson_id: null,
          unit_id: null,
          topic: this.planEditorDraft.summary.slice(0, 140) || null,
          episode_no: null,
          recording_at: null,
        },
        tags: [lane, 'planner'],
        checklist: [],
        note: this.planEditorDraft.summary,
        capture_on_done: {
          create_capture_note: true,
          template: 'What changed after execution? What should be retained in the feed?',
        },
        meta: {
          anchor_key: null,
          week_start: this.plannerWeekStart(),
        },
        order_index: this.plannerTasks().length * 100 + 100,
      } satisfies SprintTaskData['item_json'];

      const res = await fetch(`${environment.apiBase}/planner/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,
          week_start: this.plannerWeekStart(),
          item_json: itemJson,
          source_task_id: this.planEditorDraft.kanban_task_id ?? undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { ok: boolean; task?: SprintTaskData };
      if (data.task) {
        this.upsertSprintTask(this.normalizeSprintTask(data.task));
      } else {
        await this.loadPlans();
      }

      this.planEditorDraft = {
        ...this.planEditorDraft,
        pushed_to_kanban_at: new Date().toISOString(),
        kanban_task_id: data.task?.id ? String(data.task.id) : null,
      };
      await this.persistPlanItem(item, this.planEditorDraft);
      this.switchView('kanban');
      this.switchExecutionView('board');
    } catch (error) {
      console.warn('Kanban routing failed.', error);
    } finally {
      this.planEditorBusy.set(false);
    }
  }

  plannerLaneLabel(lane: SprintTaskLane): string {
    switch (lane) {
      case 'lesson':
        return 'Lessons';
      case 'podcast':
        return 'Podcast';
      case 'notes':
        return 'Notes';
      case 'admin':
      default:
        return 'Admin';
    }
  }

  plannerTaskStatusLabel(status: SprintTaskStatus): string {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'doing':
        return 'Doing';
      case 'blocked':
        return 'Blocked';
      case 'done':
        return 'Done';
      case 'skipped':
        return 'Skipped';
      case 'planned':
      default:
        return 'Planned';
    }
  }

  plannerBoardStateLabel(state: SprintBoardState): string {
    switch (state) {
      case 'in_progress':
        return 'In Progress';
      case 'review':
        return 'Review';
      case 'done':
        return 'Done';
      case 'backlog':
      default:
        return 'Backlog';
    }
  }

  plannerTaskEstimateLabel(task: SprintTaskData): string {
    const actual = task.item_json.actual_min ?? 0;
    if (task.item_json.status === 'done' && actual > 0) {
      return `${actual} min actual`;
    }
    return `${task.item_json.estimate_min} min planned`;
  }

  plannerTaskContext(task: SprintTaskData): string {
    const assignment = task.item_json.assignment;
    if (task.item_json.lane === 'lesson' && assignment.ar_lesson_id) {
      return `Lesson ${assignment.ar_lesson_id}`;
    }
    if (task.item_json.lane === 'podcast' && assignment.topic) {
      return assignment.topic;
    }
    if (task.related_node_title) {
      return task.related_node_title;
    }
    return task.task_type.replace(/[_-]+/g, ' ');
  }

  plannerTaskPriorityBadge(task: SprintTaskData): string {
    return task.item_json.priority;
  }

  plannerTasksByBoardState(state: SprintBoardState): SprintTaskData[] {
    return this.plannerTasks()
      .filter((task) => task.kanban_state === state)
      .sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0));
  }

  isCarryOverTask(taskId: string): boolean {
    return this.reviewDraft.carryOverIds.includes(taskId);
  }

  toggleCarryOverTask(taskId: string): void {
    this.reviewDraft = {
      ...this.reviewDraft,
      carryOverIds: this.isCarryOverTask(taskId)
        ? this.reviewDraft.carryOverIds.filter((id) => id !== taskId)
        : [...this.reviewDraft.carryOverIds, taskId],
    };
  }

  async addPlannerTask(): Promise<void> {
    const title = this.taskDraft.title.trim();
    const estimate = Number(this.taskDraft.estimateMin);
    if (!title || !Number.isFinite(estimate) || estimate <= 0) {
      return;
    }

    this.plannerSaving.set(true);
    try {
      const itemJson = {
        lane: this.taskDraft.lane,
        anchor: false,
        title,
        priority: this.taskDraft.lane === 'lesson' ? 'P1' : 'P2',
        status: 'planned',
        estimate_min: estimate,
        actual_min: null,
        assignment: {
          kind: this.taskDraft.lane === 'lesson' ? 'lesson' : this.taskDraft.lane === 'podcast' ? 'podcast' : 'none',
          ar_lesson_id: null,
          unit_id: null,
          topic: null,
          episode_no: null,
          recording_at: null,
        },
        tags: [this.taskDraft.lane],
        checklist: [],
        note: '',
        capture_on_done: {
          create_capture_note: false,
          template: 'What did I learn? What confused me? One next step.',
        },
        meta: {
          anchor_key: null,
          week_start: this.plannerWeekStart(),
        },
        order_index: this.plannerTasks().length * 100 + 100,
      } satisfies SprintTaskData['item_json'];

      const res = await fetch(`${environment.apiBase}/planner/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,
          week_start: this.plannerWeekStart(),
          item_json: itemJson,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { ok: boolean; task?: SprintTaskData };
      if (data.task) {
        this.upsertSprintTask(this.normalizeSprintTask(data.task));
      } else {
        await this.loadPlans();
      }
      this.refreshPlannerSummary();
      this.taskDraft = this.createEmptyTaskDraft();
    } catch (error) {
      console.warn('Planner task creation failed.', error);
      await this.loadPlans();
    } finally {
      this.plannerSaving.set(false);
    }
  }

  async updatePlannerTaskStatus(task: SprintTaskData, status: SprintTaskStatus): Promise<void> {
    const nextItemJson = {
      ...task.item_json,
      status,
      actual_min: status === 'done'
        ? (task.item_json.actual_min ?? task.item_json.estimate_min)
        : task.item_json.actual_min,
    };

    const optimistic = this.normalizeSprintTask({
      ...task,
      kanban_state: this.sprintStatusToBoardState(status),
      item_json: nextItemJson,
    });
    const previous = task;

    this.upsertSprintTask(optimistic);

    try {
      const endpoint = status === 'done'
        ? `${environment.apiBase}/planner/task/${encodeURIComponent(task.id)}/complete`
        : `${environment.apiBase}/planner/task/${encodeURIComponent(task.id)}`;
      const method = status === 'done' ? 'POST' : 'PUT';
      const body = status === 'done'
        ? { actual_min: nextItemJson.actual_min ?? task.item_json.estimate_min }
        : { user_id: 1, item_json: nextItemJson };
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { ok: boolean; task?: SprintTaskData };
      if (data.task) {
        this.upsertSprintTask(this.normalizeSprintTask(data.task));
      } else {
        await this.loadPlans();
      }
      this.refreshPlannerSummary();
    } catch (error) {
      console.warn('Planner task status update failed.', error);
      this.upsertSprintTask(previous);
      this.refreshPlannerSummary();
    }
  }

  async savePlannerReview(payloadOverride?: PlannerReviewPayload): Promise<void> {
    this.plannerSaving.set(true);
    try {
      const payload = payloadOverride ?? this.buildPlannerReviewPayload();

      const res = await fetch(`${environment.apiBase}/planner/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 1,
          week_start: this.plannerWeekStart(),
          item_json: payload,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { ok: boolean; review?: SprintReviewData };
      if (data.review) {
        this.plannerReview.set(data.review);
        this.reviewDraft = this.createReviewDraftFromApi(data.review);
      }
    } catch (error) {
      console.warn('Planner review save failed.', error);
    } finally {
      this.plannerSaving.set(false);
    }
  }

  prevPlannerWeek(): void {
    this.changePlannerWeek(-7);
  }

  nextPlannerWeek(): void {
    this.changePlannerWeek(7);
  }

  goToPlannerCurrentWeek(): void {
    const week = this.computePlannerWeekStart(new Date());
    if (week === this.plannerWeekStart()) {
      return;
    }
    this.navigatePlannerWeek(week);
  }

  plansByStatus(status: PlanStatus): Plan[] {
    return this.kanbanPlans()[status];
  }

  activeStripWorkspace(): PlannerWorkspace {
    const active = this.activeView();
    switch (active) {
      case 'capture':
      case 'plan':
      case 'kanban':
      case 'review':
        return active;
      default:
        return 'kanban';
    }
  }

  switchView(view: ViewMode): void {
    if (this.activeView() === view || this.workspaceTransitioning) {
      return;
    }

    this.animatePlannerWorkspaceSwap(view);
  }

  prevMonth(): void {
    this.shiftCalendar(-1);
  }

  nextMonth(): void {
    this.shiftCalendar(1);
  }

  handleHeaderAction(): void {
    if (this.activeView() === 'capture') {
      if (this.captureStudioMode() === 'composer') {
        void this.finalizeCaptureDraft();
      } else {
        this.openNewCapturePane(true);
      }
      return;
    }

    if (this.activeView() === 'review') {
      void this.savePlannerReview();
      return;
    }

    this.addTask();
  }

  addTask(): void {
    if (this.activeView() !== 'kanban') {
      this.switchView('kanban');
      return;
    }

    void this.addPlannerTask();
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
    const sprintTask = this.plannerTasks().find((task) => task.id === planId);
    if (sprintTask) {
      const nextStatus: SprintTaskStatus =
        status === 'active'
          ? 'doing'
          : status === 'review'
            ? 'blocked'
            : status === 'completed'
              ? 'done'
              : 'planned';
      await this.updatePlannerTaskStatus(sprintTask, nextStatus);
      return;
    }

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

  formatDayTitle(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
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

  normalizeCaptureDomain(domain?: string, fallback: CaptureDomain = 'arabic_media'): CaptureDomain {
    switch ((domain ?? '').toLowerCase()) {
      case 'arabic_linguistics':
        return 'arabic_linguistics';
      case 'quranic_concepts':
        return 'quranic_concepts';
      case 'worldview':
        return 'worldview';
      case 'english_expression':
        return 'english_expression';
      case 'arabic_media':
        return 'arabic_media';
      default:
        return fallback;
    }
  }

  normalizeCaptureStage(stage?: string, fallback: CaptureStage = 'inbox'): CaptureStage {
    switch ((stage ?? '').toLowerCase()) {
      case 'review':
        return 'review';
      case 'done':
        return 'done';
      case 'inbox':
        return 'inbox';
      default:
        return fallback;
    }
  }

  normalizeCaptureStatus(status?: string, fallback: CaptureStatus = 'active'): CaptureStatus {
    switch ((status ?? '').toLowerCase()) {
      case 'draft':
        return 'draft';
      case 'archived':
        return 'archived';
      case 'active':
        return 'active';
      default:
        return fallback;
    }
  }

  private parseViewMode(view: string | null): ViewMode {
    if (view === 'capture' || view === 'plan' || view === 'kanban' || view === 'review') {
      return view;
    }

    if (view === 'calendar' || view === 'timeline') {
      return 'kanban';
    }

    if (view === 'sprint') {
      return 'plan';
    }

    return 'plan';
  }

  private parseExecutionView(view: string | null, mode: string | null): PlannerExecutionView {
    if (mode === 'board' || mode === 'calendar' || mode === 'timeline') {
      return mode;
    }

    if (view === 'calendar') {
      return 'calendar';
    }

    if (view === 'timeline') {
      return 'timeline';
    }

    return 'board';
  }

  private isCalendarSurfaceActive(): boolean {
    return this.activeView() === 'kanban' && this.executionView() === 'calendar';
  }

  private isTimelineSurfaceActive(): boolean {
    return this.activeView() === 'kanban' && this.executionView() === 'timeline';
  }

  private isBoardSurfaceActive(): boolean {
    return this.activeView() === 'kanban' && this.executionView() === 'board';
  }

  private parseCalendarMode(mode: string | null): CalendarMode {
    if (mode === 'month' || mode === 'week' || mode === 'day') {
      return mode;
    }

    return 'month';
  }

  private parsePlannerWeek(value: string | null): string {
    const candidate = value?.trim() ?? '';
    return /^\d{4}-\d{2}-\d{2}$/.test(candidate)
      ? this.computePlannerWeekStart(candidate)
      : this.computePlannerWeekStart(new Date());
  }

  private computePlannerWeekStart(input: string | Date): string {
    const date = typeof input === 'string'
      ? new Date(`${input}T12:00:00Z`)
      : new Date(input.getTime());
    const utcDay = date.getUTCDay();
    const mondayOffset = (utcDay + 6) % 7;
    date.setUTCDate(date.getUTCDate() - mondayOffset);
    return date.toISOString().slice(0, 10);
  }

  private formatPlannerWeekLabel(weekStart: string): string {
    const start = new Date(`${weekStart}T12:00:00Z`);
    const end = new Date(start.getTime());
    end.setUTCDate(end.getUTCDate() + 6);
    const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startLabel} - ${endLabel}`;
  }

  private createEmptyTaskDraft(): SprintTaskDraft {
    return {
      title: '',
      lane: 'lesson',
      estimateMin: 45,
    };
  }

  private createEmptyReviewDraft(): SprintReviewDraft {
    return {
      retroRows: this.createDefaultReviewRows(),
      comments: '',
      finalThoughts: '',
      carryOverIds: [],
    };
  }

  private createReviewDraftFromApi(review: SprintReviewData | null): SprintReviewDraft {
    if (!review) {
      return this.createEmptyReviewDraft();
    }

    return {
      retroRows: this.normalizeReviewRows(
        review.item_json.retro_rows ?? [],
        review.item_json.what_worked,
        review.item_json.what_blocked,
        review.item_json.next_week_focus,
        review.item_json.appreciations ?? [],
      ),
      comments: (review.item_json.comments ?? []).join('\n'),
      finalThoughts: (review.item_json.final_thoughts ?? []).join('\n'),
      carryOverIds: [...review.item_json.carry_over_task_ids],
    };
  }

  private createDefaultReviewRows(): SprintReviewRetroRow[] {
    return [
      {
        category_id: 'quran',
        category_label: 'Quran',
        worked_well: '',
        needs_improvement: '',
        whats_next: '',
        appreciations: '',
      },
      {
        category_id: 'arabic',
        category_label: 'Arabic',
        worked_well: '',
        needs_improvement: '',
        whats_next: '',
        appreciations: '',
      },
      {
        category_id: 'world',
        category_label: 'World',
        worked_well: '',
        needs_improvement: '',
        whats_next: '',
        appreciations: '',
      },
      {
        category_id: 'srs_review',
        category_label: 'SRS Review',
        worked_well: '',
        needs_improvement: '',
        whats_next: '',
        appreciations: '',
      },
    ];
  }

  private normalizeReviewRows(
    rows: SprintReviewRetroRow[],
    whatWorked: string[] = [],
    whatBlocked: string[] = [],
    nextFocus: string[] = [],
    appreciations: string[] = [],
  ): SprintReviewRetroRow[] {
    const byCategory = new Map(rows.map((row) => [row.category_id, row]));
    return this.createDefaultReviewRows().map((row, index) => ({
      category_id: row.category_id,
      category_label: byCategory.get(row.category_id)?.category_label ?? row.category_label,
      worked_well: byCategory.get(row.category_id)?.worked_well ?? whatWorked[index] ?? '',
      needs_improvement: byCategory.get(row.category_id)?.needs_improvement ?? whatBlocked[index] ?? '',
      whats_next: byCategory.get(row.category_id)?.whats_next ?? nextFocus[index] ?? '',
      appreciations: byCategory.get(row.category_id)?.appreciations ?? appreciations[index] ?? '',
    }));
  }

  private buildPlannerReviewPayload(): PlannerReviewPayload {
    const retroRows = this.reviewDraft.retroRows.map((row) => ({
      ...row,
      worked_well: row.worked_well.trim(),
      needs_improvement: row.needs_improvement.trim(),
      whats_next: row.whats_next.trim(),
      appreciations: row.appreciations.trim(),
    }));

    return {
      schema_version: 1,
      title: `Sprint Review - ${this.plannerWeekStart()}`,
      outcomes: [],
      metrics: {
        tasks_done: this.plannerSummary().tasks_done,
        tasks_total: this.plannerSummary().tasks_total,
        minutes_spent: this.plannerSummary().minutes_spent,
        capture_notes: this.plannerSummary().capture_notes,
        promoted_notes: this.plannerSummary().promoted_notes,
      },
      what_worked: retroRows.map((row) => row.worked_well).filter(Boolean),
      what_blocked: retroRows.map((row) => row.needs_improvement).filter(Boolean),
      carry_over_task_ids: [...this.reviewDraft.carryOverIds],
      next_week_focus: retroRows.map((row) => row.whats_next).filter(Boolean),
      appreciations: retroRows.map((row) => row.appreciations).filter(Boolean),
      retro_rows: retroRows,
      comments: this.reviewDraft.comments.split('\n').map((row) => row.trim()).filter(Boolean),
      final_thoughts: this.reviewDraft.finalThoughts.split('\n').map((row) => row.trim()).filter(Boolean),
    };
  }

  private normalizeSprintLane(lane: SprintLaneData): SprintLaneData {
    return {
      ...lane,
      lane_key: this.normalizeSprintBoardState(lane.lane_key),
      title: lane.title || this.plannerBoardStateLabel(this.normalizeSprintBoardState(lane.lane_key)),
      order_index: Number.isFinite(lane.order_index) ? lane.order_index : 0,
      color: lane.color ?? null,
      is_done_lane: Boolean(lane.is_done_lane),
    };
  }

  private normalizeSprintTask(task: SprintTaskData): SprintTaskData {
    return {
      ...task,
      kanban_state: this.normalizeSprintBoardState(task.kanban_state),
      priority: this.normalizeDbPriority(task.priority),
      due_date: task.due_date ?? null,
      order_index: Number.isFinite(task.order_index) ? task.order_index : 0,
      related_node_id: task.related_node_id ?? null,
      related_node_title: task.related_node_title ?? null,
      source_task_id: task.source_task_id ?? null,
      item_json: {
        ...task.item_json,
        lane: this.normalizeSprintTaskLane(task.item_json.lane),
        priority: this.normalizeSprintTaskPriority(task.item_json.priority),
        status: this.normalizeSprintTaskStatus(task.item_json.status),
        estimate_min: Number.isFinite(task.item_json.estimate_min) ? task.item_json.estimate_min : 30,
        actual_min: task.item_json.actual_min ?? null,
        tags: Array.isArray(task.item_json.tags) ? task.item_json.tags : [],
        checklist: Array.isArray(task.item_json.checklist) ? task.item_json.checklist : [],
      },
    };
  }

  private normalizeSprintTaskLane(value?: string): SprintTaskLane {
    switch ((value ?? '').toLowerCase()) {
      case 'podcast':
        return 'podcast';
      case 'notes':
        return 'notes';
      case 'admin':
        return 'admin';
      case 'lesson':
      default:
        return 'lesson';
    }
  }

  private normalizeSprintTaskPriority(value?: string): SprintTaskPriority {
    switch ((value ?? '').toUpperCase()) {
      case 'P1':
        return 'P1';
      case 'P3':
        return 'P3';
      case 'P2':
      default:
        return 'P2';
    }
  }

  private normalizeDbPriority(value?: string): 'low' | 'medium' | 'high' | 'urgent' {
    switch ((value ?? '').toLowerCase()) {
      case 'urgent':
        return 'urgent';
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      case 'medium':
      default:
        return 'medium';
    }
  }

  private normalizeSprintTaskStatus(value?: string): SprintTaskStatus {
    switch ((value ?? '').toLowerCase()) {
      case 'todo':
        return 'todo';
      case 'doing':
        return 'doing';
      case 'blocked':
        return 'blocked';
      case 'done':
        return 'done';
      case 'skipped':
        return 'skipped';
      case 'planned':
      default:
        return 'planned';
    }
  }

  private normalizeSprintBoardState(value?: string): SprintBoardState {
    switch ((value ?? '').toLowerCase()) {
      case 'in_progress':
        return 'in_progress';
      case 'review':
        return 'review';
      case 'done':
        return 'done';
      case 'backlog':
      default:
        return 'backlog';
    }
  }

  private sprintStatusToBoardState(status: SprintTaskStatus): SprintBoardState {
    switch (status) {
      case 'doing':
        return 'in_progress';
      case 'blocked':
        return 'review';
      case 'done':
      case 'skipped':
        return 'done';
      case 'planned':
      case 'todo':
      default:
        return 'backlog';
    }
  }

  private upsertSprintTask(task: SprintTaskData): void {
    const normalized = this.normalizeSprintTask(task);
    this.plannerTasks.update((tasks) => {
      const index = tasks.findIndex((entry) => entry.id === normalized.id);
      if (index < 0) {
        return [...tasks, normalized].sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0));
      }

      const next = [...tasks];
      next[index] = normalized;
      return next.sort((left, right) => (left.order_index ?? 0) - (right.order_index ?? 0));
    });
  }

  private refreshPlannerSummary(): void {
    const tasks = this.plannerTasks();
    this.plannerSummary.update((summary) => ({
      ...summary,
      tasks_total: tasks.length,
      tasks_done: tasks.filter((task) => task.item_json.status === 'done').length,
      minutes_spent: tasks
        .filter((task) => task.item_json.status === 'done')
        .reduce((total, task) => total + (task.item_json.actual_min ?? task.item_json.estimate_min ?? 0), 0),
    }));
  }

  private buildCalendarTaskPlans(tasks: SprintTaskData[]): Plan[] {
    return tasks
      .slice()
      .sort((left, right) => {
        const leftDate = left.due_date ?? '';
        const rightDate = right.due_date ?? '';
        if (leftDate !== rightDate) {
          return leftDate.localeCompare(rightDate);
        }

        const orderDelta = (left.order_index ?? 0) - (right.order_index ?? 0);
        if (orderDelta !== 0) {
          return orderDelta;
        }

        return left.title.localeCompare(right.title);
      })
      .map((task, index) => {
        const calendarDate = task.due_date ?? this.resolveCalendarTaskDate(task, index);
        return {
          id: task.id,
          title: task.title,
          type: task.item_json.lane,
          start_date: calendarDate,
          end_date: calendarDate,
          status: task.item_json.status,
        } satisfies Plan;
      });
  }

  private resolveCalendarTaskDate(task: SprintTaskData, index: number): string {
    // Keep undated tasks visible by slotting them into the active sprint week in a stable order.
    const date = new Date(`${this.computePlannerWeekStart(task.week_start || this.plannerWeekStart())}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + (index % 7));
    return date.toISOString().slice(0, 10);
  }

  private firstCalendarTaskDate(plans: Plan[]): Date | null {
    const first = plans.find((plan) => typeof plan.start_date === 'string' && plan.start_date.length > 0)?.start_date;
    return first ? this.startOfDay(new Date(`${first}T12:00:00Z`)) : null;
  }

  private changePlannerWeek(dayOffset: number): void {
    const date = new Date(`${this.plannerWeekStart()}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    this.navigatePlannerWeek(this.computePlannerWeekStart(date));
  }

  private navigatePlannerWeek(weekStart: string): void {
    this.plannerWeekStart.set(weekStart);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { week: weekStart },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private createEmptyCaptureDraft(): CaptureDraft {
    return {
      domain: 'arabic_media',
      stage: 'inbox',
      title: '',
      note: '',
      quote: '',
      source: '',
      resourcesText: '',
    };
  }

  private createEmptyPlanState(): PlannerPlanState {
    return {
      ...EMPTY_PLAN_STATE,
      sections: PLANNER_SECTION_BLUEPRINT.map((section) => ({ ...section })),
      accordion_notes: PLANNER_ACCORDION_BLUEPRINT.map((note) => ({ ...note })),
    };
  }

  private buildPlanStateForItem(item: CaptureItem): PlannerPlanState {
    const base = item.payload.plan_state ? this.normalizePlanState(item.payload.plan_state) : this.createEmptyPlanState();
    if (item.payload.plan_state) {
      return base;
    }

    const noteText = this.captureNoteText(item.note);
    const mainThought = noteText || item.quote || item.compact_context || '';
    const references = item.resources.join('\n');

    return {
      ...base,
      summary: item.compact_context || noteText || item.quote || '',
      sections: base.sections.map((section) => {
        if (section.id === 'main-thought') {
          return { ...section, body: mainThought };
        }
        if (section.id === 'breakdown') {
          return { ...section, body: item.compact_context || 'Break the raw note into clearer components here.' };
        }
        if (section.id === 'possible-outputs') {
          return { ...section, body: 'Knowledge feed entry\nKanban task\nReference note' };
        }
        if (section.id === 'notes') {
          return { ...section, body: noteText || '' };
        }
        if (section.id === 'references') {
          return { ...section, body: references || item.source || 'No references captured yet.' };
        }
        return section;
      }),
      accordion_notes: [
        { id: 'source', label: 'Source', content: item.source || 'No source stored.' },
        { id: 'quote', label: 'Quote', content: item.quote || 'No quote stored.' },
        { id: 'resources', label: 'Resources', content: references || 'No resource lines stored.' },
      ],
    };
  }

  private captureDomainMeta(domain: CaptureDomain): CaptureDomainOption {
    return this.captureDomains.find((item) => item.id === domain) ?? this.captureDomains[0];
  }

  private captureHasContent(): boolean {
    return (
      this.captureDraft.title.trim().length > 0 ||
      this.captureDraft.note.trim().length > 0 ||
      this.captureDraft.quote.trim().length > 0 ||
      this.captureDraft.resourcesText.trim().length > 0
    );
  }

  private parseResourceLines(value: string): string[] {
    return Array.from(
      new Set(
        value
          .split('\n')
          .map((entry) => entry.replace(/^[-*•]\s*/, '').trim())
          .filter((entry) => entry.length > 0)
      )
    );
  }

  private compactText(value: string, max = 160): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }

    return normalized.length <= max
      ? normalized
      : `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
  }

  private buildCapturePayload(status: CaptureStatus): CapturePayloadSnapshot {
    const resources = this.parseResourceLines(this.captureDraft.resourcesText);
    const note = this.captureDraft.note.trim();
    const noteText = this.captureNoteText(note);
    const structuredTitle = this.captureNoteTitle(note);
    const titleSeed = this.captureDraft.title.trim()
      || structuredTitle
      || noteText
      || this.captureDraft.quote.trim()
      || resources[0]
      || this.captureDomainLabel(this.captureDraft.domain);
    const quote = this.captureDraft.quote.trim();
    const source = this.captureDraft.source.trim();
    const compactContext = this.compactText(
      [noteText, quote, ...resources].filter((segment) => segment.trim().length > 0).join(' '),
      180,
    );

    return {
      domain: this.captureDraft.domain,
      stage: this.captureDraft.stage,
      status,
      title: this.compactText(titleSeed, 72),
      note,
      quote,
      source,
      resources,
      compact_context: compactContext,
    };
  }

  private normalizeCaptureItem(item: CaptureItem): CaptureItem {
    const payload = this.normalizeCapturePayload(item);
    return {
      ...item,
      domain: this.normalizeCaptureDomain(item.domain),
      stage: this.normalizeCaptureStage(item.stage),
      status: this.normalizeCaptureStatus(item.status),
      resources: Array.isArray(item.resources) ? item.resources : [],
      compact_context: item.compact_context ?? '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      payload,
    };
  }

  private normalizeCapturePayload(item: Partial<CaptureItem> & { payload?: Partial<CapturePayloadSnapshot> | null }): CapturePayloadSnapshot {
    const resources = Array.isArray(item.resources) ? item.resources : [];
    const fallback = {
      domain: this.normalizeCaptureDomain(item.domain),
      stage: this.normalizeCaptureStage(item.stage),
      status: this.normalizeCaptureStatus(item.status),
      title: item.title ?? '',
      note: item.note ?? '',
      quote: item.quote ?? '',
      source: item.source ?? '',
      resources,
      compact_context: item.compact_context ?? this.compactText(
        [item.note ?? '', item.quote ?? '', ...resources].filter((segment) => segment.trim().length > 0).join(' '),
        180,
      ),
    } satisfies CapturePayloadSnapshot;
    const payload: Partial<CapturePayloadSnapshot> = item.payload ?? {};

    return {
      domain: this.normalizeCaptureDomain(payload.domain, fallback.domain),
      stage: this.normalizeCaptureStage(payload.stage, fallback.stage),
      status: this.normalizeCaptureStatus(payload.status, fallback.status),
      title: typeof payload.title === 'string' && payload.title.trim().length > 0 ? payload.title : fallback.title,
      note: typeof payload.note === 'string' ? payload.note : fallback.note,
      quote: typeof payload.quote === 'string' ? payload.quote : fallback.quote,
      source: typeof payload.source === 'string' ? payload.source : fallback.source,
      resources: Array.isArray(payload.resources) ? payload.resources.filter((entry: unknown): entry is string => typeof entry === 'string') : fallback.resources,
      compact_context: typeof payload.compact_context === 'string' ? payload.compact_context : fallback.compact_context,
      plan_state: payload.plan_state ? this.normalizePlanState(payload.plan_state) : undefined,
    };
  }

  private normalizePlanState(value: Partial<PlannerPlanState> | null | undefined): PlannerPlanState {
    if (!value) {
      return this.createEmptyPlanState();
    }

    return {
      summary: typeof value.summary === 'string' ? value.summary : '',
      sections: Array.isArray(value.sections) && value.sections.length > 0
        ? value.sections
          .filter((section): section is PlannerSection => typeof section?.title === 'string' && typeof section?.body === 'string')
          .map((section, index) => ({
            id: typeof section.id === 'string' && section.id.length > 0 ? section.id : `section-${index + 1}`,
            title: section.title,
            body: section.body,
          }))
        : PLANNER_SECTION_BLUEPRINT.map((section) => ({ ...section })),
      accordion_notes: Array.isArray(value.accordion_notes) && value.accordion_notes.length > 0
        ? value.accordion_notes.reduce<PlannerAccordionNote[]>((notes, note, index) => {
          if (typeof note?.label !== 'string' || typeof note?.content !== 'string') {
            return notes;
          }

          notes.push({
            id: typeof note.id === 'string' && note.id.length > 0 ? note.id : `note-${index + 1}`,
            label: note.label,
            content: note.content,
          });

          return notes;
        }, [])
        : PLANNER_ACCORDION_BLUEPRINT.map((note) => ({ ...note })),
      pushed_to_feed_at: typeof value.pushed_to_feed_at === 'string' ? value.pushed_to_feed_at : null,
      pushed_to_kanban_at: typeof value.pushed_to_kanban_at === 'string' ? value.pushed_to_kanban_at : null,
      kanban_task_id: typeof value.kanban_task_id === 'string' ? value.kanban_task_id : null,
      feed_item_id: typeof value.feed_item_id === 'string' ? value.feed_item_id : null,
    };
  }

  private captureDomainToTaskLane(domain: CaptureDomain): SprintTaskLane {
    switch (domain) {
      case 'quranic_concepts':
        return 'lesson';
      case 'arabic_media':
        return 'podcast';
      case 'arabic_linguistics':
      case 'worldview':
      case 'english_expression':
      default:
        return 'notes';
    }
  }

  private loadCaptureIntoDraft(item: CaptureItem): void {
    const parsedTitle = this.captureNoteTitle(item.note);
    const parsedText = this.captureNoteText(item.note);
    this.captureDraftId = item.id;
    this.captureDraft = {
      domain: item.domain,
      stage: item.stage,
      title: item.title || parsedTitle,
      note: parsedText,
      quote: item.quote,
      source: item.source,
      resourcesText: item.resources.join('\n'),
    };
    this.captureSaveState.set('idle');
    this.clearCaptureAutosaveTimer();
  }

  private sortCaptureItems(items: CaptureItem[]): CaptureItem[] {
    return [...items].sort((a, b) => {
      const left = new Date(a.updatedAt || a.createdAt).getTime();
      const right = new Date(b.updatedAt || b.createdAt).getTime();
      return right - left;
    });
  }

  private upsertCaptureItem(item: CaptureItem): void {
    this.captureItems.update((items) => {
      const index = items.findIndex((entry) => entry.id === item.id);
      if (index < 0) {
        return this.sortCaptureItems([item, ...items]);
      }

      const next = [...items];
      next[index] = item;
      return this.sortCaptureItems(next);
    });
  }

  private clearCaptureAutosaveTimer(): void {
    if (this.captureAutosaveTimer !== null) {
      window.clearTimeout(this.captureAutosaveTimer);
      this.captureAutosaveTimer = null;
    }
  }

  private captureNoteTitle(note: string): string {
    return this.extractStructuredCaptureNote(note)?.title ?? '';
  }

  private captureNoteText(note: string): string {
    return this.extractStructuredCaptureNote(note)?.text ?? note.trim();
  }

  private extractStructuredCaptureNote(note: string): { title: string; text: string } | null {
    const trimmed = note.trim();
    if (!trimmed || !/^[\[{]/.test(trimmed)) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        const text = parsed.map((entry) => this.stringifyCaptureNoteValue(entry)).filter((entry) => entry.length > 0).join('\n\n');
        return text ? { title: '', text } : null;
      }

      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const payload = parsed as Record<string, unknown>;
      const title = typeof payload['title'] === 'string' ? payload['title'].trim() : '';
      const direct = [
        payload['note'],
        payload['body_md'],
        payload['body'],
        payload['content'],
        payload['text'],
        payload['summary'],
      ]
        .map((entry) => this.stringifyCaptureNoteValue(entry))
        .find((entry) => entry.length > 0);

      if (direct) {
        return { title, text: direct };
      }

      if (Array.isArray(payload['sections'])) {
        const text = payload['sections']
          .map((section) => this.stringifyCaptureNoteValue(
            typeof section === 'object' && section && !Array.isArray(section)
              ? (section as Record<string, unknown>)['body']
                ?? (section as Record<string, unknown>)['content']
                ?? (section as Record<string, unknown>)['text']
                ?? (section as Record<string, unknown>)['summary']
                ?? section
              : section
          ))
          .filter((entry) => entry.length > 0)
          .join('\n\n');

        if (text) {
          return { title, text };
        }
      }

      const text = Object.entries(payload)
        .filter(([key]) => !['title', 'domain', 'stage', 'status', 'footnotes', 'resources', 'references', 'links'].includes(key))
        .map(([, value]) => this.stringifyCaptureNoteValue(value))
        .filter((entry) => entry.length > 0)
        .join('\n\n');

      return text ? { title, text } : null;
    } catch {
      return null;
    }
  }

  private stringifyCaptureNoteValue(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => this.stringifyCaptureNoteValue(entry))
        .filter((entry) => entry.length > 0)
        .join('\n\n');
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([, entry]) => this.stringifyCaptureNoteValue(entry))
        .filter((entry) => entry.length > 0)
        .join('\n\n');
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  }

  private async persistCaptureDraft(status: CaptureStatus): Promise<boolean> {
    this.clearCaptureAutosaveTimer();

    if (!this.captureHasContent()) {
      return false;
    }

    this.captureSaving.set(true);
    this.captureSaveState.set('saving');

    try {
      const method = this.captureDraftId ? 'PUT' : 'POST';
      const endpoint = this.captureDraftId
        ? `${environment.apiBase}/captures/${encodeURIComponent(this.captureDraftId)}`
        : `${environment.apiBase}/captures`;
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.buildCapturePayload(status)),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { ok: boolean; capture?: CaptureItem };
      if (!data.capture) {
        throw new Error('Missing capture payload');
      }

      const capture = this.normalizeCaptureItem(data.capture);
      this.captureDraftId = capture.id;
      this.upsertCaptureItem(capture);
      this.captureSaveState.set('saved');
      return true;
    } catch (error) {
      console.warn('Capture autosave failed.', error);
      this.captureSaveState.set('error');
      return false;
    } finally {
      this.captureSaving.set(false);
    }
  }

  private async persistPlanItem(item: CaptureItem, planState: PlannerPlanState): Promise<boolean> {
    this.planEditorBusy.set(true);

    try {
      const payload = {
        title: this.planEditorTitle.trim() || item.title,
        note: this.resolvePlanSectionBody(planState, 'main-thought', item.note),
        quote: item.quote,
        source: item.source,
        resources: item.resources,
        stage: item.stage,
        status: item.status,
        plan_state: planState,
      };

      const res = await fetch(`${environment.apiBase}/captures/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json() as { ok: boolean; capture?: CaptureItem };
      if (!data.capture) {
        throw new Error('Missing capture payload');
      }

      const capture = this.normalizeCaptureItem(data.capture);
      this.upsertCaptureItem(capture);
      this.planEditorTitle = capture.title;
      this.planEditorDraft = this.buildPlanStateForItem(capture);
      return true;
    } catch (error) {
      console.warn('Plan draft save failed.', error);
      return false;
    } finally {
      this.planEditorBusy.set(false);
    }
  }

  private resolvePlanSectionBody(planState: PlannerPlanState, sectionId: string, fallback: string): string {
    const section = planState.sections.find((entry) => entry.id === sectionId);
    return section?.body?.trim() || fallback;
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
      if (!root || !this.isCalendarSurfaceActive()) return;

      const stage = root.querySelector<HTMLElement>('.pl__calendar-stage');
      const toolbarItems = Array.from(
        root.querySelectorAll<HTMLElement>('.pl__calendar-toolbar > *, .pl__weekly-toolbar > *')
      );
      const stageItems = Array.from(
        root.querySelectorAll<HTMLElement>(
          '.pl__cal-day-label, .pl__cal-cell, .pl__week-day, .pl__day-card, .pl__day-empty, .pl__weekly-metric, .pl__weekly-panel, .pl__weekly-lane'
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
      if (!root || !this.isTimelineSurfaceActive()) return;

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

  private animateKanbanBoardStage(): void {
    setTimeout(() => {
      const root = this.mainRef?.nativeElement;
      if (!root || !this.isBoardSurfaceActive()) {
        return;
      }

      const items = Array.from(
        root.querySelectorAll<HTMLElement>('.pl__kanban-intro > *, .pl__col, .pl__kanban-card')
      );

      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 20, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.5,
            stagger: 0.04,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      this.bindCalendarCardTilts(root);
    }, 0);
  }

  private animateReviewStage(): void {
    setTimeout(() => {
      const root = this.mainRef?.nativeElement;
      if (!root || this.activeView() !== 'review') {
        return;
      }

      const items = Array.from(
        root.querySelectorAll<HTMLElement>('.plr__hero, .plr__metric, .plr__row, .plr__panel, .plr__save, .plr__section')
      );

      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 18, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.5,
            stagger: 0.04,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      this.clearCalendarCardTilts();
    }, 0);
  }

  private animateCaptureStage(): void {
    setTimeout(() => {
      const root = this.mainRef?.nativeElement;
      if (!root || this.activeView() !== 'capture') {
        return;
      }

      const heroItems = Array.from(root.querySelectorAll<HTMLElement>('.planner-capture__hero > *'));
      const cards = Array.from(root.querySelectorAll<HTMLElement>('.planner-capture__item'));
      const detailItems = Array.from(
        root.querySelectorAll<HTMLElement>('.planner-capture__detail-head > *, .planner-capture__section, .planner-capture__note')
      );

      if (heroItems.length > 0) {
        gsap.fromTo(
          heroItems,
          { opacity: 0, y: 20, filter: 'blur(10px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.56,
            stagger: 0.05,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 14, filter: 'blur(6px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.42,
            stagger: 0.04,
            delay: 0.1,
            ease: 'power2.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      if (detailItems.length > 0) {
        gsap.fromTo(
          detailItems,
          { opacity: 0, y: 18, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.44,
            stagger: 0.04,
            delay: 0.08,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'opacity,transform,filter',
          }
        );
      }

      this.bindCalendarCardTilts(root);
    }, 0);
  }

  private animatePlanStage(): void {
    setTimeout(() => {
      const root = this.mainRef?.nativeElement;
      if (!root || this.activeView() !== 'plan') {
        return;
      }

      const heroItems = Array.from(root.querySelectorAll<HTMLElement>('.planner-plan__hero > *'));
      const cards = Array.from(root.querySelectorAll<HTMLElement>('.planner-plan-card'));

      if (heroItems.length > 0) {
        gsap.fromTo(
          heroItems,
          { opacity: 0, y: -16, filter: 'blur(8px)' },
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

      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 28, scale: 0.98, filter: 'blur(10px)' },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.58,
            stagger: 0.05,
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

  private animateWorkspaceChange(view: ViewMode, executionView: PlannerExecutionView): void {
    if (view === 'kanban') {
      if (executionView === 'calendar') {
        this.positionCalendarModePill();
        this.animateCalendarStage();
        return;
      }

      if (executionView === 'timeline') {
        this.animateTimelineStage();
        return;
      }

      this.animateKanbanBoardStage();
      return;
    }

    if (view === 'review') {
      this.animateReviewStage();
      return;
    }

    if (view === 'capture') {
      this.animateCaptureStage();
      return;
    }

    this.animatePlanStage();
  }

  private syncPlannerShellLayout(immediate = false): void {
    const root = this.mainRef?.nativeElement;
    const panel = root?.querySelector<HTMLElement>('.planner-shell__panel');
    const surface = root?.querySelector<HTMLElement>('.planner-shell__surface');
    const inner = root?.querySelector<HTMLElement>('.planner-shell__inner');
    const strips = Array.from(root?.querySelectorAll<HTMLElement>('.planner-strip') ?? []);

    if (!root || !panel || !surface || !inner || !strips.length) {
      return;
    }

    if (this.isPlannerCompactLayout(root)) {
      this.stripLayoutReady = true;
      gsap.set(panel, { clearProps: 'x,y,width,opacity,pointerEvents' });
      gsap.set(surface, { clearProps: 'clipPath' });
      gsap.set(inner, { clearProps: 'x,y,opacity,filter' });
      if (strips.length) {
        gsap.set(strips, { clearProps: 'x,y,width,opacity,visibility,scale' });
      }
      return;
    }

    const { panelGap, panelWidth, restTargets } = this.computePlannerShellLayout(root, strips.length);

    const panelVars: gsap.TweenVars = {
      x: panelGap,
      width: panelWidth,
      opacity: 1,
      pointerEvents: 'auto',
    };
    if (!immediate) {
      panelVars['clearProps'] = 'opacity';
    }
    gsap.set(panel, panelVars);
    gsap.set(surface, { clipPath: 'inset(0 0 0 0 round 28px)' });
    gsap.set(inner, { opacity: 1, y: 0, filter: 'blur(0px)' });
    strips.forEach((strip, index) => {
      gsap.set(strip, {
        x: restTargets[index].x,
        width: restTargets[index].width,
      });
    });
    this.stripLayoutReady = true;
  }

  private computePlannerShellLayout(root: HTMLElement, stripCount: number): {
    panelGap: number;
    panelWidth: number;
    restTargets: Array<{ x: number; width: number }>;
    expandedTargets: Array<{ x: number; width: number }>;
  } {
    const width = root.clientWidth;
    const restRailWidth = this.clamp(width * 0.04, 46, 62);
    const panelGap = this.clamp(width * 0.014, 16, 24);
    const restRailClusterWidth = restRailWidth * stripCount;
    const panelWidth = Math.max(
      width - restRailClusterWidth - panelGap * 2,
      width * 0.44,
    );

    const restTargets = Array.from({ length: stripCount }, (_, index) => ({
      x: width - restRailClusterWidth + index * restRailWidth,
      width: restRailWidth,
    }));
    const expandedTargets = Array.from({ length: stripCount }, (_, index) => {
      const left = Math.round((width * index) / stripCount);
      const right = Math.round((width * (index + 1)) / stripCount);
      return {
        x: left,
        width: right - left,
      };
    });

    return { panelGap, panelWidth, restTargets, expandedTargets };
  }

  private isPlannerCompactLayout(root: HTMLElement): boolean {
    return root.clientWidth <= 960;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private animatePlannerWorkspaceContentIn(view: ViewMode): void {
    window.requestAnimationFrame(() => {
      const inner = this.mainRef?.nativeElement.querySelector<HTMLElement>('.planner-shell__inner');
      if (!inner) {
        return;
      }

      gsap.fromTo(
        inner,
        { opacity: 0, y: 16, filter: 'blur(8px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.44,
          ease: 'power2.out',
          clearProps: 'opacity,transform,filter',
        }
      );

      this.animateWorkspaceChange(view, this.executionView());
    });
  }

  private animatePlannerWorkspaceSwap(view: ViewMode): void {
    const root = this.mainRef?.nativeElement;
    const panel = root?.querySelector<HTMLElement>('.planner-shell__panel');
    const strips = Array.from(root?.querySelectorAll<HTMLElement>('.planner-strip') ?? []);
    const surface = root?.querySelector<HTMLElement>('.planner-shell__surface');
    const inner = root?.querySelector<HTMLElement>('.planner-shell__inner');
    const titles = strips
      .map((strip) => strip.querySelector<HTMLElement>('.planner-strip__title'))
      .filter((title): title is HTMLElement => !!title);
    const indices = strips
      .map((strip) => strip.querySelector<HTMLElement>('.planner-strip__index'))
      .filter((label): label is HTMLElement => !!label);
    const badges = strips
      .map((strip) => strip.querySelector<HTMLElement>('.planner-strip__badge'))
      .filter((label): label is HTMLElement => !!label);
    const subtitles = strips
      .map((strip) => strip.querySelector<HTMLElement>('.planner-strip__subtitle'))
      .filter((label): label is HTMLElement => !!label);

    if (!root || !panel || !surface || !inner || !strips.length || prefersReducedMotion()) {
      this.commitPlannerViewSwitch(view);
      this.syncPlannerShellLayout(true);
      this.animatePlannerWorkspaceContentIn(view);
      return;
    }

    if (this.isPlannerCompactLayout(root)) {
      this.commitPlannerViewSwitch(view);
      this.syncPlannerShellLayout(true);
      this.animatePlannerWorkspaceContentIn(view);
      return;
    }

    this.workspaceTransitionTimeline?.kill();
    this.workspaceTransitioning = true;

    const { panelGap, panelWidth, restTargets, expandedTargets } =
      this.computePlannerShellLayout(root, strips.length);
    const metaLabels = [...indices, ...badges, ...subtitles];

    const timeline = gsap.timeline({
      defaults: { ease: 'power4.inOut' },
      onComplete: () => {
        this.workspaceTransitioning = false;
        this.animatePlannerWorkspaceContentIn(view);
        this.pulseActivePlannerStrip();
      },
    });
    this.workspaceTransitionTimeline = timeline;

    timeline.set(
      panel,
      { x: panelGap, width: panelWidth, opacity: 1, pointerEvents: 'auto' },
      0
    );
    timeline.set(surface, { clipPath: 'inset(0 0 0 0 round 28px)' }, 0);

    timeline.to(
      inner,
      {
        opacity: 0,
        y: 12,
        filter: 'blur(6px)',
        duration: 0.22,
        ease: 'power2.in',
      },
      0
    );
    timeline.to(
      titles,
      {
        y: 30,
        opacity: 0,
        filter: 'blur(8px) brightness(0.35)',
        duration: 0.76,
        stagger: 0.05,
        ease: 'power2.in',
      },
      0
    );
    timeline.to(
      metaLabels,
      {
        y: 18,
        opacity: 0,
        filter: 'blur(5px) brightness(0.45)',
        duration: 0.68,
        stagger: 0.04,
        ease: 'power2.in',
      },
      0.08
    );

    strips.forEach((strip, index) => {
      timeline.to(
        strip,
        {
          x: expandedTargets[index].x,
          width: expandedTargets[index].width,
          duration: 0.92,
          ease: 'power2.inOut',
        },
        0
      );
      timeline.to(
        strip,
        {
          x: restTargets[index].x,
          width: restTargets[index].width,
          duration: 1.38,
          ease: 'power3.inOut',
        },
        0.98
      );
    });

    timeline.call(
      () => {
        this.commitPlannerViewSwitch(view);
      },
      undefined,
      0.98
    );
    timeline.to(
      titles,
      {
        y: 0,
        opacity: 1,
        filter: 'blur(0px) brightness(1)',
        duration: 1.02,
        stagger: 0.05,
        ease: 'power3.out',
        clearProps: 'y,opacity,filter',
      },
      1.26
    );
    timeline.to(
      metaLabels,
      {
        y: 0,
        opacity: 1,
        filter: 'blur(0px) brightness(1)',
        duration: 0.96,
        stagger: 0.04,
        ease: 'power3.out',
        clearProps: 'y,opacity,filter',
      },
      1.22
    );
  }

  private commitPlannerViewSwitch(view: ViewMode): void {
    this.activeView.set(view);

    if (view !== 'plan') {
      this.closePlanEditor();
    }

    if (
      view === 'kanban' &&
      this.executionView() === 'calendar' &&
      this.calendarMode() === 'day' &&
      this.dayPlans().length === 0
    ) {
      const firstTaskDate = this.firstCalendarTaskDate(this.plans());
      if (firstTaskDate) {
        this.focusDate.set(firstTaskDate);
      }
    }

    if (view !== 'kanban') {
      this.clearCalendarCardTilts();
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private pulseActivePlannerStrip(): void {
    if (prefersReducedMotion()) {
      return;
    }

    const activeStrip = this.mainRef?.nativeElement.querySelector<HTMLElement>('.planner-strip--active');
    if (!activeStrip) {
      return;
    }

    gsap.fromTo(
      activeStrip,
      {
        boxShadow:
          'inset 0 0 0 1px rgba(233, 212, 168, 0.18), inset 0 12px 28px rgba(255, 244, 212, 0.04), 0 0 0 rgba(0, 0, 0, 0)',
      },
      {
        boxShadow:
          'inset 0 0 0 1px rgba(233, 212, 168, 0.22), inset 0 12px 28px rgba(255, 244, 212, 0.06), 0 0 26px rgba(214, 179, 90, 0.16)',
        duration: 0.32,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out',
      }
    );
  }

  private animatePlanEditorOpen(): void {
    window.requestAnimationFrame(() => {
      const editor = document.querySelector<HTMLElement>('.planner-editor__panel');
      if (!editor) {
        return;
      }

      gsap.fromTo(
        editor,
        { opacity: 0, x: 48, scale: 0.985, filter: 'blur(12px)' },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.56,
          ease: 'power3.out',
          overwrite: 'auto',
          clearProps: 'opacity,transform,filter',
        }
      );
    });
  }

  private animateCaptureWorkspaceFocus(): void {
    window.requestAnimationFrame(() => {
      const root = this.mainRef?.nativeElement;
      if (!root || this.activeView() !== 'capture') {
        return;
      }

      const noteList = root.querySelector<HTMLElement>('.planner-capture__list-body');
      const focus = root.querySelector<HTMLElement>('.planner-capture__detail');
      const activeCards = Array.from(root.querySelectorAll<HTMLElement>('.planner-capture__item--active'));

      if (noteList) {
        gsap.fromTo(
          noteList,
          { opacity: 0.78, x: -10 },
          { opacity: 1, x: 0, duration: 0.28, ease: 'power2.out', overwrite: 'auto' }
        );
      }

      if (focus) {
        gsap.fromTo(
          focus,
          { opacity: 0.82, y: 14, filter: 'blur(8px)' },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.34,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'filter',
          }
        );
      }

      if (activeCards.length > 0) {
        gsap.fromTo(
          activeCards,
          { scale: 0.985 },
          { scale: 1, duration: 0.22, ease: 'power2.out', overwrite: 'auto' }
        );
      }

      this.bindCalendarCardTilts(root);
    });
  }

  private bindCalendarCardTilts(root: HTMLElement): void {
    this.clearCalendarCardTilts();

    const cards = Array.from(
      root.querySelectorAll<HTMLElement>(
        '.pl__cal-cell, .pl__week-card, .pl__day-card, .pl__timeline-card, .pl__capture-note-card, .pl__capture-tile, .pl__capture-recent-item, .pl__capture-focus, .planner-plan-card, .planner-capture__item, .planner-capture__section, .planner-capture__note'
      )
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
