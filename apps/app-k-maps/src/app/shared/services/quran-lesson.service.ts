import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { QuranLesson, QuranLessonSentence, QuranLessonText } from '../models/arabic/quran-lesson.model';

type RawQuranLesson = {
  id?: number | string;
  title?: string;
  title_ar?: string;
  status?: string;
  difficulty?: number;
  lesson_type?: string;
  reference?: QuranLesson['reference'];
  lesson_json?: {
    text?: QuranLessonText;
    sentences?: QuranLessonSentence[];
    comprehension?: QuranLesson['comprehension'];
    reference?: QuranLesson['reference'];
    title?: string;
    title_ar?: string;
    status?: string;
    difficulty?: number;
    lesson_type?: string;
    id?: string;
  };
};

type LessonResponse = { ok: boolean; result: RawQuranLesson };

@Injectable({
  providedIn: 'root',
})
export class QuranLessonService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/arabic/lessons/quran`;
  private readonly tokenKey = 'auth_token';

  getLesson(id: number | string) {
    return this.http.get<LessonResponse>(`${this.baseUrl}/${id}`, {
      headers: this.buildHeaders(),
    }).pipe(
      map((res) => {
        const base = res.result;
        const payload = base.lesson_json ?? {};
        const text = payload.text ?? { arabic_full: [], mode: 'original' };
        const sentences = payload.sentences ?? [];
        const comprehension = payload.comprehension ?? undefined;
        const reference = payload.reference ?? base.reference ?? undefined;
        return {
          id: base.id?.toString() ?? payload.id ?? '',
          title: base.title ?? payload.title ?? '',
          title_ar: base.title_ar ?? payload.title_ar,
          status: base.status ?? payload.status,
          difficulty: base.difficulty ?? payload.difficulty,
          lesson_type: base.lesson_type ?? payload.lesson_type ?? 'quran',
          text,
          sentences,
          comprehension,
          reference,
        } as QuranLesson;
      })
    );
  }

  private buildHeaders() {
    const token = localStorage.getItem(this.tokenKey);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (token) {
      headers['authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headers);
  }
}
