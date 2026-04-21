// ─── BalaghaRepo — ar_ling_balagha_concepts + branches + examples ─────────────

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

export class BalaghaRepo {
  constructor(private db: D1Database) {}

  listConcepts(branch?: string, opts: PaginateOptions = {}) {
    const where = branch ? `WHERE branch = ?` : '';
    const params = branch ? [branch] : [];
    return paginate<BalaghaConcept>(
      this.db,
      `SELECT id, concept_key, label_ar, label_en, branch, description, parent_id
       FROM ar_ling_balagha_concepts ${where} ORDER BY branch, label_ar`,
      `SELECT COUNT(*) AS count FROM ar_ling_balagha_concepts ${where}`,
      params,
      opts,
    );
  }

  findById(id: string): Promise<BalaghaConcept | null> {
    return queryOne<BalaghaConcept>(
      this.db,
      `SELECT id, concept_key, label_ar, label_en, branch, description, parent_id
       FROM ar_ling_balagha_concepts WHERE id = ?`,
      [id],
    );
  }

  examplesByConcept(conceptId: string): Promise<BalaghaExample[]> {
    return query<BalaghaExample>(
      this.db,
      `SELECT id, concept_id, text_ar, source_ref, explanation
       FROM ar_ling_balagha_examples WHERE concept_id = ?`,
      [conceptId],
    );
  }
}
