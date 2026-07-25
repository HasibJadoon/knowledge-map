// ─── BalaghaRepo — ar_ling_gram_term (discipline = 'balagha') ────────────────
//
// Balāgha concepts share the grammar-term table with naḥw after the AL rename;
// `discipline` separates them. The branch (bayān | badīʿ | maʿānī) is what
// `category_key` holds, and examples live in ar_ling_gram_term_example.
//
// The BalaghaConcept / BalaghaExample shapes callers see are unchanged.

import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';

export interface BalaghaConcept {
  id: string;           // AL:ULID
  concept_key: string;  // e.g. 'tashbih', 'istiara', 'majaz'
  label_ar: string;
  label_en: string;
  branch: string;       // bayan | badi | maani
  description: string | null;
  parent_id: string | null;
}

export interface BalaghaExample {
  id: string;           // AL:ULID
  concept_id: string;   // AL:ULID
  text_ar: string;
  source_ref: string | null;  // QR:surah:ayah or CM:ULID
  explanation: string | null;
}

const CONCEPT_COLS = `
  id,
  term_key       AS concept_key,
  name_ar        AS label_ar,
  name_en        AS label_en,
  category_key   AS branch,
  definition_en  AS description,
  parent_term_id AS parent_id`;

const DISCIPLINE = `discipline = 'balagha'`;

const EXAMPLE_COLS = `
  id,
  term_id     AS concept_id,
  example_ar  AS text_ar,
  COALESCE(qr_ref, source_ref) AS source_ref,
  gloss_en    AS explanation`;

export class BalaghaRepo {
  constructor(private db: D1Database) {}

  listConcepts(branch?: string, opts: PaginateOptions = {}) {
    const where  = branch ? `WHERE ${DISCIPLINE} AND category_key = ?` : `WHERE ${DISCIPLINE}`;
    const params = branch ? [branch] : [];
    return paginate<BalaghaConcept>(
      this.db,
      `SELECT ${CONCEPT_COLS}
       FROM ar_ling_gram_term ${where} ORDER BY category_key, name_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_gram_term ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<BalaghaConcept | null> {
    return queryOne<BalaghaConcept>(
      this.db,
      `SELECT ${CONCEPT_COLS}
       FROM ar_ling_gram_term WHERE id = ? AND ${DISCIPLINE}`,
      [id],
    );
  }

  examplesByConcept(conceptId: string): Promise<BalaghaExample[]> {
    return query<BalaghaExample>(
      this.db,
      `SELECT ${EXAMPLE_COLS}
       FROM ar_ling_gram_term_example WHERE term_id = ? ORDER BY sort_order`,
      [conceptId],
    );
  }
}
