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
  QuranLessonComprehensionQuestion,
  QuranLessonMcq,
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

export type QuranLessonDraft = {
  draft_id: string;
  lesson_id?: number | null;
  draft_version: number;
  status?: string;
  active_step?: string | null;
  draft_json: Record<string, unknown>;
};

export type QuranLessonDraftCommitResponse = {
  ok: boolean;
  lesson_id: number;
  committed_step: string;
  result_counts?: Record<string, number>;
};

export type QuranLessonDraftPublishResponse = {
  ok: boolean;
  lesson_id: number;
  status: string;
};

@Injectable({
  providedIn: 'root'
})
export class QuranLessonService {
  private auth = inject(AuthService);
  private readonly baseUrl = `${API_BASE}/ar/quran/lessons`;

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
    const lessonComprehensionRaw = this.asRecord(lessonJson['comprehension']) ?? {};
    const lessonComprehension = this.normalizeComprehension(lessonComprehensionRaw);
    const lessonVocabLayer = lessonJson['vocab_layer'] as QuranLesson['vocab_layer'] | undefined;
    const lessonPassageLayers = lessonJson['passage_layers'] as QuranLesson['passage_layers'] | undefined;
    const lessonNotes = lessonJson['_notes'] as QuranLessonNotes | undefined;
    const lessonNotesLegacy = lessonJson['notes'];
    const analysisOverride = this.asRecord(lessonJson['analysis']);
    const analysisTokens = this.asArray<QuranLessonTokenV2>(analysisOverride?.['tokens']);
    const analysisSpans = this.asArray<QuranLessonSpanV2>(analysisOverride?.['spans']);
    const analysisVocab = this.asRecord(analysisOverride?.['vocab']) as QuranLessonVocabBuckets | null;
    const lessonSource =
      typeof lessonJson['source'] === 'string'
        ? (lessonJson['source'] as string)
        : data.lesson_row.source ?? null;

    const lesson: QuranLesson & Record<string, unknown> = {
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
    if (lessonNotesLegacy !== undefined) {
      lesson['notes'] = lessonNotesLegacy;
    }
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

  private normalizeComprehension(raw: Record<string, unknown>): QuranLesson['comprehension'] {
    const normalized: Record<string, unknown> = { ...raw };

    if (!('mcqs' in normalized) && Array.isArray(normalized['Mcqs'])) {
      normalized['mcqs'] = normalized['Mcqs'];
    }

    const legacyQuestions = this.asArray<Record<string, unknown>>(normalized['questions']);
    const existingReflective = this.asArray<QuranLessonComprehensionQuestion>(
      normalized['reflective']
    );
    const existingAnalytical = this.asArray<QuranLessonComprehensionQuestion>(
      normalized['analytical']
    );
    if (legacyQuestions?.length && !existingReflective?.length && !existingAnalytical?.length) {
      const answers = this.asRecord(normalized['answers']) ?? {};
      normalized['reflective'] = legacyQuestions
        .map((question, index) => {
          const questionId = String(
            question['question_id'] ?? question['id'] ?? `q${index + 1}`
          );
          const questionText = String(question['question'] ?? question['text'] ?? '').trim();
          if (!questionText) return null;

          const rawAnswer =
            answers[questionId as keyof typeof answers] ??
            (question['id'] != null ? answers[String(question['id'])] : undefined);
          const answerHint = typeof rawAnswer === 'string' ? rawAnswer : undefined;

          return {
            question_id: questionId,
            question: questionText,
            question_ar:
              typeof question['question_ar'] === 'string' ? question['question_ar'] : undefined,
            answer_hint: answerHint,
            data:
              rawAnswer && typeof rawAnswer !== 'string'
                ? { legacy_answer: rawAnswer }
                : undefined,
          } as QuranLessonComprehensionQuestion;
        })
        .filter((question): question is QuranLessonComprehensionQuestion => !!question);
    }

    const normalizeMcqArray = (input: unknown): QuranLessonMcq[] | null => {
      const items = this.asArray<Record<string, unknown>>(input);
      if (!items?.length) return null;

      const results = items
        .map((entry, index) => {
          const mcqId = String(entry['mcq_id'] ?? entry['id'] ?? `mcq${index + 1}`);
          const questionText = String(entry['question'] ?? entry['text'] ?? '').trim();
          if (!questionText) return null;

          const optionsRaw = this.asArray<Record<string, unknown>>(entry['options']) ?? [];
          const correctId = entry['correct_option_id'] ?? entry['correct_option'] ?? null;
          const options = optionsRaw
            .map((option, optionIndex) => {
              const optionText = String(option['option'] ?? option['text'] ?? '').trim();
              if (!optionText) return null;
              const optionId = option['option_id'] ?? option['id'] ?? optionIndex;
              const isCorrect =
                typeof option['is_correct'] === 'boolean'
                  ? option['is_correct']
                  : correctId != null
                    ? String(correctId) === String(optionId)
                    : false;
              return {
                option: optionText,
                is_correct: isCorrect,
              };
            })
            .filter((opt): opt is { option: string; is_correct: boolean } => !!opt);

          return {
            mcq_id: mcqId,
            question: questionText,
            question_ar:
              typeof entry['question_ar'] === 'string' ? entry['question_ar'] : undefined,
            options,
          } as QuranLessonMcq;
        })
        .filter((mcq): mcq is QuranLessonMcq => !!mcq);

      return results.length ? results : null;
    };

    const mcqs = normalized['mcqs'];
    if (Array.isArray(mcqs)) {
      normalized['mcqs'] = normalizeMcqArray(mcqs) ?? mcqs;
    } else if (mcqs && typeof mcqs === 'object') {
      const grouped = mcqs as Record<string, unknown>;
      const nextGrouped: Record<string, unknown> = { ...grouped };
      for (const key of ['text', 'vocabulary', 'grammar']) {
        if (key in grouped) {
          nextGrouped[key] = normalizeMcqArray(grouped[key]) ?? grouped[key];
        }
      }
      normalized['mcqs'] = nextGrouped;
    }

    return normalized as QuranLesson['comprehension'];
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
      `${API_BASE}/ar/quran/lessons/${id}/commit`,
      payload,
      { headers }
    );
  }

