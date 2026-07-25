// ─── LemmaRepo — all SQL for ar_ling_root_lemma ───────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type { Lemma, LemmaCreate } from '../schemas/lemma.schema';

const SELECT = `
  l.id, l.lemma_ar,
  l.root_id, r.root_text,
  l.pos, l.gloss_en, l.gloss_ar, l.frequency
FROM ar_ling_root_lemma l
LEFT JOIN ar_ling_roots r ON r.id = l.root_id`;

export class LemmaRepo {
  constructor(private db: D1Database) {}

  findById(id: string): Promise<Lemma | null> {
    return queryOne<Lemma>(
      this.db,
      `SELECT ${SELECT} WHERE l.id = ?`,
      [id],
    );
  }

  byRoot(rootId: string): Promise<Lemma[]> {
    return query<Lemma>(
      this.db,
      `SELECT ${SELECT} WHERE l.root_id = ? ORDER BY l.lemma_ar`,
      [rootId],
    );
  }

  search(q: string, opts: PaginateOptions = {}) {
    const pattern = `%${q}%`;
    return paginate<Lemma>(
      this.db,
      `SELECT ${SELECT}
       WHERE l.lemma_ar LIKE ? OR l.gloss_en LIKE ?
       ORDER BY l.frequency DESC, l.lemma_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_root_lemma l
       WHERE l.lemma_ar LIKE ? OR l.gloss_en LIKE ?`,
      [pattern, pattern],
      opts,
    );
  }

  async create(input: LemmaCreate): Promise<Lemma> {
    const id = typedId('AL');
    await execute(
      this.db,
      `INSERT INTO ar_ling_root_lemma (id, lemma_ar, root_id, pos, gloss_en, gloss_ar)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.lemma_ar, input.root_id ?? null, input.pos ?? null,
       input.gloss_en ?? null, input.gloss_ar ?? null],
    );
    return (await this.findById(id))!;
  }
}
