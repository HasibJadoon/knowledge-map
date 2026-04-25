// ─── PassageRepo — all SQL for qr_surah_passages ─────────────────────────────

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { Passage, PassageCreate } from '../schemas/passage.schema';

export class PassageRepo {
  constructor(private db: D1Database) {}

  private static readonly COLS =
    'id, surah, passage_index, ayah_from, ayah_to, theme, title_ar, title_en, discourse_role, note_md';

  bySurah(surahId: number): Promise<Passage[]> {
    return query<Passage>(
      this.db,
      `SELECT ${PassageRepo.COLS}
       FROM qr_surah_passages
       WHERE surah = ?
       ORDER BY passage_index`,
      [surahId],
    );
  }

  /** Find passage(s) that contain a given ayah. */
  byAyah(surahId: number, ayahNum: number): Promise<Passage[]> {
    return query<Passage>(
      this.db,
      `SELECT ${PassageRepo.COLS}
       FROM qr_surah_passages
       WHERE surah = ? AND ayah_from <= ? AND ayah_to >= ?
       ORDER BY passage_index`,
      [surahId, ayahNum, ayahNum],
    );
  }

  findById(id: string): Promise<Passage | null> {
    return queryOne<Passage>(
      this.db,
      `SELECT ${PassageRepo.COLS}
       FROM qr_surah_passages
       WHERE id = ?`,
      [id],
    );
  }

  async create(input: PassageCreate): Promise<Passage> {
    const id = typedId('QR');

    // Auto-assign passage_index as max + 1 for this surah
    const maxRow = await queryOne<{ max_idx: number | null }>(
      this.db,
      `SELECT MAX(passage_index) AS max_idx FROM qr_surah_passages WHERE surah = ?`,
      [input.surah],
    );
    const passage_index = (maxRow?.max_idx ?? 0) + 1;

    await execute(
      this.db,
      `INSERT INTO qr_surah_passages
         (id, surah, passage_index, ayah_from, ayah_to, theme, title_ar, title_en, discourse_role, note_md)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.surah, passage_index, input.ayah_from, input.ayah_to,
       input.theme ?? null, input.title_ar ?? null, input.title_en ?? null,
       input.discourse_role ?? null, input.note_md ?? null],
    );

    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<boolean> {
    const result = await execute(
      this.db,
      `DELETE FROM qr_surah_passages WHERE id = ?`,
      [id],
    );
    return (result.meta.changes ?? 0) > 0;
  }
}
