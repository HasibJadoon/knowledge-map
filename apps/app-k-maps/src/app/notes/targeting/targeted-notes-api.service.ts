import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CaptureNote, TargetRef, computeTitleFromMarkdown } from './targeting.models';

@Injectable({ providedIn: 'root' })
export class TargetedNotesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = this.resolveApiRoot(environment.apiBase);

  listTargetNotes(target: TargetRef): Observable<CaptureNote[]> {
    return this.http.get<unknown>(
      `${this.apiRoot}/targets/${encodeURIComponent(target.target_type)}/${encodeURIComponent(target.target_id)}/notes`
    ).pipe(
      map((response) => this.pickList<CaptureNote>(response, ['notes', 'results', 'items', 'data'])),
      catchError((error: unknown) => throwError(() => new Error(this.readError(error, 'Could not load notes.'))))
    );
  }

  createTargetedNote(target: TargetRef, body_md: string): Observable<CaptureNote> {
    const body = body_md.trim();
    if (!body) {
      return throwError(() => new Error('Type a note before adding.'));
    }

    const payload = {
      body_md,
      title: computeTitleFromMarkdown(body_md),
      status: 'draft' as const,
    };

    return this.http.post<unknown>(`${this.apiRoot}/notes`, payload).pipe(
      map((response) => this.pickItem<CaptureNote>(response, ['note', 'result', 'item', 'data']) ?? (response as CaptureNote)),
      switchMap((note) => this.http.post<unknown>(`${this.apiRoot}/notes/${encodeURIComponent(note.id)}/links`, {
        target_type: target.target_type,
        target_id: target.target_id,
        ref: target.ref,
      }).pipe(map(() => note))),
      catchError((error: unknown) => throwError(() => new Error(this.readError(error, 'Could not save note.'))))
    );
  }

  private pickItem<T>(response: unknown, keys: string[]): T | null {
    if (!this.isRecord(response)) {
      return null;
    }

    for (const key of keys) {
      const value = response[key];
      if (value !== undefined && value !== null) {
        return value as T;
      }
    }

    return null;
  }

  private pickList<T>(response: unknown, keys: string[]): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }

    if (!this.isRecord(response)) {
      return [];
    }

    for (const key of keys) {
      const value = response[key];
      if (Array.isArray(value)) {
        return value as T[];
      }
    }

    return [];
  }

  private readError(error: unknown, fallback: string): string {
    if (!this.isRecord(error)) {
      return fallback;
    }

    const body = error['error'];
    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (this.isRecord(body)) {
      const message = body['message'];
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    const message = error['message'];
    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return fallback;
  }

  private resolveApiRoot(apiBase: string): string {
    const normalized = apiBase.replace(/\/+$/, '');
    if (!normalized) {
      return '/api';
    }

    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
