// ─── CONTENT service client (from QR) ────────────────────────────────────────

import { callService } from '../../../shared/src/service-client';
import type { QuranEnv } from '../env';

export interface DocumentMeta {
  id: string;         // CM:ULID
  title: string;
  doc_type: string;
  created_at: string;
}

export class CmClient {
  constructor(private fetcher: Fetcher) {}

  getDocumentsByRef(
    typedRef: string,
  ): Promise<{ ok: true; data: DocumentMeta[] }> {
    return callService(
      this.fetcher,
      `/cm/documents?ref=${encodeURIComponent(typedRef)}`,
    );
  }
}

export function createCmClient(env: QuranEnv): CmClient | null {
  return env.CONTENT ? new CmClient(env.CONTENT) : null;
}
