// ─── PlanRepo — pl_plans ──────────────────────────────────────────────────────
// Study plans: top-level containers for a set of tasks toward a learning goal.

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type { Plan, PlanCreate, PlanPatch } from '../schemas/plan.schema';
import type { Task } from '../schemas/task.schema';
import { TASK_COLS } from './task.repo';

const COLS = `id, core_user_ref, core_ws_ref, title, slug, plan_type,
  description_md, goals_md, status, priority, start_date, target_end_date,
  completed_at, meta_json, created_at, updated_at`;

export class PlanRepo {
  constructor(private db: D1Database) {}

  /** Plans owned by a user (or every plan when userRef is null). */
  list(userRef: string | null, opts: PaginateOptions = {}) {
    const where = userRef ? 'WHERE core_user_ref = ?' : '';
    const params = userRef ? [userRef] : [];
    return paginate<Plan>(
      this.db,
      `SELECT ${COLS} FROM pl_plans ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM pl_plans ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Plan | null> {
    return queryOne<Plan>(this.db, `SELECT ${COLS} FROM pl_plans WHERE id = ?`, [id]);
  }

  tasks(planId: string, opts: PaginateOptions = {}) {
    return paginate<Task>(
      this.db,
      `SELECT ${TASK_COLS} FROM pl_tasks WHERE plan_id = ?
       ORDER BY sort_order, priority, due_date IS NULL, due_date`,
      `SELECT COUNT(*) AS count FROM pl_tasks WHERE plan_id = ?`,
      [planId], opts,
    );
  }

  async create(input: PlanCreate): Promise<Plan> {
    const id = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_plans
         (id, core_user_ref, core_ws_ref, title, slug, plan_type,
          description_md, goals_md, status, priority, start_date,
          target_end_date, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        input.title,
        input.slug ?? null,
        input.plan_type ?? 'reading',
        input.description_md ?? null,
        input.goals_md ?? null,
        input.status ?? 'active',
        input.priority ?? 3,
        input.start_date ?? null,
        input.target_end_date ?? null,
        input.meta_json ?? null,
        now, now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: PlanPatch): Promise<Plan | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    const set = (col: string, value: unknown): void => {
      sets.push(`${col} = ?`);
      vals.push(value);
    };

    if (patch.title !== undefined) set('title', patch.title);
    if (patch.plan_type !== undefined) set('plan_type', patch.plan_type);
    if (patch.core_ws_ref !== undefined) set('core_ws_ref', patch.core_ws_ref);
    if (patch.slug !== undefined) set('slug', patch.slug);
    if (patch.description_md !== undefined) set('description_md', patch.description_md);
    if (patch.goals_md !== undefined) set('goals_md', patch.goals_md);
    if (patch.status !== undefined) set('status', patch.status);
    if (patch.priority !== undefined) set('priority', patch.priority);
    if (patch.start_date !== undefined) set('start_date', patch.start_date);
    if (patch.target_end_date !== undefined) set('target_end_date', patch.target_end_date);
    if (patch.completed_at !== undefined) set('completed_at', patch.completed_at);
    if (patch.meta_json !== undefined) set('meta_json', patch.meta_json);

    if (patch.status !== undefined && patch.completed_at === undefined) {
      set('completed_at', patch.status === 'completed' ? new Date().toISOString() : null);
    }

    if (sets.length === 0) return this.findById(id);

    set('updated_at', new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE pl_plans SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  setStatus(id: string, status: NonNullable<PlanPatch['status']>): Promise<Plan | null> {
    return this.patch(id, { status });
  }
}
