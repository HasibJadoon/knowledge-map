// ─── ThinkerRepo — wv_people (person_type = 'thinker') ───────────────────────
// Scholars, philosophers, theologians — the intellectual actors in worldview.
//
// `wv_thinkers` was folded into the general people table; `person_type` marks
// the thinkers. Two columns were renamed with it — `name_en` -> `name` and
// `bio_summary` -> `bio_md` — so the aliases below keep the Thinker shape
// callers already expect.

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

const COLS = `id, name AS name_en, name_ar, tradition_id,
              birth_year, death_year, bio_md AS bio_summary, created_at`;

const IS_THINKER = `person_type = 'thinker'`;

export class ThinkerRepo {
  constructor(private db: D1Database) {}

  list(traditionId: string | null, opts: PaginateOptions = {}) {
    const where  = traditionId
      ? `WHERE ${IS_THINKER} AND tradition_id = ?`
      : `WHERE ${IS_THINKER}`;
    const params = traditionId ? [traditionId] : [];
    return paginate<Thinker>(
      this.db,
      `SELECT ${COLS} FROM wv_people ${where} ORDER BY name`,
      `SELECT COUNT(*) AS count FROM wv_people ${where}`,
      params, opts,
    );
  }

  findById(id: string): Promise<Thinker | null> {
    return queryOne<Thinker>(
      this.db, `SELECT ${COLS} FROM wv_people WHERE id = ? AND ${IS_THINKER}`, [id],
    );
  }

  async create(input: ThinkerCreate): Promise<Thinker> {
    const id  = typedId('WV');
    const now = new Date().toISOString();
    // `slug` is required for lookup by name; derive it from the English name.
    const slug = input.name_en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await execute(
      this.db,
      `INSERT INTO wv_people
         (id, slug, name, name_ar, person_type, tradition_id,
          birth_year, death_year, bio_md, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'thinker', ?, ?, ?, ?, ?, ?)`,
      [id, slug, input.name_en, input.name_ar ?? null, input.tradition_id ?? null,
       input.birth_year ?? null, input.death_year ?? null, input.bio_summary ?? null, now, now],
    );
    return (await this.findById(id))!;
  }
}
