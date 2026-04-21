// ─── GoalRepo — pl_goals + pl_goal_snapshots + pl_streaks ──────────────────────
// Personal learning goals, periodic value snapshots, and continuity streaks.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── pl_goals ──────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;                  // PL:ULID
  core_user_ref: string;       // 'CORE:<user_id>'
  core_ws_ref: string | null;  // 'CORE:<workspace_id>'
  plan_id: string | null;      // PL:ULID
  title: string;
  goal_type: string;           // 'habit'|'milestone'|'quota'|'completion'|'other'
  metric: string;              // 'sessions'|'minutes'|'pages'|'ayahs'|'tasks'|'other'
  target_value: number;
  current_value: number;
  cadence: string;             // 'daily'|'weekly'|'monthly'|'total'
  period_start: string | null;
  period_end: string | null;
  status: string;              // 'active'|'completed'|'paused'|'archived'
  created_at: string;
  updated_at: string;
}

export interface GoalCreate {
  core_user_ref: string;
  core_ws_ref?: string | null;
  plan_id?: string | null;
  title: string;
  goal_type?: string;
  metric?: string;
  target_value: number;
  cadence?: string;
  period_start?: string | null;
  period_end?: string | null;
}

export interface GoalPatch {
  title?: string;
  goal_type?: string;
  metric?: string;
  target_value?: number;
  current_value?: number;
  cadence?: string;
  period_start?: string | null;
  period_end?: string | null;
  status?: string;
}

// ── pl_goal_snapshots ─────────────────────────────────────────────────────────

export interface GoalSnapshot {
  id: string;             // PL:ULID
  goal_id: string;        // PL:ULID
  snapshot_date: string;  // ISO date e.g. '2026-04-21'
  value: number;
  note: string | null;
  created_at: string;
}

// ── pl_streaks ────────────────────────────────────────────────────────────────

export interface Streak {
  id: string;                  // PL:ULID
  core_user_ref: string;       // 'CORE:<user_id>'
  plan_id: string | null;      // PL:ULID
  streak_type: string;         // 'daily_session'|'weekly_goal'|'task_chain'|'other'
  current_count: number;
  longest_count: number;
  last_active_date: string | null;
  started_date: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface StreakUpsertInput {
  core_user_ref: string;
  plan_id?: string | null;
  streak_type: string;
  current_count: number;
  longest_count: number;
  last_active_date?: string | null;
  started_date?: string | null;
  meta_json?: string | null;
}

const GOAL_COLS     = `id, core_user_ref, core_ws_ref, plan_id, title, goal_type, metric,
                        target_value, current_value, cadence, period_start, period_end,
                        status, created_at, updated_at`;
const SNAPSHOT_COLS = `id, goal_id, snapshot_date, value, note, created_at`;
const STREAK_COLS   = `id, core_user_ref, plan_id, streak_type, current_count, longest_count,
                        last_active_date, started_date, meta_json, created_at, updated_at`;

export class GoalRepo {
  constructor(private db: D1Database) {}

  // ── Goals ─────────────────────────────────────────────────────────────────

  list(userRef: string, opts: PaginateOptions = {}) {
    return paginate<Goal>(
      this.db,
      `SELECT ${GOAL_COLS} FROM pl_goals WHERE core_user_ref = ? ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM pl_goals WHERE core_user_ref = ?`,
      [userRef],
      opts,
    );
  }

  findById(id: string): Promise<Goal | null> {
    return queryOne<Goal>(
      this.db,
      `SELECT ${GOAL_COLS} FROM pl_goals WHERE id = ?`,
      [id],
    );
  }

