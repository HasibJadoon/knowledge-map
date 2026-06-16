import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { BackendApiService } from '../core/backend-api.service';

/** One curated "lens" section of a five-lens root entry. */
export interface FiveLensSection {
  id: string;
  section_seq: number;
  heading_ar: string | null;
  heading_norm: string | null;
  section_type: string;
  text_ar: string | null;
  text_en: string | null;
  page_no: number | null;
}

/** The root entry header for a five-lens lookup. */
export interface FiveLensEntry {
  id: string;
  source_slug: string;
  root_text: string;
  root_norm: string;
  entry_text_ar: string | null;
  entry_text_en: string | null;
  source_url: string | null;
  page_start: number | null;
  page_end: number | null;
  volume_no: number | null;
  status: string;
}

/** Response payload from GET /api/al/lexicon/five-lens/:rootNorm.
 *  `found: false` is the normal empty state for a root without a curated
 *  five-lens entry — it is not an error. */
export interface FiveLensResult {
  found: boolean;
  root_norm: string;
  root_text: string | null;
  entry: FiveLensEntry | null;
  lenses: FiveLensSection[];
}

/**
 * Display-only client for the curated "Five-Lens" root lexicon. Backed by the
 * km-ar-linguistics-worker (DB_AL / km_arabic_linguistic) via the backend
 * gateway. Read-only — never writes notes or documents.
 */
@Injectable({ providedIn: 'root' })
export class FiveLensLexiconService {
  private readonly api = inject(BackendApiService);

  /** Look up the five-lens entry for a root (raw or normalized — the worker
   *  normalizes again). Resolves to `found: false` when no entry exists. */
  getByRoot(root: string): Observable<FiveLensResult> {
    return this.api.getData<FiveLensResult>('al', ['lexicon', 'five-lens', root]);
  }
}
