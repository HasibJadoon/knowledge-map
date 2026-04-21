// ─── RootRepo — all SQL for ar_ling_roots ─────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type { Root, RootCreate } from '../schemas/root.schema';

export class RootRepo {
  constructor(private db: D1Database) {}

  list(opts: PaginateOptions = {}) {
    return paginate<Root>(
      this.db,
      `SELECT id, root_text, root_normalized, letter_count, frequency, notes
       FROM ar_ling_roots
       ORDER BY root_text`,
      `SELECT COUNT(*) AS count FROM ar_ling_roots`,
      [],
      opts,
    );
  }

  findById(id: string): Promise<Root | null> {
    return queryOne<Root>(
      this.db,
      `SELECT id, root_text, root_normalized, letter_count, frequency, notes
       FROM ar_ling_roots WHERE id = ?`,
      [id],
    );
  }

  search(q: string, opts: PaginateOptions = {}) {
    const pattern = `%${q}%`;
    return paginate<Root>(
      this.db,
      `SELECT id, root_text, root_normalized, letter_count, frequency, notes
       FROM ar_ling_roots
       WHERE root_text LIKE ? OR root_normalized LIKE ?
       ORDER BY frequency DESC, root_text`,
      `SELECT COUNT(*) AS count FROM ar_ling_roots
       WHERE root_text LIKE ? OR root_normalized LIKE ?`,
      [pattern, pattern],
      opts,
    );
  }

  async create(input: RootCreate): Promise<Root> {
    const id = typedId('AL');
    const normalized = input.root_text.replace(/[\u064B-\u065F]/g, ''); // strip diacritics
    await execute(
      this.db,
      `INSERT INTO ar_ling_roots (id, root_text, root_normalized, letter_count, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.root_text, normalized, input.letter_count ?? 3, input.notes ?? null],
    );
    return (await this.findById(id))!;
  }
}
