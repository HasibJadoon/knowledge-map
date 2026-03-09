import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  BrainstormApiTopicDto,
  BrainstormIdeaDraft,
} from '../brainstorm.models';
import { resolveApiRoot } from '../../sprint/services/api-root.util';

@Injectable({ providedIn: 'root' })
export class BrainstormApiService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = `${resolveApiRoot()}/brainstorm/topics`;

  listTopics(includeArchived = false): Observable<BrainstormApiTopicDto[]> {
    const suffix = includeArchived ? '?include_archived=true' : '';
    return this.http.get<{ ok: boolean; topics: BrainstormApiTopicDto[] }>(`${this.apiRoot}${suffix}`).pipe(
      map((response) => response.topics ?? [])
    );
  }

  createTopic(title: string): Observable<BrainstormApiTopicDto> {
    return this.http.post<{ ok: boolean; topic: BrainstormApiTopicDto }>(this.apiRoot, { title }).pipe(
      map((response) => response.topic)
    );
  }

  updateTopic(topicId: string, changes: { title?: string; archived?: boolean }): Observable<BrainstormApiTopicDto> {
    return this.http.patch<{ ok: boolean; topic: BrainstormApiTopicDto }>(
      `${this.apiRoot}/${encodeURIComponent(topicId)}`,
      changes,
    ).pipe(
      map((response) => response.topic)
    );
  }

  deleteTopic(topicId: string): Observable<string> {
    return this.http.delete<{ ok: boolean; id: string }>(`${this.apiRoot}/${encodeURIComponent(topicId)}`).pipe(
      map((response) => response.id)
    );
  }

  createIdea(topicId: string, draft: BrainstormIdeaDraft): Observable<BrainstormApiTopicDto[]> {
    return this.http.post<{ ok: boolean; topics: BrainstormApiTopicDto[] }>(
      `${this.apiRoot}/${encodeURIComponent(topicId)}/ideas`,
      draft,
    ).pipe(
      map((response) => response.topics ?? [])
    );
  }

  updateIdea(topicId: string, ideaId: string, changes: Partial<BrainstormIdeaDraft>): Observable<BrainstormApiTopicDto[]> {
    return this.http.patch<{ ok: boolean; topics: BrainstormApiTopicDto[] }>(
      `${this.apiRoot}/${encodeURIComponent(topicId)}/ideas/${encodeURIComponent(ideaId)}`,
      changes,
    ).pipe(
      map((response) => response.topics ?? [])
    );
  }

  deleteIdea(topicId: string, ideaId: string): Observable<BrainstormApiTopicDto[]> {
    return this.http.delete<{ ok: boolean; topics: BrainstormApiTopicDto[] }>(
      `${this.apiRoot}/${encodeURIComponent(topicId)}/ideas/${encodeURIComponent(ideaId)}`
    ).pipe(
      map((response) => response.topics ?? [])
    );
  }
}
