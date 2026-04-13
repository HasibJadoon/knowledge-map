import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { LessonPickerItem } from '../models/sprint.models';
import { resolveApiRoot } from './api-root.util';

@Injectable({ providedIn: 'root' })
export class LessonsService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = resolveApiRoot();

  list(query = '', limit = 80): Observable<LessonPickerItem[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (query.trim()) {
      params = params.set('q', query.trim());
    }

    return this.http.get<{ ok: boolean; lessons: LessonPickerItem[] }>(`${this.apiRoot}/lessons/list`, { params }).pipe(
      map((response) => response.lessons ?? [])
    );
  }
}
