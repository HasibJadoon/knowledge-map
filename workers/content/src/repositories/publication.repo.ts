// ─── PublicationRepo — cm_publications + cm_share_links + cm_distributions ───
// Publication lifecycle: draft → published, shareable token links, and
// channel-based distribution tracking.

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';

// ---------------------------------------------------------------------------
// cm_publications
// ---------------------------------------------------------------------------

export interface CmPublication {
  pub_id: string;
  core_user_ref: string;
  doc_ref: string | null;
  asset_ref: string | null;
  pub_type: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  publication_state: string;
  published_at: string | null;
  policy_ref: string | null;
  workspace_ref: string | null;
  tags_json: string;
  canonical_url: string | null;
  meta_json: string;
  created_at: string;
  updated_at: string;
}

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

export interface CmPublicationPatch {
  doc_ref?: string | null;
  asset_ref?: string | null;
  pub_type?: string;
  title?: string;
  slug?: string | null;
  excerpt?: string | null;
  cover_image_url?: string | null;
  publication_state?: string;
  published_at?: string | null;
  policy_ref?: string | null;
  workspace_ref?: string | null;
  tags_json?: string;
  canonical_url?: string | null;
  meta_json?: string;
}

const PUB_COLS = `pub_id, core_user_ref, doc_ref, asset_ref, pub_type, title, slug,
  excerpt, cover_image_url, publication_state, published_at, policy_ref,
  workspace_ref, tags_json, canonical_url, meta_json, created_at, updated_at`;

// ---------------------------------------------------------------------------
// cm_share_links
// ---------------------------------------------------------------------------

export interface CmShareLink {
  link_id: string;
  resource_ref: string;
  core_user_ref: string;
  token: string;
  access_level: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: number;            // 0 | 1
  meta_json: string;
  created_at: string;
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

const LINK_COLS = `link_id, resource_ref, core_user_ref, token, access_level,
  expires_at, max_uses, use_count, is_active, meta_json, created_at`;

// ---------------------------------------------------------------------------
// cm_distributions
// ---------------------------------------------------------------------------

export interface CmDistribution {
  dist_id: string;
  pub_id: string;
  channel: string;
  channel_config_json: string;
  sent_at: string | null;
  status: string;
  recipient_count: number | null;
  error_json: string | null;
  meta_json: string;
  created_at: string;
}

export interface CmDistributionInput {
  pub_id: string;
  channel: string;
  channel_config_json?: string;
  meta_json?: string;
}

const DIST_COLS = `dist_id, pub_id, channel, channel_config_json, sent_at,
  status, recipient_count, error_json, meta_json, created_at`;

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class PublicationRepo {
  constructor(private db: D1Database) {}

  // ── cm_publications ──────────────────────────────────────────────────────

  list(workspaceRef: string | null, opts: PaginateOptions = {}) {
    const where  = workspaceRef ? 'WHERE workspace_ref = ?' : '';
    const params = workspaceRef ? [workspaceRef] : [];
    return paginate<CmPublication>(
      this.db,
      `SELECT ${PUB_COLS} FROM cm_publications ${where} ORDER BY created_at DESC`,
      `SELECT COUNT(*) AS count FROM cm_publications ${where}`,
      params, opts,
    );
  }

  findById(pubId: string): Promise<CmPublication | null> {
    return queryOne<CmPublication>(
      this.db,
      `SELECT ${PUB_COLS} FROM cm_publications WHERE pub_id = ?`,
      [pubId],
    );
  }

  findBySlug(slug: string): Promise<CmPublication | null> {
    return queryOne<CmPublication>(
      this.db,
      `SELECT ${PUB_COLS} FROM cm_publications WHERE slug = ?`,
      [slug],
    );
  }

  async create(input: CmPublicationInput): Promise<CmPublication> {
    const pub_id = typedId('CM');
    const now    = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_publications
         (pub_id, core_user_ref, doc_ref, asset_ref, pub_type, title, slug,
          excerpt, cover_image_url, publication_state, published_at, policy_ref,
          workspace_ref, tags_json, canonical_url, meta_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pub_id, input.core_user_ref,
        input.doc_ref           ?? null,
        input.asset_ref         ?? null,
        input.pub_type          ?? 'article',
        input.title,
        input.slug              ?? null,
        input.excerpt           ?? null,
        input.cover_image_url   ?? null,
        input.publication_state ?? 'draft',
        input.policy_ref        ?? null,
        input.workspace_ref     ?? null,
        input.tags_json         ?? '[]',
        input.canonical_url     ?? null,
        input.meta_json         ?? '{}',
        now, now,
      ],
    );
    return (await this.findById(pub_id))!;
  }

