// ─── Document schemas & types ─────────────────────────────────────────────────

export interface CmDocument {
  doc_id: string;             // CM:ULID
  core_user_ref: string;
  doc_type: 'essay' | 'note' | 'article' | 'report' | 'transcript' | 'other';
  title: string;
  title_ar: string | null;
  slug: string | null;
  language: string;
  word_count: number | null;
  reading_time_min: number | null;
  publication_state: 'draft' | 'review' | 'published' | 'archived';
  policy_ref: string | null;
  workspace_ref: string | null;
  primary_source_ref: string | null;
  tags_json: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmDocumentVersion {
  version_id: string;         // CM:ULID
  doc_id: string;
  version_number: number;
  version_label: string | null;
  snapshot_json: string | null;
  change_summary: string | null;
  core_user_ref: string;
  created_at: string;
}

export interface CmDocumentCreate {
  core_user_ref: string;
  title: string;
  doc_type?: 'essay' | 'note' | 'article' | 'report' | 'transcript' | 'other';
  language?: string;
  title_ar?: string;
  slug?: string;
  workspace_ref?: string;
  primary_source_ref?: string;
  tags_json?: string;
  meta_json?: string;
}

export interface CmDocumentPatch {
  title?: string;
  title_ar?: string;
  slug?: string;
  doc_type?: 'essay' | 'note' | 'article' | 'report' | 'transcript' | 'other';
  language?: string;
  word_count?: number;
  reading_time_min?: number;
  publication_state?: 'draft' | 'review' | 'published' | 'archived';
  policy_ref?: string;
  workspace_ref?: string;
  primary_source_ref?: string;
  tags_json?: string;
  meta_json?: string;
}

export function validateCmDocumentCreate(
  body: unknown
): { data: CmDocumentCreate } | { error: string } {
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

  const validDocTypes = ['essay', 'note', 'article', 'report', 'transcript', 'other'];
  if (b['doc_type'] !== undefined && !validDocTypes.includes(b['doc_type'] as string)) {
    return { error: `doc_type must be one of: ${validDocTypes.join(', ')}` };
  }

  return {
    data: {
      core_user_ref: b['core_user_ref'] as string,
      title: b['title'] as string,
      ...(b['doc_type'] !== undefined && { doc_type: b['doc_type'] as CmDocumentCreate['doc_type'] }),
      ...(b['language'] !== undefined && { language: b['language'] as string }),
      ...(b['title_ar'] !== undefined && { title_ar: b['title_ar'] as string }),
      ...(b['slug'] !== undefined && { slug: b['slug'] as string }),
      ...(b['workspace_ref'] !== undefined && { workspace_ref: b['workspace_ref'] as string }),
      ...(b['primary_source_ref'] !== undefined && { primary_source_ref: b['primary_source_ref'] as string }),
      ...(b['tags_json'] !== undefined && { tags_json: b['tags_json'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}

export function validateCmDocumentPatch(
  body: unknown
): { data: CmDocumentPatch } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  const validDocTypes = ['essay', 'note', 'article', 'report', 'transcript', 'other'];
  if (b['doc_type'] !== undefined && !validDocTypes.includes(b['doc_type'] as string)) {
    return { error: `doc_type must be one of: ${validDocTypes.join(', ')}` };
  }

  const validStates = ['draft', 'review', 'published', 'archived'];
  if (b['publication_state'] !== undefined && !validStates.includes(b['publication_state'] as string)) {
    return { error: `publication_state must be one of: ${validStates.join(', ')}` };
  }

  if (b['word_count'] !== undefined && typeof b['word_count'] !== 'number') {
    return { error: 'word_count must be a number' };
  }
  if (b['reading_time_min'] !== undefined && typeof b['reading_time_min'] !== 'number') {
    return { error: 'reading_time_min must be a number' };
  }

  const data: CmDocumentPatch = {};
  if (b['title'] !== undefined) data.title = b['title'] as string;
  if (b['title_ar'] !== undefined) data.title_ar = b['title_ar'] as string;
  if (b['slug'] !== undefined) data.slug = b['slug'] as string;
  if (b['doc_type'] !== undefined) data.doc_type = b['doc_type'] as CmDocumentPatch['doc_type'];
  if (b['language'] !== undefined) data.language = b['language'] as string;
  if (b['word_count'] !== undefined) data.word_count = b['word_count'] as number;
  if (b['reading_time_min'] !== undefined) data.reading_time_min = b['reading_time_min'] as number;
  if (b['publication_state'] !== undefined) data.publication_state = b['publication_state'] as CmDocumentPatch['publication_state'];
  if (b['policy_ref'] !== undefined) data.policy_ref = b['policy_ref'] as string;
  if (b['workspace_ref'] !== undefined) data.workspace_ref = b['workspace_ref'] as string;
  if (b['primary_source_ref'] !== undefined) data.primary_source_ref = b['primary_source_ref'] as string;
  if (b['tags_json'] !== undefined) data.tags_json = b['tags_json'] as string;
  if (b['meta_json'] !== undefined) data.meta_json = b['meta_json'] as string;

  return { data };
}
