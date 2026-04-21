// ─── NahwRepo — ar_ling_nahw_concepts + sentence/clause/phrase types ──────────

import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';

export interface NahwConcept {
  id: string;           // AL:ULID
  concept_key: string;  // e.g. 'mubtada', 'khabar', 'fail'
  label_ar: string;
  label_en: string;
  category: string;     // syntax | morphology | grammar
  description: string | null;
  parent_id: string | null;  // AL:ULID (for hierarchical tree)
}

export class NahwRepo {
  constructor(private db: D1Database) {}

  list(category?: string, opts: PaginateOptions = {}) {
    const where = category ? `WHERE category = ?` : '';
    const params = category ? [category] : [];
    return paginate<NahwConcept>(
      this.db,
      `SELECT id, concept_key, label_ar, label_en, category, description, parent_id
       FROM ar_ling_nahw_concepts ${where} ORDER BY category, label_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_nahw_concepts ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<NahwConcept | null> {
    return queryOne<NahwConcept>(
      this.db,
      `SELECT id, concept_key, label_ar, label_en, category, description, parent_id
       FROM ar_ling_nahw_concepts WHERE id = ?`,
      [id],
    );
  }

  findByKey(key: string): Promise<NahwConcept | null> {
    return queryOne<NahwConcept>(
      this.db,
      `SELECT id, concept_key, label_ar, label_en, category, description, parent_id
       FROM ar_ling_nahw_concepts WHERE concept_key = ?`,
      [key],
    );
  }

  children(parentId: string): Promise<NahwConcept[]> {
    return query<NahwConcept>(
      this.db,
      `SELECT id, concept_key, label_ar, label_en, category, description, parent_id
       FROM ar_ling_nahw_concepts WHERE parent_id = ? ORDER BY label_ar`,
      [parentId],
    );
  }
}
