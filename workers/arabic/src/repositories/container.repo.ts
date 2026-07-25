// ─── ContainerRepo — ar_curriculum_container ────────────────────────────────────────────
// Curriculum containers: courses, books, units, chapters.
// Owned by AR worker. Cross-module content referenced via typed refs only.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Container {
  id: string;               // AR:ULID
  title: string;
  container_type: string;   // course | book | unit | chapter
  parent_id: string | null; // AR:ULID of parent container
  sort_order: number;
  status: string;           // active | archived | draft
  created_at: string;
}

export interface ContainerCreate {
  title: string;
  container_type: string;
  parent_id?: string | null;
  sort_order?: number;
}

const COLS = `id, title, container_type, parent_id, sort_order, status, created_at`;

export class ContainerRepo {
  constructor(private db: D1Database) {}

  list(type: string | null, opts: PaginateOptions = {}) {
    const where  = type ? 'WHERE container_type = ?' : '';
    const params = type ? [type] : [];
    return paginate<Container>(
      this.db,
      `SELECT ${COLS} FROM ar_curriculum_container ${where} ORDER BY sort_order, title`,
      `SELECT COUNT(*) AS count FROM ar_curriculum_container ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<Container | null> {
    return queryOne<Container>(
      this.db,
      `SELECT ${COLS} FROM ar_curriculum_container WHERE id = ?`,
      [id],
    );
  }

  children(parentId: string): Promise<Container[]> {
    return query<Container>(
      this.db,
      `SELECT ${COLS} FROM ar_curriculum_container WHERE parent_id = ? ORDER BY sort_order`,
      [parentId],
    );
  }

  async create(input: ContainerCreate): Promise<Container> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_curriculum_container
         (id, title, container_type, parent_id, sort_order, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [id, input.title, input.container_type,
       input.parent_id ?? null, input.sort_order ?? 0, now],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, patch: Partial<Pick<Container, 'title' | 'status' | 'sort_order'>>): Promise<Container | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.title      !== undefined) { sets.push('title = ?');      vals.push(patch.title); }
    if (patch.status     !== undefined) { sets.push('status = ?');     vals.push(patch.status); }
    if (patch.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(patch.sort_order); }
    if (!sets.length) return this.findById(id);
    vals.push(id);
    await execute(this.db, `UPDATE ar_curriculum_container SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }
}
