import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  QURAN_MIN_PAGE,
  QURAN_TOTAL_PAGES,
  QuranMenuResponse,
  QuranPageResponse,
} from '../models/quran-reader.model';

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
