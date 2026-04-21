// ─── PlanRepo — pl_plans ──────────────────────────────────────────────────────
// Study plans: top-level containers for a set of tasks toward a learning goal.

import { queryOne, execute, paginate, query } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Plan {
  id: string;                  // PL:ULID
  title: string;
  workspace_id: string | null; // CORE:ULID
  source_ref: string | null;   // typed ref — e.g. WV:ULID (source being studied)
  status: string;              // active | paused | completed | archived
  target_date: string | null;  // ISO date
  created_at: string;
}

export interface PlanCreate {
  title: string;
  workspace_id?: string | null;
  source_ref?: string | null;
  target_date?: string | null;
}

export interface TaskSummary {
  id: string;
  plan_id: string;
  title: string;
  task_type: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  resource_ref: string | null;
}

const PLAN_COLS = `id, title, workspace_id, source_ref, status, target_date, created_at`;
const TASK_COLS = `id, plan_id, title, task_type, status, priority, due_date, resource_ref`;

export class PlanRepo {
  constructor(private db: D1Database) {}

  list(workspaceId: string | null, opts: PaginateOptions = {}) {
    const where  = workspaceId ? 'WHERE workspace_id = ?' : '';
    const params = workspaceId ? [workspaceId] : [];
    return paginate<Plan>(
      this.db,
      `SELECT ${PLAN_COLS} FROM pl_plans ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM pl_plans ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Plan | null> {
    return queryOne<Plan>(
      this.db, `SELECT ${PLAN_COLS} FROM pl_plans WHERE id = ?`, [id],
    );
  }

  tasks(planId: string, opts: PaginateOptions = {}) {
    return paginate<TaskSummary>(
      this.db,
      `SELECT ${TASK_COLS} FROM pl_tasks WHERE plan_id = ?
       ORDER BY due_date NULLS LAST, priority`,
      `SELECT COUNT(*) AS count FROM pl_tasks WHERE plan_id = ?`,
      [planId], opts,
    );
  }

  async create(input: PlanCreate): Promise<Plan> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_plans (id, title, workspace_id, source_ref, status, target_date, created_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      [id, input.title, input.workspace_id ?? null,
       input.source_ref ?? null, input.target_date ?? null, now],
    );
    return (await this.findById(id))!;
  }

  async setStatus(id: string, status: string): Promise<Plan | null> {
    await execute(this.db, `UPDATE pl_plans SET status = ? WHERE id = ?`, [status, id]);
    return this.findById(id);
  }
}
