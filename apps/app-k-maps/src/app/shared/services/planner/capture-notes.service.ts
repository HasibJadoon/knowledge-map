import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { defer, finalize, map, Observable } from 'rxjs';
import { ApiEnvelope } from '../../models/planner/plan.models';
import {
  CaptureNote,
  CaptureNoteCreatePayload,
  CaptureNotePatchPayload,
  CaptureNoteStatus,
} from '../../models/planner/planner-extras.models';
import { resolveApiRoot } from './api-root.util';

/** HTTP client for the planner capture notes API (gateway path /api/pl/captures). */
@Injectable({ providedIn: 'root' })
export class CaptureNotesService {
  private readonly http = inject(HttpClient);
  private readonly root = `${resolveApiRoot()}/pl/captures`;

  // ── In-flight write tracker ─────────────────────────────────────────────────
  // When the editor autosaves and the user immediately swipes back, the POST
  // can still be in flight while the capture list's ionViewWillEnter calls
  // list() — the list then renders before the note has landed. Pages that
  // read captures should await whenIdle() so they see the freshly-saved row.
  private pendingWrites = 0;
  private idleResolvers: Array<() => void> = [];

  list(status: CaptureNoteStatus = 'inbox', limit = 50): Observable<CaptureNote[]> {
    const params = new HttpParams().set('status', status).set('limit', String(limit));
    return this.http
      .get<ApiEnvelope<CaptureNote[]>>(this.root, { params })
      .pipe(map((response) => response.data ?? []));
  }

  get(id: string): Observable<CaptureNote> {
    return this.http
      .get<ApiEnvelope<CaptureNote>>(`${this.root}/${encodeURIComponent(id)}`)
      .pipe(map((response) => response.data));
  }

  create(payload: CaptureNoteCreatePayload): Observable<CaptureNote> {
    return this.trackWrite(
      this.http
        .post<ApiEnvelope<CaptureNote>>(this.root, payload)
        .pipe(map((response) => response.data)),
    );
  }

  update(id: string, patch: CaptureNotePatchPayload): Observable<CaptureNote> {
    return this.trackWrite(
      this.http
        .patch<ApiEnvelope<CaptureNote>>(`${this.root}/${encodeURIComponent(id)}`, patch)
        .pipe(map((response) => response.data)),
    );
  }

  archive(id: string): Observable<CaptureNote> {
    return this.trackWrite(
      this.http
        .post<ApiEnvelope<CaptureNote>>(`${this.root}/${encodeURIComponent(id)}/archive`, {})
        .pipe(map((response) => response.data)),
    );
  }

  /** Resolves once every in-flight create/update/archive request has settled. */
  whenIdle(): Promise<void> {
    if (this.pendingWrites === 0) return Promise.resolve();
    return new Promise((resolve) => this.idleResolvers.push(resolve));
  }

  private trackWrite<T>(source: Observable<T>): Observable<T> {
    return defer(() => {
      this.pendingWrites++;
      return source.pipe(finalize(() => this.onWriteSettled()));
    });
  }

  private onWriteSettled(): void {
    this.pendingWrites = Math.max(0, this.pendingWrites - 1);
    if (this.pendingWrites > 0) return;
    const resolvers = this.idleResolvers;
    this.idleResolvers = [];
    for (const resolve of resolvers) resolve();
  }
}
