// ─── WORLDVIEW service client (from QR) ──────────────────────────────────────

import { callService } from '../../../shared/src/service-client';
import type { QuranEnv } from '../env';

export interface WorldviewNodeSummary {
  id: string;          // WV:ULID
  node_type: string;
  title: string;
  summary: string | null;
}

export class WvClient {
  constructor(private fetcher: Fetcher) {}

  getNodesByQuranScope(
    surah: number,
    from: number,
    to: number,
  ): Promise<{ ok: true; data: WorldviewNodeSummary[] }> {
    return callService(
      this.fetcher,
      `/wv/nodes?qr_scope=${surah}:${from}-${to}`,
    );
  }
}

export function createWvClient(env: QuranEnv): WvClient | null {
  return env.WORLDVIEW ? new WvClient(env.WORLDVIEW) : null;
}
