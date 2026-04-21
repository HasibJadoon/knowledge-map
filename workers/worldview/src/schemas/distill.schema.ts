// ─── Distill schemas & types ───────────────────────────────────────────────

export interface DistillBatch {
  id: string;              // WV:ULID
  title: string;
  batch_type: string;      // manual|ai_extraction|auto_cluster|review_run
  source_id: string | null;
  status: string;          // pending|running|complete|failed
  item_count: number;
  approved_count: number;
  rejected_count: number;
  core_user_ref: string | null;
  core_ws_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface DistillItem {
  id: string;              // WV:ULID
  batch_id: string;
  item_type: string;       // insight|claim|node|evidence|question|connection|other
  source_note_id: string | null;
  source_highlight_id: string | null;
  content_md: string;
  status: string;          // pending|approved|edited|rejected|saved
  approved_as_type: string | null;
  approved_as_id: string | null;
  core_user_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsightDecision {
  id: string;
  suggestion_id: string;
  decision: string;        // approved|edited|rejected
  original_json: string | null;
  final_json: string | null;
  decision_note: string | null;
  core_user_ref: string;
  created_at: string;
}

export interface BatchWithItems extends DistillBatch {
  items: DistillItem[];
}

export interface GenerateBatchInput {
  title: string;
  source_id?: string | null;
  source_unit_id?: string | null;  // filter items to this unit
  batch_type?: string;
  items: Array<{
    item_type?: string;
    content_md: string;
    source_note_id?: string | null;
    source_highlight_id?: string | null;
  }>;
  core_user_ref: string;
  core_ws_ref?: string | null;
}

export interface DecisionInput {
  item_id: string;
  decision: 'approved' | 'edited' | 'rejected';
  final_content?: string | null;  // for edited decisions — updated content_md
  decision_note?: string | null;
  core_user_ref: string;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateGenerateBatchInput(body: unknown): SchemaValidationResult<GenerateBatchInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('source_id' in b) {
    if (b.source_id !== null && typeof b.source_id !== 'string') return { error: 'source_id must be a string or null' };
    data.source_id = b.source_id;
  }
  if ('source_unit_id' in b) {
    if (b.source_unit_id !== null && typeof b.source_unit_id !== 'string') return { error: 'source_unit_id must be a string or null' };
    data.source_unit_id = b.source_unit_id;
  }
  if ('batch_type' in b) {
    if (typeof b.batch_type !== 'string') return { error: 'batch_type must be a string' };
    data.batch_type = b.batch_type;
  }
  if ('item_type' in b) {
    if (typeof b.item_type !== 'string') return { error: 'item_type must be a string' };
    data.item_type = b.item_type;
  }
  if (typeof b.content_md !== 'string' || !b.content_md.trim()) return { error: 'content_md is required and must be a non-empty string' };
  data.content_md = b.content_md.trim();
  if ('source_note_id' in b) {
    if (b.source_note_id !== null && typeof b.source_note_id !== 'string') return { error: 'source_note_id must be a string or null' };
    data.source_note_id = b.source_note_id;
  }
  if ('source_highlight_id' in b) {
    if (b.source_highlight_id !== null && typeof b.source_highlight_id !== 'string') return { error: 'source_highlight_id must be a string or null' };
    data.source_highlight_id = b.source_highlight_id;
  }
  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if ('core_ws_ref' in b) {
    if (b.core_ws_ref !== null && typeof b.core_ws_ref !== 'string') return { error: 'core_ws_ref must be a string or null' };
    data.core_ws_ref = b.core_ws_ref;
  }

  return { data: data as unknown as GenerateBatchInput };
}

export function validateDecisionInput(body: unknown): SchemaValidationResult<DecisionInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.item_id !== 'string' || !b.item_id.trim()) return { error: 'item_id is required and must be a non-empty string' };
  data.item_id = b.item_id.trim();
  if (typeof b.decision !== 'string' || !b.decision.trim()) return { error: 'decision is required and must be a non-empty string' };
  data.decision = b.decision.trim();
  if ('final_content' in b) {
    if (b.final_content !== null && typeof b.final_content !== 'string') return { error: 'final_content must be a string or null' };
    data.final_content = b.final_content;
  }
  if ('decision_note' in b) {
    if (b.decision_note !== null && typeof b.decision_note !== 'string') return { error: 'decision_note must be a string or null' };
    data.decision_note = b.decision_note;
  }
  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();

  return { data: data as unknown as DecisionInput };
}
