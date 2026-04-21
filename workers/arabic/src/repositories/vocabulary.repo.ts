// ─── VocabularyRepo — ar_vocabulary ───────────────────────────────────────────
// Learner vocabulary cards. Stores AL:ULID refs for lemma truth — never
// duplicates linguistic data from km_arabic_linguistic.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface VocabCard {
  id: string;               // AR:ULID
  container_id: string;     // AR:ULID
  lx_lemma_ref: string;     // AL:ULID → ar_ling_lemmas
  display_ar: string;
  gloss_en: string | null;
  sort_order: number;
  srs_level: number;        // 0-5
  next_review_at: string | null;
  created_at: string;
}

export interface VocabCreate {
  container_id: string;
  lx_lemma_ref: string;
  display_ar: string;
  gloss_en?: string | null;
  sort_order?: number;
}

const COLS = `id, container_id, lx_lemma_ref, display_ar, gloss_en,
              sort_order, srs_level, next_review_at, created_at`;

export class VocabularyRepo {
  constructor(private db: D1Database) {}

  byContainer(containerId: string, opts: PaginateOptions = {}) {
    return paginate<VocabCard>(
      this.db,
      `SELECT ${COLS} FROM ar_vocabulary WHERE container_id = ? ORDER BY sort_order`,
      `SELECT COUNT(*) AS count FROM ar_vocabulary WHERE container_id = ?`,
      [containerId],
      opts,
    );
  }

  findById(id: string): Promise<VocabCard | null> {
    return queryOne<VocabCard>(
      this.db,
      `SELECT ${COLS} FROM ar_vocabulary WHERE id = ?`,
      [id],
    );
  }

  /** SRS: cards due for review (srs_level < 5 and next_review_at <= now). */
  dueCards(containerId: string, limit = 20): Promise<VocabCard[]> {
    const now = new Date().toISOString();
    return query<VocabCard>(
      this.db,
      `SELECT ${COLS} FROM ar_vocabulary
       WHERE container_id = ?
         AND srs_level < 5
         AND (next_review_at IS NULL OR next_review_at <= ?)
       ORDER BY next_review_at NULLS FIRST, sort_order
       LIMIT ?`,
      [containerId, now, limit],
    );
  }

  async create(input: VocabCreate): Promise<VocabCard> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_vocabulary
         (id, container_id, lx_lemma_ref, display_ar, gloss_en, sort_order, srs_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, input.container_id, input.lx_lemma_ref, input.display_ar,
       input.gloss_en ?? null, input.sort_order ?? 0, now],
    );
    return (await this.findById(id))!;
  }

  /** Record SRS review result. Exponential back-off: interval = 2^quality days. */
  async recordReview(id: string, quality: number): Promise<VocabCard | null> {
    const q        = Math.max(0, Math.min(5, Math.round(quality)));
    const level    = q;
    const next     = new Date();
    next.setDate(next.getDate() + Math.pow(2, q));
    await execute(
      this.db,
      `UPDATE ar_vocabulary
       SET srs_level = ?, next_review_at = ?, last_reviewed_at = ?
       WHERE id = ?`,
      [level, next.toISOString(), new Date().toISOString(), id],
    );
    return this.findById(id);
  }
}
