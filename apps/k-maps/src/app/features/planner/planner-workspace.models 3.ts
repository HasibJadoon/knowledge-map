export type PlannerWorkspace = 'capture' | 'plan' | 'kanban' | 'review';
export type PlannerExecutionView = 'board' | 'calendar' | 'timeline';

export type CaptureStage = 'inbox' | 'review' | 'done';
export type CaptureStatus = 'draft' | 'active' | 'archived';
export type CaptureDomain =
  | 'arabic_media'
  | 'arabic_linguistics'
  | 'quranic_concepts'
  | 'worldview'
  | 'english_expression';

export interface PlannerSection {
  id: string;
  title: string;
  body: string;
}

export interface PlannerAccordionNote {
  id: string;
  label: string;
  content: string;
}

export interface PlannerPlanState {
  summary: string;
  sections: PlannerSection[];
  accordion_notes: PlannerAccordionNote[];
  pushed_to_feed_at: string | null;
  pushed_to_kanban_at: string | null;
  kanban_task_id: string | null;
  feed_item_id: string | null;
}

export interface CapturePayloadSnapshot {
  domain: CaptureDomain;
  stage: CaptureStage;
  status: CaptureStatus;
  title: string;
  note: string;
  quote: string;
  source: string;
  resources: string[];
  compact_context: string;
  plan_state?: PlannerPlanState;
}

export interface CaptureItem {
  id: string;
  domain: CaptureDomain;
  stage: CaptureStage;
  status: CaptureStatus;
  title: string;
  note: string;
  quote: string;
  source: string;
  resources: string[];
  compact_context: string;
  createdAt: string;
  updatedAt: string;
  payload: CapturePayloadSnapshot;
}

export interface CaptureDraft {
  domain: CaptureDomain;
  stage: CaptureStage;
  title: string;
  note: string;
  quote: string;
  source: string;
  resourcesText: string;
}

export interface PlannerStripItem {
  id: PlannerWorkspace;
  indexLabel: string;
  label: string;
  badge: string;
  caption: string;
  accent: string;
}
