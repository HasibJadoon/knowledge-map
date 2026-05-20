// ─── CaptureNoteRepo — pl_capture_notes ───────────────────────────────────────
// Quick-capture notes. Each capture is a TipTap (ProseMirror) document that
// moves through a draft → plan → review → done workflow.

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

export type CaptureNoteStatus = 'draft' | 'plan' | 'review' | 'done';

export const CAPTURE_NOTE_STATUSES: readonly CaptureNoteStatus[] =
  ['draft', 'plan', 'review', 'done'] as const;

export function isCaptureNoteStatus(v: unknown): v is CaptureNoteStatus {
  return typeof v === 'string' && (CAPTURE_NOTE_STATUSES as readonly string[]).includes(v);
}

export interface CaptureNoteRow {
  id: string;                  // PL:ULID
  core_user_ref: string;       // 'CORE:<user_id>'
  core_ws_ref: string | null;  // 'CORE:<workspace_id>'
  status: string;              // 'draft' | 'plan' | 'review' | 'done'
  title: string | null;
  doc_json: string;            // TipTap ProseMirror document JSON
  text: string;                // plain-text extraction
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaptureNoteCreate {
  core_user_ref: string;
  core_ws_ref?: string | null;
  status?: CaptureNoteStatus;
  title?: string | null;
  doc_json: string;
  text: string;
  meta_json?: string | null;
}

export interface CaptureNotePatch {
  status?: CaptureNoteStatus;
  title?: string | null;
  doc_json?: string;
  text?: string;
  meta_json?: string | null;
}

const COLS = `id, core_user_ref, core_ws_ref, status, title, doc_json, text,
              meta_json, created_at, updated_at`;

export class CaptureNoteRepo {
  constructor(private db: D1Database) {}

  /** Most-recent captures for a user, newest first. */
  list(userRef: string, limit: number): Promise<CaptureNoteRow[]> {
    return query<CaptureNoteRow>(
      this.db,
      `SELECT ${COLS} FROM pl_capture_notes
       WHERE core_user_ref = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userRef, limit],
    );
  }

  findById(id: string): Promise<CaptureNoteRow | null> {
    return queryOne<CaptureNoteRow>(
      this.db,
      `SELECT ${COLS} FROM pl_capture_notes WHERE id = ?`,
      [id],
    );
  }

  async create(input: CaptureNoteCreate): Promise<CaptureNoteRow> {
    const id  = typedId('PL');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO pl_capture_notes
         (id, core_user_ref, core_ws_ref, status, title, doc_json, text,
          meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.core_user_ref,
        input.core_ws_ref ?? null,
        input.status ?? 'draft',
        input.title ?? null,
        input.doc_json,
        input.text,
        input.meta_json ?? null,
        now,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, patch: CaptureNotePatch): Promise<CaptureNoteRow | null> {
    const sets: string[]  = [];
    const vals: unknown[] = [];
    if (patch.status    !== undefined) { sets.push('status = ?');    vals.push(patch.status); }
    if (patch.title     !== undefined) { sets.push('title = ?');     vals.push(patch.title); }
    if (patch.doc_json  !== undefined) { sets.push('doc_json = ?');  vals.push(patch.doc_json); }
    if (patch.text      !== undefined) { sets.push('text = ?');      vals.push(patch.text); }
    if (patch.meta_json !== undefined) { sets.push('meta_json = ?'); vals.push(patch.meta_json); }
    if (sets.length === 0) return this.findById(id);
    sets.push('updated_at = ?');
    vals.push(new Date().toISOString());
    vals.push(id);
    await execute(this.db, `UPDATE pl_capture_notes SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }
}
