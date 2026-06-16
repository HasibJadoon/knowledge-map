import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { BackendApiService } from '../core/backend-api.service';

// ---- models ----------------------------------------------------------------

export interface QuranWord {
  surah: number;
  ayah: number;
  wordIndex: number;
  text: string; // e.g. "زُلْفَىٰ"
  root?: string; // normalized root, e.g. "زلف"  (from qr_word_occurrences.root)
  lemma?: string;
}

export interface FiveLens {
  seq: number;
  headingAr: string | null; // صَرْف / إعراب / دلالة / بلاغة / ترجمة
  labelEn: string; // Morphology / Syntax / ...
  html: string; // curated, sanitized bilingual HTML body
}

export interface FiveLensEntry {
  found: boolean;
  entry?: {
    id: string;
    root: string; // "زلف"
    rootSpaced: string; // "ز ل ف"
    lemmaAr: string | null; // vocalized lemma, e.g. "زُلْفَىٰ"
    translit: string | null; // e.g. "zulfā"
    status: string;
  };
  ayah?: { titleAr: string | null; titleEn: string | null; surahName: string | null; html: string } | null;
  lenses?: FiveLens[];
  occurrences?: { html: string; refs: string[] };
  sources?: Record<string, string[]>; // { lexicon:[...], tafsir:[...], irab:[...] }
}

// ---- service ---------------------------------------------------------------

/**
 * Display-only client for the curated "Five-Lens" root lexicon. Backed by the
 * km-ar-linguistics-worker (DB_AL / km_arabic_linguistic) via the backend
 * gateway at /api/al/lexicon/five-lens/:rootNorm. Read-only — never writes
 * notes or documents.
 */
@Injectable({ providedIn: 'root' })
export class FiveLensLexiconService {
  private readonly api = inject(BackendApiService);

  /** Cheap per-root cache so the modal re-opens instantly. */
  private readonly cache = new Map<string, FiveLensEntry>();

  /** Look up the five-lens entry for a root (raw or normalized — the worker
   *  normalizes again). Resolves to `{ found: false }` when no entry exists or
   *  the request fails, so the modal always lands on a defined state. */
  getFiveLens(rootNorm: string): Observable<FiveLensEntry> {
    const cached = this.cache.get(rootNorm);
    if (cached) return of(cached);

    return this.api.getData<FiveLensEntry>('al', ['lexicon', 'five-lens', rootNorm]).pipe(
      map((data) => data ?? { found: false }),
      tap((data) => this.cache.set(rootNorm, data)),
      catchError(() => of({ found: false } as FiveLensEntry)),
    );
  }
}
