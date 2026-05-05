// ─── NahwRepo — ar_ling_nahw_concepts + sentence/clause/phrase types ──────────

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

export class NahwRepo {
  constructor(private db: D1Database) {}

  list(category?: string, opts: PaginateOptions = {}) {
    const where = category ? `WHERE concept_type = ?` : '';
    const params = category ? [category] : [];
    return paginate<NahwConcept>(
      this.db,
      `SELECT id, concept_name_ar, concept_name_en, concept_type, definition_ar,
              definition_en, example_ar, irab_label, parent_id
       FROM ar_ling_nahw_concepts ${where} ORDER BY concept_type, concept_name_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_nahw_concepts ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<NahwConcept | null> {
    return queryOne<NahwConcept>(
      this.db,
      `SELECT id, concept_name_ar, concept_name_en, concept_type, definition_ar,
              definition_en, example_ar, irab_label, parent_id
       FROM ar_ling_nahw_concepts WHERE id = ?`,
      [id],
    );
  }

  findByKey(key: string): Promise<NahwConcept | null> {
    const id = key.startsWith('AL:nahw:') ? key : `AL:nahw:${key}`;
    return queryOne<NahwConcept>(
      this.db,
      `SELECT id, concept_name_ar, concept_name_en, concept_type, definition_ar,
              definition_en, example_ar, irab_label, parent_id
       FROM ar_ling_nahw_concepts WHERE id = ?`,
      [id],
    );
  }

  children(parentId: string): Promise<NahwConcept[]> {
    return query<NahwConcept>(
      this.db,
      `SELECT id, concept_name_ar, concept_name_en, concept_type, definition_ar,
              definition_en, example_ar, irab_label, parent_id
       FROM ar_ling_nahw_concepts WHERE parent_id = ? ORDER BY concept_name_ar`,
      [parentId],
    );
  }
}
