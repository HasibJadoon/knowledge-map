// ─── Source schemas & types ───────────────────────────────────────────────────

export interface CmSource {
  source_id: string;          // CM:ULID
  core_user_ref: string;
  source_type: 'book' | 'article' | 'lecture' | 'manuscript' | 'video' | 'podcast' | 'other';
  title: string;
  title_ar: string | null;
  subtitle: string | null;
  language: string;
  status: 'draft' | 'processing' | 'ready' | 'archived';
  policy_ref: string | null;
  workspace_ref: string | null;
  wv_source_ref: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmSourceCreate {
  core_user_ref: string;
  title: string;
  source_type?: 'book' | 'article' | 'lecture' | 'manuscript' | 'video' | 'podcast' | 'other';
  language?: string;
  subtitle?: string;
  title_ar?: string;
  workspace_ref?: string;
  wv_source_ref?: string;
}

export interface CmSourcePatch {
  title?: string;
  title_ar?: string;
  subtitle?: string;
  source_type?: 'book' | 'article' | 'lecture' | 'manuscript' | 'video' | 'podcast' | 'other';
  language?: string;
  status?: 'draft' | 'processing' | 'ready' | 'archived';
  policy_ref?: string;
  workspace_ref?: string;
  wv_source_ref?: string;
  meta_json?: string;
}

export function validateCmSourceCreate(
  body: unknown
): { data: CmSourceCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '') {
    return { error: 'core_user_ref is required and must be a string' };
  }
  if (typeof b['title'] !== 'string' || b['title'].trim() === '') {
    return { error: 'title is required and must be a string' };
  }

  const validSourceTypes = ['book', 'article', 'lecture', 'manuscript', 'video', 'podcast', 'other'];
  if (b['source_type'] !== undefined && !validSourceTypes.includes(b['source_type'] as string)) {
    return { error: `source_type must be one of: ${validSourceTypes.join(', ')}` };
  }

  return {
    data: {
      core_user_ref: b['core_user_ref'] as string,
      title: b['title'] as string,
      ...(b['source_type'] !== undefined && { source_type: b['source_type'] as CmSourceCreate['source_type'] }),
      ...(b['language'] !== undefined && { language: b['language'] as string }),
      ...(b['subtitle'] !== undefined && { subtitle: b['subtitle'] as string }),
      ...(b['title_ar'] !== undefined && { title_ar: b['title_ar'] as string }),
      ...(b['workspace_ref'] !== undefined && { workspace_ref: b['workspace_ref'] as string }),
      ...(b['wv_source_ref'] !== undefined && { wv_source_ref: b['wv_source_ref'] as string }),
    },
  };
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateCmSourcePatch(body: unknown): SchemaValidationResult<CmSourcePatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('title_ar' in b) {
    if (typeof b.title_ar !== 'string') return { error: 'title_ar must be a string' };
    data.title_ar = b.title_ar;
  }
  if ('subtitle' in b) {
    if (typeof b.subtitle !== 'string') return { error: 'subtitle must be a string' };
    data.subtitle = b.subtitle;
  }
  if ('source_type' in b) {
    if (typeof b.source_type !== 'string') return { error: 'source_type must be a string' };
    data.source_type = b.source_type;
  }
  if ('language' in b) {
    if (typeof b.language !== 'string') return { error: 'language must be a string' };
    data.language = b.language;
  }
  if ('status' in b) {
    if (typeof b.status !== 'string') return { error: 'status must be a string' };
    data.status = b.status;
  }
  if ('policy_ref' in b) {
    if (typeof b.policy_ref !== 'string') return { error: 'policy_ref must be a string' };
    data.policy_ref = b.policy_ref;
  }
  if ('workspace_ref' in b) {
    if (typeof b.workspace_ref !== 'string') return { error: 'workspace_ref must be a string' };
    data.workspace_ref = b.workspace_ref;
  }
  if ('wv_source_ref' in b) {
    if (typeof b.wv_source_ref !== 'string') return { error: 'wv_source_ref must be a string' };
    data.wv_source_ref = b.wv_source_ref;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmSourcePatch };
}
