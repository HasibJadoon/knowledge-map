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
