import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BackendApiService } from './backend-api.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QrScholarWork {
  id: string;
  scholar_id: string;
  title_ar: string;
  title_en: string | null;
  work_type: string;
  composition_year_ce: number | null;
  volumes: number | null;
  scholar_name_ar: string;
  scholar_name_en: string | null;
  era: string | null;
  madhab: string | null;
  specialization: string | null;
  death_year_hijri: number | null;
  death_year_ce: number | null;
  entry_count: number;
}

export interface QrTafsirEntry {
  id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  content_ar: string;
  content_en: string | null;
  source_page: string | null;
  scholar: { name_ar: string; name_en: string | null } | null;
  work: { title_ar: string; title_en: string | null } | null;
  ayah_text: string | null;
}

export interface QrIrabSource {
  id: string;
  source_slug: string;
  source_title_ar: string;
  source_title_en: string | null;
  entry_count: number;
}

export interface QrIrabEntry {
  id: string;
  ayah_key: string;
  surah: number;
  ayah_from: number;
  target_text_ar: string | null;
  irab_text_ar: string;
  grammar_role_ar: string | null;
  grammar_case_ar: string | null;
  mahal_ar: string | null;
  entry_order: number;
  ayah_text: string | null;
}

export interface QrLemma {
  id: string;
  lemma_text: string;
  root: string;
  total_occurrences: number;
}

export interface QrLemmaOccurrence {
  id: string;
  surah: number;
  ayah: number;
  word_index: number;
  ayah_text: string | null;
}

export interface QrRoot {
  root: string;
  lemma_count: number;
  total_occurrences: number;
}

export interface QrPaginated<T> {
  rows: T[];
  total: number;
  page: number;
  per_page: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class QuranResearchApiService {
  private readonly api = inject(BackendApiService);

  // ── Tafsir ──────────────────────────────────────────────────────────────

  getWorks(workType?: 'tafsir' | 'irab'): Observable<{ works: QrScholarWork[] }> {
    const params = workType ? new HttpParams().set('work_type', workType) : undefined;
    return this.api.getData('qr', ['works'], params ? { params } : undefined);
  }

  getTafsirEntries(surah: number, workId?: string, page = 1, limit = 300): Observable<QrPaginated<QrTafsirEntry>> {
    let params = new HttpParams().set('surah', String(surah)).set('page', String(page)).set('limit', String(limit));
    if (workId) params = params.set('work_id', workId);
    return this.api.getData('qr', ['tafsir'], { params });
  }

  // ── Iraab ────────────────────────────────────────────────────────────────

  getIrabSources(): Observable<{ sources: QrIrabSource[] }> {
    return this.api.getData('qr', ['irab', 'book-sources']);
  }

  getIrabEntries(surah: number, sourceSlug?: string, page = 1, limit = 500): Observable<QrPaginated<QrIrabEntry>> {
    let params = new HttpParams().set('surah', String(surah)).set('page', String(page)).set('limit', String(limit));
    if (sourceSlug) params = params.set('source_slug', sourceSlug);
    return this.api.getData('qr', ['irab', 'book-entries'], { params });
  }

  // ── Lexicon ──────────────────────────────────────────────────────────────

  searchRoots(q: string): Observable<{ roots: QrRoot[] }> {
    return this.api.getData('qr', ['lexicon', 'roots'], { params: new HttpParams().set('q', q) });
  }

  getLemmasByRoot(root: string): Observable<QrPaginated<QrLemma>> {
    return this.api.getData('qr', ['lexicon', 'lemmas'], { params: new HttpParams().set('root', root).set('limit', '200') });
  }

  searchLemmas(q: string): Observable<QrPaginated<QrLemma>> {
    return this.api.getData('qr', ['lexicon', 'lemmas'], { params: new HttpParams().set('q', q).set('limit', '50') });
  }

  getLemmaOccurrences(lemmaId: string): Observable<{ lemma: QrLemma; occurrences: QrLemmaOccurrence[]; total: number }> {
    return this.api.getData('qr', ['lexicon', 'lemmas', lemmaId, 'occurrences'], { params: new HttpParams().set('limit', '300') });
  }
}
