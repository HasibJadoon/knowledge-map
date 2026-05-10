import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BackendApiService } from './backend-api.service';

// ─── Types — classical source chunks (/al/lexicon/dict/*) ────────────────────

export interface AlDictSource {
  slug: string;
  title_ar: string;
  title_en: string;
  author: string;
  period: string;
  total: number;
  roots: number;
}

export interface AlDictEntry {
  id: string;
  source_slug: string;
  heading_norm: string | null;
  text_ar: string;
  text_en: string | null;
  page_no: number | null;
  volume_no: number | null;
  is_bilingual?: boolean;
}

export interface AlRootSourceResult {
  slug: string;
  title_ar: string;
  title_en: string;
  author: string;
  entries: AlDictEntry[];
  entry_count: number;
}

export interface AlRootResult {
  root: {
    text_ar: string;
    letters: string | null;
    meaning_ar: string | null;
    meaning_en: string | null;
    frequency_quran: number | null;
  };
  sources: AlRootSourceResult[];
  source_count: number;
  lemma_count: number;
}

// ─── Types — structured lexicon entries (/al/lexicon/entries/*) ──────────────

export interface CitationChip {
  abbr:     string;
  label:    string;
  label_ar: string;
  author:   string;
}

export interface LexEntry {
  id:           string;
  heading_ar:   string | null;
  page_label:   string | null;
  page:         number | null;
  type:         string;
  definition:   string | null;
  has_gaps:     boolean;
  arabic_forms: string[];
  ref_sources:  CitationChip[];
}

export interface LexLexicon {
  slug:     string;
  title:    string;
  title_ar: string;
  author:   string;
  period:   string;
  count:    number;
  entries:  LexEntry[];
}

export interface LexRootResult {
  root:     string;
  source:   string | null;
  total:    number;
  lexicons: LexLexicon[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AlDictionaryApiService {
  private readonly api = inject(BackendApiService);

  getSources(): Observable<{ sources: AlDictSource[]; total: number }> {
    return this.api.getData('al', ['lexicon', 'dict', 'sources']);
  }

  getRootEntries(root: string, limit = 10): Observable<AlRootResult> {
    const params = new HttpParams().set('limit', String(limit));
    return this.api.getData('al', ['lexicon', 'dict', 'root', root], { params });
  }

  getStructuredRootEntries(root: string, limit = 50): Observable<LexRootResult> {
    const params = new HttpParams().set('limit', String(limit));
    return this.api.getData<LexRootResult>('al', ['lexicon', 'entries', 'root', root], { params });
  }
}
