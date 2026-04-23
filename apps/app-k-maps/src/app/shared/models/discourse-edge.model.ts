/**
 * CANONICAL DISCOURSE EDGE
 * Purpose:
 * - A directed edge in your discourse/argument graph
 * - Works for sentence flow, concept flow, argument flow
 * - Points to entities + optional unit ids
 * - relation is bilingual-friendly (can store Arabic rhetorical terms or English tags)
 */

export interface DiscourseEdge {
  entity_type: 'discourse_edge';
  id: number;

  user_id: number | null;

  edge_type: DiscourseEdgeType;
  relation: string;
  strength: number | null;

  from: DiscourseEdgeEndpoint;
  to: DiscourseEdgeEndpoint;

  note: string | null;
  meta_json: DiscourseEdgeMeta | null;

  created_at: string;
  updated_at: string | null;
}

export type DiscourseEdgeType =
  | 'sentence_flow'
  | 'concept_flow'
  | 'argument_flow';

export interface DiscourseEdgeEndpoint {
  entity_type: DiscourseEdgeEntityType;
  entity_id: string;
  unit_id: string | null;
}

export type DiscourseEdgeEntityType =
  | 'ar_lesson'
  | 'worldview_claim'
  | 'library_entry'
  | 'concept'
  | 'content_item'
  | 'brainstorm_session'
  | 'lexicon_entry'
  | 'external';

export interface DiscourseEdgeMeta {
  cue_words?: string[];
  device?: string | null;
  evidence?: Array<DiscourseEvidence>;
  tags?: string[];
  extra?: Record<string, unknown>;
}

export interface DiscourseEvidence {
  source_type: DiscourseEdgeEntityType;
  source_id: string;
  locator?: DiscourseEdgeLocator | null;
  quote?: string | null;
  note?: string | null;
}

export interface DiscourseEdgeLocator {
  type: 'surah_ayah' | 'page' | 'section' | 'paragraph' | 'timestamp' | 'url' | 'other';
  value: string;
}

export class DiscourseEdgeModel {
  constructor(public data: DiscourseEdge) {}
}
