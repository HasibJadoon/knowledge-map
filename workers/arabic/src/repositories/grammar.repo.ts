// ─── GrammarRepo — ar_grammar ─────────────────────────────────────────────────
// Learner grammar items tied to nahw/sarf concepts in km_arabic_linguistic.
// lx_nahw_ref → AL:ULID in ar_ling_nahw_concepts (never duplicate definitions).

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

export interface GrammarItem {
  id: string;             // AR:ULID
  container_id: string;   // AR:ULID
  lx_nahw_ref: string;    // AL:ULID → ar_ling_nahw_concepts
  label: string;          // short display label (e.g. "فاعل")
  example_ar: string | null;
  explanation: string | null;
  sort_order: number;
  status: string;
  created_at: string;
}

export interface GrammarCreate {
  container_id: string;
  lx_nahw_ref: string;
  label: string;
  example_ar?: string | null;
  explanation?: string | null;
  sort_order?: number;
}

const COLS = `id, container_id, lx_nahw_ref, label, example_ar,
              explanation, sort_order, status, created_at`;

export class GrammarRepo {
  constructor(private db: D1Database) {}

  byContainer(containerId: string, opts: PaginateOptions = {}) {
    return paginate<GrammarItem>(
      this.db,
      `SELECT ${COLS} FROM ar_grammar WHERE container_id = ? ORDER BY sort_order`,
      `SELECT COUNT(*) AS count FROM ar_grammar WHERE container_id = ?`,
      [containerId],
      opts,
    );
  }

  /** All grammar items for a specific nahw concept across all containers. */
  byNahwRef(lxNahwRef: string, opts: PaginateOptions = {}) {
    return paginate<GrammarItem>(
      this.db,
      `SELECT ${COLS} FROM ar_grammar WHERE lx_nahw_ref = ? ORDER BY sort_order`,
      `SELECT COUNT(*) AS count FROM ar_grammar WHERE lx_nahw_ref = ?`,
      [lxNahwRef],
      opts,
    );
  }

  findById(id: string): Promise<GrammarItem | null> {
    return queryOne<GrammarItem>(
      this.db, `SELECT ${COLS} FROM ar_grammar WHERE id = ?`, [id],
    );
  }

  async create(input: GrammarCreate): Promise<GrammarItem> {
    const id  = typedId('AR');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO ar_grammar
         (id, container_id, lx_nahw_ref, label, example_ar, explanation, sort_order, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [id, input.container_id, input.lx_nahw_ref, input.label,
       input.example_ar ?? null, input.explanation ?? null,
       input.sort_order ?? 0, now],
    );
    return (await this.findById(id))!;
  }
}