  createDraft(payload: {
    lesson_id?: number | string | null;
    subtype?: string | null;
    source?: string | null;
    initial_reference?: Record<string, unknown> | null;
    active_step?: string | null;
  }): Observable<QuranLessonDraft> {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });
    return this.http
      .post<{ ok: boolean; draft_id: string; lesson_id?: number | null; draft_version: number; draft_json: Record<string, unknown> }>(
        `${API_BASE}/ar/quran/lesson-drafts`,
        payload,
        { headers }
      )
      .pipe(
        map((res) => ({
          draft_id: res.draft_id,
          lesson_id: res.lesson_id ?? null,
          draft_version: res.draft_version,
          draft_json: res.draft_json ?? {},
        }))
      );
  }

  getDraft(draftId: string): Observable<QuranLessonDraft> {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });
    return this.http
      .get<{ ok: boolean; draft_id: string; lesson_id?: number | null; draft_version: number; status?: string; active_step?: string | null; draft_json: Record<string, unknown> }>(
        `${API_BASE}/ar/quran/lesson-drafts/${draftId}`,
        { headers }
      )
      .pipe(
        map((res) => ({
          draft_id: res.draft_id,
          lesson_id: res.lesson_id ?? null,
          draft_version: res.draft_version,
          status: res.status ?? 'draft',
          active_step: res.active_step ?? null,
          draft_json: res.draft_json ?? {},
        }))
      );
  }

  updateDraft(draftId: string, payload: { draft_json: Record<string, unknown>; active_step?: string | null }) {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });
    return this.http.put<{ ok: boolean; draft_version: number }>(
      `${API_BASE}/ar/quran/lesson-drafts/${draftId}`,
      payload,
      { headers }
    );
  }

  commitDraft(draftId: string, payload: { step: string; draft_version: number }) {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });
    return this.http.post<QuranLessonDraftCommitResponse>(
      `${API_BASE}/ar/quran/lesson-drafts/${draftId}/commit`,
      payload,
      { headers }
    );
  }

  publishDraft(draftId: string, payload: { draft_version: number }) {
    const headers = new HttpHeaders({
      'content-type': 'application/json',
      ...this.auth.authHeaders(),
    });
    return this.http.post<QuranLessonDraftPublishResponse>(
      `${API_BASE}/ar/quran/lesson-drafts/${draftId}/publish`,
      payload,
      { headers }
    );
  }
}
