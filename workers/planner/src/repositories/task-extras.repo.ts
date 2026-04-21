// ─── TaskExtrasRepo — pl_task_resources + pl_task_assignees + pl_task_dependencies ──
// Three join-tables that enrich a task with canonical resource links, multi-user
// assignees, and a dependency graph.

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

// ── pl_task_resources ────────────────────────────────────────────────────────

export interface TaskResource {
  id: string;               // PL:ULID
  task_id: string;          // PL:ULID
  resource_ref: string;     // typed ref e.g. 'CM:ULID', 'QR:2:1-10', 'WV:ULID'
  resource_type: string;    // 'cm_doc'|'ar_class'|'ar_unit'|'qr_passage'|'wv_node'|'wv_source'|'al_concept'|'cm_media'|'other'
  resource_label: string | null; // denormalized
  role: string;             // 'primary'|'reference'|'exercise'|'supplementary'
  sort_order: number;
  created_at: string;
}

export interface TaskResourceCreate {
  resource_ref: string;
  resource_type: string;
  resource_label?: string | null;
  role?: string;
  sort_order?: number;
}

// ── pl_task_assignees ────────────────────────────────────────────────────────

export interface TaskAssignee {
  id: string;          // PL:ULID
  task_id: string;     // PL:ULID
  user_ref: string;    // 'CORE:<user_id>'
  role: string;        // 'owner'|'assignee'|'reviewer'|'observer'
  assigned_at: string;
}

// ── pl_task_dependencies ─────────────────────────────────────────────────────

export interface TaskDependency {
  id: string;           // PL:ULID
  from_task_id: string; // this task is blocked by ...
  to_task_id: string;   // ... this task (must complete first)
  dep_type: string;     // 'blocks'|'related'|'sequence'
  created_at: string;
}

const RESOURCE_COLS = `id, task_id, resource_ref, resource_type, resource_label, role, sort_order, created_at`;
const ASSIGNEE_COLS = `id, task_id, user_ref, role, assigned_at`;
const DEP_COLS      = `id, from_task_id, to_task_id, dep_type, created_at`;

export class TaskExtrasRepo {
  constructor(private db: D1Database) {}

  // ── Resources ──────────────────────────────────────────────────────────────

  resources(taskId: string): Promise<TaskResource[]> {
    return query<TaskResource>(
      this.db,
      `SELECT ${RESOURCE_COLS} FROM pl_task_resources WHERE task_id = ? ORDER BY sort_order, created_at`,
      [taskId],
    );
  }

  async addResource(taskId: string, input: TaskResourceCreate): Promise<TaskResource> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_task_resources
         (id, task_id, resource_ref, resource_type, resource_label, role, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        taskId,
        input.resource_ref,
        input.resource_type,
        input.resource_label ?? null,
        input.role ?? 'primary',
        input.sort_order ?? 0,
        now,
      ],
    );
    return (await queryOne<TaskResource>(
      this.db,
      `SELECT ${RESOURCE_COLS} FROM pl_task_resources WHERE id = ?`,
      [id],
    ))!;
  }

  async removeResource(resourceId: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM pl_task_resources WHERE id = ?`,
      [resourceId],
    );
  }

  // ── Assignees ──────────────────────────────────────────────────────────────

  assignees(taskId: string): Promise<TaskAssignee[]> {
    return query<TaskAssignee>(
      this.db,
      `SELECT ${ASSIGNEE_COLS} FROM pl_task_assignees WHERE task_id = ? ORDER BY assigned_at`,
      [taskId],
    );
  }

  async assign(taskId: string, userRef: string, role = 'assignee'): Promise<TaskAssignee> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    // INSERT OR REPLACE handles the UNIQUE (task_id, user_ref) constraint —
    // updating the role if the user was already assigned.
    await execute(
      this.db,
      `INSERT INTO pl_task_assignees (id, task_id, user_ref, role, assigned_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(task_id, user_ref) DO UPDATE SET role = excluded.role, assigned_at = excluded.assigned_at`,
      [id, taskId, userRef, role, now],
    );
    return (await queryOne<TaskAssignee>(
      this.db,
      `SELECT ${ASSIGNEE_COLS} FROM pl_task_assignees WHERE task_id = ? AND user_ref = ?`,
      [taskId, userRef],
    ))!;
  }

  async unassign(taskId: string, userRef: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM pl_task_assignees WHERE task_id = ? AND user_ref = ?`,
      [taskId, userRef],
    );
  }

  // ── Dependencies ───────────────────────────────────────────────────────────

  /** All dependencies where fromTaskId is the blocked task. */
  dependencies(taskId: string): Promise<TaskDependency[]> {
    return query<TaskDependency>(
      this.db,
      `SELECT ${DEP_COLS} FROM pl_task_dependencies WHERE from_task_id = ? ORDER BY created_at`,
      [taskId],
    );
  }

  async addDependency(fromId: string, toId: string, depType = 'blocks'): Promise<TaskDependency> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_task_dependencies (id, from_task_id, to_task_id, dep_type, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(from_task_id, to_task_id) DO UPDATE SET dep_type = excluded.dep_type`,
      [id, fromId, toId, depType, now],
    );
    return (await queryOne<TaskDependency>(
      this.db,
      `SELECT ${DEP_COLS} FROM pl_task_dependencies WHERE from_task_id = ? AND to_task_id = ?`,
      [fromId, toId],
    ))!;
  }

  async removeDependency(id: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM pl_task_dependencies WHERE id = ?`,
      [id],
    );
  }
}
