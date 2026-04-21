import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PodcastEpisode } from '../../models/planner/sprint.models';
import { resolveApiRoot } from './api-root.util';

@Injectable({ providedIn: 'root' })
export class PodcastService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = resolveApiRoot();

  list(query = '', limit = 80): Observable<PodcastEpisode[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (query.trim()) {
      params = params.set('q', query.trim());
    }

    return this.http.get<{ ok: boolean; items: PodcastEpisode[] }>(`${this.apiRoot}/podcast/list`, { params }).pipe(
      map((response) => response.items ?? [])
    );
  }

  get(id: string): Observable<PodcastEpisode> {
    return this.http.get<{ ok: boolean; item: PodcastEpisode }>(`${this.apiRoot}/podcast/${encodeURIComponent(id)}`).pipe(
      map((response) => response.item)
    );
  }

  create(payload: {
    title: string;
    status?: string;
    related_type?: string | null;
    related_id?: string | null;
    refs_json: Record<string, unknown>;
    content_json: Record<string, unknown>;
  }): Observable<PodcastEpisode> {
    return this.http.post<{ ok: boolean; item: PodcastEpisode }>(`${this.apiRoot}/podcast`, payload).pipe(
      map((response) => response.item)
    );
  }

  save(id: string, payload: {
    title?: string;
    status?: string;
    related_type?: string | null;
    related_id?: string | null;
    refs_json: Record<string, unknown>;
    content_json: Record<string, unknown>;
  }): Observable<PodcastEpisode> {
    return this.http.put<{ ok: boolean; item: PodcastEpisode }>(`${this.apiRoot}/podcast/${encodeURIComponent(id)}`, payload).pipe(
      map((response) => response.item)
    );
  }
}
