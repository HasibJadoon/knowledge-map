import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ── Quran models ────────────────────────────────────────────────────────────

export interface QuranAyahWord {
  id?: number;
  text?: string | null;
  simple?: string | null;
  lemma?: string | null;
  root?: string | null;
  lemma_text?: string | null;
  lemma_text_clean?: string | null;
  ar_u_token?: string | null;
  token_index?: number;
  word_simple?: string | null;
  word_diacritic?: string | null;
}

export interface QuranAyah {
  id?: number;
  surah: number;
  ayah: number;
  text: string;
  text_uthmani?: string | null;       // clean Uthmani diacritics (use for display)
  text_uthmani_clean?: string | null; // alias — same as text_uthmani
  text_simple?: string | null;        // plain script, no diacritics
  text_bare?: string | null;          // search/FTS normalised
  verse_mark?: string | null;         // U+06DD + Arabic-Indic digits — renders as medallion
  translation?: string | null;
  word_count?: number | null;
  page_number?: number | null;
  juz_number?: number | null;
  words?: QuranAyahWord[];
}

export interface AyahsSurah {
  surah: number;
  name_ar: string;
  name_en: string | null;
  ayah_count: number | null;
}

export interface TranslationPassage {
  id: number;
  source_key: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  passage_index: number;
  page_pdf: number | null;
  page_book: number | null;
  text: string | null;
}

export interface AyahsResponse {
  ok: boolean;
  surah?: AyahsSurah;
  translation_passages?: TranslationPassage[];
  total: number;
  page: number;
  pageSize: number;
  results?: QuranAyah[];
  verses?: QuranAyah[];
}

export interface PassagesResponse {
  ok: boolean;
  surah?: AyahsSurah;
  source_key?: string;
  passages: TranslationPassage[];
  passage?: TranslationPassage | null;
}

// ── Lesson models ───────────────────────────────────────────────────────────

export type TaskType =
  | 'reading'
  | 'morphology'
  | 'sentence_structure'
  | 'expressions'
  | 'comprehension'
  | 'passage_structure';

export interface LessonTask {
  task_type: TaskType;
  task_json: string;
  label: string;
}

export interface LessonFullDetail {
  id: string;
  title: string;
  title_ar: string;
  surah: number | null;
  ayah_from: number | null;
  ayah_to: number | null;
  container_id: string | null;
  unit_id: string | null;
}

export interface QuranLesson {
  id: string;
  title: string;
  title_ar?: string;
  status?: string;
  difficulty?: number;
  lesson_type?: string;
}

type RawLessonResponse = {
  ok: boolean;
  result: {
    id?: number | string;
    title?: string;
    title_ar?: string;
    status?: string;
    difficulty?: number;
    lesson_type?: string;
    lesson_json?: {
      id?: string;
      title?: string;
      title_ar?: string;
      status?: string;
      difficulty?: number;
      lesson_type?: string;
    };
  };
};

type RawLessonDetailResponse = {
  result: {
    lesson_row?: { container_id?: string; unit_id?: string };
    lesson_json?: { meta?: { title?: string; title_ar?: string } };
    container?: { id?: string };
    units?: Array<{
      id?: string;
      parent_unit_id?: string | null;
      unit_type?: string;
      surah?: number | null;
      ayah_from?: number;
      ayah_to?: number;
      start_ref?: string;
      end_ref?: string;
    }>;
  };
};

type RawLessonTasksResponse = {
  result: {
    tasks?: Array<{
      task_type?: string;
      task_name?: string;
      task_json?: unknown;
    }>;
  };
};

