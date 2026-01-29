/**
 * CANONICAL BRAINSTORM SESSION (v2)
 * Includes: RAW (inline) + SEMI-RAW (raw_notes) + ANALYSIS (brain_items) + PAIN + RECALL PLAN + PROMOTIONS + REFS_JSON
 * Design goals:
 * - Single JSON blob saveable to DB
 * - Multi-pane extensible (3 panes or more)
 * - Strong linking between panes/extracts/notes/items/sources
 * - Promotion tracking to structured entities later
 */

export interface BrainstormSession {
  entity_type: 'brainstorm_session';
  schema_version: 2;
  id: string;
  topic: string;
  topic_concept_ids: string[];
  status: BrainstormStatus;
  stage: BrainstormStage;
  user_id?: number | null;
  revision?: number;
  sources: BrainstormSource[];
  pane_bundle: BrainstormPaneBundle;
  brain_items: BrainstormItem[];
  pain_points?: BrainstormPainPoint[];
  filter_index?: BrainstormFilterIndex & { is_cached?: boolean; built_at?: string | null };
  recall?: BrainstormRecall;
  refs_json?: BrainstormRefsIndex;
  promotions?: BrainstormPromotions;
  autosave?: BrainstormAutosave;
  access?: BrainstormAccess;
  created_at: string;
  updated_at: string | null;
}

export type BrainstormStatus = 'open' | 'closed' | 'archived';
export type BrainstormStage = 'raw' | 'structured' | 'linked';

export interface BrainstormAutosave {
  enabled: boolean;
  dirty: boolean;
  last_saved_at: string | null;
}

export interface BrainstormAccess {
  level: 'private' | 'shared' | 'public';
  shared_with?: Array<{ user_id: number; role?: 'viewer' | 'editor' }>;
}

export type BrainstormSourceType =
  | 'library_entry'
  | 'quran'
  | 'bible'
  | 'classical_text'
  | 'hadith'
  | 'poetry'
  | 'worldview'
  | 'ar_lesson'
  | 'web'
  | 'youtube'
  | 'book'
  | 'paper'
  | 'other';

export interface BrainstormSource {
  id: string;
  source_type: BrainstormSourceType;
  source_ref_id: string | null;
  label: string;
  locator: BrainstormLocator | null;
  url?: string | null;
  meta_json?: Record<string, unknown> | null;
}

export type BrainstormLocatorType =
  | 'timestamp'
  | 'page'
  | 'section'
  | 'verse'
  | 'line'
  | 'chapter'
  | 'range'
  | 'other';

export interface BrainstormLocator {
  type: BrainstormLocatorType;
  value: string;
}

export interface BrainstormPaneBundle {
  bundle_type: BrainstormPaneBundleType;
  origin: BrainstormOrigin | null;
  panes: BrainstormPane[];
}

export type BrainstormPaneBundleType = 'full_3_pane_snapshot' | 'custom';

export interface BrainstormOrigin {
  type: BrainstormOriginType;
  session_id: string | null;
  note: string | null;
}

export type BrainstormOriginType = 'comparison_session' | 'manual' | 'import';

export interface BrainstormPane {
  pane_id: string;
  title: string;
  source_ref: BrainstormSourceRef | null;
  source: BrainstormPaneSource;
  raw_notes?: BrainstormRawNote[];
  extracts: BrainstormExtract[];
  highlights: BrainstormHighlight[];
}

export interface BrainstormSourceRef {
  source_type: BrainstormSourceType;
  refs: string[];
  source_id?: string | null;
}

export interface BrainstormPaneSource {
  format: BrainstormPaneFormat;
  delta: QuillDelta;
}

export type BrainstormPaneFormat = 'quill_delta';

export interface QuillDelta {
  ops: Array<QuillOp>;
}

export type QuillOp = {
  insert: string | Record<string, unknown>;
  attributes?: Record<string, unknown>;
};

export interface BrainstormRawNote {
  id: string;
  text: string;
  tone?: BrainstormRawNoteTone;
  certainty?: number | null;
  tags?: string[];
  links?: BrainstormLink[];
  created_at: string;
  updated_at?: string | null;
}

export type BrainstormRawNoteTone = 'intuition' | 'confusion' | 'pattern' | 'tension' | 'idea' | 'question';

export interface BrainstormExtract {
  id: string;
  text: string;
  extract_type?: BrainstormExtractType;
  pane_anchor: BrainstormRange;
  quote_anchor: BrainstormQuoteAnchor;
  refs_json?: BrainstormRefPointer | null;
  tags: string[];
  status: BrainstormExtractStatus;
  created_at: string;
  updated_at?: string | null;
}

