// ─── AR_LINGUISTICS service client (from QR) ─────────────────────────────────
// Wraps callService() with typed return shapes for the AL routes QR needs.
// Rule: QR never binds DB_AL directly — all AL data comes through this client.

import { callService } from '../../../shared/src/service-client';
import type { QuranEnv } from '../env';

export interface LemmaInfo {
  id: string;           // AL:ULID
  root_text: string | null;
  lemma_ar: string;
  pos: string | null;
  gloss_en: string | null;
}

export interface MorphologyInfo {
  id: string;           // AL:ULID
  form_ar: string;
  stem_type: string | null;
  pattern: string | null;
  tags: string | null;
}

export interface ExpressionItem {
  id: string;
  ayah: number;
  ar: string | null;
  en: string | null;
  type: string | null;
}

export class AlClient {
  constructor(private fetcher: Fetcher) {}

  getLemma(id: string): Promise<{ ok: true; data: LemmaInfo }> {
    return callService(this.fetcher, `/al/lemmas/${encodeURIComponent(id)}`);
  }

  /** Table-sourced expressions for a passage's surah:ayah range. */
  getExpressionsByQuran(
    surah: number,
    from: number,
    to: number,
  ): Promise<{ ok: true; data: ExpressionItem[] }> {
    return callService(
      this.fetcher,
      `/al/expressions/by-quran/${surah}?from=${from}&to=${to}`,
    );
  }

  getMorphology(id: string): Promise<{ ok: true; data: MorphologyInfo }> {
    return callService(this.fetcher, `/al/morphology/${encodeURIComponent(id)}`);
  }

  getLemmasByRoot(rootText: string): Promise<{ ok: true; data: LemmaInfo[] }> {
    return callService(
      this.fetcher,
      `/al/lemmas?root=${encodeURIComponent(rootText)}`,
    );
  }
}

/** Create an AlClient from a QuranEnv, or return null if binding is absent. */
export function createAlClient(env: QuranEnv): AlClient | null {
  return env.AR_LINGUISTICS ? new AlClient(env.AR_LINGUISTICS) : null;
}
