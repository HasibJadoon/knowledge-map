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

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface CmPublicationInput {
  core_user_ref: string;
  doc_ref?: string | null;
  asset_ref?: string | null;
  pub_type?: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  cover_image_url?: string | null;
  publication_state?: string;
  policy_ref?: string | null;
  workspace_ref?: string | null;
  tags_json?: string;
  canonical_url?: string | null;
  meta_json?: string;
}

export interface CmShareLinkInput {
  resource_ref: string;
  core_user_ref: string;
  token: string;
  access_level?: string;
  expires_at?: string | null;
  max_uses?: number | null;
  meta_json?: string;
}

export interface CmDistributionInput {
  pub_id: string;
  channel: string;
  channel_config_json?: string;
  meta_json?: string;
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateCmPublicationPatch(body: unknown): SchemaValidationResult<CmPublicationPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('title' in b) {
    if (typeof b.title !== 'string') return { error: 'title must be a string' };
    data.title = b.title;
  }
  if ('pub_type' in b) {
    if (typeof b.pub_type !== 'string') return { error: 'pub_type must be a string' };
    data.pub_type = b.pub_type;
  }
  if ('doc_ref' in b) {
    if (typeof b.doc_ref !== 'string') return { error: 'doc_ref must be a string' };
    data.doc_ref = b.doc_ref;
  }
  if ('asset_ref' in b) {
    if (typeof b.asset_ref !== 'string') return { error: 'asset_ref must be a string' };
    data.asset_ref = b.asset_ref;
  }
  if ('slug' in b) {
    if (typeof b.slug !== 'string') return { error: 'slug must be a string' };
    data.slug = b.slug;
  }
  if ('excerpt' in b) {
    if (typeof b.excerpt !== 'string') return { error: 'excerpt must be a string' };
    data.excerpt = b.excerpt;
  }
  if ('cover_image_url' in b) {
    if (typeof b.cover_image_url !== 'string') return { error: 'cover_image_url must be a string' };
    data.cover_image_url = b.cover_image_url;
  }
  if ('publication_state' in b) {
    if (typeof b.publication_state !== 'string') return { error: 'publication_state must be a string' };
    data.publication_state = b.publication_state;
  }
  if ('published_at' in b) {
    if (typeof b.published_at !== 'string') return { error: 'published_at must be a string' };
    data.published_at = b.published_at;
  }
  if ('policy_ref' in b) {
    if (typeof b.policy_ref !== 'string') return { error: 'policy_ref must be a string' };
    data.policy_ref = b.policy_ref;
  }
  if ('workspace_ref' in b) {
    if (typeof b.workspace_ref !== 'string') return { error: 'workspace_ref must be a string' };
    data.workspace_ref = b.workspace_ref;
  }
  if ('tags_json' in b) {
    if (typeof b.tags_json !== 'string') return { error: 'tags_json must be a string' };
    data.tags_json = b.tags_json;
  }
  if ('canonical_url' in b) {
    if (typeof b.canonical_url !== 'string') return { error: 'canonical_url must be a string' };
    data.canonical_url = b.canonical_url;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmPublicationPatch };
}

export function validateCmPublicationInput(body: unknown): SchemaValidationResult<CmPublicationInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if ('doc_ref' in b) {
    if (b.doc_ref !== null && typeof b.doc_ref !== 'string') return { error: 'doc_ref must be a string or null' };
    data.doc_ref = b.doc_ref;
  }
  if ('asset_ref' in b) {
    if (b.asset_ref !== null && typeof b.asset_ref !== 'string') return { error: 'asset_ref must be a string or null' };
    data.asset_ref = b.asset_ref;
  }
  if ('pub_type' in b) {
    if (typeof b.pub_type !== 'string') return { error: 'pub_type must be a string' };
    data.pub_type = b.pub_type;
  }
  if (typeof b.title !== 'string' || !b.title.trim()) return { error: 'title is required and must be a non-empty string' };
  data.title = b.title.trim();
  if ('slug' in b) {
    if (b.slug !== null && typeof b.slug !== 'string') return { error: 'slug must be a string or null' };
    data.slug = b.slug;
  }
  if ('excerpt' in b) {
    if (b.excerpt !== null && typeof b.excerpt !== 'string') return { error: 'excerpt must be a string or null' };
    data.excerpt = b.excerpt;
  }
  if ('cover_image_url' in b) {
    if (b.cover_image_url !== null && typeof b.cover_image_url !== 'string') return { error: 'cover_image_url must be a string or null' };
    data.cover_image_url = b.cover_image_url;
  }
  if ('publication_state' in b) {
    if (typeof b.publication_state !== 'string') return { error: 'publication_state must be a string' };
    data.publication_state = b.publication_state;
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
  if ('canonical_url' in b) {
    if (b.canonical_url !== null && typeof b.canonical_url !== 'string') return { error: 'canonical_url must be a string or null' };
    data.canonical_url = b.canonical_url;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmPublicationInput };
}

export function validateCmShareLinkInput(body: unknown): SchemaValidationResult<CmShareLinkInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.resource_ref !== 'string' || !b.resource_ref.trim()) return { error: 'resource_ref is required and must be a non-empty string' };
  data.resource_ref = b.resource_ref.trim();
  if (typeof b.core_user_ref !== 'string' || !b.core_user_ref.trim()) return { error: 'core_user_ref is required and must be a non-empty string' };
  data.core_user_ref = b.core_user_ref.trim();
  if (typeof b.token !== 'string' || !b.token.trim()) return { error: 'token is required and must be a non-empty string' };
  data.token = b.token.trim();
  if ('access_level' in b) {
    if (typeof b.access_level !== 'string') return { error: 'access_level must be a string' };
    data.access_level = b.access_level;
  }
  if ('expires_at' in b) {
    if (b.expires_at !== null && typeof b.expires_at !== 'string') return { error: 'expires_at must be a string or null' };
    data.expires_at = b.expires_at;
  }
  if ('max_uses' in b) {
    if (b.max_uses !== null && (typeof b.max_uses !== 'number' || !Number.isFinite(b.max_uses))) return { error: 'max_uses must be a number or null' };
    data.max_uses = b.max_uses;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmShareLinkInput };
}

export function validateCmDistributionInput(body: unknown): SchemaValidationResult<CmDistributionInput> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if (typeof b.pub_id !== 'string' || !b.pub_id.trim()) return { error: 'pub_id is required and must be a non-empty string' };
  data.pub_id = b.pub_id.trim();
  if (typeof b.channel !== 'string' || !b.channel.trim()) return { error: 'channel is required and must be a non-empty string' };
  data.channel = b.channel.trim();
  if ('channel_config_json' in b) {
    if (typeof b.channel_config_json !== 'string') return { error: 'channel_config_json must be a string' };
    data.channel_config_json = b.channel_config_json;
  }
  if ('meta_json' in b) {
    if (typeof b.meta_json !== 'string') return { error: 'meta_json must be a string' };
    data.meta_json = b.meta_json;
  }

  return { data: data as unknown as CmDistributionInput };
}
