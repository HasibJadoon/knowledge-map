import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';
import {
  QURAN_MUSHAF_LINE_COUNT,
  QURAN_TOTAL_PAGES,
  QuranBrowseSurah,
  QuranLayoutLine,
  QuranPageMeta,
  QuranPageResponse,
} from '../../../shared/models/quran-reader.model';
import { QuranReaderService } from '../../../shared/services/quran-reader.service';
import {
  QuranReaderFallbackVerseViewModel,
  QuranReaderLayoutSlotViewModel,
  QuranReaderPageLineViewModel,
  QuranReaderPageViewModel,
} from '../models/quran-reader-view.model';

@Injectable({ providedIn: 'root' })
export class QuranReaderPageService {
  private readonly api = inject(QuranReaderService);
  private readonly pageViewCache = new Map<number, Observable<QuranReaderPageViewModel>>();

  getPage(pageNumber: number): Observable<QuranReaderPageViewModel> {
    const cached = this.pageViewCache.get(pageNumber);
    if (cached) {
      return cached;
    }

    const request$ = this.api.getPage(pageNumber).pipe(
      map((response) => this.toPageViewModel(response)),
      catchError((error: unknown) => {
        this.pageViewCache.delete(pageNumber);
        return throwError(() => error instanceof Error ? error : new Error('Unable to load Quran page.'));
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.pageViewCache.set(pageNumber, request$);
    return request$;
  }

  preloadAdjacentPages(pageNumber: number): void {
    this.api.preloadPages([pageNumber - 1, pageNumber + 1]);
  }

  resolveSurahStartPage(surah: number): Observable<number | null> {
    return this.api.resolveSurahStartPage(surah);
  }

  private toPageViewModel(response: QuranPageResponse): QuranReaderPageViewModel {
    const primarySurah = response.surahs[0] ?? null;
    const title = this.buildPrimaryTitle(primarySurah, response.page.number, response.surahs.length);
    const arabicTitle = response.surahs.length === 1 ? primarySurah?.name_ar ?? null : null;
    const referenceLabel = `${response.page.start_ref} - ${response.page.end_ref}`;
    const footerLabel = this.buildFooterLabel(response.page, response.surahs.length);
    const structuredLines = this.buildStructuredLines(response.page.number, response.layout_lines);

    return {
      header: {
        title,
        arabicTitle,
        subtitle: referenceLabel,
      },
      meta: {
        pageNumber: response.page.number,
        totalPages: QURAN_TOTAL_PAGES,
        pageLabel: `Page ${response.page.number}`,
        prevPage: response.page.prev_page,
        nextPage: response.page.next_page,
        verseCount: response.page.verse_count,
        startRef: response.page.start_ref,
        endRef: response.page.end_ref,
        referenceLabel,
        footerLabel,
      },
      surahs: response.surahs,
      primarySurah,
      layout: {
        hasStructuredLines: structuredLines.length > 0,
        slotCount: this.resolveSlotCount(response.layout_lines),
        slots: this.buildLayoutSlots(structuredLines, response.layout_lines),
      },
      fallbackVerses: response.verses.map((verse): QuranReaderFallbackVerseViewModel => ({
        id: verse.id,
        verseKey: verse.verse_key,
        text: verse.verse_full ?? verse.text_diacritics ?? verse.text,
      })),
    };
  }

  private buildPrimaryTitle(
    primarySurah: QuranBrowseSurah | null,
    pageNumber: number,
    surahCount: number
  ): string {
    const primaryLabel = primarySurah
      ? primarySurah.meta.name_simple ?? primarySurah.name_en ?? `Surah ${primarySurah.surah}`
      : null;

    if (!primaryLabel) {
      return `Page ${pageNumber}`;
    }

    return surahCount > 1 ? `${primaryLabel} + ${surahCount - 1}` : primaryLabel;
  }

  private buildFooterLabel(page: QuranPageMeta, surahCount: number): string | null {
    const parts: string[] = [];

    if (surahCount > 1) {
      parts.push(`${surahCount} surahs`);
    }

    if (page.juzs.length > 0) {
      parts.push(`Juz ${page.juzs.join(', ')}`);
    }

    if (page.hizbs.length > 0) {
      parts.push(`Hizb ${page.hizbs.join(', ')}`);
    }

    if (page.verse_count > 0) {
      parts.push(`${page.verse_count} ayahs`);
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  }

  private buildStructuredLines(
    pageNumber: number,
    layoutLines: QuranLayoutLine[]
  ): QuranReaderPageLineViewModel[] {
    return layoutLines
      .filter((line) => line.text.trim().length > 0)
      .map((line) => ({
        id: `${pageNumber}-${line.line_number}-${line.line_type}`,
        slot: line.line_number,
        text: line.text,
        lineType: line.line_type,
        isCentered: line.is_centered || line.line_type !== 'ayah',
      }));
  }

  private buildLayoutSlots(
    structuredLines: QuranReaderPageLineViewModel[],
    rawLayoutLines: QuranLayoutLine[]
  ): QuranReaderLayoutSlotViewModel[] {
    const slotCount = this.resolveSlotCount(rawLayoutLines);
    const linesBySlot = new Map(structuredLines.map((line) => [line.slot, line]));

    return Array.from({ length: slotCount }, (_, index) => {
      const slot = index + 1;
      return {
        slot,
        line: linesBySlot.get(slot) ?? null,
      };
    });
  }

  private resolveSlotCount(layoutLines: QuranLayoutLine[]): number {
    const highestLine = layoutLines.reduce((maxLine, line) => Math.max(maxLine, line.line_number), 0);
    return Math.max(QURAN_MUSHAF_LINE_COUNT, highestLine);
  }
}
