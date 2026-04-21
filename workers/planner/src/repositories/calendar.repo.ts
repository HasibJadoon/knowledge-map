// ─── CalendarRepo — pl_calendar_entries ────────────────────────────────────────
// Calendar entries linking sessions, tasks, and milestones to a time grid.
// Supports one-off entries and RRULE-compatible recurring entries.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface CalendarEntry {
  id: string;                  // PL:ULID
  core_user_ref: string;       // 'CORE:<user_id>'
  core_ws_ref: string | null;  // 'CORE:<workspace_id>'
  plan_id: string | null;      // PL:ULID
  task_id: string | null;      // PL:ULID
  session_id: string | null;   // PL:ULID
  title: string;
  entry_type: string;          // 'scheduled_session'|'deadline'|'milestone'|'review'|'event'|'other'
  start_datetime: string;      // ISO datetime
  end_datetime: string | null; // ISO datetime
  all_day: number;             // SQLite INTEGER bool (0/1)
  recurrence_json: string | null; // RRULE-compatible JSON
  is_completed: number;        // SQLite INTEGER bool (0/1)
  meta_json: string | null;
  created_at: string;
}

export interface CalendarEntryCreate {
  core_user_ref: string;
  core_ws_ref?: string | null;
  plan_id?: string | null;
  task_id?: string | null;
  session_id?: string | null;
  title: string;
  entry_type?: string;
  start_datetime: string;
  end_datetime?: string | null;
  all_day?: boolean;
  recurrence_json?: string | null;
  meta_json?: string | null;
}

export interface CalendarEntryPatch {
  title?: string;
  entry_type?: string;
  start_datetime?: string;
  end_datetime?: string | null;
  all_day?: boolean;
  recurrence_json?: string | null;
  plan_id?: string | null;
  task_id?: string | null;
  session_id?: string | null;
  is_completed?: boolean;
  meta_json?: string | null;
}

const COLS = `id, core_user_ref, core_ws_ref, plan_id, task_id, session_id, title,
              entry_type, start_datetime, end_datetime, all_day, recurrence_json,
              is_completed, meta_json, created_at`;

export class CalendarRepo {
  constructor(private db: D1Database) {}

  /**
   * All entries for a user within a datetime range (inclusive both ends).
   * start and end should be ISO datetime strings.
   */
  list(userRef: string, start: string, end: string): Promise<CalendarEntry[]> {
    return query<CalendarEntry>(
      this.db,
      `SELECT ${COLS} FROM pl_calendar_entries
       WHERE core_user_ref = ?
         AND start_datetime >= ?
         AND start_datetime <= ?
       ORDER BY start_datetime`,
      [userRef, start, end],
    );
  }

  /** Paginated entries for a specific plan (for the planner timeline view). */
  forPlan(planId: string, opts: PaginateOptions = {}) {
    return paginate<CalendarEntry>(
      this.db,
      `SELECT ${COLS} FROM pl_calendar_entries WHERE plan_id = ? ORDER BY start_datetime`,
      `SELECT COUNT(*) AS count FROM pl_calendar_entries WHERE plan_id = ?`,
      [planId],
      opts,
    );
  }

  findById(id: string): Promise<CalendarEntry | null> {
    return queryOne<CalendarEntry>(
      this.db,
      `SELECT ${COLS} FROM pl_calendar_entries WHERE id = ?`,
      [id],
    );
  }

  async create(input: CalendarEntryCreate): Promise<CalendarEntry> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_calendar_entries
         (id, core_user_ref, core_ws_ref, plan_id, task_id, session_id, title,
          entry_type, start_datetime, end_datetime, all_day, recurrence_json,
          is_completed, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        input.plan_id ?? null,
        input.task_id ?? null,
        input.session_id ?? null,
        input.title,
        input.entry_type ?? 'scheduled_session',
        input.start_datetime,
        input.end_datetime ?? null,
        input.all_day ? 1 : 0,
        input.recurrence_json ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: CalendarEntryPatch): Promise<CalendarEntry | null> {
    const sets: string[]   = [];
    const vals: unknown[]  = [];
    if (patch.title           !== undefined) { sets.push('title = ?');           vals.push(patch.title); }
    if (patch.entry_type      !== undefined) { sets.push('entry_type = ?');      vals.push(patch.entry_type); }
    if (patch.start_datetime  !== undefined) { sets.push('start_datetime = ?');  vals.push(patch.start_datetime); }
    if (patch.end_datetime    !== undefined) { sets.push('end_datetime = ?');    vals.push(patch.end_datetime); }
    if (patch.all_day         !== undefined) { sets.push('all_day = ?');         vals.push(patch.all_day ? 1 : 0); }
    if (patch.recurrence_json !== undefined) { sets.push('recurrence_json = ?'); vals.push(patch.recurrence_json); }
    if (patch.plan_id         !== undefined) { sets.push('plan_id = ?');         vals.push(patch.plan_id); }
    if (patch.task_id         !== undefined) { sets.push('task_id = ?');         vals.push(patch.task_id); }
    if (patch.session_id      !== undefined) { sets.push('session_id = ?');      vals.push(patch.session_id); }
    if (patch.is_completed    !== undefined) { sets.push('is_completed = ?');    vals.push(patch.is_completed ? 1 : 0); }
    if (patch.meta_json       !== undefined) { sets.push('meta_json = ?');       vals.push(patch.meta_json); }
    if (sets.length === 0) return this.findById(id);
    vals.push(id);
    await execute(this.db, `UPDATE pl_calendar_entries SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  /** Mark entry as completed. */
  async complete(id: string): Promise<CalendarEntry | null> {
    await execute(
      this.db,
      `UPDATE pl_calendar_entries SET is_completed = 1 WHERE id = ?`,
      [id],
    );
    return this.findById(id);
  }
}
