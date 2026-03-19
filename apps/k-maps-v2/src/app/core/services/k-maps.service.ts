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
  text_uthmani?: string | null;
  text_simple?: string | null;
  translation?: string | null;
  word_count?: number | null;
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
}
