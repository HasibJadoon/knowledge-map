export type PlannerWorkspace = 'capture' | 'plan' | 'kanban' | 'review';
export type PlannerExecutionView = 'board' | 'calendar' | 'timeline';

export type CaptureStage = 'inbox' | 'review' | 'done';
export type CaptureStatus = 'draft' | 'active' | 'archived';

/** Legacy domain values — used throughout existing planner/kanban/plan code */
export type CaptureDomain =
  | 'arabic_media'
  | 'arabic_linguistics'
  | 'quranic_concepts'
  | 'worldview'
  | 'english_expression';

/** New simplified area used by the Tiptap capture system */
export type CaptureArea = 'quran' | 'arabic' | 'wv' | 'vocabulary';

// Tiptap canonical document format
export interface TiptapDoc {
  type: 'doc';
  content: TiptapNode[];
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

export function emptyTiptapDoc(): TiptapDoc {
  return { type: 'doc', content: [] };
}

/** Convert a legacy plain-text note to a minimal Tiptap doc */
export function legacyNoteToTiptap(note: string): TiptapDoc {
  if (!note?.trim()) return emptyTiptapDoc();
  const paragraphs = note.split(/\n{2,}/).filter(Boolean).map(chunk => ({
    type: 'paragraph',
    content: [{ type: 'text', text: chunk.replace(/\n/g, ' ').trim() }],
  }));
  return { type: 'doc', content: paragraphs.length ? paragraphs : [] };
}

// New canonical note shape — saved to DB and returned from API
export interface CaptureNote {
  id: string;
  area: CaptureArea;
  stage: CaptureStage;
  status: CaptureStatus;
  title: string;
  editor_json: TiptapDoc;
  plain_text: string;
  created_at: string;
  updated_at: string;
}

// In-flight draft used during editing
export interface CaptureNoteDraft {
  area: CaptureArea;
  stage: CaptureStage;
  title: string;
  editor_json: TiptapDoc;
}

// ── Legacy types kept for planner/kanban/review subsystems ───────────────────

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

/** @deprecated use CaptureNoteDraft */
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
