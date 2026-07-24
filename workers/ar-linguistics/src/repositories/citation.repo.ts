// ─── CitationRepo — Roam-style backlinks over ar_ling_citations ───────────────
// Forward: a root/layer's sources. Reverse: a resource's "Linked References".
// The link target is a typed ref (ALB:/ALE:/SRC:/ALGEN:/QRT:/QR:/SS:/AREX:), so
// the same edge table spans lexicon, roots, expressions, tafsīr and SS.

import { query } from '../../../shared/src/db';

export interface Citation {
  fromLayer: string;
  fromId: string;
  toRef: string;
  toKind: string;
  relation: string;
  sourceSlug: string | null;
  pageNo: number | null;
  quoteAr: string | null;
  confidence: number | null;
}

export interface Backlink {
  rootNorm: string | null;
  fromLayer: string;
  fromId: string;
  relation: string;
  sourceSlug: string | null;
  quoteAr: string | null;
  confidence: number | null;
}

const SELECT_FWD = `
  SELECT from_layer AS fromLayer, from_id AS fromId, to_ref AS toRef, to_kind AS toKind,
         relation, source_slug AS sourceSlug, page_no AS pageNo, quote_ar AS quoteAr,
         confidence
  FROM ar_ling_citations
  WHERE root_norm = ? AND status = 'live'
  ORDER BY from_layer, page_no`;

export class CitationRepo {
  constructor(private db: D1Database) {}

  /** Forward — every source a root's layers cite. */
  byRoot(root: string): Promise<Citation[]> {
    return query<Citation>(this.db, SELECT_FWD, [root]);
  }

  /** Reverse — the "Linked References" of one resource (pass a typed to_ref). */
  referencedBy(ref: string): Promise<Backlink[]> {
    return query<Backlink>(
      this.db,
      `SELECT root_norm AS rootNorm, from_layer AS fromLayer, from_id AS fromId,
              relation, source_slug AS sourceSlug, quote_ar AS quoteAr, confidence
       FROM ar_ling_citations
       WHERE to_ref = ? AND status = 'live'
       ORDER BY from_layer`,
      [ref],
    );
  }

  /** Distinct resources a root points at, with how many layers cite each. */
  resources(root: string): Promise<Array<{ toRef: string; toKind: string; sourceSlug: string | null; refCount: number }>> {
    return query(
      this.db,
      `SELECT to_ref AS toRef, to_kind AS toKind, source_slug AS sourceSlug, COUNT(*) AS refCount
       FROM ar_ling_citations
       WHERE root_norm = ? AND status = 'live'
       GROUP BY to_ref
       ORDER BY refCount DESC`,
      [root],
    );
  }
}
