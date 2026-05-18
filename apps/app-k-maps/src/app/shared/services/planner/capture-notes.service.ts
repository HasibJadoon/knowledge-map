import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
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
    return this.http
      .post<ApiEnvelope<CaptureNote>>(this.root, payload)
      .pipe(map((response) => response.data));
  }

  update(id: string, patch: CaptureNotePatchPayload): Observable<CaptureNote> {
    return this.http
      .patch<ApiEnvelope<CaptureNote>>(`${this.root}/${encodeURIComponent(id)}`, patch)
      .pipe(map((response) => response.data));
  }

  archive(id: string): Observable<CaptureNote> {
    return this.http
      .post<ApiEnvelope<CaptureNote>>(`${this.root}/${encodeURIComponent(id)}/archive`, {})
      .pipe(map((response) => response.data));
  }
}
