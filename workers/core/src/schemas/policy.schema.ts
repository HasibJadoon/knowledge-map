// ─── Policy schemas & types ────────────────────────────────────────────────────

// core_workspace_policies
export interface WorkspacePolicy {
  id: string;                                           // CORE:ULID
  workspace_id: string;                                 // CORE:ULID → core_workspaces (UNIQUE)
  max_visibility: 'private' | 'workspace' | 'link_share' | 'public';
  allow_public_publish: boolean;                        // DB: INTEGER 0|1
  allow_link_share: boolean;                            // DB: INTEGER 0|1
  allow_guest_access: boolean;                          // DB: INTEGER 0|1
  guest_max_visibility: 'private' | 'workspace' | 'link_share' | 'public';
  default_discovery: 'hidden' | 'workspace_searchable' | 'public_indexed';
  allow_member_invitations: boolean;                    // DB: INTEGER 0|1
  review_required_for_publish: boolean;                 // DB: INTEGER 0|1
  comment_policy: 'members' | 'workspace' | 'public' | 'disabled';
  extra_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspacePolicyPatch {
  max_visibility?: 'private' | 'workspace' | 'link_share' | 'public';
  allow_public_publish?: boolean;
  allow_link_share?: boolean;
  allow_guest_access?: boolean;
  guest_max_visibility?: 'private' | 'workspace' | 'link_share' | 'public';
  default_discovery?: 'hidden' | 'workspace_searchable' | 'public_indexed';
  allow_member_invitations?: boolean;
  review_required_for_publish?: boolean;
  comment_policy?: 'members' | 'workspace' | 'public' | 'disabled';
  extra_json?: string | null;
}

// core_resource_policies
export interface ResourcePolicy {
  id: string;                                           // CORE:ULID
  resource_ref: string;                                 // typed ref: 'CM:xx'|'WV:xx'|etc. (UNIQUE)
  resource_type: 'document' | 'note' | 'source' | 'media' | 'comparison' | 'plan' | 'session' | 'other';
  owner_user_ref: string;                               // 'CORE:<user_id>'
  workspace_ref: string | null;                         // 'CORE:<workspace_id>'
  visibility_scope: 'private' | 'workspace' | 'link_share' | 'public';
  publication_state: 'draft' | 'review' | 'published' | 'archived' | 'rejected';
  is_discoverable: boolean;                             // DB: INTEGER 0|1
  allow_comments: 'none' | 'workspace' | 'public';
  allow_downloads: boolean;                             // DB: INTEGER 0|1
  inherits_from_ref: string | null;                     // parent container resource_ref
  override_flag: boolean;                               // DB: INTEGER 0|1 — 1 = breaks inheritance
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourcePolicyCreate {
  resource_ref: string;
  resource_type: ResourcePolicy['resource_type'];
  owner_user_ref: string;
  workspace_ref?: string;
  visibility_scope?: ResourcePolicy['visibility_scope'];
  publication_state?: ResourcePolicy['publication_state'];
  is_discoverable?: boolean;
  allow_comments?: ResourcePolicy['allow_comments'];
  allow_downloads?: boolean;
  inherits_from_ref?: string;
  override_flag?: boolean;
  meta_json?: string;
}

// core_resource_grants
export interface ResourceGrant {
  id: string;                                           // CORE:ULID
  resource_ref: string;                                 // typed ref to resource
  subject_ref: string;                                  // 'CORE:<user_id>' or 'CORE:<group_id>'
  subject_type: 'user' | 'group' | 'role' | 'anyone';
  access_role: 'viewer' | 'commenter' | 'editor' | 'manager' | 'owner';
  granted_by_ref: string;                               // 'CORE:<user_id>'
  granted_at: string;
  expires_at: string | null;
  is_inheritance_break: boolean;                        // DB: INTEGER 0|1
  revoked_at: string | null;
  note: string | null;
}

export interface ResourceGrantCreate {
  resource_ref: string;
  subject_ref: string;
  subject_type: 'user' | 'group' | 'role' | 'anyone';
  access_role: ResourceGrant['access_role'];
  granted_by_ref: string;
  expires_at?: string;
}

// ─── Validators ────────────────────────────────────────────────────────────────

export function validateWorkspacePolicyPatch(
  body: unknown,
): { data: WorkspacePolicyPatch } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  const visibilityScopes = ['private', 'workspace', 'link_share', 'public'] as const;
  const discoveryOptions = ['hidden', 'workspace_searchable', 'public_indexed'] as const;
  const commentPolicies = ['members', 'workspace', 'public', 'disabled'] as const;