export type BrainstormExtractStatus = 'kept' | 'dropped';

export type BrainstormExtractType =
  | 'quote'
  | 'paraphrase'
  | 'definition'
  | 'argument_step'
  | 'objection'
  | 'summary'
  | 'term'
  | 'other';

export interface BrainstormRange {
  type: 'quill_range';
  index: number;
  length: number;
}

export interface BrainstormQuoteAnchor {
  type: 'hybrid';
  quote: string;
  prefix: string | null;
  suffix: string | null;
}

export interface BrainstormHighlight {
  id: string;
  kind: BrainstormHighlightKind;
  range: BrainstormRange;
  style: BrainstormHighlightStyle;
  linked_extract_id: string | null;
  tags: string[];
  active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export type BrainstormHighlightKind = 'extract_highlight' | 'note' | 'claim';
export type BrainstormHighlightStyle = 'extract' | 'note' | 'claim';

export type BrainstormLinkKind =
  | 'pane'
  | 'pane_extract'
  | 'pane_note'
  | 'brain_item'
  | 'source'
  | 'promotion_target';

export interface BrainstormLink {
  kind: BrainstormLinkKind;
  pane_id?: string | null;
  extract_id?: string | null;
  note_id?: string | null;
  item_id?: string | null;
  source_id?: string | null;
  locator?: BrainstormLocator | null;
  target_type?: BrainstormPromotionTargetType | null;
  target_id?: string | number | null;
}

export interface BrainstormItem {
  id: string;
  type: BrainstormItemType;
  text: string;
  confidence: BrainstormConfidence | null;
  tags: string[];
  links: BrainstormLink[];
}

export type BrainstormItemType = 'observation' | 'question' | 'hypothesis';
export type BrainstormConfidence = number;

export interface BrainstormPainPoint {
  id: string;
  kind: BrainstormPainKind;
  text: string;
  severity: 1 | 2 | 3 | 4 | 5;
  status: 'open' | 'resolved' | 'archived';
  tags?: string[];
  links?: BrainstormLink[];
  created_at: string;
  updated_at?: string | null;
}

export type BrainstormPainKind =
  | 'confusion'
  | 'contradiction_tension'
  | 'missing_evidence'
  | 'unclear_definition'
  | 'too_much_text'
  | 'time_pressure'
  | 'bias_risk'
  | 'other';

export interface BrainstormFilterIndex {
  panes: string[];
  tags: string[];
  item_types: BrainstormItemType[];
  extract_status: BrainstormExtractStatus[];
  highlight_styles: BrainstormHighlightStyle[];
  extract_types?: BrainstormExtractType[];
  pain_kinds?: BrainstormPainKind[];
  note_tones?: BrainstormRawNoteTone[];
}

export interface BrainstormRecall {
  summary_raw: string;
  keywords: string[];
  next_actions: string[];
  flash_recall?: BrainstormFlashRecall[];
  review_schedule?: BrainstormReviewSchedule;
}

export interface BrainstormFlashRecall {
  id: string;
  prompt: string;
  answer: string;
  links?: BrainstormLink[];
}

export interface BrainstormReviewSchedule {
  first_review_at: string | null;
  spaced_days: number[];
}

export interface BrainstormRefsIndex {
  primary_topic_refs?: string[];
  external_refs?: Array<{ source_id: string; locator?: BrainstormLocator | null }>;
  pane_refs?: Array<{ pane_id: string; refs: string[] }>;
}

export interface BrainstormRefPointer {
  ref: string;
  source_id?: string | null;
  locator?: BrainstormLocator | null;
}

export type BrainstormPromotionTargetType =
  | 'worldview_claim'
  | 'worldview_lesson'
  | 'concept'
  | 'concept_anchor'
  | 'cross_reference'
  | 'quran_relation'
  | 'content_item'
  | 'other';

export interface BrainstormPromotions {
  wv_claims?: BrainstormPromotion[];
  wv_concept_anchors?: BrainstormPromotion[];
  wv_cross_references?: BrainstormPromotion[];
  ar_quran_relations?: BrainstormPromotion[];
  wv_content_items?: BrainstormPromotion[];
}

export interface BrainstormPromotion {
  from_kind: 'brain_item' | 'pane_extract' | 'pane_note';
  from_id: string;
  target_type: BrainstormPromotionTargetType;
  target_id: string | number | null;
  status: 'planned' | 'created' | 'linked' | 'dropped';
  note?: string | null;
  created_at?: string | null;
}

export class BrainstormSessionModel {
  constructor(public data: BrainstormSession) {}
}