  async patch(pubId: string, patch: CmPublicationPatch): Promise<CmPublication | null> {
    const now  = new Date().toISOString();
    const sets: string[]  = ['updated_at = ?'];
    const vals: unknown[] = [now];
    if (patch.doc_ref           !== undefined) { sets.push('doc_ref = ?');           vals.push(patch.doc_ref); }
    if (patch.asset_ref         !== undefined) { sets.push('asset_ref = ?');         vals.push(patch.asset_ref); }
    if (patch.pub_type          !== undefined) { sets.push('pub_type = ?');          vals.push(patch.pub_type); }
    if (patch.title             !== undefined) { sets.push('title = ?');             vals.push(patch.title); }
    if (patch.slug              !== undefined) { sets.push('slug = ?');              vals.push(patch.slug); }
    if (patch.excerpt           !== undefined) { sets.push('excerpt = ?');           vals.push(patch.excerpt); }
    if (patch.cover_image_url   !== undefined) { sets.push('cover_image_url = ?');   vals.push(patch.cover_image_url); }
    if (patch.publication_state !== undefined) { sets.push('publication_state = ?'); vals.push(patch.publication_state); }
    if (patch.published_at      !== undefined) { sets.push('published_at = ?');      vals.push(patch.published_at); }
    if (patch.policy_ref        !== undefined) { sets.push('policy_ref = ?');        vals.push(patch.policy_ref); }
    if (patch.workspace_ref     !== undefined) { sets.push('workspace_ref = ?');     vals.push(patch.workspace_ref); }
    if (patch.tags_json         !== undefined) { sets.push('tags_json = ?');         vals.push(patch.tags_json); }
    if (patch.canonical_url     !== undefined) { sets.push('canonical_url = ?');     vals.push(patch.canonical_url); }
    if (patch.meta_json         !== undefined) { sets.push('meta_json = ?');         vals.push(patch.meta_json); }
    vals.push(pubId);
    await execute(this.db, `UPDATE cm_publications SET ${sets.join(', ')} WHERE pub_id = ?`, vals);
    return this.findById(pubId);
  }

  async publish(pubId: string, publishedAt?: string): Promise<CmPublication | null> {
    const now = new Date().toISOString();
    const at  = publishedAt ?? now;
    await execute(
      this.db,
      `UPDATE cm_publications
       SET publication_state = 'published', published_at = ?, updated_at = ?
       WHERE pub_id = ?`,
      [at, now, pubId],
    );
    return this.findById(pubId);
  }

  // ── cm_share_links ───────────────────────────────────────────────────────

  shareLinks(resourceRef: string): Promise<CmShareLink[]> {
    return query<CmShareLink>(
      this.db,
      `SELECT ${LINK_COLS} FROM cm_share_links
       WHERE resource_ref = ? AND is_active = 1 ORDER BY created_at DESC`,
      [resourceRef],
    );
  }

  async createShareLink(input: CmShareLinkInput): Promise<CmShareLink> {
    const link_id = typedId('CM');
    const now     = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_share_links
         (link_id, resource_ref, core_user_ref, token, access_level,
          expires_at, max_uses, use_count, is_active, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
      [
        link_id, input.resource_ref, input.core_user_ref, input.token,
        input.access_level ?? 'view',
        input.expires_at   ?? null,
        input.max_uses     ?? null,
        input.meta_json    ?? '{}',
        now,
      ],
    );
    return (await queryOne<CmShareLink>(
      this.db, `SELECT ${LINK_COLS} FROM cm_share_links WHERE link_id = ?`, [link_id],
    ))!;
  }

  async revokeShareLink(linkId: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE cm_share_links SET is_active = 0 WHERE link_id = ?`,
      [linkId],
    );
  }

  findShareLink(token: string): Promise<CmShareLink | null> {
    return queryOne<CmShareLink>(
      this.db,
      `SELECT ${LINK_COLS} FROM cm_share_links WHERE token = ?`,
      [token],
    );
  }

  // ── cm_distributions ─────────────────────────────────────────────────────

  distributions(pubId: string): Promise<CmDistribution[]> {
    return query<CmDistribution>(
      this.db,
      `SELECT ${DIST_COLS} FROM cm_distributions
       WHERE pub_id = ? ORDER BY created_at DESC`,
      [pubId],
    );
  }

  async createDistribution(input: CmDistributionInput): Promise<CmDistribution> {
    const dist_id = typedId('CM');
    const now     = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO cm_distributions
         (dist_id, pub_id, channel, channel_config_json, sent_at, status,
          recipient_count, error_json, meta_json, created_at)
       VALUES (?, ?, ?, ?, NULL, 'pending', NULL, NULL, ?, ?)`,
      [
        dist_id, input.pub_id, input.channel,
        input.channel_config_json ?? '{}',
        input.meta_json           ?? '{}',
        now,
      ],
    );
    return (await queryOne<CmDistribution>(
      this.db, `SELECT ${DIST_COLS} FROM cm_distributions WHERE dist_id = ?`, [dist_id],
    ))!;
  }
}
