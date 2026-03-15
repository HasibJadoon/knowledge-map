import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Comment as NoteComment,
  Note,
  NoteDetail,
  NoteLink,
  NoteLinkTargetType,
  NoteStatus,
} from './notes.models';

interface CreateNotePayload {
  body_md: string;
  title?: string | null;
  status?: NoteStatus;
}

interface UpdateNotePayload {
  body_md?: string;
  title?: string | null;
  status?: NoteStatus;
}

interface CreateLinkPayload {
  target_type: NoteLinkTargetType;
  target_id: string;
  ref?: string;
}

interface CreateCommentPayload {
  target_type: NoteComment['target_type'];
  target_id: string;
  body_md: string;
}

@Injectable({ providedIn: 'root' })
export class NotesApiService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = resolveApiRoot(environment.apiBase);

  listNotes(status: NoteStatus = 'draft', q = ''): Observable<Note[]> {
    let params = new HttpParams()
      .set('status', status)
      .set('limit', '400');

    const query = q.trim();
    if (query) {
      params = params.set('q', query);
    }

    return this.http.get<unknown>(`${this.apiRoot}/notes`, { params }).pipe(
      map((response) => this.pickList<Note>(response, ['notes', 'results', 'items', 'data']))
    );
  }

  createNote(payload: CreateNotePayload): Observable<Note> {
    return this.http.post<unknown>(`${this.apiRoot}/notes`, payload).pipe(
      map((response) => this.pickItem<Note>(response, ['note', 'result', 'item', 'data']) ?? (response as Note))
    );
  }

  getNote(noteId: string): Observable<NoteDetail> {
    return this.http.get<unknown>(`${this.apiRoot}/notes/${encodeURIComponent(noteId)}`).pipe(
      map((response) => this.normalizeNoteDetail(response))
    );
  }

  updateNote(noteId: string, payload: UpdateNotePayload): Observable<Note> {
    return this.http.patch<unknown>(`${this.apiRoot}/notes/${encodeURIComponent(noteId)}`, payload).pipe(
      map((response) => this.pickItem<Note>(response, ['note', 'result', 'item', 'data']) ?? (response as Note))
    );
  }

  archiveNote(noteId: string): Observable<Note | null> {
    return this.http.post<unknown>(`${this.apiRoot}/notes/${encodeURIComponent(noteId)}/archive`, {}).pipe(
      map((response) => this.pickItem<Note>(response, ['note', 'result', 'item', 'data']))
    );
  }

  unarchiveNote(noteId: string): Observable<Note | null> {
    return this.http.post<unknown>(`${this.apiRoot}/notes/${encodeURIComponent(noteId)}/unarchive`, {}).pipe(
      map((response) => this.pickItem<Note>(response, ['note', 'result', 'item', 'data']))
    );
  }

  addLink(noteId: string, payload: CreateLinkPayload): Observable<NoteLink> {
    return this.http.post<unknown>(`${this.apiRoot}/notes/${encodeURIComponent(noteId)}/links`, payload).pipe(
      map((response) => {
        const picked = this.pickItem<NoteLink>(response, ['link', 'note_link', 'result', 'item', 'data']);
        if (picked) {
          return picked;
        }

        const first = this.pickList<NoteLink>(response, ['links', 'note_links', 'items'])[0];
        return first ?? {
          note_id: noteId,
          target_type: payload.target_type,
          target_id: payload.target_id,
          ref: payload.ref ?? null,
          created_at: new Date().toISOString(),
        };
      })
    );
  }

  removeLink(noteId: string, targetType: NoteLinkTargetType, targetId: string): Observable<void> {
    const params = new HttpParams()
      .set('target_type', targetType)
      .set('target_id', targetId);

    return this.http.delete<void>(`${this.apiRoot}/notes/${encodeURIComponent(noteId)}/links`, {
      params,
    });
  }

  getComments(targetType: NoteComment['target_type'], targetId: string): Observable<NoteComment[]> {
    const params = new HttpParams()
      .set('target_type', targetType)
      .set('target_id', targetId);

    return this.http.get<unknown>(`${this.apiRoot}/comments`, { params }).pipe(
      map((response) => this.pickList<NoteComment>(response, ['comments', 'results', 'items', 'data']))
    );
  }

  createComment(payload: CreateCommentPayload): Observable<NoteComment> {
    return this.http.post<unknown>(`${this.apiRoot}/comments`, payload).pipe(
      map((response) =>
        this.pickItem<NoteComment>(response, ['comment', 'result', 'item', 'data']) ?? (response as NoteComment)
      )
    );
  }

  private normalizeNoteDetail(response: unknown): NoteDetail {
    const root = asRecord(response);
    const noteContainer = root?.['note'];
    const note = this.pickItem<Note>(response, ['note', 'result', 'item', 'data'])
      ?? (isRecord(noteContainer) ? (noteContainer as unknown as Note) : (response as Note));

    const rootLinks = this.pickList<NoteLink>(response, ['links', 'note_links']);
    const nestedLinks = isRecord(noteContainer)
      ? this.pickList<NoteLink>(noteContainer, ['links', 'note_links'])
      : [];

    return {
      ...note,
      links: rootLinks.length ? rootLinks : nestedLinks,
    };
  }

  private pickItem<T>(response: unknown, keys: string[]): T | null {
    if (!isRecord(response)) {
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

    if (!isRecord(response)) {
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
}

function resolveApiRoot(apiBase: string): string {
  const normalized = apiBase.replace(/\/+$/, '');
  if (!normalized) {
    return '/api';
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}
