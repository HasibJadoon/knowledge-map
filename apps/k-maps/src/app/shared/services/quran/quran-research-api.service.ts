import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BackendApiService } from '../backend-api.service';
import type {
  QrScholar,
  QrScholarWork,
  QrTafsirEntry,
  QrIrabSource,
  QrIrabEntry,
  QrLemma,
  QrLemmaOccurrence,
  QrRoot,
  QrPaginated,
} from '../../models/quran/qr.models';

@Injectable({ providedIn: 'root' })
export class QuranResearchApiService {
  private readonly api = inject(BackendApiService);

  // ── Tafsir ────────────────────────────────────────────────────────────────

  getScholars(): Observable<{ scholars: QrScholar[] }> {
    return this.api.getData('qr', ['scholars']);
  }

  getWorks(workType?: 'tafsir' | 'irab'): Observable<{ works: QrScholarWork[] }> {
    const params = workType ? new HttpParams().set('work_type', workType) : undefined;
    return this.api.getData('qr', ['works'], params ? { params } : undefined);
  }

  getTafsirEntries(
    surah: number,
    ayah?: number,
    workId?: string,
    page = 1,
    limit = 300,
  ): Observable<QrPaginated<QrTafsirEntry>> {
    let params = new HttpParams().set('surah', String(surah)).set('page', String(page)).set('limit', String(limit));
    if (ayah !== undefined) params = params.set('ayah', String(ayah));
    if (workId)             params = params.set('work_id', workId);
    return this.api.getData('qr', ['tafsir'], { params });
  }

  // ── Iraab ─────────────────────────────────────────────────────────────────

  getIrabSources(): Observable<{ sources: QrIrabSource[] }> {
    return this.api.getData('qr', ['irab', 'book-sources']);
  }

  getIrabEntries(
    surah: number,
    ayah?: number,
    sourceSlug?: string,
    page = 1,
    limit = 500,
  ): Observable<QrPaginated<QrIrabEntry>> {
    let params = new HttpParams().set('surah', String(surah)).set('page', String(page)).set('limit', String(limit));
    if (ayah !== undefined) params = params.set('ayah', String(ayah));
    if (sourceSlug)         params = params.set('source_slug', sourceSlug);
    return this.api.getData('qr', ['irab', 'book-entries'], { params });
  }

  // ── Lexicon ───────────────────────────────────────────────────────────────

  searchRoots(q: string): Observable<{ roots: QrRoot[] }> {
    const params = new HttpParams().set('q', q);
    return this.api.getData('qr', ['lexicon', 'roots'], { params });
  }

  getLemmasByRoot(root: string): Observable<QrPaginated<QrLemma>> {
    const params = new HttpParams().set('root', root).set('limit', '200');
    return this.api.getData('qr', ['lexicon', 'lemmas'], { params });
  }

  searchLemmas(q: string): Observable<QrPaginated<QrLemma>> {
    const params = new HttpParams().set('q', q).set('limit', '50');
    return this.api.getData('qr', ['lexicon', 'lemmas'], { params });
  }

  getLemmaOccurrences(
    lemmaId: string,
    page = 1,
    limit = 300,
  ): Observable<{ lemma: QrLemma; occurrences: QrLemmaOccurrence[]; total: number }> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.api.getData('qr', ['lexicon', 'lemmas', lemmaId, 'occurrences'], { params });
  }
}
