import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CaptureNote, CaptureNoteMeta, PromotionRequest } from '../models/sprint.models';
import { resolveApiRoot } from './api-root.util';

@Injectable({ providedIn: 'root' })
export class CaptureNotesService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = resolveApiRoot();

  list(status: 'inbox' | 'archived' = 'inbox', limit = 50): Observable<CaptureNote[]> {
    const params = new HttpParams()
      .set('status', status)
      .set('limit', String(limit));

    return this.http.get<{ ok: boolean; notes: CaptureNote[] }>(`${this.apiRoot}/notes/capture`, { params }).pipe(
      map((response) => response.notes ?? [])
    );
  }

  create(args: {
    text: string;
    title?: string | null;
    status?: 'inbox' | 'archived';
    meta: CaptureNoteMeta;
  }): Observable<CaptureNote> {
    return this.http.post<{ ok: boolean; note: CaptureNote }>(`${this.apiRoot}/notes/capture`, {
      title: args.title ?? null,
      status: args.status ?? 'inbox',
      text: args.text,
      meta: args.meta,
    }).pipe(map((response) => response.note));
  }

  promote(captureId: string, payload: PromotionRequest): Observable<{
    note: Record<string, unknown> | null;
    targets: Array<Record<string, unknown>>;
  }> {
    return this.http.post<{
      ok: boolean;
      note: Record<string, unknown> | null;
      targets: Array<Record<string, unknown>>;
    }>(`${this.apiRoot}/notes/capture/${encodeURIComponent(captureId)}/promote`, payload).pipe(
      map((response) => ({
        note: response.note,
        targets: response.targets ?? [],
      }))
    );
  }

  archive(captureId: string): Observable<CaptureNote> {
    return this.http.post<{ ok: boolean; note: CaptureNote }>(`${this.apiRoot}/notes/capture/${encodeURIComponent(captureId)}/archive`, {}).pipe(
      map((response) => response.note)
    );
  }
}
