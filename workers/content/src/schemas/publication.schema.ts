// ─── Publication schemas & types ──────────────────────────────────────────────

export interface CmPublication {
  pub_id: string;             // CM:ULID
  core_user_ref: string;
  doc_ref: string | null;
  asset_ref: string | null;
  pub_type: 'article' | 'podcast' | 'video' | 'collection' | 'other';
  title: string;
  slug: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  publication_state: 'draft' | 'review' | 'published' | 'archived';
  published_at: string | null;
  policy_ref: string | null;
  workspace_ref: string | null;
  tags_json: string | null;
  canonical_url: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmShareLink {
  link_id: string;            // CM:ULID
  resource_ref: string;
  core_user_ref: string;
  token: string;
  access_level: 'view' | 'comment' | 'edit';
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  meta_json: string | null;
  created_at: string;
}

export interface CmDistribution {
  dist_id: string;            // CM:ULID
  pub_id: string;
  channel: string;
  channel_config_json: string | null;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed';
  recipient_count: number | null;
  error_json: string | null;
  meta_json: string | null;
  created_at: string;
}

export interface CmPublicationCreate {
  core_user_ref: string;
  title: string;
  pub_type?: 'article' | 'podcast' | 'video' | 'collection' | 'other';
  doc_ref?: string;
  asset_ref?: string;
  workspace_ref?: string;
  slug?: string;
  excerpt?: string;
  cover_image_url?: string;
  tags_json?: string;
  canonical_url?: string;
  policy_ref?: string;
  meta_json?: string;
}

export interface CmPublicationPatch {
  title?: string;
  pub_type?: 'article' | 'podcast' | 'video' | 'collection' | 'other';
  doc_ref?: string;
  asset_ref?: string;
  slug?: string;
  excerpt?: string;
  cover_image_url?: string;
  publication_state?: 'draft' | 'review' | 'published' | 'archived';
  published_at?: string;
  policy_ref?: string;
  workspace_ref?: string;
  tags_json?: string;
  canonical_url?: string;
  meta_json?: string;
}

export interface CmShareLinkCreate {
  resource_ref: string;
  core_user_ref: string;
  access_level?: 'view' | 'comment' | 'edit';
  expires_at?: string;
  max_uses?: number;
  meta_json?: string;
}

export function validateCmPublicationCreate(
  body: unknown
): { data: CmPublicationCreate } | { error: string } {
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

  const validPubTypes = ['article', 'podcast', 'video', 'collection', 'other'];
  if (b['pub_type'] !== undefined && !validPubTypes.includes(b['pub_type'] as string)) {
    return { error: `pub_type must be one of: ${validPubTypes.join(', ')}` };
  }

  return {
    data: {
      core_user_ref: b['core_user_ref'] as string,
      title: b['title'] as string,
      ...(b['pub_type'] !== undefined && { pub_type: b['pub_type'] as CmPublicationCreate['pub_type'] }),
      ...(b['doc_ref'] !== undefined && { doc_ref: b['doc_ref'] as string }),
      ...(b['asset_ref'] !== undefined && { asset_ref: b['asset_ref'] as string }),
      ...(b['workspace_ref'] !== undefined && { workspace_ref: b['workspace_ref'] as string }),
      ...(b['slug'] !== undefined && { slug: b['slug'] as string }),
      ...(b['excerpt'] !== undefined && { excerpt: b['excerpt'] as string }),
      ...(b['cover_image_url'] !== undefined && { cover_image_url: b['cover_image_url'] as string }),
      ...(b['tags_json'] !== undefined && { tags_json: b['tags_json'] as string }),
      ...(b['canonical_url'] !== undefined && { canonical_url: b['canonical_url'] as string }),
      ...(b['policy_ref'] !== undefined && { policy_ref: b['policy_ref'] as string }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}

export function validateCmShareLinkCreate(
  body: unknown
): { data: CmShareLinkCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b['resource_ref'] !== 'string' || b['resource_ref'].trim() === '') {
    return { error: 'resource_ref is required and must be a string' };
  }
  if (typeof b['core_user_ref'] !== 'string' || b['core_user_ref'].trim() === '') {
    return { error: 'core_user_ref is required and must be a string' };
  }

  const validAccessLevels = ['view', 'comment', 'edit'];
  if (b['access_level'] !== undefined && !validAccessLevels.includes(b['access_level'] as string)) {
    return { error: `access_level must be one of: ${validAccessLevels.join(', ')}` };
  }

  if (b['max_uses'] !== undefined && typeof b['max_uses'] !== 'number') {
    return { error: 'max_uses must be a number' };
  }

  return {
    data: {
      resource_ref: b['resource_ref'] as string,
      core_user_ref: b['core_user_ref'] as string,
      ...(b['access_level'] !== undefined && { access_level: b['access_level'] as CmShareLinkCreate['access_level'] }),
      ...(b['expires_at'] !== undefined && { expires_at: b['expires_at'] as string }),
      ...(b['max_uses'] !== undefined && { max_uses: b['max_uses'] as number }),
      ...(b['meta_json'] !== undefined && { meta_json: b['meta_json'] as string }),
    },
  };
}
