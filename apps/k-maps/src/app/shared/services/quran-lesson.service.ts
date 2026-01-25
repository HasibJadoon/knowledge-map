import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './AuthService';
import { QuranLesson } from '../models/arabic/quran-lesson.model';
import { API_BASE } from '../api-base';

@Injectable({
  providedIn: 'root'
})
export class QuranLessonService {
  private auth = inject(AuthService);
  private readonly baseUrl = `${API_BASE}/arabic/lessons/quran`;

  constructor(private readonly http: HttpClient) {}

  getLesson(id: number | string): Observable<QuranLesson> {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });

    type LessonResponse = QuranLesson & { lesson_json?: Partial<QuranLesson> };

    return this.http
      .get<{ ok: boolean; result: LessonResponse }>(`${this.baseUrl}/${id}`, { headers })
      .pipe(
        map((res) => {
          const data = res.result;
          if (data.lesson_json && typeof data.lesson_json === 'object') {
            const { lesson_json, ...rest } = data;
            return { ...rest, ...(lesson_json as Partial<QuranLesson>) } as QuranLesson;
          }
          return data as QuranLesson;
        })
      );
  }

  updateLesson(id: number | string, payload: QuranLesson) {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });

    return this.http.put<{ ok: boolean; result: QuranLesson }>(
      `${this.baseUrl}/${id}`,
      payload,
      { headers }
    );
  }

  createLesson(payload: Omit<QuranLesson, 'id'>) {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });

    return this.http
      .post<{ ok: boolean; result: QuranLesson }>(this.baseUrl, payload, { headers })
      .pipe(map((res) => res.result));
  }
}
