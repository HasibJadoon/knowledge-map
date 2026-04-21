// ─── Comment schemas & types ──────────────────────────────────────────────────

export interface CmComment {
  comment_id: string;         // CM:ULID
  core_user_ref: string;
  target_ref: string;
  parent_comment_id: string | null;
  thread_root_id: string | null;
  comment_text: string;
  comment_ar: string | null;
  is_resolved: boolean;
  resolved_by_ref: string | null;
  resolved_at: string | null;
  edit_history_json: string | null;
  workspace_ref: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmCommentReaction {
  reaction_id: string;        // CM:ULID
  comment_id: string;
  core_user_ref: string;
  emoji: string;
  created_at: string;
}

export interface CmCommentCreate {
  core_user_ref: string;
  target_ref: string;
  comment_text: string;
  parent_comment_id?: string;
  comment_ar?: string;
  workspace_ref?: string;
  meta_json?: string;
}

export interface CmCommentPatch {
  comment_text?: string;
  comment_ar?: string;
  meta_json?: string;
}

export interface CmReactionAdd {
  core_user_ref: string;
  emoji: string;
}

export function validateCmCommentCreate(
  body: unknown
): { data: CmCommentCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '') {
    return { error: 'core_user_ref is required and must be a string' };
  }
  if (typeof b['target_ref'] !== 'string' || b['target_ref'].trim() === '') {
    return { error: 'target_ref is required and must be a string' };
  }
  if (typeof b['comment_text'] !== 'string' || b['comment_text'].trim() === '') {
    return { error: 'comment_text is required and must be a string' };
  }

  return {
    data: {
      core_user_ref: b['core_user_ref'] as string,
      target_ref: b['target_ref'] as string,
      comment_text: b['comment_text'] as string,
      ...(b['parent_comment_id'] !== undefined && { parent_comment_id: b['parent_comment_id'] as string }),
      ...(b['comment_ar'] !== undefined && { comment_ar: b['comment_ar'] as string }),
      ...(b['workspace_ref'] !== undefined && { workspace_ref: b['workspace_ref'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface CmCommentInput {
  core_user_ref: string;
  target_ref: string;
  parent_comment_id?: string | null;
  thread_root_id?: string | null;
  comment_text: string;
  comment_ar?: string | null;
  workspace_ref?: string | null;
  meta_json?: string;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateCmCommentPatch(body: unknown): SchemaValidationResult<CmCommentPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('comment_text' in b) {
    if (typeof b.comment_text !== 'string') return { error: 'comment_text must be a string' };
    data.comment_text = b.comment_text;
  }
  if ('comment_ar' in b) {
    if (typeof b.comment_ar !== 'string') return { error: 'comment_ar must be a string' };
    data.comment_ar = b.comment_ar;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmCommentPatch };
}

export function validateCmReactionAdd(body: unknown): SchemaValidationResult<CmReactionAdd> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if (typeof b.emoji !== 'string' || !b.emoji.trim()) return { error: 'emoji is required and must be a non-empty string' };
  data.emoji = b.emoji.trim();

  return { data: data as unknown as CmReactionAdd };
}

export function validateCmCommentInput(body: unknown): SchemaValidationResult<CmCommentInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if (typeof b.target_ref !== 'string' || !b.target_ref.trim()) return { error: 'target_ref is required and must be a non-empty string' };
  data.target_ref = b.target_ref.trim();
  if ('parent_comment_id' in b) {
    if (b.parent_comment_id !== null && typeof b.parent_comment_id !== 'string') return { error: 'parent_comment_id must be a string or null' };
    data.parent_comment_id = b.parent_comment_id;
  }
  if ('thread_root_id' in b) {
    if (b.thread_root_id !== null && typeof b.thread_root_id !== 'string') return { error: 'thread_root_id must be a string or null' };
    data.thread_root_id = b.thread_root_id;
  }
  if (typeof b.comment_text !== 'string' || !b.comment_text.trim()) return { error: 'comment_text is required and must be a non-empty string' };
  data.comment_text = b.comment_text.trim();
  if ('comment_ar' in b) {
    if (b.comment_ar !== null && typeof b.comment_ar !== 'string') return { error: 'comment_ar must be a string or null' };
    data.comment_ar = b.comment_ar;
  }
  if ('workspace_ref' in b) {
    if (b.workspace_ref !== null && typeof b.workspace_ref !== 'string') return { error: 'workspace_ref must be a string or null' };
    data.workspace_ref = b.workspace_ref;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmCommentInput };
}
