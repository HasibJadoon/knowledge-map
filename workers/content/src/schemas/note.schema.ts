// ─── Note schemas & types ─────────────────────────────────────────────────────

export interface CmNote {
  note_id: string;            // CM:ULID
  core_user_ref: string;
  note_type: 'general' | 'annotation' | 'reflection' | 'question' | 'summary';
  title: string | null;
  body_text: string;
  body_ar: string | null;
  is_pinned: boolean;
  tags_json: string | null;
  workspace_ref: string | null;
  policy_ref: string | null;
  source_capture_ref: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmNoteTarget {
  target_id: string;          // CM:ULID
  note_id: string;
  target_ref: string;
  relation_type: 'about' | 'from' | 'quotes' | 'related';
  seq_order: number;
}

export interface CmNoteCreate {
  core_user_ref: string;
  title?: string;
  note_type?: 'general' | 'annotation' | 'reflection' | 'question' | 'summary';
  body_text?: string;
  body_ar?: string;
  workspace_ref?: string;
  tags_json?: string;
  is_pinned?: boolean;
  source_capture_ref?: string;
  policy_ref?: string;
  meta_json?: string;
}

export interface CmNotePatch {
  title?: string;
  note_type?: 'general' | 'annotation' | 'reflection' | 'question' | 'summary';
  body_text?: string;
  body_ar?: string;
  is_pinned?: boolean;
  tags_json?: string;
  workspace_ref?: string;
  policy_ref?: string;
  source_capture_ref?: string;
  meta_json?: string;
}

export interface CmNoteTargetAdd {
  target_ref: string;
  relation_type?: 'about' | 'from' | 'quotes' | 'related';
  seq_order?: number;
}

export function validateCmNoteCreate(
  body: unknown
): { data: CmNoteCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '') {
    return { error: 'core_user_ref is required and must be a string' };
  }

  const validNoteTypes = ['general', 'annotation', 'reflection', 'question', 'summary'];
  if (b['note_type'] !== undefined && !validNoteTypes.includes(b['note_type'] as string)) {
    return { error: `note_type must be one of: ${validNoteTypes.join(', ')}` };
  }

  if (b['is_pinned'] !== undefined && typeof b['is_pinned'] !== 'boolean') {
    return { error: 'is_pinned must be a boolean' };
  }

  return {
    data: {
      core_user_ref: b['core_user_ref'] as string,
      ...(b['title'] !== undefined && { title: b['title'] as string }),
      ...(b['note_type'] !== undefined && { note_type: b['note_type'] as CmNoteCreate['note_type'] }),
      ...(b['body_text'] !== undefined && { body_text: b['body_text'] as string }),
      ...(b['body_ar'] !== undefined && { body_ar: b['body_ar'] as string }),
      ...(b['workspace_ref'] !== undefined && { workspace_ref: b['workspace_ref'] as string }),
      ...(b['tags_json'] !== undefined && { tags_json: b['tags_json'] as string }),
      ...(b['is_pinned'] !== undefined && { is_pinned: b['is_pinned'] as boolean }),
      ...(b['source_capture_ref'] !== undefined && { source_capture_ref: b['source_capture_ref'] as string }),
      ...(b['policy_ref'] !== undefined && { policy_ref: b['policy_ref'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface Note {
  id: string;               // CM:ULID
  title: string | null;
  content_md: string;
  resource_ref: string | null; // typed ref (QR:, WV:, AL:, etc.)
  created_at: string;
  updated_at: string | null;
}

export interface NoteCreate {
  content_md: string;
  title?: string | null;
  resource_ref?: string | null;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateCmNotePatch(body: unknown): SchemaValidationResult<CmNotePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('note_type' in b) {
    if (typeof b.note_type !== 'string') return { error: 'note_type must be a string' };
    data.note_type = b.note_type;
  }
  if ('body_text' in b) {
    if (typeof b.body_text !== 'string') return { error: 'body_text must be a string' };
    data.body_text = b.body_text;
  }
  if ('body_ar' in b) {
    if (typeof b.body_ar !== 'string') return { error: 'body_ar must be a string' };
    data.body_ar = b.body_ar;
  }
  if ('is_pinned' in b) {
    if (typeof b.is_pinned !== 'boolean') return { error: 'is_pinned must be a boolean' };
    data.is_pinned = b.is_pinned;
  }
  if ('tags_json' in b) {
    if (typeof b.tags_json !== 'string') return { error: 'tags_json must be a string' };
    data.tags_json = b.tags_json;
  }
  if ('workspace_ref' in b) {
    if (typeof b.workspace_ref !== 'string') return { error: 'workspace_ref must be a string' };
    data.workspace_ref = b.workspace_ref;
  }
  if ('policy_ref' in b) {
    if (typeof b.policy_ref !== 'string') return { error: 'policy_ref must be a string' };
    data.policy_ref = b.policy_ref;
  }
  if ('source_capture_ref' in b) {
    if (typeof b.source_capture_ref !== 'string') return { error: 'source_capture_ref must be a string' };
    data.source_capture_ref = b.source_capture_ref;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmNotePatch };
}

export function validateCmNoteTargetAdd(body: unknown): SchemaValidationResult<CmNoteTargetAdd> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.target_ref !== 'string' || !b.target_ref.trim()) return { error: 'target_ref is required and must be a non-empty string' };
  data.target_ref = b.target_ref.trim();
  if ('relation_type' in b) {
    if (typeof b.relation_type !== 'string') return { error: 'relation_type must be a string' };
    data.relation_type = b.relation_type;
  }
  if ('seq_order' in b) {
    if (typeof b.seq_order !== 'number' || !Number.isFinite(b.seq_order)) return { error: 'seq_order must be a number' };
    data.seq_order = b.seq_order;
  }

  return { data: data as unknown as CmNoteTargetAdd };
}

export function validateNoteCreate(body: unknown): SchemaValidationResult<NoteCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.content_md !== 'string' || !b.content_md.trim()) return { error: 'content_md is required and must be a non-empty string' };
  data.content_md = b.content_md.trim();
  if ('title' in b) {
    if (b.title !== null && typeof b.title !== 'string') return { error: 'title must be a string or null' };
    data.title = b.title;
  }
  if ('resource_ref' in b) {
    if (b.resource_ref !== null && typeof b.resource_ref !== 'string') return { error: 'resource_ref must be a string or null' };
    data.resource_ref = b.resource_ref;
  }

  return { data: data as unknown as NoteCreate };
}
