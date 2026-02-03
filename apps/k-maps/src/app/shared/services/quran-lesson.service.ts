import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './AuthService';
import {
  QuranLesson,
  QuranLessonSentence,
  QuranLessonSentenceV2,
  QuranLessonText,
  QuranLessonApiPayload,
  QuranLessonTokenV2,
  QuranLessonSpanV2,
  QuranLessonVocabBuckets,
  QuranLessonNotes,
  QuranLessonReference,
  QuranLessonUnit,
  normalizeQuranLessonSentences,
} from '../models/arabic/quran-lesson.model';
import { API_BASE } from '../api-base';

type LessonResponse = QuranLessonApiPayload;

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

    return this.http
      .get<{ ok: boolean; result: LessonResponse }>(`${this.baseUrl}/${id}`, { headers })
      .pipe(map((res) => this.mergeLessonPayload(res.result)));
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

  private mergeLessonPayload(data: LessonResponse): QuranLesson {
    const lessonJson = (data.lesson_json as Record<string, unknown>) ?? {};
    const ayat = data.ayat ?? [];
    const sentencesV2 = (data.sentences ?? []) as QuranLessonSentenceV2[];
    const sentencesPayload = sentencesV2.map((sentence) => {
      const translationValue = sentence.text.translation ?? null;
      return {
        entity_type: 'sentence',
        sentence_id: sentence.sentence_occ_id,
        unit_id: sentence.unit_id,
        sentence_order: sentence.sentence_order,
        text: {
          arabic: sentence.text.arabic,
          translation: translationValue,
        },
        notes: sentence.notes ?? null,
        ref: sentence.ref,
        anchors: sentence.anchors as QuranLessonSentence['anchors'],
        classification: {},
        markers: [],
      };
    });
    const normalizedSentences = normalizeQuranLessonSentences(sentencesPayload);
    const lessonUnits: QuranLessonUnit[] = (data.units ?? []).map((unit) => ({
      id: unit.id ?? null,
      unit_type: unit.unit_type ?? null,
      order_index: unit.order_index ?? null,
      ayah_from: unit.ayah_from ?? null,
      ayah_to: unit.ayah_to ?? null,
      start_ref: unit.start_ref ?? null,
      end_ref: unit.end_ref ?? null,
      text_cache: unit.text_cache ?? null,
      meta_json: unit.meta_json ?? null,
    }));
    const rawMode = lessonJson['mode'];
    const lessonMode: 'original' | 'edited' | 'mixed' =
      rawMode === 'edited'
        ? 'edited'
        : rawMode === 'mixed'
          ? 'mixed'
          : 'original';
    const text: QuranLessonText = {
      arabic_full: ayat.map((unit) => ({
        unit_id: unit.unit_id,
        unit_type: unit.unit_type,
        arabic: unit.arabic,
        arabic_diacritics: unit.arabic_diacritics ?? null,
        arabic_non_diacritics: unit.arabic_non_diacritics ?? null,
        translation:
          unit.translation && typeof unit.translation === 'string' ? unit.translation : null,
        translations: unit.translations ?? null,
        surah: unit.surah,
        ayah: unit.ayah,
        notes: unit.notes ?? null,
        lemmas: unit.lemmas ?? undefined,
      })),
      mode:
        rawMode === 'edited'
          ? 'edited'
          : rawMode === 'mixed'
            ? 'mixed'
            : 'original',
    };

    const lessonReference = lessonJson['reference'] as QuranLessonReference | undefined;
    const lessonComprehension = lessonJson['comprehension'] as QuranLesson['comprehension'] | undefined;
    const lessonVocabLayer = lessonJson['vocab_layer'] as QuranLesson['vocab_layer'] | undefined;
    const lessonPassageLayers = lessonJson['passage_layers'] as QuranLesson['passage_layers'] | undefined;
    const lessonNotes = lessonJson['_notes'] as QuranLessonNotes | undefined;

    const lesson: QuranLesson = {
      lesson_type: 'quran',
      id: `${data.lesson_row.id}`,
      title: data.lesson_row.title,
      title_ar: data.lesson_row.title_ar ?? undefined,
      status: data.lesson_row.status,
      difficulty:
        typeof data.lesson_row.difficulty === 'number' ? data.lesson_row.difficulty : undefined,
      reference: lessonReference,
      text,
      sentences: normalizedSentences,
      comprehension: lessonComprehension,
      vocab_layer: lessonVocabLayer,
      passage_layers: lessonPassageLayers,
      units: lessonUnits,
      _notes: lessonNotes,
      created_at: data.lesson_row.created_at,
      updated_at: data.lesson_row.updated_at ?? undefined,
      analysis: {
        tokens: data.tokens as QuranLessonTokenV2[],
        spans: data.spans as QuranLessonSpanV2[],
        vocab: data.vocab as QuranLessonVocabBuckets,
      },
    };
    return lesson;
  }

  createContainer(payload: {
    container_id?: string;
    container_key?: string;
    title?: string;
    surah: number;
    ayah_from: number;
    ayah_to: number;
    text_cache?: string;
  }) {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });
    return this.http.post<{ ok: boolean; result: any }>(`${this.baseUrl}/create`, payload, { headers });
  }

  addOccurrences(lessonId: number | string, payload: any) {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });
    return this.http.post<{ ok: boolean; result: any }>(
      `${this.baseUrl}/${lessonId}/occurrences`,
      payload,
      { headers }
    );
  }
}
