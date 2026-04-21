// ─── ReviewQueueRepo — core_review_queue ──────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Interfaces ────────────────────────────────────────────────────────────────

export type ReviewStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'edited'
  | 'rejected'
  | 'deferred';

export interface ReviewQueueItem {
  id: string;
  workspace_id: string;
  reviewer_ref: string | null;
  source_module: 'WV' | 'QR' | 'AL' | 'AR' | 'CM' | 'PL';
  suggestion_ref: string;
  entity_type: 'node' | 'edge' | 'claim' | 'evidence' | 'cluster' | 'map' | 'diagram' | 'other';
  title: string | null;
  status: ReviewStatus;
  priority: number;
  due_at: string | null;
  resolved_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewQueueCreate {
  workspaceId: string;
  reviewerRef?: string;
  sourceModule: ReviewQueueItem['source_module'];
  suggestionRef: string;
  entityType: ReviewQueueItem['entity_type'];
  title?: string;
  priority?: number;
  dueAt?: string;
  note?: string;
}

export interface ReviewQueueListOptions extends PaginateOptions {
  status?: ReviewStatus;
  sourceModule?: string;
  reviewerRef?: string;
  priority?: number;
}

// ── Column fragment ───────────────────────────────────────────────────────────

const COLS = `
  id, workspace_id, reviewer_ref, source_module, suggestion_ref,
  entity_type, title, status, priority, due_at, resolved_at,
  note, created_at, updated_at
FROM core_review_queue`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class ReviewQueueRepo {
  constructor(private db: D1Database) {}

  list(workspaceId: string, opts: ReviewQueueListOptions = {}) {
    const conditions: string[] = ['workspace_id = ?'];
    const args: unknown[] = [workspaceId];

    if (opts.status) {
      conditions.push('status = ?');
      args.push(opts.status);
    }
    if (opts.sourceModule) {
      conditions.push('source_module = ?');
      args.push(opts.sourceModule);
    }
    if (opts.reviewerRef) {
      conditions.push('reviewer_ref = ?');
      args.push(opts.reviewerRef);
    }
    if (opts.priority !== undefined) {
      conditions.push('priority = ?');
      args.push(opts.priority);
    }

    const where = conditions.join(' AND ');
    return paginate<ReviewQueueItem>(
      this.db,
      `SELECT ${COLS} WHERE ${where} ORDER BY priority ASC, created_at ASC`,
      `SELECT COUNT(*) AS count FROM core_review_queue WHERE ${where}`,
      args,
      opts,
    );
  }

  findById(id: string): Promise<ReviewQueueItem | null> {
    return queryOne<ReviewQueueItem>(
      this.db,
      `SELECT ${COLS} WHERE id = ?`,
      [id],
    );
  }

  findBySuggestionRef(suggestionRef: string): Promise<ReviewQueueItem | null> {
    return queryOne<ReviewQueueItem>(
      this.db,
      `SELECT ${COLS} WHERE suggestion_ref = ?`,
      [suggestionRef],
    );
  }

  async create(input: ReviewQueueCreate): Promise<ReviewQueueItem> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_review_queue
         (id, workspace_id, reviewer_ref, source_module, suggestion_ref,
          entity_type, title, status, priority, due_at, resolved_at,
          note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NULL, ?, ?, ?)`,
      [
        id,
        input.workspaceId,
        input.reviewerRef ?? null,
        input.sourceModule,
        input.suggestionRef,
        input.entityType,
        input.title ?? null,
        input.priority ?? 3,
        input.dueAt ?? null,
        input.note ?? null,
        now,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async updateStatus(
    id: string,
    status: ReviewStatus,
    note?: string,
  ): Promise<ReviewQueueItem | null> {
    const now = new Date().toISOString();
    const isTerminal = ['approved', 'edited', 'rejected'].includes(status);

    const sets = ['status = ?', 'updated_at = ?'];
    const vals: unknown[] = [status, now];

    if (isTerminal) {
      sets.push('resolved_at = ?');
      vals.push(now);
    }
    if (note !== undefined) {
      sets.push('note = ?');
      vals.push(note);
    }

    vals.push(id);
    await execute(
      this.db,
      `UPDATE core_review_queue SET ${sets.join(', ')} WHERE id = ?`,
      vals,
    );
    return this.findById(id);
  }

  async assignReviewer(id: string, reviewerRef: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_review_queue SET reviewer_ref = ?, status = 'in_review', updated_at = datetime('now')
       WHERE id = ?`,
      [reviewerRef, id],
    );
  }

  /** Counts by status for a workspace (dashboard summary). */
  statusCounts(workspaceId: string): Promise<Array<{ status: string; count: number }>> {
    return query(
      this.db,
      `SELECT status, COUNT(*) AS count
       FROM core_review_queue WHERE workspace_id = ?
       GROUP BY status`,
      [workspaceId],
    );
  }
}
