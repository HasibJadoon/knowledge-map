// ─── Note schemas & types ───────────────────────────────────────────────

export interface WvNote {
  id: string;
  note_type: string;
  title: string | null;
  body_md: string;
  tradition_id: string | null;
  topic_id: string | null;
  moral_axis_id: string | null;
  core_user_ref: string;
  core_ws_ref: string | null;
  is_pinned: number;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WvNoteRelation {
  id: string;
  note_id: string;
  target_type: string;
  target_id: string;
  relation_role: string | null;
  created_at: string;
}

export interface NoteCreate {
  note_type: string;
  title?: string | null;
  body_md: string;
  tradition_id?: string | null;
  topic_id?: string | null;
  moral_axis_id?: string | null;
  core_user_ref: string;
  core_ws_ref?: string | null;
  is_pinned?: number;
  meta_json?: string | null;
}

export type NotePatch = Partial<Omit<NoteCreate, 'core_user_ref'>>;

export interface NoteRelationCreate {
  note_id: string;
  target_type: string;
  target_id: string;
  relation_role?: string | null;
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateNoteCreate(body: unknown): SchemaValidationResult<NoteCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.note_type !== 'string' || !b.note_type.trim()) return { error: 'note_type is required and must be a non-empty string' };
  data.note_type = b.note_type.trim();
  if ('title' in b) {
    if (b.title !== null && typeof b.title !== 'string') return { error: 'title must be a string or null' };
    data.title = b.title;
  }
  if (typeof b.body_md !== 'string' || !b.body_md.trim()) return { error: 'body_md is required and must be a non-empty string' };
  data.body_md = b.body_md.trim();
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('topic_id' in b) {
    if (b.topic_id !== null && typeof b.topic_id !== 'string') return { error: 'topic_id must be a string or null' };
    data.topic_id = b.topic_id;
  }
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if ('core_ws_ref' in b) {
    if (b.core_ws_ref !== null && typeof b.core_ws_ref !== 'string') return { error: 'core_ws_ref must be a string or null' };
    data.core_ws_ref = b.core_ws_ref;
  }
  if ('is_pinned' in b) {
    if (typeof b.is_pinned !== 'number' || !Number.isFinite(b.is_pinned)) return { error: 'is_pinned must be a number' };
    data.is_pinned = b.is_pinned;
  }
  if ('meta_json' in b) {
    if (b.meta_json !== null && typeof b.meta_json !== 'string') return { error: 'meta_json must be a string or null' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as NoteCreate };
}

export function validateNoteRelationCreate(body: unknown): SchemaValidationResult<NoteRelationCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.note_id !== 'string' || !b.note_id.trim()) return { error: 'note_id is required and must be a non-empty string' };
  data.note_id = b.note_id.trim();
  if (typeof b.target_type !== 'string' || !b.target_type.trim()) return { error: 'target_type is required and must be a non-empty string' };
  data.target_type = b.target_type.trim();
  if (typeof b.target_id !== 'string' || !b.target_id.trim()) return { error: 'target_id is required and must be a non-empty string' };
  data.target_id = b.target_id.trim();
  if ('relation_role' in b) {
    if (b.relation_role !== null && typeof b.relation_role !== 'string') return { error: 'relation_role must be a string or null' };
    data.relation_role = b.relation_role;
  }

  return { data: data as unknown as NoteRelationCreate };
}

export function validateNotePatch(body: unknown): SchemaValidationResult<NotePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  return { data: body as NotePatch };
}