@Injectable({ providedIn: 'root' })
export class KMapsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase;

  // ── v2: Quran Ayahs ────────────────────────────────────────────────────────
  getAyahs(surah: number, pageSize = 400): Observable<AyahsResponse> {
    const params = new HttpParams()
      .set('surah', String(surah))
      .set('pageSize', String(pageSize));
    return this.http.get<AyahsResponse>(`${this.base}/ar/quran/ayahs`, { params });
  }

  // ── v2: Quran Passages ─────────────────────────────────────────────────────
  getPassages(surah: number, passageIndex?: number): Observable<PassagesResponse> {
    let params = new HttpParams().set('surah', String(surah));
    if (passageIndex !== undefined) {
      params = params.set('passage', String(passageIndex));
    }
    return this.http.get<PassagesResponse>(`${this.base}/ar/quran/passages`, { params });
  }

  // ── v1: Lesson ─────────────────────────────────────────────────────────────
  getLesson(id: number | string): Observable<QuranLesson> {
    return this.http.get<RawLessonResponse>(`${this.base}/arabic/lessons/quran/${id}`).pipe(
      map((res) => {
        const base = res.result;
        const payload = base.lesson_json ?? {};
        return {
          id: base.id?.toString() ?? payload.id ?? String(id),
          title: base.title ?? payload.title ?? '',
          title_ar: base.title_ar ?? payload.title_ar,
          status: base.status ?? payload.status,
          difficulty: base.difficulty ?? payload.difficulty,
          lesson_type: base.lesson_type ?? payload.lesson_type ?? 'quran',
        } as QuranLesson;
      })
    );
  }

  // ── v2: Lesson full detail (surah, range, container) ───────────────────────
  getLessonDetail(id: string | number): Observable<LessonFullDetail> {
    return this.http.get<RawLessonDetailResponse>(`${this.base}/ar/quran/lessons/${id}`).pipe(
      map((res) => {
        const result = res.result ?? {};
        const lessonRow = result.lesson_row ?? {};
        const lessonJson = result.lesson_json ?? {};
        const container = result.container ?? {};
        const units = result.units ?? [];
        const passageUnit = units.find((u) => u.unit_type === 'passage') ?? units[0] ?? null;
        const meta = lessonJson.meta ?? {};

        // Parse surah from start_ref e.g. "2:5" → 2
        const parseRef = (ref: string | undefined, index: number): number | null => {
          if (!ref) return null;
          const parts = String(ref).split(':');
          const val = Number(parts[index]);
          return Number.isFinite(val) && val > 0 ? val : null;
        };

        const parseSurahFromUnitId = (unitId: string | undefined): number | null => {
          if (!unitId) return null;
          const match = String(unitId).match(/^U:C:QURAN:(\d+)(?::|$)/);
          if (!match) return null;
          const value = Number(match[1]);
          return Number.isFinite(value) && value > 0 ? value : null;
        };

        return {
          id: String(id),
          title: meta.title ?? '',
          title_ar: meta.title_ar ?? '',
          surah: passageUnit?.surah ?? parseRef(passageUnit?.start_ref, 0) ?? parseSurahFromUnitId(passageUnit?.id),
          ayah_from: passageUnit?.ayah_from ?? parseRef(passageUnit?.start_ref, 1),
          ayah_to: passageUnit?.ayah_to ?? parseRef(passageUnit?.end_ref, 1),
          container_id: lessonRow.container_id ?? container.id ?? null,
          unit_id: lessonRow.unit_id ?? passageUnit?.id ?? null,
        } as LessonFullDetail;
      })
    );
  }

  // ── v2: Lesson tasks ────────────────────────────────────────────────────────
  getLessonTasks(id: string | number): Observable<LessonTask[]> {
    return this.http.get<RawLessonTasksResponse>(`${this.base}/ar/quran/lessons/${id}/tasks`).pipe(
      map((res) => {
        const tasks = res.result?.tasks ?? [];
        const TASK_LABELS: Record<string, string> = {
          reading: 'Reading',
          morphology: 'Morphology',
          sentence_structure: 'Sentence Structure',
          expressions: 'Expressions',
          comprehension: 'Comprehension',
          passage_structure: 'Passage Structure',
        };
        return tasks
          .filter((t) => t.task_type && t.task_json != null)
          .map((t) => ({
            task_type: t.task_type as TaskType,
            task_json: typeof t.task_json === 'string'
              ? t.task_json
              : JSON.stringify(t.task_json),
            label: t.task_name ?? TASK_LABELS[t.task_type ?? ''] ?? String(t.task_type),
          }));
      })
    );
  }
}
