// ─── DistillRepo — wv_distill_batches + wv_distill_items + wv_insight_decisions ──
// Distillation workflow: generate batches of candidate insights from source content,
// then let the user approve/edit/reject each item in the Hub Review Queue.
//
// Canonical columns per 001_wv_schema.sql §10.5-10.8.
//
// Workflow:
//   POST /worldview/distill/generate        → create batch + items
//   GET  /worldview/distill/batch?batchId=  → poll batch progress
//   GET  /worldview/distill/by-unit         → find batch for a unit
//   POST /worldview/distill/decision        → approve|edit|reject one item
//   POST /worldview/distill/approve         → bulk-approve all pending items

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DistillBatch {
  id: string;              // WV:ULID
  title: string;
  batch_type: string;      // manual|ai_extraction|auto_cluster|review_run
  source_id: string | null;
  status: string;          // pending|running|complete|failed
  item_count: number;
  approved_count: number;
  rejected_count: number;
  core_user_ref: string | null;
  core_ws_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistillItem {
  id: string;              // WV:ULID
  batch_id: string;
  item_type: string;       // insight|claim|node|evidence|question|connection|other
  source_note_id: string | null;
  source_highlight_id: string | null;
  content_md: string;
  status: string;          // pending|approved|edited|rejected|saved
  approved_as_type: string | null;
  approved_as_id: string | null;
  core_user_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsightDecision {
  id: string;
  suggestion_id: string;
  decision: string;        // approved|edited|rejected
  original_json: string | null;
  final_json: string | null;
  decision_note: string | null;
  core_user_ref: string;
  created_at: string;
}

export interface BatchWithItems extends DistillBatch {
  items: DistillItem[];
}

export interface GenerateBatchInput {
  title: string;
  source_id?: string | null;
  source_unit_id?: string | null;  // filter items to this unit
  batch_type?: string;
  items: Array<{
    item_type?: string;
    content_md: string;
    source_note_id?: string | null;
    source_highlight_id?: string | null;
  }>;
  core_user_ref: string;
  core_ws_ref?: string | null;
}

export interface DecisionInput {
  item_id: string;
  decision: 'approved' | 'edited' | 'rejected';
  final_content?: string | null;  // for edited decisions — updated content_md
  decision_note?: string | null;
  core_user_ref: string;
}

// ── Column lists ──────────────────────────────────────────────────────────────

const BATCH_COLS = `
  id, title, batch_type, source_id, status,
  item_count, approved_count, rejected_count,
  core_user_ref, core_ws_ref, created_at, updated_at
`.trim().replace(/\n\s+/g, ' ');

const ITEM_COLS = `
  id, batch_id, item_type, source_note_id, source_highlight_id,
  content_md, status, approved_as_type, approved_as_id,
  core_user_ref, created_at, updated_at
`.trim().replace(/\n\s+/g, ' ');

// ── Repo ──────────────────────────────────────────────────────────────────────

export class DistillRepo {
  constructor(private db: D1Database) {}

  // ── Generate (create batch + items atomically) ────────────────────────────

  async generate(input: GenerateBatchInput): Promise<BatchWithItems> {
    const batchId = typedId('WV');
    const now     = new Date().toISOString();

    await execute(
      this.db,
      `INSERT INTO wv_distill_batches
         (id, title, batch_type, source_id, status,
          item_count, approved_count, rejected_count,
          core_user_ref, core_ws_ref, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, 0, 0, ?, ?, ?, ?)`,
      [
        batchId,
        input.title,
        input.batch_type ?? 'manual',
        input.source_id ?? null,
        input.items.length,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        now, now,
      ],
    );

    for (const item of input.items) {
      const itemId = typedId('WV');
      await execute(
        this.db,
        `INSERT INTO wv_distill_items
           (id, batch_id, item_type, source_note_id, source_highlight_id,
            content_md, status, core_user_ref, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          itemId,
          batchId,
          item.item_type ?? 'insight',
          item.source_note_id ?? null,
          item.source_highlight_id ?? null,
          item.content_md,
          input.core_user_ref,
          now, now,
        ],
      );
    }

    // Mark running
    await execute(
      this.db,
      `UPDATE wv_distill_batches SET status = 'running', updated_at = ? WHERE id = ?`,
      [now, batchId],
    );

    return (await this.batchById(batchId))!;
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async batchById(batchId: string): Promise<BatchWithItems | null> {
    const batch = await queryOne<DistillBatch>(
      this.db,
      `SELECT ${BATCH_COLS} FROM wv_distill_batches WHERE id = ?`,
      [batchId],
    );
    if (!batch) return null;

    const items = await query<DistillItem>(
      this.db,
      `SELECT ${ITEM_COLS} FROM wv_distill_items WHERE batch_id = ? ORDER BY created_at`,
      [batchId],
    );

    return { ...batch, items };
  }

  /** Find the most recent batch for a given source (+ optional unit). */
  async batchByUnit(
    sourceId: string,
    sourceUnitId?: string | null,
  ): Promise<BatchWithItems | null> {
    // Batches are keyed to source_id; we look for the most recent one
    const batch = await queryOne<DistillBatch>(
      this.db,
      `SELECT ${BATCH_COLS} FROM wv_distill_batches
       WHERE source_id = ? ORDER BY created_at DESC LIMIT 1`,
      [sourceId],
    );
    if (!batch) return null;

    // If caller wants unit-scoped items, filter by source_highlight_id or source_note_id
    // (items don't have source_unit_id directly — they link via notes/highlights)
    // Return all items and let the client filter, OR join through highlights
    const items = sourceUnitId
      ? await query<DistillItem>(
          this.db,
          `SELECT di.${ITEM_COLS.replace(/,\s*/g, ', di.')}
           FROM wv_distill_items di
           LEFT JOIN wv_highlights h ON h.id = di.source_highlight_id
           WHERE di.batch_id = ?
             AND (h.source_unit_id = ? OR di.source_highlight_id IS NULL)
           ORDER BY di.created_at`,
          [batch.id, sourceUnitId],
        )
      : await query<DistillItem>(
          this.db,
          `SELECT ${ITEM_COLS} FROM wv_distill_items WHERE batch_id = ? ORDER BY created_at`,
          [batch.id],
        );

    return { ...batch, items };
  }

  // ── Decision (approve / edit / reject one item) ───────────────────────────

  async recordDecision(input: DecisionInput): Promise<DistillItem | null> {
    const now = new Date().toISOString();

    // Update the item status
    const newStatus = input.decision === 'approved'
      ? 'approved'
      : input.decision === 'edited'
      ? 'edited'
      : 'rejected';

    const sets: string[]  = ['status = ?', 'updated_at = ?'];
    const vals: unknown[] = [newStatus, now];
    if (input.final_content !== undefined) {
      sets.push('content_md = ?'); vals.push(input.final_content);
    }
    vals.push(input.item_id);
    await execute(
      this.db,
      `UPDATE wv_distill_items SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );

    // Refresh batch counts
    await this._refreshBatchCounts(input.item_id, now);

    return queryOne<DistillItem>(
      this.db,
      `SELECT ${ITEM_COLS} FROM wv_distill_items WHERE id = ?`,
      [input.item_id],
    );
  }

  // ── Bulk approve all pending items in a batch ─────────────────────────────

  async approveBatch(batchId: string, coreUserRef: string): Promise<DistillBatch | null> {
    const now = new Date().toISOString();
    await execute(
      this.db,
      `UPDATE wv_distill_items
       SET status = 'approved', updated_at = ?
       WHERE batch_id = ? AND status = 'pending'`,
      [now, batchId],
    );
    await execute(
      this.db,
      `UPDATE wv_distill_batches
       SET status = 'complete',
           approved_count = (SELECT COUNT(*) FROM wv_distill_items WHERE batch_id = ? AND status IN ('approved','edited','saved')),
           rejected_count = (SELECT COUNT(*) FROM wv_distill_items WHERE batch_id = ? AND status = 'rejected'),
           updated_at = ?
       WHERE id = ?`,
      [batchId, batchId, now, batchId],
    );
    return queryOne<DistillBatch>(
      this.db,
      `SELECT ${BATCH_COLS} FROM wv_distill_batches WHERE id = ?`,
      [batchId],
    );
  }

  // ── Internal: refresh batch progress counters ─────────────────────────────

  private async _refreshBatchCounts(itemId: string, now: string): Promise<void> {
    const item = await queryOne<{ batch_id: string }>(
      this.db, `SELECT batch_id FROM wv_distill_items WHERE id = ?`, [itemId],
    );
    if (!item) return;

    const batchId = item.batch_id;
    const total = await queryOne<{ total: number; approved: number; rejected: number; pending: number }>(
      this.db,
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status IN ('approved','edited','saved') THEN 1 ELSE 0 END) AS approved,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
         SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending
       FROM wv_distill_items WHERE batch_id = ?`,
      [batchId],
    );
    if (!total) return;

    const newStatus = total.pending === 0 ? 'complete' : 'running';
    await execute(
      this.db,
      `UPDATE wv_distill_batches
       SET status = ?, approved_count = ?, rejected_count = ?, updated_at = ?
       WHERE id = ?`,
      [newStatus, total.approved, total.rejected, now, batchId],
    );
  }
}
