// ─── SessionRepo — pl_sessions + pl_session_item_logs ──────────────────────────
// Completed study session logs and per-item coverage records within a session.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── pl_sessions ───────────────────────────────────────────────────────────────

export interface Session {
  id: string;                 // PL:ULID
  plan_id: string | null;     // PL:ULID
  task_id: string | null;     // PL:ULID
  core_user_ref: string;      // 'CORE:<user_id>'
  core_ws_ref: string | null; // 'CORE:<workspace_id>'
  session_type: string;       // 'reading'|'memorization'|'revision'|'exercise'|'lecture'|'class'|'podcast'|'research'|'other'
  resource_ref: string | null;    // primary resource studied
  resource_type: string | null;
  resource_label: string | null;  // denormalized
  qr_scope_ref: string | null;    // 'QR:2:1-10' if Quran session
  started_at: string;
  ended_at: string | null;
  duration_mins: number | null;
  pages_covered: string | null;   // e.g. '45-60'
  ayahs_covered: string | null;   // e.g. '1-15'
  rating: number | null;          // 1–5 quality/focus rating
  notes_md: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface SessionCreate {
  plan_id?: string | null;
  task_id?: string | null;
  core_user_ref: string;
  core_ws_ref?: string | null;
  session_type?: string;
  resource_ref?: string | null;
  resource_type?: string | null;
  resource_label?: string | null;
  qr_scope_ref?: string | null;
  started_at: string;
  ended_at?: string | null;
  duration_mins?: number | null;
  pages_covered?: string | null;
  ayahs_covered?: string | null;
  rating?: number | null;
  notes_md?: string | null;
  meta_json?: string | null;
}

// ── pl_session_item_logs ──────────────────────────────────────────────────────

export interface SessionItemLog {
  id: string;               // PL:ULID
  session_id: string;       // PL:ULID
  resource_ref: string;     // typed ref
  resource_type: string;
  resource_label: string | null;  // denormalized
  item_status: string;      // 'completed'|'partial'|'skipped'|'reviewed'
  time_spent_mins: number | null;
  notes: string | null;
  created_at: string;
}

export interface SessionItemLogCreate {
  resource_ref: string;
  resource_type: string;
  resource_label?: string | null;
  item_status?: string;
  time_spent_mins?: number | null;
  notes?: string | null;
}

const SESSION_COLS = `id, plan_id, task_id, core_user_ref, core_ws_ref, session_type,
                      resource_ref, resource_type, resource_label, qr_scope_ref,
                      started_at, ended_at, duration_mins, pages_covered, ayahs_covered,
                      rating, notes_md, meta_json, created_at`;
const LOG_COLS     = `id, session_id, resource_ref, resource_type, resource_label,
                      item_status, time_spent_mins, notes, created_at`;

export class SessionRepo {
  constructor(private db: D1Database) {}

  // ── Sessions ──────────────────────────────────────────────────────────────

  list(planId: string | null | undefined, userRef: string | null | undefined, opts: PaginateOptions = {}) {
    const conds: string[]   = [];
    const params: unknown[] = [];
    if (planId)  { conds.push('plan_id = ?');       params.push(planId); }
    if (userRef) { conds.push('core_user_ref = ?'); params.push(userRef); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<Session>(
      this.db,
      `SELECT ${SESSION_COLS} FROM pl_sessions ${where} ORDER BY started_at DESC`,
      `SELECT COUNT(*) AS count FROM pl_sessions ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<Session | null> {
    return queryOne<Session>(
      this.db,
      `SELECT ${SESSION_COLS} FROM pl_sessions WHERE id = ?`,
      [id],
    );
  }

  async create(input: SessionCreate): Promise<Session> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_sessions
         (id, plan_id, task_id, core_user_ref, core_ws_ref, session_type,
          resource_ref, resource_type, resource_label, qr_scope_ref,
          started_at, ended_at, duration_mins, pages_covered, ayahs_covered,
          rating, notes_md, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.plan_id ?? null,
        input.task_id ?? null,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        input.session_type ?? 'reading',
        input.resource_ref ?? null,
        input.resource_type ?? null,
        input.resource_label ?? null,
        input.qr_scope_ref ?? null,
        input.started_at,
        input.ended_at ?? null,
        input.duration_mins ?? null,
        input.pages_covered ?? null,
        input.ayahs_covered ?? null,
        input.rating ?? null,
        input.notes_md ?? null,
        input.meta_json ?? null,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  /** Mark a session as complete — stamps ended_at, duration, rating, and optional notes. */
  async complete(
    id: string,
    durationMins: number,
    rating: number | null,
    notesMd?: string | null,
  ): Promise<Session | null> {
    const now = new Date().toISOString();
    const sets: string[]   = ['ended_at = ?', 'duration_mins = ?'];
    const vals: unknown[]  = [now, durationMins];
    if (rating !== undefined && rating !== null) { sets.push('rating = ?');   vals.push(rating); }
    if (notesMd !== undefined)                  { sets.push('notes_md = ?'); vals.push(notesMd); }
    vals.push(id);
    await execute(this.db, `UPDATE pl_sessions SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  // ── Item Logs ─────────────────────────────────────────────────────────────

  itemLogs(sessionId: string): Promise<SessionItemLog[]> {
    return query<SessionItemLog>(
      this.db,
      `SELECT ${LOG_COLS} FROM pl_session_item_logs WHERE session_id = ? ORDER BY created_at`,
      [sessionId],
    );
  }

  async logItem(sessionId: string, input: SessionItemLogCreate): Promise<SessionItemLog> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_session_item_logs
         (id, session_id, resource_ref, resource_type, resource_label,
          item_status, time_spent_mins, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sessionId,
        input.resource_ref,
        input.resource_type,
        input.resource_label ?? null,
        input.item_status ?? 'completed',
        input.time_spent_mins ?? null,
        input.notes ?? null,
        now,
      ],
    );
    return (await queryOne<SessionItemLog>(
      this.db,
      `SELECT ${LOG_COLS} FROM pl_session_item_logs WHERE id = ?`,
      [id],
    ))!;
  }
}
