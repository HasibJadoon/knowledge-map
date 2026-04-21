// ─── SrsRepo — Quran SRS review queue ──────────────────────────────────────────
// Table: qr_srs_items
// item_key format: '{surahNo}:{ayahNo}' — surah is extracted via SQL SUBSTR.

import { query, queryOne } from '../../../shared/src/db';

// ─── types ─────────────────────────────────────────────────────────────────────

export type SrsFilter = 'due' | 'upcoming' | 'all' | 'suspended';

export interface SrsItem {
  id: string;
  item_type: string;
  item_key: string;
  surah_id: number | null;       // extracted from item_key
  card_json: string | null;
  status: string;
  due_at: string | null;
  last_review_at: string | null;
  interval_days: number | null;
  ease: number | null;
  reps: number | null;
  lapses: number | null;
  last_rating: string | null;
  created_at: string;
  updated_at: string;
}

export interface SrsSummary {
  due: number;
  upcoming: number;
  suspended: number;
  total: number;
}

// ─── SQL helper — extracts surah number from 'surah:ayah' item_key format ─────

const SURAH_EXPR = `CASE
  WHEN INSTR(item_key, ':') > 0
    THEN CAST(SUBSTR(item_key, 1, INSTR(item_key, ':') - 1) AS INTEGER)
  ELSE NULL
END`;

// ─── SrsRepo ───────────────────────────────────────────────────────────────────

export class SrsRepo {
  constructor(private db: D1Database) {}

  /**
   * List SRS items with their summary counts.
   *
   * @param filter  - 'due' | 'upcoming' | 'all' | 'suspended'
   * @param surahId - optional surah filter (extracts from item_key)
   * @param limit   - max items to return (capped at 250)
   */
  async list(
    filter: SrsFilter = 'due',
    surahId?: number | null,
    limit = 80,
  ): Promise<{ filter: SrsFilter; items: SrsItem[]; summary: SrsSummary }> {
    const now       = new Date().toISOString();
    const safeLimit = Math.max(1, Math.min(250, limit));

    // Scope WHERE — shared between items query and summary query
    const scopeWhere: string[] = [`status != 'archived'`];
    const scopeParams: unknown[] = [];
    if (surahId) {
      scopeWhere.push(`(${SURAH_EXPR}) = ?`);
      scopeParams.push(surahId);
    }

    // Filter WHERE — adds filter-specific clauses on top of scope
    const filterWhere  = [...scopeWhere];
    const filterParams = [...scopeParams];
    if (filter === 'due') {
      filterWhere.push(`status = 'active'`, `due_at IS NOT NULL`, `due_at <= ?`);
      filterParams.push(now);
    } else if (filter === 'upcoming') {
      filterWhere.push(`status = 'active'`, `(due_at IS NULL OR due_at > ?)`);
      filterParams.push(now);
    } else if (filter === 'suspended') {
      filterWhere.push(`status = 'suspended'`);
    }
    // 'all' — no extra filter clauses

    const [items, summaryRow] = await Promise.all([
      query<SrsItem>(
        this.db,
        `SELECT id, item_type, item_key,
                (${SURAH_EXPR}) AS surah_id,
                card_json, status, due_at, last_review_at,
                interval_days, ease, reps, lapses, last_rating,
                created_at, updated_at
         FROM qr_srs_items
         WHERE ${filterWhere.join(' AND ')}
         ORDER BY
           CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,
           due_at ASC,
           id ASC
         LIMIT ?`,
        [...filterParams, safeLimit],
      ),
      queryOne<{ due: number; upcoming: number; suspended: number; total: number }>(
        this.db,
        `SELECT
           SUM(CASE WHEN status = 'active' AND due_at IS NOT NULL AND due_at <= ? THEN 1 ELSE 0 END) AS due,
           SUM(CASE WHEN status = 'active' AND (due_at IS NULL OR due_at > ?)      THEN 1 ELSE 0 END) AS upcoming,
           SUM(CASE WHEN status = 'suspended'                                       THEN 1 ELSE 0 END) AS suspended,
           COUNT(*) AS total
         FROM qr_srs_items
         WHERE ${scopeWhere.join(' AND ')}`,
        [now, now, ...scopeParams],
      ),
    ]);

    return {
      filter,
      items,
      summary: {
        due:       Number(summaryRow?.due       ?? 0),
        upcoming:  Number(summaryRow?.upcoming  ?? 0),
        suspended: Number(summaryRow?.suspended ?? 0),
        total:     Number(summaryRow?.total     ?? 0),
      },
    };
  }
}
