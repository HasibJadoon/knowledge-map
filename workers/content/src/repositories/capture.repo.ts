// ─── CaptureRepo — cm_capture_entries ────────────────────────────────────────
// Quick captures: highlights, quotes, bookmarks from any source.
//
// The table is `cm_capture_entries` (the old `cm_captures` name went away in
// the CM rename). Column mapping, kept behind aliases so the `Capture` shape
// callers see is unchanged:
//   id         → capture_id
//   text       → raw_text
//   source_ref → meta_json.$.source_ref   (no dedicated column)
//   color      → meta_json.$.color        (no dedicated column)
// `core_user_ref` is NOT NULL, so writes carry the caller's user id.

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Capture {
  id: string;              // CM:ULID
  capture_type: string;    // highlight | quote | bookmark | excerpt
  text: string;
  source_ref: string | null; // typed ref to origin resource
  color: string | null;    // UI highlight colour tag
  created_at: string;
}

export interface CaptureCreate {
  text: string;
  core_user_ref: string;
  capture_type?: string;
  source_ref?: string | null;
  color?: string | null;
}

const COLS = `
  capture_id                            AS id,
  capture_type,
  raw_text                              AS text,
  json_extract(meta_json, '$.source_ref') AS source_ref,
  json_extract(meta_json, '$.color')      AS color,
  created_at`;

export class CaptureRepo {
  constructor(private db: D1Database) {}

  list(sourceRef: string | null, opts: PaginateOptions = {}) {
    const where  = sourceRef ? `WHERE json_extract(meta_json, '$.source_ref') = ?` : '';
    const params = sourceRef ? [sourceRef] : [];
    return paginate<Capture>(
      this.db,
      `SELECT ${COLS} FROM cm_capture_entries ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_capture_entries ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Capture | null> {
    return queryOne<Capture>(
      this.db, `SELECT ${COLS} FROM cm_capture_entries WHERE capture_id = ?`, [id],
    );
  }

  async create(input: CaptureCreate): Promise<Capture> {
    const id  = typedId('CM');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_capture_entries
         (capture_id, core_user_ref, capture_type, raw_text, meta_json, captured_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.core_user_ref, input.capture_type ?? 'highlight', input.text,
       JSON.stringify({
         source_ref: input.source_ref ?? null,
         color:      input.color ?? null,
       }),
       now, now],
    );
    return (await this.findById(id))!;
  }
}
