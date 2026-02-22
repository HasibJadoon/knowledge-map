import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  CaptureNote,
  CaptureNoteMeta,
  LessonPickerItem,
  PlannerLane,
  PlannerPriority,
  PlannerTask,
  PlannerTaskRow,
  PlannerTaskStatus,
  PlannerWeekPlan,
  PlannerWeekResponse,
  PlannerWeekSummary,
  UserFocusState,
} from '../../models/sprint.models';
import { CaptureNotesService } from '../../services/capture-notes.service';
import { LessonsService } from '../../services/lessons.service';
import { PlannerService } from '../../services/planner.service';
import { UserStateService } from '../../services/user-state.service';
import { computeWeekStartSydney, formatWeekRangeLabel } from '../../utils/week-start.util';

type BoardStatus = 'planned' | 'doing' | 'done';

type PlanWeekAssignments = {
  lesson_1: { ar_lesson_id: number | null; unit_id: string | null };
  lesson_2: { ar_lesson_id: number | null; unit_id: string | null };
  podcast_1: { topic: string; episode_no: number | null; recording_at: string | null };
  podcast_2: { topic: string; episode_no: number | null; recording_at: string | null };
  podcast_3: { topic: string; episode_no: number | null; recording_at: string | null };
};

@Component({
  selector: 'app-sprint-week-board-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './sprint-week-board.page.html',
  styleUrl: './sprint-week-board.page.scss',
})
export class SprintWeekBoardPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly planner = inject(PlannerService);
  private readonly captureNotes = inject(CaptureNotesService);
  private readonly userState = inject(UserStateService);
  private readonly lessonsService = inject(LessonsService);

  readonly weekStart = signal<string>(computeWeekStartSydney());
  readonly weekPlan = signal<PlannerWeekPlan | null>(null);
  readonly tasks = signal<PlannerTaskRow[]>([]);
  readonly summary = signal<PlannerWeekSummary>({
    tasks_done: 0,
    tasks_total: 0,
    minutes_spent: 0,
    inbox_count: 0,
    capture_notes: 0,
    promoted_notes: 0,
  });
  readonly focusState = signal<UserFocusState | null>(null);
  readonly inboxNotes = signal<CaptureNote[]>([]);
  readonly lessonOptions = signal<LessonPickerItem[]>([]);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly planningModalOpen = signal(false);

  readonly quickCaptureControl = new FormControl('', { nonNullable: true });
  readonly quickTaskControl = new FormControl('', { nonNullable: true });
  readonly checklistInputControl = new FormControl('', { nonNullable: true });

  readonly drawerOpen = signal(false);
  readonly selectedTaskId = signal<string | null>(null);

  readonly lanes: PlannerLane[] = ['lesson', 'podcast', 'notes', 'admin'];
  readonly priorities: PlannerPriority[] = ['P1', 'P2', 'P3'];
  readonly statuses: PlannerTaskStatus[] = ['planned', 'doing', 'done', 'blocked', 'skipped'];
  readonly boardColumns: ReadonlyArray<{ key: BoardStatus; label: string }> = [
    { key: 'planned', label: 'To Do' },
    { key: 'doing', label: 'Doing' },
    { key: 'done', label: 'Done' },
  ];
  readonly noteTypes: ReadonlyArray<string> = [
    'lesson_note',
    'podcast_note',
    'grammar',
    'morphology',
    'reflection',
    'idea',
  ];

  readonly weekRangeLabel = computed(() => formatWeekRangeLabel(this.weekStart()));

  readonly lessonAnchorDone = computed(() => this.countAnchorDone('lesson'));
  readonly podcastAnchorDone = computed(() => this.countAnchorDone('podcast'));

  readonly targetMinutes = computed(() => {
    const budget = this.weekPlan()?.time_budget;
    if (!budget) {
      return 0;
    }
    return budget.lesson_min + budget.podcast_min + budget.review_min;
  });

  readonly completionPct = computed(() => {
    const current = this.summary();
    if (!current.tasks_total) {
      return 0;
    }
    return Math.min(100, Math.round((current.tasks_done / current.tasks_total) * 100));
  });

  readonly minutesPct = computed(() => {
    const target = this.targetMinutes();
    if (!target) {
      return 0;
    }
    return Math.min(100, Math.round((this.summary().minutes_spent / target) * 100));
  });

  readonly nextLessonAnchor = computed(() => this.nextAnchor('lesson'));
  readonly nextPodcastAnchor = computed(() => this.nextAnchor('podcast'));

  taskDraft: PlannerTask | null = null;
  taskRelatedType = '';
  taskRelatedId = '';
  taskSource: PlannerTaskRow | null = null;
  searchQuery = '';

  promoteTypeByNoteId: Record<string, string> = {};
  planDraft: PlanWeekAssignments = createPlanWeekDraft();

  constructor() {
    this.route.paramMap.subscribe((params) => {
      void this.loadFromParams(params);
    });
  }

  tasksFor(status: BoardStatus, lane: PlannerLane): PlannerTaskRow[] {
    return this.tasks()
      .filter((task) =>
        task.item_json.lane === lane &&
        this.toBoardStatus(task.item_json.status) === status &&
        this.matchesTaskSearch(task)
      )
      .sort((a, b) => {
        const orderA = typeof a.item_json.order_index === 'number' ? a.item_json.order_index : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.item_json.order_index === 'number' ? b.item_json.order_index : Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        const updatedA = new Date(a.updated_at ?? a.created_at).getTime();
        const updatedB = new Date(b.updated_at ?? b.created_at).getTime();
        return updatedB - updatedA;
      });
  }

  laneCount(status: BoardStatus, lane: PlannerLane): number {
    return this.tasksFor(status, lane).length;
  }

  columnCount(status: BoardStatus): number {
    return this.tasks().filter((task) => this.toBoardStatus(task.item_json.status) === status && this.matchesTaskSearch(task)).length;
  }

  filteredTaskCount(): number {
    return this.tasks().filter((task) => this.matchesTaskSearch(task)).length;
  }

  boardDropListId(status: BoardStatus, lane: PlannerLane): string {
    return `drop-${status}-${lane}`;
  }

  connectedDropListsForLane(lane: PlannerLane): string[] {
    return this.boardColumns.map((column) => this.boardDropListId(column.key, lane));
  }

  async onTaskDrop(event: CdkDragDrop<PlannerTaskRow[]>, status: BoardStatus, lane: PlannerLane): Promise<void> {
    const source = event.previousContainer.data;
    const destination = event.container.data;
    if (!source || !destination) {
      return;
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(destination, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(source, destination, event.previousIndex, event.currentIndex);
    }

    const movedTask = destination[event.currentIndex];
    if (!movedTask) {
      return;
    }

    const nextStatus = status;
    const nextOrder = (event.currentIndex + 1) * 100;
    const currentStatus = this.toBoardStatus(movedTask.item_json.status);
    if (currentStatus === nextStatus && movedTask.item_json.order_index === nextOrder) {
      return;
    }

    const patched: PlannerTask = {
      ...movedTask.item_json,
      lane,
      status: nextStatus,
      order_index: nextOrder,
    };

    await this.saveExistingTask(movedTask, patched, movedTask.related_type, movedTask.related_id);
  }

  openTask(task: PlannerTaskRow): void {
    this.taskSource = task;
    this.selectedTaskId.set(task.id);
    this.taskDraft = structuredClone(task.item_json);
    this.taskRelatedType = task.related_type ?? '';
    this.taskRelatedId = task.related_id ?? '';
    this.checklistInputControl.setValue('', { emitEvent: false });
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedTaskId.set(null);
    this.taskSource = null;
    this.taskDraft = null;
    this.taskRelatedType = '';
    this.taskRelatedId = '';
  }

  startCreateTask(): void {
    const title = this.quickTaskControl.value.trim() || 'New task';
    this.taskSource = null;
    this.selectedTaskId.set(null);
    this.taskDraft = createTaskTemplate(title, this.weekStart());
    this.taskRelatedType = '';
    this.taskRelatedId = '';
    this.checklistInputControl.setValue('', { emitEvent: false });
    this.drawerOpen.set(true);
    this.quickTaskControl.setValue('', { emitEvent: false });
  }

  addChecklistItem(): void {
    if (!this.taskDraft) {
      return;
    }
    const label = this.checklistInputControl.value.trim();
    if (!label) {
      return;
    }

    this.taskDraft = {
      ...this.taskDraft,
      checklist: [
        ...this.taskDraft.checklist,
        { id: `c${Date.now()}`, label, done: false },
      ],
    };
    this.checklistInputControl.setValue('', { emitEvent: false });
  }

  removeChecklistItem(itemId: string): void {
    if (!this.taskDraft) {
      return;
    }

    this.taskDraft = {
      ...this.taskDraft,
      checklist: this.taskDraft.checklist.filter((item) => item.id !== itemId),
    };
  }

  async saveDraft(): Promise<void> {
    if (!this.taskDraft) {
      return;
    }

    const draft = {
      ...this.taskDraft,
      title: this.taskDraft.title.trim() || 'Untitled task',
      order_index: this.taskDraft.order_index ?? Date.now(),
    };

    if (this.taskSource) {
      await this.saveExistingTask(this.taskSource, draft, this.taskRelatedType || null, this.taskRelatedId || null);
      this.closeDrawer();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const row = await firstValueFrom(
        this.planner.createTask({
          week_start: this.weekStart(),
          related_type: this.taskRelatedType || null,
          related_id: this.taskRelatedId || null,
          item_json: draft,
        })
      );
      this.tasks.update((items) => [row, ...items]);
      this.recomputeSummary();
      this.openTask(row);
    } catch {
      this.error.set('Could not create task.');
    } finally {
      this.saving.set(false);
    }
  }

  async markDone(task: PlannerTaskRow): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.planner.completeTask(task.id, {
          actual_min: task.item_json.actual_min ?? task.item_json.estimate_min,
        })
      );
      this.replaceTask(response.task);
      await this.loadInbox();
      this.recomputeSummary();
    } catch {
      this.error.set('Could not complete task.');
    } finally {
      this.saving.set(false);
    }
  }

  async startTask(task: PlannerTaskRow): Promise<void> {
    const next: PlannerTask = {
      ...task.item_json,
      status: 'doing',
    };
    await this.saveExistingTask(task, next, task.related_type, task.related_id);
    this.openTask(task);
  }

  async captureQuickNote(): Promise<void> {
    const text = this.quickCaptureControl.value.trim();
    if (!text) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const meta: CaptureNoteMeta = {
        schema_version: 1,
        kind: 'capture',
        week_start: this.weekStart(),
        source: 'weekly',
        related_type: 'sp_weekly_plans',
        related_id: this.weekStart(),
      };

      await firstValueFrom(
        this.captureNotes.create({
          text,
          title: summarizeTitle(text),
          meta,
        })
      );

      this.quickCaptureControl.setValue('', { emitEvent: false });
      await this.loadInbox();
      this.summary.update((current) => ({
        ...current,
        capture_notes: current.capture_notes + 1,
      }));
    } catch {
      this.error.set('Could not capture note.');
    } finally {
      this.saving.set(false);
    }
  }

  promoteTypeFor(note: CaptureNote): string {
    return this.promoteTypeByNoteId[note.id] ?? 'reflection';
  }

  setPromoteType(noteId: string, value: string): void {
    this.promoteTypeByNoteId = {
      ...this.promoteTypeByNoteId,
      [noteId]: value,
    };
  }

  async promoteNote(note: CaptureNote): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.captureNotes.promote(note.id, {
          note_type: this.promoteTypeFor(note),
        })
      );
      await this.loadInbox();
      this.summary.update((current) => ({
        ...current,
        promoted_notes: current.promoted_notes + 1,
      }));
    } catch {
      this.error.set('Could not promote note.');
    } finally {
      this.saving.set(false);
    }
  }

  async archiveNote(note: CaptureNote): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.captureNotes.archive(note.id));
      await this.loadInbox();
    } catch {
      this.error.set('Could not archive note.');
    } finally {
      this.saving.set(false);
    }
  }

  async startFocus(task: PlannerTaskRow): Promise<void> {
    const updated = {
      ...task.item_json,
      status: task.item_json.status === 'done' ? 'done' : 'doing',
    } satisfies PlannerTask;

    await this.saveExistingTask(task, updated, task.related_type, task.related_id);
    await this.setFocusFromTask(task);
    this.openTask(task);
  }

  async setFocusFromTask(task: PlannerTaskRow): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const focus = await firstValueFrom(this.userState.updateState({
        current_type: task.related_type ?? 'sp_weekly_tasks',
        current_id: task.related_id ?? task.id,
        focus_mode: task.item_json.lane === 'podcast' ? 'producing' : 'studying',
      }));
      this.focusState.set(focus);
    } catch {
      this.error.set('Could not update focus.');
    } finally {
      this.saving.set(false);
    }
  }

  goToReview(): void {
    void this.router.navigate(['/review', this.weekStart()]);
  }

  openRelated(task: PlannerTaskRow): void {
    if (!task.related_id) {
      return;
    }

    if (task.related_type === 'wv_content_item') {
      void this.router.navigate(['/podcast', task.related_id]);
      return;
    }

    if (task.related_type === 'ar_lesson') {
      void this.router.navigate(['/lesson', task.related_id]);
      return;
    }
  }

  openPlanningModal(): void {
    this.seedPlanDraft();
    this.planningModalOpen.set(true);
    void this.ensureLessonOptions();
  }

  async saveWeekPlan(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.planner.planWeek({
          week_start: this.weekStart(),
          planning_state: {
            is_planned: true,
          },
          assignments: {
            lesson_1: this.planDraft.lesson_1,
            lesson_2: this.planDraft.lesson_2,
            podcast_1: this.planDraft.podcast_1,
            podcast_2: this.planDraft.podcast_2,
            podcast_3: this.planDraft.podcast_3,
          },
        })
      );

      this.applyWeekResponse(response);
      this.planningModalOpen.set(false);
    } catch {
      this.error.set('Could not save week plan.');
    } finally {
      this.saving.set(false);
    }
  }

  async deferPlanToLater(): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      const response = await firstValueFrom(
        this.planner.planWeek({
          week_start: this.weekStart(),
          later_today: true,
          planning_state: {
            is_planned: false,
          },
        })
      );
      this.applyWeekResponse(response);
      this.planningModalOpen.set(false);
    } catch {
      this.error.set('Could not defer week planning.');
    } finally {
      this.saving.set(false);
    }
  }

  private async loadWeek(weekStart: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const week = await firstValueFrom(this.planner.ensureWeekAnchors(weekStart));
      this.applyWeekResponse(week);

      await Promise.all([this.loadInbox(), this.loadFocusState()]);
      await this.ensureLessonOptions();
      this.refreshPlanningGate();
    } catch {
      this.error.set('Could not load week board.');
    } finally {
      this.loading.set(false);
    }
  }

  private applyWeekResponse(week: PlannerWeekResponse): void {
    this.weekStart.set(week.week_start);
    this.weekPlan.set(week.weekPlan?.item_json ?? null);
    this.tasks.set(week.tasks);
    this.summary.set(week.summary);
    this.recomputeSummary();
  }

  private refreshPlanningGate(): void {
    const plan = this.weekPlan();
    if (!plan) {
      this.planningModalOpen.set(false);
      return;
    }

    const planning = plan.planning_state;
    const now = Date.now();
    const deferAt = planning.defer_until ? new Date(planning.defer_until).getTime() : null;
    const shouldPrompt = !planning.is_planned && (deferAt === null || Number.isNaN(deferAt) || now >= deferAt);
    if (shouldPrompt) {
      this.seedPlanDraft();
    }
    this.planningModalOpen.set(shouldPrompt);
  }

  private seedPlanDraft(): void {
    const draft = createPlanWeekDraft();
    for (const task of this.tasks()) {
      const key = task.item_json.meta.anchor_key;
      if (!key) {
        continue;
      }

      if (key === 'lesson_1' || key === 'lesson_2') {
        draft[key] = {
          ar_lesson_id: task.item_json.assignment.ar_lesson_id,
          unit_id: task.item_json.assignment.unit_id,
        };
        continue;
      }

      draft[key] = {
        topic: task.item_json.assignment.topic ?? '',
        episode_no: task.item_json.assignment.episode_no,
        recording_at: task.item_json.assignment.recording_at,
      };
    }

    this.planDraft = draft;
  }

  private async ensureLessonOptions(): Promise<void> {
    if (this.lessonOptions().length > 0) {
      return;
    }

    try {
      const lessons = await firstValueFrom(this.lessonsService.list('', 100));
      this.lessonOptions.set(lessons);
    } catch {
      this.lessonOptions.set([]);
    }
  }

  private async saveExistingTask(
    row: PlannerTaskRow,
    itemJson: PlannerTask,
    relatedType: string | null,
    relatedId: string | null
  ): Promise<void> {
    this.saving.set(true);
    this.error.set(null);

    try {
      const updated = await firstValueFrom(
        this.planner.updateTask(row.id, {
          related_type: relatedType,
          related_id: relatedId,
          item_json: itemJson,
        })
      );
      this.replaceTask(updated);
      this.recomputeSummary();

      if (this.selectedTaskId() === row.id) {
        this.openTask(updated);
      }
    } catch {
      this.error.set('Could not save task.');
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

  private recomputeSummary(): void {
    const tasks = this.tasks();
    let done = 0;
    let minutes = 0;
    for (const task of tasks) {
      if (this.toBoardStatus(task.item_json.status) === 'done') {
        done += 1;
      }
      if (typeof task.item_json.actual_min === 'number' && Number.isFinite(task.item_json.actual_min)) {
        minutes += task.item_json.actual_min;
      }
    }

    this.summary.update((current) => ({
      ...current,
      tasks_done: done,
      tasks_total: tasks.length,
      minutes_spent: minutes,
    }));
  }

  private async loadInbox(): Promise<void> {
    try {
      const notes = await firstValueFrom(this.captureNotes.list('inbox', 10));
      this.inboxNotes.set(notes);
      this.summary.update((current) => ({
        ...current,
        inbox_count: notes.length,
      }));
    } catch {
      this.inboxNotes.set([]);
    }
  }

  private async loadFocusState(): Promise<void> {
    try {
      const state = await firstValueFrom(this.userState.getState());
      this.focusState.set(state);
    } catch {
      this.focusState.set(null);
    }
  }

  private async loadFromParams(params: ParamMap): Promise<void> {
    const taskId = params.get('taskId');
    if (taskId) {
      try {
        const task = await firstValueFrom(this.planner.getTask(taskId));
        const week = computeWeekStartSydney(task.week_start ?? computeWeekStartSydney());
        this.weekStart.set(week);
        await this.loadWeek(week);
        const target = this.tasks().find((item) => item.id === taskId);
        if (target) {
          this.openTask(target);
        }
        return;
      } catch {
        this.error.set('Could not open linked task.');
      }
    }

    const weekStart = params.get('weekStart') || computeWeekStartSydney();
    const normalized = computeWeekStartSydney(weekStart);
    this.weekStart.set(normalized);
    await this.loadWeek(normalized);
  }

  private toBoardStatus(status: PlannerTaskStatus): BoardStatus {
    if (status === 'done') {
      return 'done';
    }
    if (status === 'doing' || status === 'blocked') {
      return 'doing';
    }
    return 'planned';
  }

  private countAnchorDone(lane: 'lesson' | 'podcast'): number {
    return this.tasks().filter((task) => task.item_json.anchor && task.item_json.lane === lane && this.toBoardStatus(task.item_json.status) === 'done').length;
  }

  private nextAnchor(lane: 'lesson' | 'podcast'): PlannerTaskRow | null {
    const pending = this.tasks()
      .filter((task) => task.item_json.lane === lane)
      .filter((task) => {
        const status = this.toBoardStatus(task.item_json.status);
        return status === 'planned' || status === 'doing';
      })
      .sort((a, b) => {
        const orderA = typeof a.item_json.order_index === 'number' ? a.item_json.order_index : Number.MAX_SAFE_INTEGER;
        const orderB = typeof b.item_json.order_index === 'number' ? b.item_json.order_index : Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
    return pending.length > 0 ? pending[0] : null;
  }

  private matchesTaskSearch(task: PlannerTaskRow): boolean {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return true;
    }

    const searchText = [
      task.item_json.title,
      task.item_json.note,
      task.item_json.lane,
      task.item_json.priority,
      task.item_json.status,
      task.item_json.assignment.topic,
      task.item_json.assignment.unit_id,
      task.related_type,
      task.related_id,
    ]
      .map((part) => (part ?? '').toString().toLowerCase())
      .join(' ');

    return searchText.includes(query);
  }

  lessonLabel(lessonId: number | null): string {
    if (lessonId === null) {
      return 'Not assigned';
    }
    const item = this.lessonOptions().find((lesson) => lesson.id === lessonId);
    return item ? item.title : `Lesson #${lessonId}`;
  }

  assignmentSummary(task: PlannerTaskRow): string {
    if (task.item_json.lane === 'lesson') {
      return `Lesson: ${this.lessonLabel(task.item_json.assignment.ar_lesson_id)}`;
    }

    if (task.item_json.lane === 'podcast') {
      const topic = task.item_json.assignment.topic?.trim();
      if (topic) {
        return `Topic: ${topic}`;
      }
      return 'Topic: Not assigned';
    }

    return task.related_type && task.related_id
      ? `${task.related_type} ${task.related_id}`
      : 'No linked target';
  }
}

function createTaskTemplate(title: string, weekStart: string): PlannerTask {
  return {
    schema_version: 1,
    lane: 'lesson',
    anchor: false,
    title,
    priority: 'P2',
    status: 'planned',
    estimate_min: 30,
    actual_min: null,
    assignment: {
      kind: 'none',
      ar_lesson_id: null,
      unit_id: null,
      topic: null,
      episode_no: null,
      recording_at: null,
    },
    tags: [],
    checklist: [],
    note: '',
    links: [],
    capture_on_done: {
      create_capture_note: true,
      template: 'What did I learn? What confused me? One next step.',
    },
    meta: {
      anchor_key: null,
      week_start: weekStart,
    },
    order_index: Date.now(),
  };
}

function summarizeTitle(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return 'Capture note';
  }
  if (compact.length <= 60) {
    return compact;
  }
  return `${compact.slice(0, 57).trimEnd()}...`;
}

function createPlanWeekDraft(): PlanWeekAssignments {
  return {
    lesson_1: { ar_lesson_id: null, unit_id: null },
    lesson_2: { ar_lesson_id: null, unit_id: null },
    podcast_1: { topic: '', episode_no: 1, recording_at: null },
    podcast_2: { topic: '', episode_no: 2, recording_at: null },
    podcast_3: { topic: '', episode_no: 3, recording_at: null },
  };
}
