/**
 * CANONICAL CROSS REFERENCE
 * Purpose:
 * - Stores explicit cross-links between heterogeneous knowledge objects
 * - Used for Qur’an ↔ Worldview ↔ Concept ↔ Claim ↔ Content comparisons
 * - Entire meaning lives in ref_json (intentionally flexible)
 */

export interface CrossReference {
  entity_type: 'cross_reference';
  id: number;

  user_id: number | null;

  status: CrossReferenceStatus;

  ref_json: CrossReferencePayload;

  created_at: string;
  updated_at: string | null;
}

export type CrossReferenceStatus = 'active' | 'archived';

export interface CrossReferencePayload {
  relation_type: CrossReferenceRelationType;
  left: CrossReferenceEndpoint;
  right: CrossReferenceEndpoint;
  direction: CrossReferenceDirection;
  note: string | null;
  confidence: number | null;
  tags: string[];
}

export type CrossReferenceRelationType =
  | 'supports'
  | 'contradicts'
  | 'clarifies'
  | 'parallels'
  | 'refines'
  | 'derives_from'
  | 'applies_to'
  | 'illustrates'
  | 'other';

export type CrossReferenceDirection = 'left_to_right' | 'right_to_left' | 'bidirectional';

export interface CrossReferenceEndpoint {
  entity_type: CrossReferenceEntityType;
  entity_id: string | number;
  label: string | null;
  locator: CrossReferenceLocator | null;
}

export type CrossReferenceEntityType =
  | 'ar_lesson'
  | 'worldview_claim'
  | 'concept'
  | 'lexicon_entry'
  | 'content_item'
  | 'library_entry'
  | 'brainstorm_session'
  | 'external';

export type CrossReferenceLocatorType =
  | 'surah_ayah'
  | 'paragraph'
  | 'sentence'
  | 'page'
  | 'section'
  | 'timestamp'
  | 'url'
  | 'other';

export interface CrossReferenceLocator {
  type: CrossReferenceLocatorType;
  value: string;
}

export class CrossReferenceModel {
  constructor(public data: CrossReference) {}
}
