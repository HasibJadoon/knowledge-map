import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  QURAN_MIN_PAGE,
  QURAN_TOTAL_PAGES,
  QuranMenuResponse,
  QuranPageResponse,
} from '../models/quran-reader.model';

// ── Surah ayahs response (same shape as k-maps desktop) ──────────────────────
export interface QuranAyah {
  surah: number;
  ayah: number;
  text: string;
  text_uthmani?: string | null;
  text_uthmani_clean?: string | null;
  text_bare?: string | null;
  verse_mark?: string | null;
  translation?: string | null;
  page_number?: number | null;
}

export interface AyahsSurah {
  surah: number;
  name_ar: string;
  name_en: string | null;
  ayah_count: number | null;
}

export interface TranslationPassage {
  id: number;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  passage_index: number;
}

export interface AyahsResponse {
  ok: boolean;
  surah?: AyahsSurah;
  translation_passages?: TranslationPassage[];
  total: number;
  results?: QuranAyah[];
  verses?: QuranAyah[];
}

// ── /quran/surahs response ────────────────────────────────────────────────────
export interface QuranSurahListItem {
  id: string;
  surahNumber: number;
  slug: string;
  arabicName: string;
  transliteratedName: string;
  englishName: string;
  ayahCount: number;
  revelationType: 'makki' | 'madani';
  juz: number | null;
}

export interface SurahListResponse {
  ok: boolean;
  surahs: QuranSurahListItem[];
}

@Injectable({ providedIn: 'root' })
export class QuranReaderService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBase}/arabic/quran`;
  private readonly pageCache = new Map<number, Observable<QuranPageResponse>>();

  private menuRequest$: Observable<QuranMenuResponse> | null = null;

  getMenu(): Observable<QuranMenuResponse> {
    if (!this.menuRequest$) {
      this.menuRequest$ = this.http.get<QuranMenuResponse>(`${this.baseUrl}/menu`).pipe(
        catchError((error: unknown) => {
          this.menuRequest$ = null;
          return throwError(() => new Error(this.toErrorMessage(error, 'Unable to load Quran menu.')));
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    return this.menuRequest$;
  }

  getPage(pageNumber: number): Observable<QuranPageResponse> {
    const cached = this.pageCache.get(pageNumber);
    if (cached) {
      return cached;
    }

    const request$ = this.http.get<QuranPageResponse>(`${this.baseUrl}/pages/${pageNumber}`).pipe(
      map((response) => ({
        ...response,
        surahs: response.surahs ?? [],
        verses: response.verses ?? [],
        layout_lines: response.layout_lines ?? [],
      })),
      catchError((error: unknown) => {
        this.pageCache.delete(pageNumber);
        return throwError(() => new Error(this.toErrorMessage(error, 'Unable to load Quran page.')));
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.pageCache.set(pageNumber, request$);
    return request$;
  }

  preloadPages(pageNumbers: Array<number | null | undefined>): void {
    const uniquePageNumbers = Array.from(
      new Set(
        pageNumbers.filter((pageNumber): pageNumber is number =>
          pageNumber != null
          &&
          Number.isInteger(pageNumber)
          && pageNumber >= QURAN_MIN_PAGE
          && pageNumber <= QURAN_TOTAL_PAGES
        )
      )
    );

    for (const pageNumber of uniquePageNumbers) {
      this.getPage(pageNumber).pipe(take(1)).subscribe({
        error: () => undefined,
      });
    }
  }

  getSurahs(): Observable<SurahListResponse> {
    return this.http.get<SurahListResponse>(`${environment.apiBase}/quran/surahs`).pipe(
      catchError((error: unknown) =>
        throwError(() => new Error(this.toErrorMessage(error, 'Unable to load surahs.')))
      ),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  getSurahAyahs(surah: number): Observable<AyahsResponse> {
    const params = new HttpParams().set('surah', String(surah)).set('pageSize', '400');
    return this.http.get<AyahsResponse>(`${environment.apiBase}/ar/quran/ayahs`, { params }).pipe(
      catchError((error: unknown) =>
        throwError(() => new Error(this.toErrorMessage(error, 'Unable to load ayahs.')))
      )
    );
  }

  resolveSurahStartPage(surah: number): Observable<number | null> {
    return this.getMenu().pipe(
      map((menu) => menu.surahs.find((item) => item.surah === surah)?.start_page ?? null)
    );
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const responseMessage = this.readErrorMessage(error.error);
      return responseMessage ?? error.message ?? fallback;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  }

  private readErrorMessage(payload: unknown): string | null {
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const value = payload.error;
      return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
    }

    return null;
  }
}
