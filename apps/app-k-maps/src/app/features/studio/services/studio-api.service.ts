// ─── StudioApiService — km-studio (ST) adapter ────────────────────────────────
// The integration point between the Episode Studio UI and the ST worker
// (/api/st/...). Unwraps the `{ ok, data }` envelope and returns plain models.

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import {
  EpisodeAggregate, EpisodeSummary, Participant, Section, StudioTemplate, TalkingPoint,
} from '../studio.models';

interface Envelope<T> {
  ok: boolean;
  data: T;
}

/** A section row as returned by create/update — without its nested points. */
type SectionRow = Omit<Section, 'points'>;

@Injectable({ providedIn: 'root' })
export class StudioApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/st`;

  // ── Templates ────────────────────────────────────────────────────────────────

  listTemplates(): Observable<StudioTemplate[]> {
    return this.http
      .get<Envelope<StudioTemplate[]>>(`${this.base}/templates`)
      .pipe(map((res) => res.data));
  }

  // ── Episodes ─────────────────────────────────────────────────────────────────

  listEpisodes(): Observable<EpisodeSummary[]> {
    return this.http
      .get<Envelope<EpisodeSummary[]>>(`${this.base}/episodes`)
      .pipe(map((res) => res.data));
  }

  getEpisode(id: string): Observable<EpisodeAggregate> {
    return this.http
      .get<Envelope<EpisodeAggregate>>(`${this.base}/episodes/${id}`)
      .pipe(map((res) => res.data));
  }

  createEpisode(
    body: { title: string; format?: string; template_ref?: string | null },
  ): Observable<EpisodeAggregate> {
    return this.http
      .post<Envelope<EpisodeAggregate>>(`${this.base}/episodes`, body)
      .pipe(map((res) => res.data));
  }

  updateEpisode(
    id: string,
    patch: { title?: string; format?: string; status?: string },
  ): Observable<EpisodeSummary> {
    return this.http
      .patch<Envelope<EpisodeSummary>>(`${this.base}/episodes/${id}`, patch)
      .pipe(map((res) => res.data));
  }

  deleteEpisode(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/episodes/${id}`);
  }

  // ── Participants ─────────────────────────────────────────────────────────────

  addParticipant(
    episodeId: string,
    body: { display_name: string; role?: string; color?: string },
  ): Observable<Participant> {
    return this.http
      .post<Envelope<Participant>>(`${this.base}/episodes/${episodeId}/participants`, body)
      .pipe(map((res) => res.data));
  }

  updateParticipant(
    id: string,
    patch: { display_name?: string; color?: string; role?: string },
  ): Observable<Participant> {
    return this.http
      .patch<Envelope<Participant>>(`${this.base}/participants/${id}`, patch)
      .pipe(map((res) => res.data));
  }

  deleteParticipant(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/participants/${id}`);
  }

  // ── Sections ─────────────────────────────────────────────────────────────────

  addSection(episodeId: string, body: { heading: string; type?: string }): Observable<Section> {
    return this.http
      .post<Envelope<SectionRow>>(`${this.base}/episodes/${episodeId}/sections`, body)
      .pipe(map((res) => ({ ...res.data, points: [] })));
  }

  updateSection(id: string, patch: { heading?: string; type?: string }): Observable<SectionRow> {
    return this.http
      .patch<Envelope<SectionRow>>(`${this.base}/sections/${id}`, patch)
      .pipe(map((res) => res.data));
  }

  deleteSection(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sections/${id}`);
  }

  // ── Talking points ───────────────────────────────────────────────────────────

  addPoint(
    sectionId: string,
    body: { text?: string; speaker_ref?: string | null },
  ): Observable<TalkingPoint> {
    return this.http
      .post<Envelope<TalkingPoint>>(`${this.base}/sections/${sectionId}/points`, body)
      .pipe(map((res) => res.data));
  }

  updatePoint(
    id: string,
    patch: { text?: string; speaker_ref?: string | null; est_seconds?: number | null },
  ): Observable<TalkingPoint> {
    return this.http
      .patch<Envelope<TalkingPoint>>(`${this.base}/points/${id}`, patch)
      .pipe(map((res) => res.data));
  }

  deletePoint(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/points/${id}`);
  }
}
