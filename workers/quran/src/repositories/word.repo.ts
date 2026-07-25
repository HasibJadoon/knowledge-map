// ─── WordRepo — all SQL for qr_word_occurrence ───────────────────────────────
// qr_word_occurrence is the single canonical owner of visible Quranic words.
// Column names must match the live D1 schema (word_index / word_text / root /
// lemma / pos) — the older alias set is no longer present in the table.

import { query, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';
import type { WordOccurrence } from '../schemas/word.schema';

const SELECT = `
  id, surah, ayah, word_index,
  word_text, word_text_bare,
  root, lemma, pos, morphology_tag, morphology_tag_json
FROM qr_word_occurrence`;

export class WordRepo {
  constructor(private db: D1Database) {}

  /** All word occurrences for a single ayah, ordered by position. */
  byAyah(surahId: number, ayahNum: number): Promise<WordOccurrence[]> {
    return query<WordOccurrence>(
      this.db,
      `SELECT ${SELECT}
       WHERE surah = ? AND ayah = ?
       ORDER BY word_index`,
      [surahId, ayahNum],
    );
  }

  /** All words in an ayah range. */
  byRange(surahId: number, from: number, to: number): Promise<WordOccurrence[]> {
    return query<WordOccurrence>(
      this.db,
      `SELECT ${SELECT}
       WHERE surah = ? AND ayah BETWEEN ? AND ?
       ORDER BY ayah, word_index`,
      [surahId, from, to],
    );
  }

  /** All occurrences of a lemma across the entire Quran. */
  byLemmaRef(lemma: string, opts: PaginateOptions = {}) {
    return paginate<WordOccurrence>(
      this.db,
      `SELECT ${SELECT} WHERE lemma = ? ORDER BY surah, ayah, word_index`,
      `SELECT COUNT(*) AS count FROM qr_word_occurrence WHERE lemma = ?`,
      [lemma],
      opts,
    );
  }

  /** All occurrences of a root across the entire Quran. */
  byRoot(root: string, opts: PaginateOptions = {}) {
    return paginate<WordOccurrence>(
      this.db,
      `SELECT ${SELECT} WHERE root = ? ORDER BY surah, ayah, word_index`,
      `SELECT COUNT(*) AS count FROM qr_word_occurrence WHERE root = ?`,
      [root],
      opts,
    );
  }
}
