// ─── MorphologyRepo — ar_ling_root_lemma_form_map + ar_ling_root_form_paradigm ─
//
// `ar_ling_morphology` did not survive the AL rename. A lemma's morphology now
// comes from ar_ling_root_lemma_form_map (which keys by lemma text, not by
// lemma id) joined to ar_ling_root_form_family for the wazn and form name — so
// byLemma resolves the id to its lemma text first.
//
// ar_ling_root_form_paradigm kept its name but not its columns: `category` is
// now `paradigm_type` and there is no `example_ar`; the ṣarf bāb (`bab_key`)
// is the closest thing to the old `pattern`.

import { query, queryOne, paginate } from '../../../shared/src/db';
import type { PaginateOptions } from '../../../shared/src/types';

export interface MorphologyEntry {
  id: string;           // AL:ULID
  lemma_id: string;     // AL:ULID
  form_ar: string;
  stem_type: string | null;  // verb_form | noun_pattern | ...
  pattern: string | null;    // فَعَلَ / فِعَال etc.
  tags: string | null;       // JSON array of grammatical tags
}

export interface FormParadigm {
  id: string;           // AL:ULID
  paradigm_name: string;
  category: string;     // verb | noun | adjective | ...
  pattern: string;
  example_ar: string | null;
}

export class MorphologyRepo {
  constructor(private db: D1Database) {}

  byLemma(lemmaId: string): Promise<MorphologyEntry[]> {
    return query<MorphologyEntry>(
      this.db,
      `SELECT fm.form_family_id           AS id,
              l.id                        AS lemma_id,
              fm.lemma_ar                 AS form_ar,
              fm.derivation_type          AS stem_type,
              ff.wazn                     AS pattern,
              ff.verb_form_key            AS tags
       FROM ar_ling_root_lemma l
       JOIN ar_ling_root_lemma_form_map fm
         ON fm.lemma_ar = l.lemma_text
       LEFT JOIN ar_ling_root_form_family ff
         ON ff.id = fm.form_family_id
       WHERE l.id = ?
       ORDER BY fm.derivation_type, fm.lemma_ar`,
      [lemmaId],
    );
  }

  findById(id: string): Promise<MorphologyEntry | null> {
    // `id` is a form-family id: the row identifies a form, not a lemma binding.
    return queryOne<MorphologyEntry>(
      this.db,
      `SELECT ff.id                        AS id,
              ''                           AS lemma_id,
              COALESCE(ff.example_ar, '')  AS form_ar,
              ff.derivation_type           AS stem_type,
              ff.wazn                      AS pattern,
              ff.verb_form_key             AS tags
       FROM ar_ling_root_form_family ff
       WHERE ff.id = ?`,
      [id],
    );
  }

  listParadigms(category?: string, opts: PaginateOptions = {}) {
    const where  = category ? `WHERE paradigm_type = ?` : '';
    const params = category ? [category] : [];
    return paginate<FormParadigm>(
      this.db,
      `SELECT id,
              paradigm_name,
              paradigm_type                     AS category,
              COALESCE(bab_key, verb_form, '')  AS pattern,
              NULL                              AS example_ar
       FROM ar_ling_root_form_paradigm ${where}
       ORDER BY paradigm_type, paradigm_name`,
      `SELECT COUNT(*) AS count FROM ar_ling_root_form_paradigm ${where}`,
      params,
      opts,
    );
  }
}
