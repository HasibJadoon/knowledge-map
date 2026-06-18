// ─── WordViewRepo — panels for the fused word lens ───────────────────────────
// verb government + root antonyms (new tables) and verbal idioms by root.

import { query } from '../../../shared/src/db';

export interface VgRow {
  verbAr: string;
  form: string | null;
  transitivity: string;
  harf: string | null;
  meaningEn: string | null;
  meaningAr: string | null;
  qrRef: string | null;
}
export interface AntonymRow {
  ar: string;
  en: string | null;
  kind: string;
}
export interface IdiomRow {
  phraseAr: string;
  en: string | null;
  sourceLabel: string;
}

export class WordViewRepo {
  constructor(private db: D1Database) {}

  /** ar_ling_verb_government — transitivity + preposition government. */
  verbGovernment(root: string) {
    return query<VgRow>(
      this.db,
      `SELECT verb_ar AS verbAr, verb_form AS form, transitivity, harf,
              meaning_en AS meaningEn, meaning_ar AS meaningAr, qr_ref AS qrRef
       FROM ar_ling_verb_government
       WHERE root_norm = ? AND status = 'live'
       ORDER BY sort_order`,
      [root],
    );
  }

  /** ar_ling_root_antonyms — cross-root opposites/contrasts. */
  antonyms(root: string) {
    return query<AntonymRow>(
      this.db,
      `SELECT antonym_ar AS ar, antonym_en AS en, relation_kind AS kind
       FROM ar_ling_root_antonyms
       WHERE root_norm = ? AND status = 'live'
       ORDER BY sort_order`,
      [root],
    );
  }

  /** ar_ling_expressions (Mir verbal idioms) for the root, via lemma → root. */
  expressionsByRoot(root: string) {
    return query<IdiomRow>(
      this.db,
      `SELECT e.expression_ar AS phraseAr, e.expression_en AS en,
              'Mir · Verbal Idioms' AS sourceLabel
       FROM ar_ling_expressions e
       JOIN ar_ling_lemmas l ON l.id = e.primary_lemma_id
       JOIN ar_ling_roots  r ON r.id = l.root_id
       WHERE r.root_text = ?
       LIMIT 12`,
      [root],
    );
  }
}
