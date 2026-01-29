/**
 * CANONICAL WORLDVIEW CLAIM (DB-BACKED)
 * Matches `wv_claims` table exactly.
 * - Table is intentionally thin
 * - Full semantic structure lives in claim_json
 * - This is the authoritative store for claims
 */

export interface WorldviewClaim {
  entity_type: 'worldview_claim';
  id: number;

  user_id: number | null;

  title: string;

  status: WorldviewClaimStatus;

  claim: WorldviewClaimPayload;

  created_at: string;
  updated_at: string | null;
}

export type WorldviewClaimStatus = 'draft' | 'active' | 'published' | 'archived';

export interface WorldviewClaimPayload {
  claim_type: WorldviewClaimType;
  subtype: WorldviewClaimSubtype | null;
  title_short?: string | null;
  confidence_level?: number | null;
  reference: WorldviewClaimReference;
  claim_text: string;
  claim_text_short?: string | null;
  units?: WorldviewClaimUnit[];
  session_wv_concepts?: WorldviewClaimConceptItem[];
  session_counterclaims?: WorldviewCounterClaimItem[];
  evaluation?: WorldviewClaimEvaluation;
  tags?: string[];
}

export type WorldviewClaimType =
  | 'descriptive'
  | 'normative'
  | 'historical'
  | 'theological'
  | 'philosophical'
  | 'legal'
  | 'political'
  | 'scientific'
  | 'sociological'
  | 'other';

export type WorldviewClaimSubtype =
  | 'assertion'
  | 'argument'
  | 'principle'
  | 'doctrine'
  | 'critique'
  | 'comparison'
  | 'hypothesis';

export interface WorldviewClaimReference {
  source_type: WorldviewSourceType;
  source_ref_id: string | null;
  author: string | null;
  work_title: string | null;
  section_from: string | null;
  section_to: string | null;
  ref_label: string | null;
  citation: string | null;
}

export type WorldviewSourceType =
  | 'book'
  | 'article'
  | 'paper'
  | 'speech'
  | 'lecture'
  | 'religious_text'
  | 'historical_text'
  | 'philosophy'
  | 'political_theory'
  | 'law'
  | 'other';

export type WorldviewClaimUnitType =
  | 'paragraph'
  | 'sentence'
  | 'quote'
  | 'evidence'
  | 'example';

export interface WorldviewClaimUnit {
  unit_id: string;
  unit_type: WorldviewClaimUnitType;
  text: string;
  note: string | null;
}

export interface WorldviewClaimConceptItem {
  concept_id: number | null;
  unit_id: string | null;
  label: string;
  definition: string | null;
  relevance: 'low' | 'medium' | 'high';
  note: string | null;
}

export interface WorldviewCounterClaimItem {
  counterclaim_id: number | null;
  unit_id: string | null;
  counterclaim_text: string;
  stance: 'supporting' | 'opposing' | 'qualifying';
  confidence: number | null;
  note: string | null;
  tags: string[];
}

export interface WorldviewClaimEvaluation {
  strengths?: string[];
  weaknesses?: string[];
  open_questions?: string[];
  comparison_links?: WorldviewClaimComparison[];
}

export interface WorldviewClaimComparison {
  comparison_id: string;
  with_claim_id: number | null;
  relation: 'supports' | 'contradicts' | 'refines' | 'unrelated';
  note: string | null;
}

export class WorldviewClaimModel {
  constructor(public data: WorldviewClaim) {}
}
