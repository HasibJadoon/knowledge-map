// ─── SprintRepo — sp_planner (weekly-sprint planner item store) ───────────────
// One generic table holds week plans, tasks, and sprint reviews as item_json
// blobs, scoped to a CORE user ref.

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

export interface SprintRow {
  id: string;
  canonical_input: string;
  core_user_ref: string;
  item_type: string;
  week_start: string | null;
  period_start: string | null;
  period_end: string | null;
  related_type: string | null;
  related_id: string | null;
  item_json: string;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export interface SprintInsert {
  canonical_input: string;
  core_user_ref: string;
  item_type: 'week_plan' | 'task' | 'sprint_review';
  week_start?: string | null;
  related_type?: string | null;
  related_id?: string | null;
  item_json: string;
}

export interface SprintUpdate {
  item_json?: string;
  related_type?: string | null;
  related_id?: string | null;
  status?: string;
}

const COLS = `id, canonical_input, core_user_ref, item_type, week_start,
  period_start, period_end, related_type, related_id, item_json, status,
  created_at, updated_at`;

export class SprintRepo {
  constructor(private db: D1Database) {}

  findById(userRef: string, id: string): Promise<SprintRow | null> {
    return queryOne<SprintRow>(
      this.db,
      `SELECT ${COLS} FROM sp_planner WHERE id = ? AND core_user_ref = ?`,
      [id, userRef],
    );
  }

  weekPlan(userRef: string, weekStart: string): Promise<SprintRow | null> {
    return queryOne<SprintRow>(
      this.db,
      `SELECT ${COLS} FROM sp_planner
       WHERE core_user_ref = ? AND item_type = 'week_plan' AND week_start = ?
       LIMIT 1`,
      [userRef, weekStart],
    );
  }

  tasksForWeek(userRef: string, weekStart: string): Promise<SprintRow[]> {
    return query<SprintRow>(
      this.db,
      `SELECT ${COLS} FROM sp_planner
       WHERE core_user_ref = ? AND item_type = 'task' AND week_start = ?
       ORDER BY created_at`,
      [userRef, weekStart],
    );
  }

  review(userRef: string, weekStart: string): Promise<SprintRow | null> {
    return queryOne<SprintRow>(
      this.db,
      `SELECT ${COLS} FROM sp_planner
       WHERE core_user_ref = ? AND item_type = 'sprint_review' AND week_start = ?
       LIMIT 1`,
      [userRef, weekStart],
    );
  }

  private byId(id: string): Promise<SprintRow | null> {
    return queryOne<SprintRow>(this.db, `SELECT ${COLS} FROM sp_planner WHERE id = ?`, [id]);
  }

  async insert(input: SprintInsert): Promise<SprintRow> {
    const id = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO sp_planner
         (id, canonical_input, core_user_ref, item_type, week_start,
          related_type, related_id, item_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        id,
        input.canonical_input,
        input.core_user_ref,
        input.item_type,
        input.week_start ?? null,
        input.related_type ?? null,
        input.related_id ?? null,
        input.item_json,
        now, now,
      ],
    );
    return (await this.byId(id))!;
  }

  async update(id: string, fields: SprintUpdate): Promise<SprintRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (fields.item_json !== undefined) { sets.push('item_json = ?'); vals.push(fields.item_json); }
    if (fields.related_type !== undefined) { sets.push('related_type = ?'); vals.push(fields.related_type); }
    if (fields.related_id !== undefined) { sets.push('related_id = ?'); vals.push(fields.related_id); }
    if (fields.status !== undefined) { sets.push('status = ?'); vals.push(fields.status); }
    if (sets.length === 0) return this.byId(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString(), id);
    await execute(this.db, `UPDATE sp_planner SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.byId(id);
  }
}
