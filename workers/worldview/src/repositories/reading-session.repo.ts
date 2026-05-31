// ─── ReadingSessionRepo — wv_reading_sessions ─────────────────────────────────
// A focused reading pass over a wv_sources book, optionally scoped to a
// wv_source_units chapter. Tracks status / position and groups the highlights
// captured during the pass (wv_highlights.reading_session_id).
//
// Canonical columns per 002_add_wv_reading_sessions.sql.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WvReadingSession {
  id: string;                       // WV:ULID
  source_id: string;
  source_unit_id: string | null;
  title: string | null;
  session_type: string;             // reading | extraction | review
  status: string;                   // active | paused | completed
  focus_mode: string | null;        // deep_read | skim | extraction
  started_at: string;
  ended_at: string | null;
  last_position: string | null;
  duration_secs: number | null;
  summary_md: string | null;
  core_user_ref: string;            // CORE:ULID
  core_ws_ref: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingSessionCreate {
  source_id: string;
  source_unit_id?: string | null;
  title?: string | null;
  session_type?: string;
  status?: string;
  focus_mode?: string | null;
  last_position?: string | null;
  summary_md?: string | null;
  core_user_ref: string;
  core_ws_ref?: string | null;
  meta_json?: string | null;
}

export interface ReadingSessionPatch {
  source_unit_id?: string | null;
  title?: string | null;
  session_type?: string;
  status?: string;
  focus_mode?: string | null;
  started_at?: string;
  ended_at?: string | null;
  last_position?: string | null;
  duration_secs?: number | null;
  summary_md?: string | null;
  meta_json?: string | null;
}

export interface ReadingSessionListOpts extends PaginateOptions {
  source_id?: string | null;
  core_user_ref?: string | null;
  status?: string | null;
}

// ── Column list ───────────────────────────────────────────────────────────────

const COLS = `
  id, source_id, source_unit_id, title, session_type, status, focus_mode,
  started_at, ended_at, last_position, duration_secs, summary_md,
  core_user_ref, core_ws_ref, meta_json, created_at, updated_at
`.trim().replace(/\n\s+/g, ' ');

// Mutable columns that PATCH may touch, in a stable order.
const PATCH_COLS: (keyof ReadingSessionPatch)[] = [
  'source_unit_id', 'title', 'session_type', 'status', 'focus_mode',
  'started_at', 'ended_at', 'last_position', 'duration_secs', 'summary_md', 'meta_json',
];

// ── Repo ──────────────────────────────────────────────────────────────────────

export class ReadingSessionRepo {
  constructor(private db: D1Database) {}

  /** Sessions filtered by any of source / user / status. */
  list(opts: ReadingSessionListOpts = {}) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (opts.source_id)     { where.push('source_id = ?');     params.push(opts.source_id); }
    if (opts.core_user_ref) { where.push('core_user_ref = ?'); params.push(opts.core_user_ref); }
    if (opts.status)        { where.push('status = ?');        params.push(opts.status); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    return paginate<WvReadingSession>(
      this.db,
      `SELECT ${COLS} FROM wv_reading_sessions ${clause} ORDER BY started_at DESC`,
      `SELECT COUNT(*) AS count FROM wv_reading_sessions ${clause}`,
      params, opts,
    );
  }

  findById(id: string): Promise<WvReadingSession | null> {
    return queryOne<WvReadingSession>(
      this.db, `SELECT ${COLS} FROM wv_reading_sessions WHERE id = ?`, [id],
    );
  }

  /** The most recent active session for a source/user, if any. */
  activeForSource(sourceId: string, coreUserRef: string): Promise<WvReadingSession | null> {
    return queryOne<WvReadingSession>(
      this.db,
      `SELECT ${COLS} FROM wv_reading_sessions
        WHERE source_id = ? AND core_user_ref = ? AND status = 'active'
        ORDER BY started_at DESC LIMIT 1`,
      [sourceId, coreUserRef],
    );
  }

  async create(input: ReadingSessionCreate): Promise<WvReadingSession> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_reading_sessions
         (id, source_id, source_unit_id, title, session_type, status, focus_mode,
          started_at, ended_at, last_position, duration_secs, summary_md,
          core_user_ref, core_ws_ref, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.source_id,
        input.source_unit_id ?? null,
        input.title          ?? null,
        input.session_type   ?? 'reading',
        input.status         ?? 'active',
        input.focus_mode     ?? null,
        now,
        null,
        input.last_position  ?? null,
        null,
        input.summary_md     ?? null,
        input.core_user_ref,
        input.core_ws_ref    ?? null,
        input.meta_json      ?? null,
        now,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  /** Partial update. Only provided fields are written. */
  async patch(id: string, fields: ReadingSessionPatch): Promise<WvReadingSession | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const col of PATCH_COLS) {
      if (fields[col] !== undefined) {
        sets.push(`${col} = ?`);
        params.push(fields[col]);
      }
    }
    if (!sets.length) return this.findById(id);

    sets.push(`updated_at = ?`);
    params.push(new Date().toISOString());
    params.push(id);

    await execute(
      this.db,
      `UPDATE wv_reading_sessions SET ${sets.join(', ')} WHERE id = ?`,
      params,
    );
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await execute(this.db, `DELETE FROM wv_reading_sessions WHERE id = ?`, [id]);
  }
}
