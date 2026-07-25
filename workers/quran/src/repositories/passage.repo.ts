// ─── PassageRepo — all SQL for qr_surah_study_passage ────────────────────────
//
// The passage spine was folded into the Surah-study tables during the QR
// rename: `qr_surah_passages` is now `qr_surah_study_passage`. Two columns
// moved with it — `passage_index` → `passage_no`, `note_md` → `summary_md` —
// and `discourse_role` has no column of its own, so it rides in `meta_json`.
// The `Passage` shape returned to callers is unchanged; the aliases below do
// the translating.

import { query, queryOne, execute } from '../../../shared/src/db';
import type { Passage, PassageCreate } from '../schemas/passage.schema';

export class PassageRepo {
  constructor(private db: D1Database) {}

  private static readonly COLS = `
    id,
    surah,
    passage_no                            AS passage_index,
    ayah_from,
    ayah_to,
    theme,
    title_ar,
    title_en,
    json_extract(meta_json, '$.discourse_role') AS discourse_role,
    summary_md                            AS note_md`;

  bySurah(surahId: number): Promise<Passage[]> {
    return query<Passage>(
      this.db,
      `SELECT ${PassageRepo.COLS}
       FROM qr_surah_study_passage
       WHERE surah = ?
       ORDER BY passage_no`,
      [surahId],
    );
  }

  /** Find passage(s) that contain a given ayah. */
  byAyah(surahId: number, ayahNum: number): Promise<Passage[]> {
    return query<Passage>(
      this.db,
      `SELECT ${PassageRepo.COLS}
       FROM qr_surah_study_passage
       WHERE surah = ? AND ayah_from <= ? AND ayah_to >= ?
       ORDER BY passage_no`,
      [surahId, ayahNum, ayahNum],
    );
  }

  findById(id: string): Promise<Passage | null> {
    return queryOne<Passage>(
      this.db,
      `SELECT ${PassageRepo.COLS}
       FROM qr_surah_study_passage
       WHERE id = ?`,
      [id],
    );
  }

  async create(input: PassageCreate): Promise<Passage> {
    // The table keys passages by their ayah range, not by a generated ULID,
    // and enforces UNIQUE (surah, ayah_from, ayah_to).
    const range = `${input.ayah_from}-${input.ayah_to}`;
    const id    = `QR:SP:${input.surah}:${range}`;

    // Auto-assign passage_no as max + 1 for this surah
    const maxRow = await queryOne<{ max_no: number | null }>(
      this.db,
      `SELECT MAX(passage_no) AS max_no FROM qr_surah_study_passage WHERE surah = ?`,
      [input.surah],
    );
    const passage_no = (maxRow?.max_no ?? 0) + 1;

    await execute(
      this.db,
      `INSERT INTO qr_surah_study_passage
         (id, surah, passage_no, ayah_from, ayah_to, theme, title_ar, title_en,
          summary_md, meta_json, public_unit_id, public_surah_unit_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.surah, passage_no, input.ayah_from, input.ayah_to,
       input.theme ?? null, input.title_ar ?? null, input.title_en ?? null,
       input.note_md ?? null,
       input.discourse_role ? JSON.stringify({ discourse_role: input.discourse_role }) : null,
       `U:C:QURAN:${input.surah}:${range}`,
       `U:C:QURAN:${input.surah}`],
    );

    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<boolean> {
    const result = await execute(
      this.db,
      `DELETE FROM qr_surah_study_passage WHERE id = ?`,
      [id],
    );
    return (result.meta.changes ?? 0) > 0;
  }
}
