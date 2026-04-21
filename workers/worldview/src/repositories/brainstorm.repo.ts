// ─── BrainstormRepo — wv_brainstorm_sessions ──────────────────────────────────
// Loose ideation and research capture sessions (freeform markdown + tags).
//
// Canonical columns per 001_wv_schema.sql §10.4.
// Table name: wv_brainstorm_sessions (NOT wv_brainstorms — that was legacy).

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BrainstormSession {
  id: string;              // WV:ULID
  title: string;
  topic_id: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  status: string;          // active|paused|complete|archived
  body_md: string | null;
  tags_json: string | null; // JSON [string]
  core_user_ref: string;   // CORE:ULID
  core_ws_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrainstormCreate {
  title: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  body_md?: string | null;
  tags_json?: string | null;
  core_user_ref: string;
  core_ws_ref?: string | null;
}

export interface BrainstormPatch {
  title?: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  body_md?: string | null;
  tags_json?: string | null;
  status?: 'active' | 'paused' | 'complete' | 'archived';
}

// ── Column list ───────────────────────────────────────────────────────────────

const COLS = `
  id, title, topic_id, tradition_id, moral_axis_id, status,
  body_md, tags_json, core_user_ref, core_ws_ref, created_at, updated_at
`.trim().replace(/\n\s+/g, ' ');

// ── Repo ──────────────────────────────────────────────────────────────────────

export class BrainstormRepo {
  constructor(private db: D1Database) {}

  list(opts: {
    topic_id?: string | null;
    status?: string | null;
    core_ws_ref?: string | null;
  } & PaginateOptions = {}) {
    const conds: string[]  = [];
    const params: unknown[] = [];
    if (opts.topic_id)    { conds.push('topic_id = ?');      params.push(opts.topic_id); }
    if (opts.status)      { conds.push('status = ?');        params.push(opts.status); }
    if (opts.core_ws_ref) { conds.push('core_ws_ref = ?');   params.push(opts.core_ws_ref); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    return paginate<BrainstormSession>(
      this.db,
      `SELECT ${COLS} FROM wv_brainstorm_sessions ${where} ORDER BY updated_at DESC`,
      `SELECT COUNT(*) AS count FROM wv_brainstorm_sessions ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<BrainstormSession | null> {
    return queryOne<BrainstormSession>(
      this.db, `SELECT ${COLS} FROM wv_brainstorm_sessions WHERE id = ?`, [id],
    );
  }

  async create(input: BrainstormCreate): Promise<BrainstormSession> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_brainstorm_sessions
         (id, title, topic_id, tradition_id, moral_axis_id, status,
          body_md, tags_json, core_user_ref, core_ws_ref, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.title,
        input.topic_id    ?? null,
        input.tradition_id ?? null,
        input.moral_axis_id ?? null,
        input.body_md     ?? null,
        input.tags_json   ?? null,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        now, now,
      ],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: BrainstormPatch): Promise<BrainstormSession | null> {
    const now  = new Date().toISOString();
    const sets: string[]  = ['updated_at = ?'];
    const vals: unknown[] = [now];

    const MAP: [keyof BrainstormPatch, string][] = [
      ['title',        'title = ?'],
      ['topic_id',     'topic_id = ?'],
      ['tradition_id', 'tradition_id = ?'],
      ['body_md',      'body_md = ?'],
      ['tags_json',    'tags_json = ?'],
      ['status',       'status = ?'],
    ];
    for (const [key, sql] of MAP) {
      if (key in patch) { sets.push(sql); vals.push(patch[key] ?? null); }
    }
    vals.push(id);
    await execute(this.db, `UPDATE wv_brainstorm_sessions SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }
}
