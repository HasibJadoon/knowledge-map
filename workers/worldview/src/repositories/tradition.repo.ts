// ─── TraditionRepo — wv_traditions ────────────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Tradition {
  id: string;           // WV:ULID
  slug: string;
  label_en: string;
  label_ar: string | null;
  category: string;     // abrahamic | eastern | secular | tribal | other
  parent_id: string | null;
  created_at: string;
}

export interface TraditionCreate {
  slug: string;
  label_en: string;
  label_ar?: string | null;
  category?: string;
  parent_id?: string | null;
}

const COLS = `id, slug, label_en, label_ar, category, parent_id, created_at`;

export class TraditionRepo {
  constructor(private db: D1Database) {}

  list(category: string | null, opts: PaginateOptions = {}) {
    const where  = category ? 'WHERE category = ?' : '';
    const params = category ? [category] : [];
    return paginate<Tradition>(
      this.db,
      `SELECT ${COLS} FROM wv_traditions ${where} ORDER BY label_en`,
      `SELECT COUNT(*) AS count FROM wv_traditions ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Tradition | null> {
    return queryOne<Tradition>(
      this.db, `SELECT ${COLS} FROM wv_traditions WHERE id = ?`, [id],
    );
  }

  findBySlug(slug: string): Promise<Tradition | null> {
    return queryOne<Tradition>(
      this.db, `SELECT ${COLS} FROM wv_traditions WHERE slug = ?`, [slug],
    );
  }

  async create(input: TraditionCreate): Promise<Tradition> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_traditions (id, slug, label_en, label_ar, category, parent_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.slug, input.label_en, input.label_ar ?? null,
       input.category ?? 'other', input.parent_id ?? null, now],
    );
    return (await this.findById(id))!;
  }
}