  const data: WorkspacePolicyPatch = {};

  if (b.max_visibility !== undefined) {
    if (!visibilityScopes.includes(b.max_visibility as never))
      return { error: `max_visibility must be one of: ${visibilityScopes.join(', ')}` };
    data.max_visibility = b.max_visibility as WorkspacePolicyPatch['max_visibility'];
  }

  if (b.guest_max_visibility !== undefined) {
    if (!visibilityScopes.includes(b.guest_max_visibility as never))
      return { error: `guest_max_visibility must be one of: ${visibilityScopes.join(', ')}` };
    data.guest_max_visibility = b.guest_max_visibility as WorkspacePolicyPatch['guest_max_visibility'];
  }

  if (b.default_discovery !== undefined) {
    if (!discoveryOptions.includes(b.default_discovery as never))
      return { error: `default_discovery must be one of: ${discoveryOptions.join(', ')}` };
    data.default_discovery = b.default_discovery as WorkspacePolicyPatch['default_discovery'];
  }

  if (b.comment_policy !== undefined) {
    if (!commentPolicies.includes(b.comment_policy as never))
      return { error: `comment_policy must be one of: ${commentPolicies.join(', ')}` };
    data.comment_policy = b.comment_policy as WorkspacePolicyPatch['comment_policy'];
  }

  if (b.allow_public_publish !== undefined)
    data.allow_public_publish = Boolean(b.allow_public_publish);
  if (b.allow_link_share !== undefined)
    data.allow_link_share = Boolean(b.allow_link_share);
  if (b.allow_guest_access !== undefined)
    data.allow_guest_access = Boolean(b.allow_guest_access);
  if (b.allow_member_invitations !== undefined)
    data.allow_member_invitations = Boolean(b.allow_member_invitations);
  if (b.review_required_for_publish !== undefined)
    data.review_required_for_publish = Boolean(b.review_required_for_publish);
  if (b.extra_json !== undefined)
    data.extra_json = typeof b.extra_json === 'string' ? b.extra_json : null;

  return { data };
}

export function validateResourceGrantCreate(
  body: unknown,
): { data: ResourceGrantCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.resource_ref !== 'string' || !b.resource_ref.trim())
    return { error: 'resource_ref is required' };
  if (typeof b.subject_ref !== 'string' || !b.subject_ref.trim())
    return { error: 'subject_ref is required' };
  if (typeof b.granted_by_ref !== 'string' || !b.granted_by_ref.trim())
    return { error: 'granted_by_ref is required' };

  const subjectTypes = ['user', 'group', 'role', 'anyone'] as const;
  if (!subjectTypes.includes(b.subject_type as never))
    return { error: `subject_type must be one of: ${subjectTypes.join(', ')}` };

  const accessRoles = ['viewer', 'commenter', 'editor', 'manager', 'owner'] as const;
  if (!accessRoles.includes(b.access_role as never))
    return { error: `access_role must be one of: ${accessRoles.join(', ')}` };

  const data: ResourceGrantCreate = {
    resource_ref: b.resource_ref.trim(),
    subject_ref: b.subject_ref.trim(),
    subject_type: b.subject_type as ResourceGrantCreate['subject_type'],
    access_role: b.access_role as ResourceGrantCreate['access_role'],
    granted_by_ref: b.granted_by_ref.trim(),
  };

  if (typeof b.expires_at === 'string') data.expires_at = b.expires_at;

  return { data };
}
