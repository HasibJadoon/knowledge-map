// ─── DocumentRepo — cm_documents ──────────────────────────────────────────────
// Authored documents: research notes, essays, study guides.

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Document {
  id: string;            // CM:ULID
  title: string;
  doc_type: string;      // note | essay | guide | report
  resource_ref: string | null; // typed ref to linked entity (QR:, WV:, etc.)
  body_md: string | null;
  status: string;        // draft | published | archived
  created_at: string;
  updated_at: string | null;
}

export interface DocumentCreate {
  title: string;
  doc_type?: string;
  resource_ref?: string | null;
  body_md?: string | null;
}

export interface DocumentPatch {
  title?: string;
  body_md?: string;
  status?: 'draft' | 'published' | 'archived';
}

const COLS = `id, title, doc_type, resource_ref, body_md, status, created_at, updated_at`;

export class DocumentRepo {
  constructor(private db: D1Database) {}

  list(ref: string | null, opts: PaginateOptions = {}) {
    const where  = ref ? 'WHERE resource_ref = ?' : '';
    const params = ref ? [ref] : [];
    return paginate<Document>(
      this.db,
      `SELECT ${COLS} FROM cm_documents ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_documents ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Document | null> {
    return queryOne<Document>(
      this.db, `SELECT ${COLS} FROM cm_documents WHERE id = ?`, [id],
    );
  }

  async create(input: DocumentCreate): Promise<Document> {
    const id  = typedId('CM');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_documents (id, title, doc_type, resource_ref, body_md, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?)`,
      [id, input.title, input.doc_type ?? 'note', input.resource_ref ?? null,
       input.body_md ?? null, now],
    );
    return (await this.findById(id))!;
  }

  async patch(id: string, patch: DocumentPatch): Promise<Document | null> {
    const now  = new Date().toISOString();
    const sets: string[]  = ['updated_at = ?'];
    const vals: unknown[] = [now];
    if (patch.title   !== undefined) { sets.push('title = ?');   vals.push(patch.title); }
    if (patch.body_md !== undefined) { sets.push('body_md = ?'); vals.push(patch.body_md); }
    if (patch.status  !== undefined) { sets.push('status = ?');  vals.push(patch.status); }
    vals.push(id);
    await execute(this.db, `UPDATE cm_documents SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }
}
