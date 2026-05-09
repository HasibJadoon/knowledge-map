import { Injectable, inject } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BackendApiService } from './backend-api.service';

// ─── Types ────────────────────────────────────────────────────────────────────

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
}
