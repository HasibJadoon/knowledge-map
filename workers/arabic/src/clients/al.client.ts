// ─── AR_LINGUISTICS client (from AR) ──────────────────────────────────────────
// Used by vocabulary and grammar routes to resolve lemma/root data.

import { callService } from '../../../shared/src/service-client';
import type { ArabicEnv } from '../env';

export class AlClientFromAr {
  constructor(private fetcher: Fetcher) {}

  getLemma(id: string) {
    return callService(this.fetcher, `/al/lemmas/${encodeURIComponent(id)}`);
  }

  getNahwConcept(id: string) {
    return callService(this.fetcher, `/al/nahw/${encodeURIComponent(id)}`);
  }

  getBalaghaConcept(id: string) {
    return callService(this.fetcher, `/al/balagha/${encodeURIComponent(id)}`);
  }
}

export function createAlClient(env: ArabicEnv): AlClientFromAr | null {
  return env.AR_LINGUISTICS ? new AlClientFromAr(env.AR_LINGUISTICS) : null;
}
