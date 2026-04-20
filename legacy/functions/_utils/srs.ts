import type { D1Database } from '@cloudflare/workers-types';

const SRS_TABLE_CANDIDATES = ['km_srs', 'ar_srs'] as const;

export type SrsTableName = (typeof SRS_TABLE_CANDIDATES)[number];

export async function resolveSrsTable(db: D1Database): Promise<SrsTableName> {
  for (const table of SRS_TABLE_CANDIDATES) {
    try {
      await db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).first();
      return table;
    } catch {
      // Keep probing until we find the active SRS table.
    }
  }

  return 'km_srs';
}
