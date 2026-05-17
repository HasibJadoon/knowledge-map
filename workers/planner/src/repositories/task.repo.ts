// ─── TaskRepo — pl_tasks ───────────────────────────────────────────────────────
// Individual study tasks within a plan. Columns mirror the pl_tasks table.

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type { Task, TaskCreate, TaskPatch } from '../schemas/task.schema';

export const TASK_COLS = `id, plan_id, scope_id, parent_task_id, title,
  description_md, task_type, status, priority, due_date, estimated_mins,
  actual_mins, assignee_ref, step_no, sort_order, completed_at, meta_json,
  created_at, updated_at`;

export interface TaskFilters {
  status?: string | null;
  planId?: string | null;
  /** Inclusive upper bound on due_date (ISO date). */
  dueBefore?: string | null;
}

export class TaskRepo {
  constructor(private db: D1Database) {}

  list(filters: TaskFilters, opts: PaginateOptions = {}) {
    const conds: string[] = [];
    const params: unknown[] = [];
    if (filters.planId) { conds.push('plan_id = ?'); params.push(filters.planId); }
    if (filters.status) { conds.push('status = ?'); params.push(filters.status); }
    if (filters.dueBefore) {
      conds.push('due_date IS NOT NULL AND due_date <= ?');
      params.push(filters.dueBefore);
    }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<Task>(
      this.db,
      `SELECT ${TASK_COLS} FROM pl_tasks ${where}
       ORDER BY sort_order, priority, due_date IS NULL, due_date`,
      `SELECT COUNT(*) AS count FROM pl_tasks ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Task | null> {
    return queryOne<Task>(this.db, `SELECT ${TASK_COLS} FROM pl_tasks WHERE id = ?`, [id]);
  }

  async create(input: TaskCreate): Promise<Task> {
    const id = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_tasks
         (id, plan_id, scope_id, parent_task_id, title, description_md,
          task_type, status, priority, due_date, estimated_mins,
          assignee_ref, step_no, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.plan_id,
        input.scope_id ?? null,
        input.parent_task_id ?? null,
        input.title,
        input.description_md ?? null,
        input.task_type ?? 'read',
        input.priority ?? 3,
        input.due_date ?? null,
        input.estimated_mins ?? null,
        input.assignee_ref ?? null,
        input.step_no ?? null,
        input.sort_order ?? 0,
        now, now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: TaskPatch): Promise<Task | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const set = (col: string, value: unknown): void => {
      sets.push(`${col} = ?`);
      vals.push(value);
    };

    if (patch.title !== undefined) set('title', patch.title);
    if (patch.task_type !== undefined) set('task_type', patch.task_type);
    if (patch.scope_id !== undefined) set('scope_id', patch.scope_id);
    if (patch.parent_task_id !== undefined) set('parent_task_id', patch.parent_task_id);
    if (patch.description_md !== undefined) set('description_md', patch.description_md);
    if (patch.status !== undefined) set('status', patch.status);
    if (patch.priority !== undefined) set('priority', patch.priority);
    if (patch.due_date !== undefined) set('due_date', patch.due_date);
    if (patch.estimated_mins !== undefined) set('estimated_mins', patch.estimated_mins);
    if (patch.actual_mins !== undefined) set('actual_mins', patch.actual_mins);
    if (patch.assignee_ref !== undefined) set('assignee_ref', patch.assignee_ref);
    if (patch.step_no !== undefined) set('step_no', patch.step_no);
    if (patch.sort_order !== undefined) set('sort_order', patch.sort_order);
    if (patch.completed_at !== undefined) set('completed_at', patch.completed_at);
    if (patch.meta_json !== undefined) set('meta_json', patch.meta_json);

    // Keep completed_at consistent with a status change unless given explicitly.
    if (patch.status !== undefined && patch.completed_at === undefined) {
      set('completed_at', patch.status === 'done' ? new Date().toISOString() : null);
    }

    if (sets.length === 0) return this.findById(id);

    set('updated_at', new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE pl_tasks SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  async complete(id: string): Promise<Task | null> {
    const now = new Date().toISOString();
    await execute(
      this.db,
      `UPDATE pl_tasks SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id],
    );
    return this.findById(id);
  }
}
