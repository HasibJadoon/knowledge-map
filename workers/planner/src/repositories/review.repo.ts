// ─── ReviewRepo — pl_tasks review queue ───────────────────────────────────────
// Drives the /pl/review endpoints — surfacing due tasks and recording feedback.
// The review score is kept in the task meta_json (pl_tasks has no SRS columns).

import { query, queryOne, execute } from '../../../shared/src/db';
import type { Task } from '../schemas/task.schema';
import { TASK_COLS } from './task.repo';

export interface ReviewFeedback {
  task_id: string;
  quality: number;
  reviewed_at: string;
}

export class ReviewRepo {
  constructor(private db: D1Database) {}

  /** Open tasks that are due on or before today (tasks with no due date too). */
  due(planId: string | null, limit = 50): Promise<Task[]> {
    const today = new Date().toISOString().slice(0, 10);
    const cap = Math.max(1, Math.min(Math.trunc(limit) || 50, 200));
    const and = planId ? 'AND plan_id = ?' : '';
    const params: unknown[] = planId ? [today, planId] : [today];
    return query<Task>(
      this.db,
      `SELECT ${TASK_COLS} FROM pl_tasks
       WHERE status IN ('pending', 'in_progress')
         AND (due_date IS NULL OR due_date <= ?)
         ${and}
       ORDER BY due_date IS NULL, due_date, priority
       LIMIT ${cap}`,
      params,
    );
  }

  /** Record a review score (0-5) onto the task's meta_json. */
  async feedback(taskId: string, quality: number): Promise<ReviewFeedback> {
    const row = await queryOne<{ meta_json: string | null }>(
      this.db, `SELECT meta_json FROM pl_tasks WHERE id = ?`, [taskId],
    );
    let meta: Record<string, unknown> = {};
    try {
      meta = row?.meta_json ? (JSON.parse(row.meta_json) as Record<string, unknown>) : {};
    } catch {
      meta = {};
    }
    const reviewed_at = new Date().toISOString();
    meta['review'] = { quality, reviewed_at };
    await execute(
      this.db,
      `UPDATE pl_tasks SET meta_json = ?, updated_at = ? WHERE id = ?`,
      [JSON.stringify(meta), reviewed_at, taskId],
    );
    return { task_id: taskId, quality, reviewed_at };
  }
}
