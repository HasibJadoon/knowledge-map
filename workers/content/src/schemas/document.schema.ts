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

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface Document {
  id: string;            // CM:ULID
  title: string;
  doc_type: string;      // note | essay | guide | report
  resource_ref: string | null; // typed ref to linked entity (QR:, WV:, etc.)
  body_md: string | null;
  status: string;        // draft | published | archived
  created_at: string;
  updated_at: string | null;
}

export interface DocumentCreate {
  title: string;
  doc_type?: string;
  resource_ref?: string | null;
  body_md?: string | null;
}

export interface DocumentPatch {
  title?: string;
  body_md?: string;
  status?: 'draft' | 'published' | 'archived';
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateDocumentCreate(body: unknown): SchemaValidationResult<DocumentCreate> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('doc_type' in b) {
    if (typeof b.doc_type !== 'string') return { error: 'doc_type must be a string' };
    data.doc_type = b.doc_type;
  }
  if ('resource_ref' in b) {
    if (b.resource_ref !== null && typeof b.resource_ref !== 'string') return { error: 'resource_ref must be a string or null' };
    data.resource_ref = b.resource_ref;
  }
  if ('body_md' in b) {
    if (b.body_md !== null && typeof b.body_md !== 'string') return { error: 'body_md must be a string or null' };
    data.body_md = b.body_md;
  }

  return { data: data as unknown as DocumentCreate };
}

export function validateDocumentPatch(body: unknown): SchemaValidationResult<DocumentPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('body_md' in b) {
    if (typeof b.body_md !== 'string') return { error: 'body_md must be a string' };
    data.body_md = b.body_md;
  }
  if ('status' in b) {
    if (typeof b.status !== 'string') return { error: 'status must be a string' };
    data.status = b.status;
  }

  return { data: data as unknown as DocumentPatch };
}
