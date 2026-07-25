// ─── AyahRepo — all SQL for qr_ayah ───────────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';
import type { Ayah, AyahWord, AyahPatch } from '../schemas/ayah.schema';

// Canonical column selection — always use text_uthmani_clean first.
const SELECT = `
  surah, ayah,
  COALESCE(text_uthmani_clean, text_uthmani, text_bare, text) AS text_display,
  text_uthmani_clean, text_uthmani, translation, verse_mark, page_number
FROM qr_ayah`;

export class AyahRepo {
  constructor(private db: D1Database) {}

  /** All ayahs of a surah in order. */
  bySurah(surahId: number): Promise<Ayah[]> {
    return query<Ayah>(
      this.db,
      `SELECT ${SELECT} WHERE surah = ? ORDER BY ayah`,
      [surahId],
    );
  }

  /** Range of ayahs within a surah. */
  byRange(surahId: number, from: number, to: number): Promise<Ayah[]> {
    return query<Ayah>(
      this.db,
      `SELECT ${SELECT} WHERE surah = ? AND ayah BETWEEN ? AND ? ORDER BY ayah`,
      [surahId, from, to],
    );
  }

  /** Single ayah. */
  find(surahId: number, ayahNum: number): Promise<Ayah | null> {
    return queryOne<Ayah>(
      this.db,
      `SELECT ${SELECT} WHERE surah = ? AND ayah = ?`,
      [surahId, ayahNum],
    );
  }

  /** Paginated search (full-text via LIKE on text_bare). */
  search(q: string, opts: PaginateOptions = {}) {
    const pattern = `%${q}%`;
    return paginate<Ayah>(
      this.db,
      `SELECT ${SELECT} WHERE text_bare LIKE ?`,
      `SELECT COUNT(*) AS count FROM qr_ayah WHERE text_bare LIKE ?`,
      [pattern],
      opts,
    );
  }

  // ── Word helpers ─────────────────────────────────────────────────────────────

  private static readonly WORD_SELECT = `
    surah, ayah, word_index,
    word_text AS text, word_text_bare AS text_bare,
    root, lemma, pos, morphology_tag
  FROM qr_word_occurrence`;

  /** All words for a surah, ordered by ayah then word_index. */
  wordsBySurah(surahId: number): Promise<AyahWord & { surah: number; ayah: number }[]> {
    return query(
      this.db,
      `SELECT ${AyahRepo.WORD_SELECT}
       WHERE surah = ? ORDER BY ayah, word_index`,
      [surahId],
    );
  }

  /** Words for an ayah range. */
  wordsByRange(surahId: number, from: number, to: number): Promise<AyahWord & { surah: number; ayah: number }[]> {
    return query(
      this.db,
      `SELECT ${AyahRepo.WORD_SELECT}
       WHERE surah = ? AND ayah BETWEEN ? AND ? ORDER BY ayah, word_index`,
      [surahId, from, to],
    );
  }

  async update(surahId: number, ayahNum: number, patch: AyahPatch): Promise<Ayah | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.translation !== undefined) { sets.push('translation = ?'); vals.push(patch.translation); }
    if (patch.verse_mark !== undefined)  { sets.push('verse_mark = ?');  vals.push(patch.verse_mark); }
    if (sets.length === 0) return this.find(surahId, ayahNum);

    vals.push(surahId, ayahNum);
    await execute(
      this.db,
      `UPDATE qr_ayah SET ${sets.join(', ')} WHERE surah = ? AND ayah = ?`,
      vals,
    );
    return this.find(surahId, ayahNum);
  }
}
