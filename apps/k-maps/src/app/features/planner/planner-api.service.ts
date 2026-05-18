// ─── PlannerApiService — rich km-planner-worker adapter ──────────────────────
// Single integration point for the planner feature. Targets the planner
// gateway routes (/api/pl/...) and unwraps the { ok, data } envelope.

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiEnvelope,
  Lane,
  PaginatedEnvelope,
  Plan,
  PlanCreatePayload,
  PlanPatchPayload,
  PlanStatus,
  PlanTask,
  TaskCreatePayload,
  TaskPatchPayload,
  TaskStatus,
} from './planner.models';

@Injectable({ providedIn: 'root' })
export class PlannerApiService {
  private readonly http = inject(HttpClient);
  private readonly root = `${environment.apiBase}/pl`;

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
}
