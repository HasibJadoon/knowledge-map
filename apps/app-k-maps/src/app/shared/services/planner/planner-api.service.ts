import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  ApiEnvelope,
  Lane,
  PaginatedEnvelope,
  Plan,
  PlanCreatePayload,
  PlanStatus,
  PlanTask,
  TaskCreatePayload,
  TaskStatus,
} from '../../models/planner/plan.models';
import {
  CalendarEntry,
  CalendarEntryCreatePayload,
  Goal,
  GoalCreatePayload,
  GoalPatchPayload,
} from '../../models/planner/planner-extras.models';
import { resolveApiRoot } from './api-root.util';

export interface PlanPatchPayload {
  title?: string;
  plan_type?: Plan['plan_type'];
  description_md?: string | null;
  status?: PlanStatus;
  priority?: Plan['priority'];
  start_date?: string | null;
  target_end_date?: string | null;
  meta_json?: string | null;
}

export interface TaskPatchPayload {
  title?: string;
  task_type?: PlanTask['task_type'];
  description_md?: string | null;
  status?: TaskStatus;
  priority?: PlanTask['priority'];
  due_date?: string | null;
  estimated_mins?: number | null;
  actual_mins?: number | null;
  sort_order?: number;
}

/** HTTP client for the rich km-planner-worker API (gateway path /api/pl/*). */
@Injectable({ providedIn: 'root' })
export class PlannerApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${resolveApiRoot()}/pl`;

  // ── Plans ───────────────────────────────────────────────────────────────────

  listPlans(options: { status?: PlanStatus | null } = {}): Observable<Plan[]> {
    let params = new HttpParams().set('per_page', '100');
    if (options.status) {
      params = params.set('status', options.status);
    }
    return this.http
      .get<PaginatedEnvelope<Plan>>(`${this.root}/plans`, { params })
      .pipe(map((response) => response.data ?? []));
  }

  getPlan(planId: string): Observable<Plan> {
    return this.http
      .get<ApiEnvelope<Plan>>(`${this.root}/plans/${encodeURIComponent(planId)}`)
      .pipe(map((response) => response.data));
  }

  createPlan(payload: PlanCreatePayload): Observable<Plan> {
    return this.http
      .post<ApiEnvelope<Plan>>(`${this.root}/plans`, payload)
      .pipe(map((response) => response.data));
  }

  patchPlan(planId: string, patch: PlanPatchPayload): Observable<Plan> {
    return this.http
      .patch<ApiEnvelope<Plan>>(`${this.root}/plans/${encodeURIComponent(planId)}`, patch)
      .pipe(map((response) => response.data));
  }

  setPlanStatus(planId: string, status: PlanStatus): Observable<Plan> {
    return this.http
      .patch<ApiEnvelope<Plan>>(`${this.root}/plans/${encodeURIComponent(planId)}/status`, { status })
      .pipe(map((response) => response.data));
  }

  getPlanTasks(planId: string): Observable<PlanTask[]> {
    const params = new HttpParams().set('per_page', '200');
    return this.http
      .get<PaginatedEnvelope<PlanTask>>(`${this.root}/plans/${encodeURIComponent(planId)}/tasks`, { params })
      .pipe(map((response) => response.data ?? []));
  }

  // ── Lanes ───────────────────────────────────────────────────────────────────

  getPlanLanes(planId: string): Observable<Lane[]> {
    return this.http
      .get<ApiEnvelope<Lane[]>>(`${this.root}/plans/${encodeURIComponent(planId)}/lanes`)
      .pipe(map((response) => response.data ?? []));
  }

  // ── Tasks ───────────────────────────────────────────────────────────────────

  listTasks(options: { status?: TaskStatus; planId?: string; dueBefore?: string } = {}): Observable<PlanTask[]> {
    let params = new HttpParams().set('per_page', '200');
    if (options.status) {
      params = params.set('status', options.status);
    }
    if (options.planId) {
      params = params.set('plan', options.planId);
    }
    if (options.dueBefore) {
      params = params.set('due_before', options.dueBefore);
    }
    return this.http
      .get<PaginatedEnvelope<PlanTask>>(`${this.root}/tasks`, { params })
      .pipe(map((response) => response.data ?? []));
  }

  getTask(taskId: string): Observable<PlanTask> {
    return this.http
      .get<ApiEnvelope<PlanTask>>(`${this.root}/tasks/${encodeURIComponent(taskId)}`)
      .pipe(map((response) => response.data));
  }

  createTask(payload: TaskCreatePayload): Observable<PlanTask> {
    return this.http
      .post<ApiEnvelope<PlanTask>>(`${this.root}/tasks`, payload)
      .pipe(map((response) => response.data));
  }

  patchTask(taskId: string, patch: TaskPatchPayload): Observable<PlanTask> {
    return this.http
      .patch<ApiEnvelope<PlanTask>>(`${this.root}/tasks/${encodeURIComponent(taskId)}`, patch)
      .pipe(map((response) => response.data));
  }

  completeTask(taskId: string): Observable<PlanTask> {
    return this.http
      .patch<ApiEnvelope<PlanTask>>(`${this.root}/tasks/${encodeURIComponent(taskId)}/complete`, {})
      .pipe(map((response) => response.data));
  }

  // ── Review ──────────────────────────────────────────────────────────────────

  reviewDue(limit = 50): Observable<PlanTask[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http
      .get<ApiEnvelope<PlanTask[]>>(`${this.root}/review/due`, { params })
      .pipe(map((response) => response.data ?? []));
  }

  reviewFeedback(taskId: string, quality: number): Observable<unknown> {
    return this.http
      .post<ApiEnvelope<unknown>>(`${this.root}/review/feedback`, { task_id: taskId, quality })
      .pipe(map((response) => response.data));
  }

  // ── Goals ───────────────────────────────────────────────────────────────────

  listGoals(): Observable<Goal[]> {
    const params = new HttpParams().set('per_page', '100');
    return this.http
      .get<PaginatedEnvelope<Goal>>(`${this.root}/goals`, { params })
      .pipe(map((response) => response.data ?? []));
  }

  createGoal(payload: GoalCreatePayload): Observable<Goal> {
    return this.http
      .post<ApiEnvelope<Goal>>(`${this.root}/goals`, payload)
      .pipe(map((response) => response.data));
  }

  patchGoal(goalId: string, patch: GoalPatchPayload): Observable<Goal> {
    return this.http
      .patch<ApiEnvelope<Goal>>(`${this.root}/goals/${encodeURIComponent(goalId)}`, patch)
      .pipe(map((response) => response.data));
  }

  updateGoalValue(goalId: string, value: number): Observable<Goal> {
    return this.http
      .patch<ApiEnvelope<Goal>>(`${this.root}/goals/${encodeURIComponent(goalId)}/value`, { value })
      .pipe(map((response) => response.data));
  }

  // ── Calendar ────────────────────────────────────────────────────────────────

  listCalendar(range: { start?: string; end?: string } = {}): Observable<CalendarEntry[]> {
    let params = new HttpParams();
    if (range.start) {
      params = params.set('start', range.start);
    }
    if (range.end) {
      params = params.set('end', range.end);
    }
    return this.http
      .get<ApiEnvelope<CalendarEntry[]>>(`${this.root}/calendar`, { params })
      .pipe(map((response) => response.data ?? []));
  }

  createCalendarEntry(payload: CalendarEntryCreatePayload): Observable<CalendarEntry> {
    return this.http
      .post<ApiEnvelope<CalendarEntry>>(`${this.root}/calendar`, payload)
      .pipe(map((response) => response.data));
  }

  completeCalendarEntry(entryId: string): Observable<CalendarEntry> {
    return this.http
      .patch<ApiEnvelope<CalendarEntry>>(`${this.root}/calendar/${encodeURIComponent(entryId)}/complete`, {})
      .pipe(map((response) => response.data));
  }
}
