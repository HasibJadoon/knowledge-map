// ─── RootRepo — all SQL for ar_ling_roots ─────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { ulid } from '../../../shared/src/ulid';
import { localId } from '../../../shared/src/refs';
import type { PaginateOptions } from '../../../shared/src/types';
import type { Root, RootCreate } from '../schemas/root.schema';

const COLS = `id, root_text, root_normalized, root_letters, root_type,
              frequency_quran, meaning_core_en, meaning_core_ar, note_md, canonical_id`;

export class RootRepo {
  constructor(private db: D1Database) {}

  list(opts: PaginateOptions = {}) {
    return paginate<Root>(
      this.db,
      `SELECT ${COLS}
       FROM ar_ling_roots
       ORDER BY frequency_quran DESC, root_text`,
      `SELECT COUNT(*) AS count FROM ar_ling_roots`,
      [],
      opts,
    );
  }

  /** Accepts either a bare key or an 'AL:<id>' cross-domain ref. */
  findById(id: string): Promise<Root | null> {
    const key = localId(id, 'AL');
    if (!key) return Promise.resolve(null);
    return queryOne<Root>(
      this.db,
      `SELECT ${COLS} FROM ar_ling_roots WHERE id = ? OR canonical_id = ?`,
      [key, key],
    );
  }

  search(q: string, opts: PaginateOptions = {}) {
    const pattern = `%${q}%`;
    return paginate<Root>(
      this.db,
      `SELECT ${COLS}
       FROM ar_ling_roots
       WHERE root_text LIKE ? OR root_normalized LIKE ?
       ORDER BY frequency_quran DESC, root_text`,
      `SELECT COUNT(*) AS count FROM ar_ling_roots
       WHERE root_text LIKE ? OR root_normalized LIKE ?`,
      [pattern, pattern],
      opts,
    );
  }

  async create(input: RootCreate): Promise<Root> {
    // Bare local key. Do NOT use typedId('AL') here — an 'AL:'-prefixed primary
    // key is what forked ar_ling_root_lemma into 4,817 duplicate rows. The
    // prefix is a reference-site convention (qr_lemma.lx_lemma_ref), not a key.
    const id = ulid();
    const normalized = input.root_text.replace(/[ً-ٟ]/g, ''); // strip diacritics
    const letters = JSON.stringify([...normalized]);
    await execute(
      this.db,
      `INSERT INTO ar_ling_roots
         (id, root_text, root_normalized, root_letters, root_type, note_md, canonical_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.root_text,
        normalized,
        letters,
        input.root_type ?? (normalized.length === 4 ? 'quadrilateral' : 'trilateral'),
        input.note_md ?? null,
        id, // canonical_id == id for roots minted here
      ],
    );
    return (await this.findById(id))!;
  }
}
