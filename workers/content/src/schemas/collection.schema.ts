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
