/**
 * CANONICAL QURAN RELATION
 * Purpose:
 * - Links a Concept to a non-Qur’anic target (worldview claim, library source, or content)
 * - Encodes how Qur’anic principles relate to that target
 * - Evidence is Qur’an-first and structured via quran_evidence_json
 */

export interface QuranRelation {
  entity_type: 'quran_relation';
  id: number;

  user_id: number | null;

  concept_id: number;

  target_type: QuranRelationTargetType;
  target_id: string;

  relation: QuranRelationType;

  quran_evidence: QuranEvidence[] | null;
  note: string | null;

  created_at: string;
  updated_at: string | null;
}

export type QuranRelationTargetType =
  | 'worldview_claim'
  | 'library_entry'
  | 'content_item';

export type QuranRelationType =
  | 'align'
  | 'partial'
  | 'contradict'
  | 'unknown';

export interface QuranEvidence {
  surah: number;
  ayah: number | string;
  arabic: string | null;
  translation: string | null;
  explanation: string | null;
  tags: string[];
}

export class QuranRelationModel {
  constructor(public data: QuranRelation) {}
}
