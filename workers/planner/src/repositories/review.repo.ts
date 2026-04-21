// ─── ReviewRepo — pl_tasks (SRS review queue) ─────────────────────────────────
// Drives the /pl/review endpoints — surfacing due tasks and recording feedback.

import { query, execute } from '../../../shared/src/db';

export interface DueTask {
  id: string;
  plan_id: string;
  title: string;
  task_type: string;
  status: string;
  priority: string | null;
  resource_ref: string | null;
  due_date: string | null;
  next_review_at: string | null;
  srs_quality: number | null;
}

export interface SrsFeedback {
  task_id: string;
  next_review_at: string;
}

const DUE_COLS = `id, plan_id, title, task_type, status, priority,
                  resource_ref, due_date, next_review_at, srs_quality`;

export class ReviewRepo {
  constructor(private db: D1Database) {}

  /** Tasks due for review today (due_date <= today OR next_review_at <= now). */
  due(planId: string | null, limit = 50): Promise<DueTask[]> {
    const today = new Date().toISOString().slice(0, 10);
    const now   = new Date().toISOString();
    const and   = planId ? 'AND plan_id = ?' : '';
    const params: unknown[] = planId ? [today, now, planId] : [today, now];
    return query<DueTask>(
      this.db,
      `SELECT ${DUE_COLS} FROM pl_tasks
       WHERE status IN ('pending', 'in_progress')
         AND (due_date <= ? OR next_review_at <= ? OR (due_date IS NULL AND next_review_at IS NULL))
         ${and}
       ORDER BY due_date NULLS LAST, priority
       LIMIT ${limit}`,
      params,
    );
  }

  /** Record SRS quality (0-5) and schedule next review via 2^quality days. */
  async feedback(taskId: string, quality: number): Promise<SrsFeedback> {
    const now        = new Date();
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + Math.pow(2, quality));
    await execute(
      this.db,
      `UPDATE pl_tasks SET last_reviewed_at = ?, next_review_at = ?, srs_quality = ?
       WHERE id = ?`,
      [now.toISOString(), nextReview.toISOString(), quality, taskId],
    );
    return { task_id: taskId, next_review_at: nextReview.toISOString() };
  }
}
