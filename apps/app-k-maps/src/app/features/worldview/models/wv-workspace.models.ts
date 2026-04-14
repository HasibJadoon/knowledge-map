export type WvWorkspaceTabKey = 'overview' | 'read' | 'highlights' | 'notes';

export type WvDistillItemRole = 'claim_seed' | 'evidence' | 'observation' | 'question';
export type WvSuggestionKind = 'concept' | 'claim' | 'theme' | 'output' | 'edge';
export type WvSuggestionStatus = 'draft' | 'approved' | 'rejected';
export type WvDecisionStatus = 'approved' | 'edited' | 'rejected';

export interface WvDistillBatch {
  id: string;
  unitId: string;
  sourceId: string;
  batchType: 'distill';
  workspaceId: 'ws_quran' | 'ws_worldview';
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface WvDistillBatchItem {
  id: string;
  batchId: string;
  noteId: string;
  role: WvDistillItemRole;
  selected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WvInsightSuggestion {
  id: string;
  batchId: string;
  kind: WvSuggestionKind;
  title: string;
  summary: string;
  relationType: string | null;
  sourceNoteIds: string[];
  status: WvSuggestionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WvInsightDecision {
  id: string;
  suggestionId: string;
  status: WvDecisionStatus;
  title: string;
  summary: string;
  nodeType: WvSuggestionKind;
  relationType: string | null;
  graphTargetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WvDocumentDraft {
  id: string;
  unitId: string;
  sourceId: string;
  title: string;
  docType: 'lesson' | 'brief' | 'outline';
  contentItemId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WvPlannerTaskDraft {
  id: string;
  unitId: string;
  sourceId: string;
  title: string;
  lane: 'todo' | 'in_progress' | 'review' | 'done';
  relatedTarget: 'distill' | 'document' | 'node' | 'source_unit';
  createdAt: string;
  updatedAt: string;
}
