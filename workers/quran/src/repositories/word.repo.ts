// ─── WordRepo — all SQL for qr_word_occurrences ───────────────────────────────
// qr_word_occurrences is the single canonical owner of visible Quranic words.
// Do NOT create qr_ss_occ_word — that table does not exist in the schema.

import { query, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';
import type { WordOccurrence } from '../schemas/word.schema';

const SELECT = `
  id, surah, ayah, word_position,
  text_uthmani, text_clean,
  lx_lemma_ref, root_text, pos_tag, morphology_tag
FROM qr_word_occurrences`;

export class WordRepo {
  constructor(private db: D1Database) {}

  /** All word occurrences for a single ayah, ordered by position. */
  byAyah(surahId: number, ayahNum: number): Promise<WordOccurrence[]> {
    return query<WordOccurrence>(
      this.db,
      `SELECT ${SELECT}
       WHERE surah = ? AND ayah = ?
       ORDER BY word_position`,
      [surahId, ayahNum],
    );
  }

  /** All words in an ayah range. */
  byRange(surahId: number, from: number, to: number): Promise<WordOccurrence[]> {
    return query<WordOccurrence>(
      this.db,
      `SELECT ${SELECT}
       WHERE surah = ? AND ayah BETWEEN ? AND ?
       ORDER BY ayah, word_position`,
      [surahId, from, to],
    );
  }

  /** All occurrences of a lemma across the entire Quran. */
  byLemmaRef(lxLemmaRef: string, opts: PaginateOptions = {}) {
    return paginate<WordOccurrence>(
      this.db,
      `SELECT ${SELECT} WHERE lx_lemma_ref = ? ORDER BY surah, ayah, word_position`,
      `SELECT COUNT(*) AS count FROM qr_word_occurrences WHERE lx_lemma_ref = ?`,
      [lxLemmaRef],
      opts,
    );
  }

  /** All occurrences of a root across the entire Quran. */
  byRoot(rootText: string, opts: PaginateOptions = {}) {
    return paginate<WordOccurrence>(
      this.db,
      `SELECT ${SELECT} WHERE root_text = ? ORDER BY surah, ayah, word_position`,
      `SELECT COUNT(*) AS count FROM qr_word_occurrences WHERE root_text = ?`,
      [rootText],
      opts,
    );
  }
}
