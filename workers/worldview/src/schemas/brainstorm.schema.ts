// ─── Brainstorm schemas & types ───────────────────────────────────────────────

export interface BrainstormSession {
  id: string;              // WV:ULID
  title: string;
  topic_id: string | null;
  tradition_id: string | null;
  moral_axis_id: string | null;
  status: string;          // active|paused|complete|archived
  body_md: string | null;
  tags_json: string | null; // JSON [string]
  core_user_ref: string;   // CORE:ULID
  core_ws_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrainstormCreate {
  title: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  moral_axis_id?: string | null;
  body_md?: string | null;
  tags_json?: string | null;
  core_user_ref: string;
  core_ws_ref?: string | null;
}

export interface BrainstormPatch {
  title?: string;
  topic_id?: string | null;
  tradition_id?: string | null;
  body_md?: string | null;
  tags_json?: string | null;
  status?: 'active' | 'paused' | 'complete' | 'archived';
}

// ─── Validators ───────────────────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateBrainstormCreate(body: unknown): SchemaValidationResult<BrainstormCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('topic_id' in b) {
    if (b.topic_id !== null && typeof b.topic_id !== 'string') return { error: 'topic_id must be a string or null' };
    data.topic_id = b.topic_id;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('moral_axis_id' in b) {
    if (b.moral_axis_id !== null && typeof b.moral_axis_id !== 'string') return { error: 'moral_axis_id must be a string or null' };
    data.moral_axis_id = b.moral_axis_id;
  }
  if ('body_md' in b) {
    if (b.body_md !== null && typeof b.body_md !== 'string') return { error: 'body_md must be a string or null' };
    data.body_md = b.body_md;
  }
  if ('tags_json' in b) {
    if (b.tags_json !== null && typeof b.tags_json !== 'string') return { error: 'tags_json must be a string or null' };
    data.tags_json = b.tags_json;
  }
  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if ('core_ws_ref' in b) {
    if (b.core_ws_ref !== null && typeof b.core_ws_ref !== 'string') return { error: 'core_ws_ref must be a string or null' };
    data.core_ws_ref = b.core_ws_ref;
  }

  return { data: data as unknown as BrainstormCreate };
}

export function validateBrainstormPatch(body: unknown): SchemaValidationResult<BrainstormPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('topic_id' in b) {
    if (b.topic_id !== null && typeof b.topic_id !== 'string') return { error: 'topic_id must be a string or null' };
    data.topic_id = b.topic_id;
  }
  if ('tradition_id' in b) {
    if (b.tradition_id !== null && typeof b.tradition_id !== 'string') return { error: 'tradition_id must be a string or null' };
    data.tradition_id = b.tradition_id;
  }
  if ('body_md' in b) {
    if (b.body_md !== null && typeof b.body_md !== 'string') return { error: 'body_md must be a string or null' };
    data.body_md = b.body_md;
  }
  if ('tags_json' in b) {
    if (b.tags_json !== null && typeof b.tags_json !== 'string') return { error: 'tags_json must be a string or null' };
    data.tags_json = b.tags_json;
  }
  if ('status' in b) {
    if (typeof b.status !== 'string') return { error: 'status must be a string' };
    data.status = b.status;
  }

  return { data: data as unknown as BrainstormPatch };
}
