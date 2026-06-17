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

export interface FiveLensLedgerPanel {
  tier: string;
  word: string;
  case: string;
  role: string;
  chips: string[];
}

export interface FiveLensLedger {
  claimed: FiveLensLedgerPanel;
  granted: FiveLensLedgerPanel;
  note?: string;
}

export interface FiveLens {
  seq: number;
  headingAr: string | null; // صَرْف / إعراب / دلالة / بلاغة / ترجمة
  labelEn: string; // Morphology / Syntax / ...
  html: string; // curated, sanitized bilingual HTML body
  ledger?: FiveLensLedger | null; // intratextual ledger (balagha lens only)
}

export interface FiveLensFamily {
  headingAr: string;
  gloss: string;
  refs: string[];
}

export interface FiveLensSense {
  ar: string;
  en: string;
}

export interface FiveLensForm {
  form: string; // I / IV / V / VIII
  wazn: string; // فَعَلَ ...
  past: string; // ماضٍ
  present: string; // مضارع
  masdar: string; // مصدر
  gloss: string;
}

export interface FiveLensMorphology {
  note: string | null;
  forms: FiveLensForm[];
  keyword: { word: string; pattern: string; kind: string; gloss: string } | null;
}

export interface FiveLensAnchor {
  en: string;
  note: string;
}

export interface FiveLensRetention {
  hook: string; // mnemonic (curated HTML)
  anchors: FiveLensAnchor[]; // English vocabulary constellation
  contrast: string | null;
  retrieval: string | null;
}

export interface FiveLensEntry {
  found: boolean;
  entry?: {
    id: string;
    root: string; // "زلف"
    rootSpaced: string; // "ز ل ف"
    lemmaAr: string | null; // vocalized lemma, e.g. "زُلْفَىٰ"
    translit: string | null; // e.g. "zulfā"
    sense: string | null; // "nearness as elevated standing"
    pattern: string | null; // "فُعْلَىٰ"
    surahNameAr: string | null; // "سورة الزُّمَر"
    status: string;
  };
  figure?: { html: string; label: string | null } | null;
  meaning?: { senses: FiveLensSense[] } | null;
  morphology?: FiveLensMorphology | null;
  retention?: FiveLensRetention | null;
  ayah?: { titleAr: string | null; titleEn: string | null; surahName: string | null; html: string } | null;
  lenses?: FiveLens[];
  occurrences?: { html: string; refs: string[]; families: FiveLensFamily[] };
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
