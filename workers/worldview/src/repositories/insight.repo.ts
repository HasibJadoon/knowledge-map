// ─── InsightRepo — wv_insight_suggestions ─────────────────────────────────────
// AI pipeline → Hub Review Queue → approved wv_nodes/edges.
// Claude writes suggestions here; humans approve/reject in the Hub UI.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface InsightSuggestion {
  id: string;               // WV:ULID
  suggestion_type: string;  // node | edge | cluster
  payload_json: string;     // JSON: the extracted knowledge payload
  status: string;           // suggested | approved | edited | rejected | saved
  batch_id: string | null;  // WV:ULID → wv_distill_batches
  source_chunk_ref: string | null; // AL:ULID → ar_ling_source_chunks
  created_at: string;
  reviewed_at: string | null;
}

export interface SuggestionCreate {
  suggestion_type: string;
  payload_json: string;
  batch_id?: string | null;
  source_chunk_ref?: string | null;
}

const COLS = `id, suggestion_type, payload_json, status, batch_id,
              source_chunk_ref, created_at, reviewed_at`;

export class InsightRepo {
  constructor(private db: D1Database) {}

  /** Paginated review queue — suggestions pending human review. */
  queue(status: string | null, batchId: string | null, opts: PaginateOptions = {}) {
    const conds: string[]  = [];
    const params: unknown[] = [];
    if (status)  { conds.push('status = ?');   params.push(status); }
    if (batchId) { conds.push('batch_id = ?'); params.push(batchId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<InsightSuggestion>(
      this.db,
      `SELECT ${COLS} FROM wv_insight_suggestions ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM wv_insight_suggestions ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<InsightSuggestion | null> {
    return queryOne<InsightSuggestion>(
      this.db, `SELECT ${COLS} FROM wv_insight_suggestions WHERE id = ?`, [id],
    );
  }

  async create(input: SuggestionCreate): Promise<InsightSuggestion> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_insight_suggestions
         (id, suggestion_type, payload_json, status, batch_id, source_chunk_ref, created_at)
       VALUES (?, ?, ?, 'suggested', ?, ?, ?)`,
      [id, input.suggestion_type, input.payload_json,
       input.batch_id ?? null, input.source_chunk_ref ?? null, now],
    );
    return (await this.findById(id))!;
  }

  /** Update status (approve / reject / mark saved). Records reviewed_at timestamp. */
  async setStatus(
    id: string,
    status: 'approved' | 'rejected' | 'edited' | 'saved',
    payload_json?: string,
  ): Promise<InsightSuggestion | null> {
    const now  = new Date().toISOString();
    const sets = ['status = ?', 'reviewed_at = ?'];
    const vals: unknown[] = [status, now];
    if (payload_json !== undefined) { sets.push('payload_json = ?'); vals.push(payload_json); }
    vals.push(id);
    await execute(
      this.db,
      `UPDATE wv_insight_suggestions SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findById(id);
  }
}
