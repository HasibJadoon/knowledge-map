// ─── Workspace feature models ─────────────────────────────────────────────────
// UI-facing shapes. The WorkspaceApiService adapts the CORE wire format
// (core_workspaces / core_users / core_workspace_roles) onto these.

export interface WorkspaceSummary {
  id: string;
  name: string;
  type: string;
  description: string;
  member_count: number;
  created_at: string;
  status: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  owner: string;
}

export interface WorkspaceMember {
  id: string;          // user id (CORE:ULID)
  member_id: string;   // membership row id — used for member mutations
  name: string;
  role: string;        // membership role: owner | admin | member | guest
  status: string;      // active | invited | suspended
  email: string;
  avatar_url: string;
  joined_at: string;
}

export interface WorkspaceActivity {
  id: string;
  action: string;
  actor: string;
  created_at: string;
  details: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
}

export interface WorkspaceRole {
  id: string;
  workspace_id: string;
  role_key: string;
  title: string;
  permissions_json: string;
  is_system_role: boolean;
  created_at: string;
}

export interface NewUserInput {
  email: string;
  display_name: string;
  role: string;
  password?: string;
}

export interface WorkspacePatch {
  title?: string;
  description_md?: string | null;
  workspace_type?: string;
  status?: string;
}

export interface NewMemberInput {
  email: string;
  membership_role: string;
}

// ─── OAuth provider configuration (from /core/auth/providers) ─────────────────

export interface OAuthProvidersConfig {
  google: { enabled: boolean; client_id: string };
  apple: { enabled: boolean; client_id: string; redirect_uri: string; scope: string };
}
