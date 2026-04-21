// ─── Workspace Group schemas & types ──────────────────────────────────────────

// core_workspace_groups
export interface WorkspaceGroup {
  id: string;                                           // CORE:ULID
  workspace_id: string;                                 // CORE:ULID → core_workspaces
  name: string;
  group_type: 'team' | 'class' | 'cohort' | 'role_group' | 'other';
  description: string | null;
  created_by_id: string;                                // CORE:ULID → core_users
  meta_json: string | null;
  created_at: string;
}

export interface WorkspaceGroupCreate {
  workspace_id: string;
  name: string;
  group_type?: 'team' | 'class' | 'cohort' | 'role_group' | 'other';
  description?: string;
  created_by_id?: string;
}

// core_workspace_group_members
export interface WorkspaceGroupMember {
  id: string;                                           // CORE:ULID
  group_id: string;                                     // CORE:ULID → core_workspace_groups
  user_id: string;                                      // CORE:ULID → core_users
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupMemberAdd {
  user_id: string;
  role?: 'admin' | 'member';
}

// ─── Validators ────────────────────────────────────────────────────────────────

export function validateWorkspaceGroupCreate(
  body: unknown,
): { data: WorkspaceGroupCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.workspace_id !== 'string' || !b.workspace_id.trim())
    return { error: 'workspace_id is required' };
  if (typeof b.name !== 'string' || !b.name.trim())
    return { error: 'name is required' };

  const groupTypes = ['team', 'class', 'cohort', 'role_group', 'other'] as const;
  const group_type = (b.group_type as string) ?? 'team';
  if (!groupTypes.includes(group_type as never))
    return { error: `group_type must be one of: ${groupTypes.join(', ')}` };

  const data: WorkspaceGroupCreate = {
    workspace_id: b.workspace_id.trim(),
    name: b.name.trim(),
    group_type: group_type as WorkspaceGroupCreate['group_type'],
  };

  if (typeof b.description === 'string') data.description = b.description;
  if (typeof b.created_by_id === 'string') data.created_by_id = b.created_by_id;

  return { data };
}

export function validateGroupMemberAdd(
  body: unknown,
): { data: GroupMemberAdd } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.user_id !== 'string' || !b.user_id.trim())
    return { error: 'user_id is required' };

  const roles = ['admin', 'member'] as const;
  const role = (b.role as string) ?? 'member';
  if (!roles.includes(role as never))
    return { error: `role must be one of: ${roles.join(', ')}` };

  return {
    data: {
      user_id: b.user_id.trim(),
      role: role as GroupMemberAdd['role'],
    },
  };
}
