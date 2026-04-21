// ─── Collection schemas & types ───────────────────────────────────────────────

export interface CmCollection {
  collection_id: string;      // CM:ULID
  core_user_ref: string;
  collection_type: 'reading_list' | 'playlist' | 'curriculum' | 'favorites' | 'other';
  title: string;
  title_ar: string | null;
  description: string | null;
  is_ordered: boolean;
  policy_ref: string | null;
  workspace_ref: string | null;
  tags_json: string | null;
  cover_image_url: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmCollectionItem {
  item_id: string;            // CM:ULID
  collection_id: string;
  target_ref: string;
  seq_order: number;
  item_note: string | null;
  meta_json: string | null;
}

export interface CmCollectionCreate {
  core_user_ref: string;
  title: string;
  collection_type?: 'reading_list' | 'playlist' | 'curriculum' | 'favorites' | 'other';
  is_ordered?: boolean;
  title_ar?: string;
  description?: string;
  workspace_ref?: string;
  tags_json?: string;
  cover_image_url?: string;
  policy_ref?: string;
  meta_json?: string;
}

export interface CmCollectionPatch {
  title?: string;
  title_ar?: string;
  collection_type?: 'reading_list' | 'playlist' | 'curriculum' | 'favorites' | 'other';
  is_ordered?: boolean;
  description?: string;
  tags_json?: string;
  cover_image_url?: string;
  workspace_ref?: string;
  policy_ref?: string;
  meta_json?: string;
}

export interface CmCollectionItemAdd {
  target_ref: string;
  seq_order?: number;
  item_note?: string;
  meta_json?: string;
}

export function validateCmCollectionCreate(
  body: unknown
): { data: CmCollectionCreate } | { error: string } {
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

  const validCollectionTypes = ['reading_list', 'playlist', 'curriculum', 'favorites', 'other'];
  if (b['collection_type'] !== undefined && !validCollectionTypes.includes(b['collection_type'] as string)) {
    return { error: `collection_type must be one of: ${validCollectionTypes.join(', ')}` };
  }

  if (b['is_ordered'] !== undefined && typeof b['is_ordered'] !== 'boolean') {
    return { error: 'is_ordered must be a boolean' };
  }

  return {
    data: {
      core_user_ref: b['core_user_ref'] as string,
      title: b['title'] as string,
      ...(b['collection_type'] !== undefined && { collection_type: b['collection_type'] as CmCollectionCreate['collection_type'] }),
      ...(b['is_ordered'] !== undefined && { is_ordered: b['is_ordered'] as boolean }),
      ...(b['title_ar'] !== undefined && { title_ar: b['title_ar'] as string }),
      ...(b['description'] !== undefined && { description: b['description'] as string }),
      ...(b['workspace_ref'] !== undefined && { workspace_ref: b['workspace_ref'] as string }),
      ...(b['tags_json'] !== undefined && { tags_json: b['tags_json'] as string }),
      ...(b['cover_image_url'] !== undefined && { cover_image_url: b['cover_image_url'] as string }),
      ...(b['policy_ref'] !== undefined && { policy_ref: b['policy_ref'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface CmCollectionInput {
  core_user_ref: string;
  collection_type?: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  is_ordered?: number;
  policy_ref?: string | null;
  workspace_ref?: string | null;
  tags_json?: string;
  cover_image_url?: string | null;
  meta_json?: string;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateCmCollectionPatch(body: unknown): SchemaValidationResult<CmCollectionPatch> {
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
  if ('collection_type' in b) {
    if (typeof b.collection_type !== 'string') return { error: 'collection_type must be a string' };
    data.collection_type = b.collection_type;
  }
  if ('is_ordered' in b) {
    if (typeof b.is_ordered !== 'boolean') return { error: 'is_ordered must be a boolean' };
    data.is_ordered = b.is_ordered;
  }
  if ('description' in b) {
    if (typeof b.description !== 'string') return { error: 'description must be a string' };
    data.description = b.description;
  }
  if ('tags_json' in b) {
    if (typeof b.tags_json !== 'string') return { error: 'tags_json must be a string' };
    data.tags_json = b.tags_json;
  }
  if ('cover_image_url' in b) {
    if (typeof b.cover_image_url !== 'string') return { error: 'cover_image_url must be a string' };
    data.cover_image_url = b.cover_image_url;
  }
  if ('workspace_ref' in b) {
    if (typeof b.workspace_ref !== 'string') return { error: 'workspace_ref must be a string' };
    data.workspace_ref = b.workspace_ref;
  }
  if ('policy_ref' in b) {
    if (typeof b.policy_ref !== 'string') return { error: 'policy_ref must be a string' };
    data.policy_ref = b.policy_ref;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmCollectionPatch };
}

export function validateCmCollectionItemAdd(body: unknown): SchemaValidationResult<CmCollectionItemAdd> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.target_ref !== 'string' || !b.target_ref.trim()) return { error: 'target_ref is required and must be a non-empty string' };
  data.target_ref = b.target_ref.trim();
  if ('seq_order' in b) {
    if (typeof b.seq_order !== 'number' || !Number.isFinite(b.seq_order)) return { error: 'seq_order must be a number' };
    data.seq_order = b.seq_order;
  }
  if ('item_note' in b) {
    if (typeof b.item_note !== 'string') return { error: 'item_note must be a string' };
    data.item_note = b.item_note;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmCollectionItemAdd };
}

export function validateCmCollectionInput(body: unknown): SchemaValidationResult<CmCollectionInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if ('collection_type' in b) {
    if (typeof b.collection_type !== 'string') return { error: 'collection_type must be a string' };
    data.collection_type = b.collection_type;
  }
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('title_ar' in b) {
    if (b.title_ar !== null && typeof b.title_ar !== 'string') return { error: 'title_ar must be a string or null' };
    data.title_ar = b.title_ar;
  }
  if ('description' in b) {
    if (b.description !== null && typeof b.description !== 'string') return { error: 'description must be a string or null' };
    data.description = b.description;
  }
  if ('is_ordered' in b) {
    if (typeof b.is_ordered !== 'number' || !Number.isFinite(b.is_ordered)) return { error: 'is_ordered must be a number' };
    data.is_ordered = b.is_ordered;
  }
  if ('policy_ref' in b) {
    if (b.policy_ref !== null && typeof b.policy_ref !== 'string') return { error: 'policy_ref must be a string or null' };
    data.policy_ref = b.policy_ref;
  }
  if ('workspace_ref' in b) {
    if (b.workspace_ref !== null && typeof b.workspace_ref !== 'string') return { error: 'workspace_ref must be a string or null' };
    data.workspace_ref = b.workspace_ref;
  }
  if ('tags_json' in b) {
    if (typeof b.tags_json !== 'string') return { error: 'tags_json must be a string' };
    data.tags_json = b.tags_json;
  }
  if ('cover_image_url' in b) {
    if (b.cover_image_url !== null && typeof b.cover_image_url !== 'string') return { error: 'cover_image_url must be a string or null' };
    data.cover_image_url = b.cover_image_url;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmCollectionInput };
}
