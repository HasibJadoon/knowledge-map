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

export type QuranLessonCommitStep =
  | 'meta'
  | 'container'
  | 'units'
  | 'lemmas'
  | 'tokens'
  | 'spans'
  | 'grammar'
  | 'sentences'
  | 'expressions'
  | 'links';

export interface QuranLessonCommitRequest {
  step: QuranLessonCommitStep;
  container_id?: string | null;
  unit_id?: string | null;
  payload: Record<string, unknown>;
}

export interface QuranLessonCommitResult {
  lesson_id: number;
  step: QuranLessonCommitStep;
  container_id?: string | null;
  unit_id?: string | null;
  counts: Record<string, number>;
}

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
      this.buildPersistPayload(payload),
      { headers }
    );
  }

  createLesson(payload: Omit<QuranLesson, 'id'>) {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });

    return this.http
      .post<{ ok: boolean; result: QuranLesson }>(
        this.baseUrl,
        this.buildPersistPayload(payload),
        { headers }
      )
      .pipe(map((res) => res.result));
  }

  private mergeLessonPayload(data: LessonResponse): QuranLesson {
    const lessonJson = this.asRecord(data.lesson_json) ?? {};
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
    const baseText: QuranLessonText = {
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
      mode: 'original',
    };

    const textOverride = this.asRecord(lessonJson['text']);
    const overrideAyat = this.asArray<QuranLessonText['arabic_full'][number]>(
      textOverride?.['arabic_full']
    );
    const overrideModeRaw = textOverride?.['mode'];
    const overrideMode: QuranLessonText['mode'] =
      overrideModeRaw === 'edited'
        ? 'edited'
        : overrideModeRaw === 'mixed'
          ? 'mixed'
          : overrideModeRaw === 'original'
            ? 'original'
            : baseText.mode;

    const text: QuranLessonText = {
      arabic_full: overrideAyat ?? baseText.arabic_full,
      mode: overrideMode,
    };

    const sentencesOverride = this.asArray<QuranLessonSentence>(lessonJson['sentences']);
    const lessonSentences = normalizeQuranLessonSentences(
      sentencesOverride?.length ? sentencesOverride : normalizedSentences
    );

    const lessonReference = lessonJson['reference'] as QuranLessonReference | undefined;
    const lessonComprehension = lessonJson['comprehension'] as QuranLesson['comprehension'] | undefined;
    const lessonVocabLayer = lessonJson['vocab_layer'] as QuranLesson['vocab_layer'] | undefined;
    const lessonPassageLayers = lessonJson['passage_layers'] as QuranLesson['passage_layers'] | undefined;
    const lessonNotes = lessonJson['_notes'] as QuranLessonNotes | undefined;
    const analysisOverride = this.asRecord(lessonJson['analysis']);
    const analysisTokens = this.asArray<QuranLessonTokenV2>(analysisOverride?.['tokens']);
    const analysisSpans = this.asArray<QuranLessonSpanV2>(analysisOverride?.['spans']);
    const analysisVocab = this.asRecord(analysisOverride?.['vocab']) as QuranLessonVocabBuckets | null;
    const lessonSource =
      typeof lessonJson['source'] === 'string'
        ? (lessonJson['source'] as string)
        : data.lesson_row.source ?? null;

    const lesson: QuranLesson = {
      lesson_type: 'quran',
      id: `${data.lesson_row.id}`,
      title: data.lesson_row.title,
      title_ar: data.lesson_row.title_ar ?? undefined,
      source: lessonSource,
      status: data.lesson_row.status,
      subtype: data.lesson_row.subtype ?? undefined,
      difficulty:
        typeof data.lesson_row.difficulty === 'number' ? data.lesson_row.difficulty : undefined,
      reference: lessonReference,
      text,
      sentences: lessonSentences,
      comprehension: lessonComprehension,
      vocab_layer: lessonVocabLayer,
      passage_layers: lessonPassageLayers,
      units: lessonUnits,
      _notes: lessonNotes,
      created_at: data.lesson_row.created_at,
      updated_at: data.lesson_row.updated_at ?? undefined,
      analysis: {
        tokens: analysisTokens ?? (data.tokens as QuranLessonTokenV2[]),
        spans: analysisSpans ?? (data.spans as QuranLessonSpanV2[]),
        vocab: analysisVocab ?? (data.vocab as QuranLessonVocabBuckets),
      },
    };
    return lesson;
  }

  private buildPersistPayload(payload: Partial<QuranLesson>) {
    const title = String(payload.title ?? '').trim();
    return {
      title,
      title_ar: payload.title_ar ?? null,
      lesson_type: 'quran',
      subtype: payload.subtype ?? null,
      source: payload.source ?? payload.reference?.ref_label ?? null,
      status: payload.status ?? 'draft',
      difficulty:
        typeof payload.difficulty === 'number' && Number.isFinite(payload.difficulty)
          ? Math.trunc(payload.difficulty)
          : null,
      lesson_json: payload,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private asArray<T>(value: unknown): T[] | null {
    if (!Array.isArray(value)) return null;
    return value as T[];
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

  commitStep(id: number | string, payload: QuranLessonCommitRequest) {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });
    return this.http.post<{ ok: boolean; result: QuranLessonCommitResult }>(
      `${API_BASE}/arabic/lessons/${id}/commit`,
      payload,
      { headers }
    );
  }
}
