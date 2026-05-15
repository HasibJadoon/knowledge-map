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
  QrTafsirDisplaySource,
  QrIraabDisplaySource,
  QrTafsirGroupDisplayPayload,
  QrIraabGroupDisplayPayload,
  QrTafsirDisplayBlock,
  QrDisplaySearchHit,
  QrDisplayMadhab,
  QrDisplayEra,
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

  // ── Tafsir display layer (migration 012) ──────────────────────────────────

  getTafsirDisplaySources(): Observable<{ sources: QrTafsirDisplaySource[] }> {
    return this.api.getData('qr', ['tafsir', 'display', 'sources']);
  }

  getTafsirDisplay(
    surah: number,
    ayah: number,
    opts: { scholar_id?: string; work_id?: string; madhab?: QrDisplayMadhab } = {},
  ): Observable<QrTafsirGroupDisplayPayload> {
    let params = new HttpParams().set('surah', String(surah)).set('ayah', String(ayah));
    if (opts.scholar_id) params = params.set('scholar_id', opts.scholar_id);
    if (opts.work_id)    params = params.set('work_id', opts.work_id);
    if (opts.madhab)     params = params.set('madhab', opts.madhab);
    return this.api.getData('qr', ['tafsir', 'display'], { params });
  }

  searchTafsirDisplay(
    q: string,
    opts: { surah?: number; scholar_id?: string; madhab?: QrDisplayMadhab; era?: QrDisplayEra; block_type?: string; limit?: number } = {},
  ): Observable<{ q: string; hits: QrDisplaySearchHit[] }> {
    let params = new HttpParams().set('q', q);
    if (opts.surah !== undefined) params = params.set('surah', String(opts.surah));
    if (opts.scholar_id)          params = params.set('scholar_id', opts.scholar_id);
    if (opts.madhab)              params = params.set('madhab', opts.madhab);
    if (opts.era)                 params = params.set('era', opts.era);
    if (opts.block_type)          params = params.set('block_type', opts.block_type);
    if (opts.limit !== undefined) params = params.set('limit', String(opts.limit));
    return this.api.getData('qr', ['tafsir', 'display', 'search'], { params });
  }

  compareTafsirDisplay(
    surah: number,
    ayah: number,
    scholarIds: string[],
  ): Observable<{ surah_no: number; ayah_no: number; scholar_ids: string[]; columns: Array<{ scholar_id: string; blocks: QrTafsirDisplayBlock[] }>; total_blocks: number }> {
    const params = new HttpParams()
      .set('surah', String(surah))
      .set('ayah', String(ayah))
      .set('scholar_ids', scholarIds.join(','));
    return this.api.getData('qr', ['tafsir', 'display', 'compare'], { params });
  }

  // ── Iʿrāb display layer (migration 011) ───────────────────────────────────

  getIraabDisplaySources(): Observable<{ sources: QrIraabDisplaySource[] }> {
    return this.api.getData('qr', ['iraab', 'display', 'sources']);
  }

  getIraabDisplay(
    surah: number,
    ayah: number,
    opts: { source_slug?: string } = {},
  ): Observable<QrIraabGroupDisplayPayload> {
    let params = new HttpParams().set('surah', String(surah)).set('ayah', String(ayah));
    if (opts.source_slug) params = params.set('source_slug', opts.source_slug);
    return this.api.getData('qr', ['iraab', 'display'], { params });
  }

  searchIraabDisplay(
    q: string,
    opts: { surah?: number; source_slug?: string; block_type?: string; limit?: number } = {},
  ): Observable<{ q: string; hits: QrDisplaySearchHit[] }> {
    let params = new HttpParams().set('q', q);
    if (opts.surah !== undefined) params = params.set('surah', String(opts.surah));
    if (opts.source_slug)         params = params.set('source_slug', opts.source_slug);
    if (opts.block_type)          params = params.set('block_type', opts.block_type);
    if (opts.limit !== undefined) params = params.set('limit', String(opts.limit));
    return this.api.getData('qr', ['iraab', 'display', 'search'], { params });
  }
}
