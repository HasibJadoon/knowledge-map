// ─── SurahRepo — all SQL for qr_surah ────────────────────────────────────────

import { query, queryOne, execute } from '../../../shared/src/db';
import type { Surah, SurahPatch } from '../schemas/surah.schema';

export class SurahRepo {
  constructor(private db: D1Database) {}

  listAll(): Promise<Surah[]> {
    return query<Surah>(
      this.db,
      `SELECT id, name_ar, name_en, name_transliteration,
              revelation_type, ayah_count, juz_start, page_start
       FROM qr_surah
       ORDER BY id`,
    );
  }

  findById(id: number): Promise<Surah | null> {
    return queryOne<Surah>(
      this.db,
      `SELECT id, name_ar, name_en, name_transliteration,
              revelation_type, ayah_count, juz_start, page_start
       FROM qr_surah
       WHERE id = ?`,
      [id],
    );
  }

  async update(id: number, patch: SurahPatch): Promise<Surah | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];

    if (patch.name_en !== undefined)             { sets.push('name_en = ?');             vals.push(patch.name_en); }
    if (patch.name_transliteration !== undefined){ sets.push('name_transliteration = ?'); vals.push(patch.name_transliteration); }
    if (patch.revelation_type !== undefined)     { sets.push('revelation_type = ?');      vals.push(patch.revelation_type); }
    if (patch.juz_start !== undefined)           { sets.push('juz_start = ?');            vals.push(patch.juz_start); }
    if (patch.page_start !== undefined)          { sets.push('page_start = ?');           vals.push(patch.page_start); }

    if (sets.length === 0) return this.findById(id);

    vals.push(id);
    await execute(this.db, `UPDATE qr_surah SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }
}
