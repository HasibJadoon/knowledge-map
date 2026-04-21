// ─── ThinkerRepo — wv_thinkers ────────────────────────────────────────────────
// Scholars, philosophers, theologians — the intellectual actors in worldview.

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface Thinker {
  id: string;               // WV:ULID
  name_en: string;
  name_ar: string | null;
  tradition_id: string | null; // WV:ULID
  birth_year: number | null;
  death_year: number | null;
  bio_summary: string | null;
  created_at: string;
}

export interface ThinkerCreate {
  name_en: string;
  name_ar?: string | null;
  tradition_id?: string | null;
  birth_year?: number | null;
  death_year?: number | null;
  bio_summary?: string | null;
}

const COLS = `id, name_en, name_ar, tradition_id, birth_year, death_year, bio_summary, created_at`;

export class ThinkerRepo {
  constructor(private db: D1Database) {}

  list(traditionId: string | null, opts: PaginateOptions = {}) {
    const where  = traditionId ? 'WHERE tradition_id = ?' : '';
    const params = traditionId ? [traditionId] : [];
    return paginate<Thinker>(
      this.db,
      `SELECT ${COLS} FROM wv_thinkers ${where} ORDER BY name_en`,
      `SELECT COUNT(*) AS count FROM wv_thinkers ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Thinker | null> {
    return queryOne<Thinker>(
      this.db, `SELECT ${COLS} FROM wv_thinkers WHERE id = ?`, [id],
    );
  }

  async create(input: ThinkerCreate): Promise<Thinker> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO wv_thinkers
         (id, name_en, name_ar, tradition_id, birth_year, death_year, bio_summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.name_en, input.name_ar ?? null, input.tradition_id ?? null,
       input.birth_year ?? null, input.death_year ?? null, input.bio_summary ?? null, now],
    );
    return (await this.findById(id))!;
  }
}
