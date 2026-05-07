import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, take, throwError } from 'rxjs';
import { BackendApiService } from '../core/backend-api.service';
import {
  QURAN_MIN_PAGE,
  QURAN_TOTAL_PAGES,
  QuranBrowseJuz,
  QuranBrowseSurah,
  QuranMenuResponse,
  QuranPageAyahSlice,
  QuranPageVerse,
  QuranPageWord,
  QuranPageResponse,
} from '../../models/quran/quran-reader.model';

// ── Surah ayahs response (same shape as k-maps desktop) ──────────────────────
export interface QuranAyahWord {
  word_index: number;
  text: string;
  text_bare: string;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  morphology_tag: string | null;
}

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
  words?: QuranAyahWord[];  // present when ?words=1
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
  private readonly api = inject(BackendApiService);
  private readonly pageCache = new Map<number, Observable<QuranPageResponse>>();
  private readonly mushafPageCache = new Map<string, Observable<QuranPageResponse>>();

  private menuRequest$: Observable<QuranMenuResponse> | null = null;

  getMenu(): Observable<QuranMenuResponse> {
    if (!this.menuRequest$) {
      this.menuRequest$ = this.api.getData<QrMenuPayload>('qr', ['menu']).pipe(
        map((payload) => this.normalizeMenu(payload)),
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

    const request$ = this.api.getData<QrPagePayload>('qr', ['pages', pageNumber]).pipe(
      map((payload) => this.normalizePage(payload)),
      catchError((error: unknown) => {
        this.pageCache.delete(pageNumber);
        return throwError(() => new Error(this.toErrorMessage(error, 'Unable to load Quran page.')));
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.pageCache.set(pageNumber, request$);
    return request$;
  }

  getMushafPage(pageNumber: number, layout = 'qpc-v2-15-lines'): Observable<QuranPageResponse> {
    const cacheKey = `${layout}:${pageNumber}`;
    const cached = this.mushafPageCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const params = new HttpParams().set('layout', layout);
    const request$ = this.api.getData<QrPagePayload>('qr', ['mushaf', 'pages', pageNumber], { params }).pipe(
      map((payload) => this.normalizePage(payload)),
      catchError((error: unknown) => {
        this.mushafPageCache.delete(cacheKey);
        return throwError(() => new Error(this.toErrorMessage(error, 'Unable to load Quran mushaf page.')));
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.mushafPageCache.set(cacheKey, request$);
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
    return this.api.getData<QrMenuPayload>('qr', ['menu']).pipe(
      map((payload) => ({
        ok: true,
        surahs: payload.surahs.map((surah) => this.normalizeSurahListItem(surah)),
      })),
      catchError((error: unknown) =>
        throwError(() => new Error(this.toErrorMessage(error, 'Unable to load surahs.')))
      ),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  getSurahAyahs(surah: number, opts: { from?: number; to?: number; words?: boolean } = {}): Observable<AyahsResponse> {
    let params = new HttpParams().set('surah', String(surah));
    if (opts.from  !== undefined) params = params.set('from',  String(opts.from));
    if (opts.to    !== undefined) params = params.set('to',    String(opts.to));
    if (opts.words)               params = params.set('words', '1');
    return this.api.getData<QrAyah[]>('qr', ['ayahs'], { params }).pipe(
      map((ayahs) => ({
        ok: true,
        total: ayahs.length,
        results: ayahs.map((ayah) => ({
          surah: ayah.surah,
          ayah: ayah.ayah,
          text: ayah.text_display,
          text_uthmani: ayah.text_uthmani,
          text_uthmani_clean: ayah.text_uthmani_clean,
          text_bare: null,
          verse_mark: ayah.verse_mark,
          translation: ayah.translation,
          page_number: ayah.page_number,
          words: ayah.words,
        })),
      })),
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

  private normalizeMenu(payload: QrMenuPayload): QuranMenuResponse {
    const surahs = payload.surahs.map((surah) => this.normalizeBrowseSurah(surah));

    return {
      ok: true,
      stats: {
        total_pages: payload.stats.total_pages,
        total_surahs: payload.stats.total_surahs,
        total_juzs: payload.stats.total_juzs,
      },
      surahs,
      juzs: payload.juzs.map((juz): QuranBrowseJuz => ({
        juz: juz.juz,
        start_page: juz.surahs[0]?.page_start ?? null,
        end_page: null,
        ayah_count: 0,
        surahs: juz.surahs.map((surah) => this.normalizeBrowseSurah(surah)),
      })),
    };
  }

  private normalizePage(payload: QrPagePayload): QuranPageResponse {
    const verses = payload.ayahs.map((ayah, index): QuranPageVerse => {
      const verseKey = `${ayah.surah}:${ayah.ayah}`;
      const words = (ayah.words ?? []).map((word) => this.normalizePageWord(word));

      return {
        id: index + 1,
        surah: ayah.surah,
        ayah: ayah.ayah,
        surah_ayah: ayah.ayah,
        verse_key: verseKey,
        page: payload.page.number,
        juz: null,
        hizb: null,
        ruku: null,
        text: ayah.text_arabic,
        text_simple: ayah.text_arabic,
        text_diacritics: ayah.text_arabic,
        text_no_diacritics: ayah.text_arabic,
        verse_mark: ayah.verse_mark,
        verse_full: ayah.text_arabic,
        word_count: words.length,
        char_count: ayah.text_arabic.length,
        translation: ayah.translation,
        words,
      };
    });

    return {
      ok: true,
      page: {
        number: payload.page.number,
        prev_page: payload.page.prev_page,
        next_page: payload.page.next_page,
        verse_count: payload.page.ayah_count,
        start_ref: payload.page.start_ref,
        end_ref: payload.page.end_ref,
        juzs: [],
        hizbs: [],
      },
      surahs: payload.surahs.map((surah) => this.normalizeBrowseSurah(surah)),
      verses,
      layout_lines: payload.layout_lines.map((line) => ({
        line_number: line.line_number,
        line_type: line.line_type,
        is_centered: line.is_centered,
        surah_number: line.surah_number,
        text: line.text_arabic,
        text_simple: line.text_clean,
        ayahs: line.ayahs.map((ayah): QuranPageAyahSlice => ({
          surah: ayah.surah,
          ayah: ayah.ayah,
          verse_key: ayah.verse_key,
          marker: ayah.marker,
          is_complete: true,
          words: ayah.words.map((word) => this.normalizePageWord(word)),
        })),
      })),
    };
  }

  private normalizeBrowseSurah(surah: QrMenuSurah): QuranBrowseSurah {
    return {
      surah: surah.id,
      name_ar: surah.name_ar,
      name_en: surah.name_en,
      ayah_count: surah.ayah_count,
      start_page: surah.page_start,
      start_juz: surah.juz_start,
      meta: {
        name_simple: surah.name_transliteration ?? surah.name_en,
        revelation_place: surah.revelation_type,
        revelation_order: null,
        bismillah_pre: surah.id !== 9,
      },
    };
  }

  private normalizeSurahListItem(surah: QrMenuSurah): QuranSurahListItem {
    const transliteratedName = surah.name_transliteration ?? surah.name_en ?? `Surah ${surah.id}`;

    return {
      id: String(surah.id),
      surahNumber: surah.id,
      slug: transliteratedName.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      arabicName: surah.name_ar,
      transliteratedName,
      englishName: surah.name_en ?? transliteratedName,
      ayahCount: surah.ayah_count,
      revelationType: surah.revelation_type === 'madani' ? 'madani' : 'makki',
      juz: surah.juz_start,
    };
  }

  private normalizePageWord(word: QrPageWord): QuranPageWord {
    return {
      word_id: Number(String(word.id).replace(/\D/g, '').slice(-9)) || null,
      surah: word.surah,
      ayah: word.ayah,
      position: word.word_position,
      text: word.text_uthmani,
      simple: word.text_clean,
      translation: null,
      lemma: word.lx_lemma_ref,
      root: word.root_text,
      page: null,
      line: null,
    };
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

interface QrMenuPayload {
  stats: {
    total_pages: number;
    total_surahs: number;
    total_juzs: number;
    total_ayahs?: number;
  };
  surahs: QrMenuSurah[];
  juzs: Array<{ juz: number; surahs: QrMenuSurah[] }>;
}

interface QrMenuSurah {
  id: number;
  name_ar: string;
  name_en: string | null;
  name_transliteration: string | null;
  revelation_type: string | null;
  ayah_count: number;
  juz_start: number | null;
  page_start: number | null;
}

interface QrAyahWord {
  word_index: number;
  text: string;
  text_bare: string;
  root: string | null;
  lemma: string | null;
  pos: string | null;
  morphology_tag: string | null;
}

interface QrAyah {
  surah: number;
  ayah: number;
  text_display: string;
  text_uthmani_clean: string | null;
  text_uthmani: string | null;
  translation: string | null;
  verse_mark: string | null;
  page_number: number | null;
  words?: QrAyahWord[];
}

interface QrPagePayload {
  page: {
    number: number;
    prev_page: number | null;
    next_page: number | null;
    ayah_count: number;
    start_ref: string;
    end_ref: string;
  };
  surahs: QrMenuSurah[];
  ayahs: QrPageAyah[];
  layout_lines: QrPageLayoutLine[];
}

interface QrPageAyah {
  surah: number;
  ayah: number;
  text_arabic: string;
  verse_mark: string | null;
  translation: string | null;
  words: QrPageWord[];
}

interface QrPageLayoutLine {
  line_number: number;
  line_type: 'ayah' | 'surah_name' | 'basmallah';
  is_centered: boolean;
  surah_number: number | null;
  text_arabic: string;
  text_clean: string | null;
  ayahs: Array<{
    surah: number;
    ayah: number;
    verse_key: string;
    marker: string | null;
    words: QrPageWord[];
  }>;
}

interface QrPageWord {
  id: string;
  surah: number;
  ayah: number;
  word_position: number;
  text_uthmani: string | null;
  text_clean: string | null;
  lx_lemma_ref: string | null;
  root_text: string | null;
}
