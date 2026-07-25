// ─── NahwRepo — ar_ling_gram_term (discipline = 'nahw') ──────────────────────
//
// Naḥw and balāgha concepts were folded into one grammar-term table during the
// AL rename; `discipline` tells them apart and `category_key` carries what used
// to be `concept_type`. The old per-row `example_ar` moved out to
// ar_ling_gram_term_example, so it is joined back in (lowest sort_order wins).
// `irab_label` has no column of its own — `short_ar` is the equivalent field.
//
// The NahwConcept shape callers see is unchanged; the aliases below translate.

import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';

export interface NahwConcept {
  id: string;
  concept_name_ar: string;
  concept_name_en: string;
  concept_type: string;
  definition_ar: string | null;
  definition_en: string | null;
  example_ar: string | null;
  irab_label: string | null;
  parent_id: string | null;
}

const COLS = `
  t.id,
  t.name_ar        AS concept_name_ar,
  t.name_en        AS concept_name_en,
  t.category_key   AS concept_type,
  t.definition_ar,
  t.definition_en,
  (SELECT e.example_ar
     FROM ar_ling_gram_term_example e
    WHERE e.term_id = t.id
    ORDER BY e.sort_order
    LIMIT 1)       AS example_ar,
  t.short_ar       AS irab_label,
  t.parent_term_id AS parent_id`;

const DISCIPLINE = `t.discipline = 'nahw'`;

export class NahwRepo {
  constructor(private db: D1Database) {}

  list(category?: string, opts: PaginateOptions = {}) {
    const where  = category ? `WHERE ${DISCIPLINE} AND t.category_key = ?` : `WHERE ${DISCIPLINE}`;
    const params = category ? [category] : [];
    return paginate<NahwConcept>(
      this.db,
      `SELECT ${COLS}
       FROM ar_ling_gram_term t ${where}
       ORDER BY t.category_key, t.name_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_gram_term t ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<NahwConcept | null> {
    return queryOne<NahwConcept>(
      this.db,
      `SELECT ${COLS}
       FROM ar_ling_gram_term t WHERE t.id = ? AND ${DISCIPLINE}`,
      [id],
    );
  }

  findByKey(key: string): Promise<NahwConcept | null> {
    // Callers pass either a bare term key or the AL:nahw:<key> typed form.
    const termKey = key.startsWith('AL:nahw:') ? key.slice('AL:nahw:'.length) : key;
    return queryOne<NahwConcept>(
      this.db,
      `SELECT ${COLS}
       FROM ar_ling_gram_term t
       WHERE (t.term_key = ? OR t.id = ?) AND ${DISCIPLINE}`,
      [termKey, key],
    );
  }

  children(parentId: string): Promise<NahwConcept[]> {
    return query<NahwConcept>(
      this.db,
      `SELECT ${COLS}
       FROM ar_ling_gram_term t
       WHERE t.parent_term_id = ? AND ${DISCIPLINE}
       ORDER BY t.name_ar`,
      [parentId],
    );
  }
}
