// ─── CaptureRepo — cm_captures ────────────────────────────────────────────────
// Quick captures: highlights, quotes, bookmarks from any source.

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
  capture_type?: string;
  source_ref?: string | null;
  color?: string | null;
}

const COLS = `id, capture_type, text, source_ref, color, created_at`;

export class CaptureRepo {
  constructor(private db: D1Database) {}

  list(sourceRef: string | null, opts: PaginateOptions = {}) {
    const where  = sourceRef ? 'WHERE source_ref = ?' : '';
    const params = sourceRef ? [sourceRef] : [];
    return paginate<Capture>(
      this.db,
      `SELECT ${COLS} FROM cm_captures ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_captures ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Capture | null> {
    return queryOne<Capture>(
      this.db, `SELECT ${COLS} FROM cm_captures WHERE id = ?`, [id],
    );
  }

  async create(input: CaptureCreate): Promise<Capture> {
    const id  = typedId('CM');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_captures (id, capture_type, text, source_ref, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.capture_type ?? 'highlight', input.text,
       input.source_ref ?? null, input.color ?? null, now],
    );
    return (await this.findById(id))!;
  }
}
