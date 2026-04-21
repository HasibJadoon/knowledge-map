// ─── PolicyRepo — core_workspace_policies + core_resource_policies + core_resource_grants ─

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface WorkspacePolicy {
  id: string;
  workspace_id: string;
  max_visibility: 'private' | 'workspace' | 'link_share' | 'public';
  allow_public_publish: number;
  allow_link_share: number;
  allow_guest_access: number;
  guest_max_visibility: string;
  default_discovery: 'hidden' | 'workspace_searchable' | 'public_indexed';
  allow_member_invitations: number;
  review_required_for_publish: number;
  comment_policy: 'members' | 'workspace' | 'public' | 'disabled';
  extra_json: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkspacePolicyPatch = Partial<Omit<WorkspacePolicy, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>;

export interface ResourcePolicy {
  id: string;
  resource_ref: string;
  resource_type: 'document' | 'note' | 'source' | 'media' | 'comparison' | 'plan' | 'session' | 'other';
  owner_user_ref: string;
  workspace_ref: string | null;
  visibility_scope: 'private' | 'workspace' | 'link_share' | 'public';
  publication_state: 'draft' | 'review' | 'published' | 'archived' | 'rejected';
  is_discoverable: number;
  allow_comments: 'none' | 'workspace' | 'public';
  allow_downloads: number;
  inherits_from_ref: string | null;
  override_flag: number;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourcePolicyInput {
  resourceRef: string;
  resourceType: ResourcePolicy['resource_type'];
  ownerUserRef: string;
  workspaceRef?: string;
  visibilityScope?: ResourcePolicy['visibility_scope'];
  publicationState?: ResourcePolicy['publication_state'];
  isDiscoverable?: boolean;
  allowComments?: ResourcePolicy['allow_comments'];
  allowDownloads?: boolean;
  inheritsFromRef?: string;
  overrideFlag?: boolean;
  metaJson?: string;
}

export interface ResourceGrant {
  id: string;
  resource_ref: string;
  subject_ref: string;
  subject_type: 'user' | 'group' | 'role' | 'anyone';
  access_role: 'viewer' | 'commenter' | 'editor' | 'manager' | 'owner';
  granted_by_ref: string;
  granted_at: string;
  expires_at: string | null;
  is_inheritance_break: number;
  revoked_at: string | null;
  note: string | null;
}

export interface ResourceGrantInput {
  resourceRef: string;
  subjectRef: string;
  subjectType?: ResourceGrant['subject_type'];
  accessRole?: ResourceGrant['access_role'];
  grantedByRef: string;
  expiresAt?: string;
  isInheritanceBreak?: boolean;
  note?: string;
}

// ── Column fragments ──────────────────────────────────────────────────────────

const WP_COLS = `
  id, workspace_id, max_visibility, allow_public_publish, allow_link_share,
  allow_guest_access, guest_max_visibility, default_discovery,
  allow_member_invitations, review_required_for_publish, comment_policy,
  extra_json, created_at, updated_at
FROM core_workspace_policies`;

const RP_COLS = `
  id, resource_ref, resource_type, owner_user_ref, workspace_ref,
  visibility_scope, publication_state, is_discoverable, allow_comments,
  allow_downloads, inherits_from_ref, override_flag, meta_json,
  created_at, updated_at
FROM core_resource_policies`;

const RG_COLS = `
  id, resource_ref, subject_ref, subject_type, access_role,
  granted_by_ref, granted_at, expires_at, is_inheritance_break,
  revoked_at, note
FROM core_resource_grants`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class PolicyRepo {
  constructor(private db: D1Database) {}

  // ── Workspace Policies ──

  workspacePolicy(workspaceId: string): Promise<WorkspacePolicy | null> {
    return queryOne<WorkspacePolicy>(
      this.db,
      `SELECT ${WP_COLS} WHERE workspace_id = ?`,
      [workspaceId],
    );
  }

  async upsertWorkspacePolicy(
    workspaceId: string,
    patch: WorkspacePolicyPatch,
  ): Promise<WorkspacePolicy> {
    const existing = await this.workspacePolicy(workspaceId);
    const now = new Date().toISOString();

    if (!existing) {
      const id = typedId('CORE');
      await execute(
        this.db,
        `INSERT INTO core_workspace_policies
           (id, workspace_id, max_visibility, allow_public_publish, allow_link_share,
            allow_guest_access, guest_max_visibility, default_discovery,
            allow_member_invitations, review_required_for_publish, comment_policy,
            extra_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          workspaceId,
          patch.max_visibility ?? 'workspace',
          patch.allow_public_publish ?? 0,
          patch.allow_link_share ?? 1,
          patch.allow_guest_access ?? 0,
          patch.guest_max_visibility ?? 'workspace',
          patch.default_discovery ?? 'workspace_searchable',
          patch.allow_member_invitations ?? 1,
          patch.review_required_for_publish ?? 0,
          patch.comment_policy ?? 'members',
          patch.extra_json ?? null,
          now,
          now,
        ],
      );
    } else {
      const sets: string[] = ['updated_at = ?'];
      const vals: unknown[] = [now];

      const fields: (keyof WorkspacePolicyPatch)[] = [
        'max_visibility', 'allow_public_publish', 'allow_link_share',
        'allow_guest_access', 'guest_max_visibility', 'default_discovery',
        'allow_member_invitations', 'review_required_for_publish',
        'comment_policy', 'extra_json',
      ];
      for (const f of fields) {
        if (patch[f] !== undefined) {
          sets.push(`${f} = ?`);
          vals.push(patch[f]);
        }
      }
      vals.push(workspaceId);
      await execute(
        this.db,
        `UPDATE core_workspace_policies SET ${sets.join(', ')} WHERE workspace_id = ?`,
        vals,
      );
    }
    return (await this.workspacePolicy(workspaceId))!;
  }

  // ── Resource Policies ──

  resourcePolicy(resourceRef: string): Promise<ResourcePolicy | null> {
    return queryOne<ResourcePolicy>(
      this.db,
      `SELECT ${RP_COLS} WHERE resource_ref = ?`,
      [resourceRef],
    );
  }

  async upsertResourcePolicy(
    resourceRef: string,
    input: ResourcePolicyInput,
  ): Promise<ResourcePolicy> {
    const existing = await this.resourcePolicy(resourceRef);
    const now = new Date().toISOString();

    if (!existing) {
      const id = typedId('CORE');
      await execute(
        this.db,
        `INSERT INTO core_resource_policies
           (id, resource_ref, resource_type, owner_user_ref, workspace_ref,
            visibility_scope, publication_state, is_discoverable, allow_comments,
            allow_downloads, inherits_from_ref, override_flag, meta_json,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          resourceRef,
          input.resourceType,
          input.ownerUserRef,
          input.workspaceRef ?? null,
          input.visibilityScope ?? 'workspace',
          input.publicationState ?? 'draft',
          input.isDiscoverable !== false ? 1 : 0,
          input.allowComments ?? 'workspace',
          input.allowDownloads ? 1 : 0,
          input.inheritsFromRef ?? null,
          input.overrideFlag ? 1 : 0,
          input.metaJson ?? null,
          now,
          now,
        ],
      );
    } else {
      const sets: string[] = ['updated_at = ?'];
      const vals: unknown[] = [now];

      if (input.visibilityScope !== undefined)  { sets.push('visibility_scope = ?');  vals.push(input.visibilityScope); }
      if (input.publicationState !== undefined) { sets.push('publication_state = ?'); vals.push(input.publicationState); }
      if (input.isDiscoverable !== undefined)   { sets.push('is_discoverable = ?');   vals.push(input.isDiscoverable ? 1 : 0); }
      if (input.allowComments !== undefined)    { sets.push('allow_comments = ?');    vals.push(input.allowComments); }
      if (input.allowDownloads !== undefined)   { sets.push('allow_downloads = ?');   vals.push(input.allowDownloads ? 1 : 0); }
      if (input.overrideFlag !== undefined)     { sets.push('override_flag = ?');     vals.push(input.overrideFlag ? 1 : 0); }
      if (input.metaJson !== undefined)         { sets.push('meta_json = ?');         vals.push(input.metaJson); }
      if (input.workspaceRef !== undefined)     { sets.push('workspace_ref = ?');     vals.push(input.workspaceRef); }

      vals.push(resourceRef);
      await execute(
        this.db,
        `UPDATE core_resource_policies SET ${sets.join(', ')} WHERE resource_ref = ?`,
        vals,
      );
    }
    return (await this.resourcePolicy(resourceRef))!;
  }

  /** Policies for multiple resource refs (e.g. for a batch visibility check). */
  resourcePoliciesByRefs(refs: string[]): Promise<ResourcePolicy[]> {
    if (refs.length === 0) return Promise.resolve([]);
    const placeholders = refs.map(() => '?').join(', ');
    return query<ResourcePolicy>(
      this.db,
      `SELECT ${RP_COLS} WHERE resource_ref IN (${placeholders})`,
      refs,
    );
  }

  // ── Resource Grants ──

  grants(resourceRef: string): Promise<ResourceGrant[]> {
    return query<ResourceGrant>(
      this.db,
      `SELECT ${RG_COLS}
       WHERE resource_ref = ? AND revoked_at IS NULL
       ORDER BY granted_at`,
      [resourceRef],
    );
  }

  /** Active grants for a subject (user or group) across all resources. */
  subjectGrants(subjectRef: string): Promise<ResourceGrant[]> {
    return query<ResourceGrant>(
      this.db,
      `SELECT ${RG_COLS}
       WHERE subject_ref = ? AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY granted_at DESC`,
      [subjectRef],
    );
  }

  async addGrant(input: ResourceGrantInput): Promise<ResourceGrant> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT OR REPLACE INTO core_resource_grants
         (id, resource_ref, subject_ref, subject_type, access_role,
          granted_by_ref, granted_at, expires_at, is_inheritance_break,
          revoked_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        id,
        input.resourceRef,
        input.subjectRef,
        input.subjectType ?? 'user',
        input.accessRole ?? 'viewer',
        input.grantedByRef,
        now,
        input.expiresAt ?? null,
        input.isInheritanceBreak ? 1 : 0,
        input.note ?? null,
      ],
    );
    return (await queryOne<ResourceGrant>(
      this.db,
      `SELECT ${RG_COLS} WHERE id = ?`,
      [id],
    ))!;
  }

  async revokeGrant(id: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_resource_grants SET revoked_at = datetime('now') WHERE id = ?`,
      [id],
    );
  }
}
