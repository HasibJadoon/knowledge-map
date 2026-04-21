// ─── NoteRepo — cm_notes ──────────────────────────────────────────────────────
// Atomic margin notes and annotations linked to any typed ref.

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Note {
  id: string;               // CM:ULID
  title: string | null;
  content_md: string;
  resource_ref: string | null; // typed ref (QR:, WV:, AL:, etc.)
  created_at: string;
  updated_at: string | null;
}

export interface NoteCreate {
  content_md: string;
  title?: string | null;
  resource_ref?: string | null;
}

const COLS = `id, title, content_md, resource_ref, created_at, updated_at`;

export class NoteRepo {
  constructor(private db: D1Database) {}

  list(ref: string | null, opts: PaginateOptions = {}) {
    const where  = ref ? 'WHERE resource_ref = ?' : '';
    const params = ref ? [ref] : [];
    return paginate<Note>(
      this.db,
      `SELECT ${COLS} FROM cm_notes ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_notes ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Note | null> {
    return queryOne<Note>(
      this.db, `SELECT ${COLS} FROM cm_notes WHERE id = ?`, [id],
    );
  }

  async create(input: NoteCreate): Promise<Note> {
    const id  = typedId('CM');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_notes (id, title, content_md, resource_ref, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.title ?? null, input.content_md, input.resource_ref ?? null, now],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, content_md: string, title?: string | null): Promise<Note | null> {
    const now  = new Date().toISOString();
    const sets = ['content_md = ?', 'updated_at = ?'];
    const vals: unknown[] = [content_md, now];
    if (title !== undefined) { sets.push('title = ?'); vals.push(title); }
    vals.push(id);
    await execute(this.db, `UPDATE cm_notes SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }
}