  async create(input: GoalCreate): Promise<Goal> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_goals
         (id, core_user_ref, core_ws_ref, plan_id, title, goal_type, metric,
          target_value, current_value, cadence, period_start, period_end,
          status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'active', ?, ?)`,
      [
        id,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        input.plan_id ?? null,
        input.title,
        input.goal_type ?? 'habit',
        input.metric ?? 'sessions',
        input.target_value,
        input.cadence ?? 'weekly',
        input.period_start ?? null,
        input.period_end ?? null,
        now,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: GoalPatch): Promise<Goal | null> {
    const sets: string[]   = [];
    const vals: unknown[]  = [];
    if (patch.title         !== undefined) { sets.push('title = ?');         vals.push(patch.title); }
    if (patch.goal_type     !== undefined) { sets.push('goal_type = ?');     vals.push(patch.goal_type); }
    if (patch.metric        !== undefined) { sets.push('metric = ?');        vals.push(patch.metric); }
    if (patch.target_value  !== undefined) { sets.push('target_value = ?');  vals.push(patch.target_value); }
    if (patch.current_value !== undefined) { sets.push('current_value = ?'); vals.push(patch.current_value); }
    if (patch.cadence       !== undefined) { sets.push('cadence = ?');       vals.push(patch.cadence); }
    if (patch.period_start  !== undefined) { sets.push('period_start = ?');  vals.push(patch.period_start); }
    if (patch.period_end    !== undefined) { sets.push('period_end = ?');    vals.push(patch.period_end); }
    if (patch.status        !== undefined) { sets.push('status = ?');        vals.push(patch.status); }
    if (sets.length === 0) return this.findById(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE pl_goals SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  /** Directly set current_value (e.g. after logging a session). */
  async updateValue(id: string, value: number): Promise<Goal | null> {
    const now = new Date().toISOString();
    await execute(
      this.db,
      `UPDATE pl_goals SET current_value = ?, updated_at = ? WHERE id = ?`,
      [value, now, id],
    );
    return this.findById(id);
  }

  // ── Snapshots ─────────────────────────────────────────────────────────────

  snapshots(goalId: string): Promise<GoalSnapshot[]> {
    return query<GoalSnapshot>(
      this.db,
      `SELECT ${SNAPSHOT_COLS} FROM pl_goal_snapshots WHERE goal_id = ? ORDER BY snapshot_date DESC`,
      [goalId],
    );
  }

  async addSnapshot(goalId: string, value: number, note?: string | null): Promise<GoalSnapshot> {
    const id           = typedId('PL');
    const now          = new Date().toISOString();
    const snapshotDate = now.slice(0, 10); // ISO date only
    // UNIQUE (goal_id, snapshot_date) — replace if same day
    await execute(
      this.db,
      `INSERT INTO pl_goal_snapshots (id, goal_id, snapshot_date, value, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(goal_id, snapshot_date) DO UPDATE SET value = excluded.value, note = excluded.note`,
      [id, goalId, snapshotDate, value, note ?? null, now],
    );
    return (await queryOne<GoalSnapshot>(
      this.db,
      `SELECT ${SNAPSHOT_COLS} FROM pl_goal_snapshots WHERE goal_id = ? AND snapshot_date = ?`,
      [goalId, snapshotDate],
    ))!;
  }

  // ── Streaks ───────────────────────────────────────────────────────────────

  streaks(userRef: string, planId?: string | null): Promise<Streak[]> {
    if (planId) {
      return query<Streak>(
        this.db,
        `SELECT ${STREAK_COLS} FROM pl_streaks WHERE core_user_ref = ? AND plan_id = ? ORDER BY streak_type`,
        [userRef, planId],
      );
    }
    return query<Streak>(
      this.db,
      `SELECT ${STREAK_COLS} FROM pl_streaks WHERE core_user_ref = ? ORDER BY streak_type`,
      [userRef],
    );
  }

  /** Upsert based on UNIQUE (core_user_ref, streak_type, plan_id). */
  async upsertStreak(input: StreakUpsertInput): Promise<Streak> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_streaks
         (id, core_user_ref, plan_id, streak_type, current_count, longest_count,
          last_active_date, started_date, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(core_user_ref, streak_type, plan_id) DO UPDATE SET
         current_count    = excluded.current_count,
         longest_count    = excluded.longest_count,
         last_active_date = excluded.last_active_date,
         started_date     = excluded.started_date,
         meta_json        = excluded.meta_json,
         updated_at       = excluded.updated_at`,
      [
        id,
        input.core_user_ref,
        input.plan_id ?? null,
        input.streak_type,
        input.current_count,
        input.longest_count,
        input.last_active_date ?? null,
        input.started_date ?? null,
        input.meta_json ?? null,
        now,
        now,
      ],
    );
    return (await queryOne<Streak>(
      this.db,
      `SELECT ${STREAK_COLS} FROM pl_streaks
       WHERE core_user_ref = ? AND streak_type = ? AND plan_id IS ?`,
      [input.core_user_ref, input.streak_type, input.plan_id ?? null],
    ))!;
  }
}
