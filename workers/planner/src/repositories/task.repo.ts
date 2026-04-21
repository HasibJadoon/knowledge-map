// ─── TaskRepo — pl_tasks ───────────────────────────────────────────────────────
// Individual study tasks within a plan. Supports kanban status, SRS scheduling,
// and priority ordering for the planner UI (calendar, kanban, timeline).

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Task {
  id: string;                // PL:ULID
  plan_id: string;           // PL:ULID
  title: string;
  task_type: string;         // reading | review | exercise | memorise | listen | other
  status: string;            // pending | in_progress | done | skipped
  priority: string | null;   // high | medium | low
  due_date: string | null;   // ISO date
  resource_ref: string | null; // typed ref to what is being studied
  completed_at: string | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  srs_quality: number | null; // 0-5
  created_at: string;
}

export interface TaskCreate {
  plan_id: string;
  title: string;
  task_type?: string;
  priority?: string | null;
  due_date?: string | null;
  resource_ref?: string | null;
}

export interface TaskPatch {
  status?: string;
  priority?: string;
  due_date?: string | null;
  title?: string;
}

const COLS = `id, plan_id, title, task_type, status, priority, due_date,
              resource_ref, completed_at, last_reviewed_at, next_review_at,
              srs_quality, created_at`;

export class TaskRepo {
  constructor(private db: D1Database) {}

  list(filters: { status?: string | null; planId?: string | null }, opts: PaginateOptions = {}) {
    const conds: string[]  = [];
    const params: unknown[] = [];
    if (filters.status) { conds.push('status = ?');   params.push(filters.status); }
    if (filters.planId) { conds.push('plan_id = ?');  params.push(filters.planId); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<Task>(
      this.db,
      `SELECT ${COLS} FROM pl_tasks ${where} ORDER BY due_date NULLS LAST, priority`,
      `SELECT COUNT(*) AS count FROM pl_tasks ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Task | null> {
    return queryOne<Task>(
      this.db, `SELECT ${COLS} FROM pl_tasks WHERE id = ?`, [id],
    );
  }

  async create(input: TaskCreate): Promise<Task> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_tasks
         (id, plan_id, title, task_type, status, priority, due_date, resource_ref, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [id, input.plan_id, input.title, input.task_type ?? 'reading',
       input.priority ?? null, input.due_date ?? null, input.resource_ref ?? null, now],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: TaskPatch): Promise<Task | null> {
    const sets: string[]  = [];
    const vals: unknown[] = [];
    if (patch.status   !== undefined) { sets.push('status = ?');   vals.push(patch.status); }
    if (patch.priority !== undefined) { sets.push('priority = ?'); vals.push(patch.priority); }
    if (patch.due_date !== undefined) { sets.push('due_date = ?'); vals.push(patch.due_date); }
    if (patch.title    !== undefined) { sets.push('title = ?');    vals.push(patch.title); }
    if (sets.length === 0) return this.findById(id);
    vals.push(id);
    await execute(this.db, `UPDATE pl_tasks SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  async complete(id: string): Promise<Task | null> {
    const now = new Date().toISOString();
    await execute(
      this.db,
      `UPDATE pl_tasks SET status = 'done', completed_at = ? WHERE id = ?`,
      [now, id],
    );
    return this.findById(id);
  }

  /** SRS: record quality score and compute next review date (2^quality days). */
  async recordSrs(id: string, quality: number): Promise<Task | null> {
    const now        = new Date();
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + Math.pow(2, quality));
    await execute(
      this.db,
      `UPDATE pl_tasks
       SET last_reviewed_at = ?, next_review_at = ?, srs_quality = ?
       WHERE id = ?`,
      [now.toISOString(), nextReview.toISOString(), quality, id],
    );
    return this.findById(id);
  }
}
