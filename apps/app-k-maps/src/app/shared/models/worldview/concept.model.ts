/**
 * CANONICAL CONCEPT
 * Atomic conceptual node used across:
 * - WorldviewClaim
 * - ArabicLesson (concept tagging)
 * - BrainstormSession
 * - Cross-comparison (Qur'an ↔ Worldview)
 */

export interface Concept {
  entity_type: 'concept';
  id: number;

  user_id: number | null;

  slug: string;
  label_ar: string | null;
  label_en: string | null;

  category: ConceptCategory | null;

  notes: string | null;

  status: ConceptStatus;

  created_at: string;
  updated_at: string | null;
}

export type ConceptCategory =
  | 'epistemology'
  | 'morality'
  | 'law'
  | 'power'
  | 'rhetoric'
  | 'narrative'
  | 'society'
  | 'theology'
  | 'history'
  | 'politics'
  | 'ethics'
  | 'ontology'
  | 'other';

export type ConceptStatus = 'active' | 'draft' | 'archived';

export class ConceptModel {
  constructor(public data: Concept) {}
}
