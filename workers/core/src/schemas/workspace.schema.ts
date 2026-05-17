// ─── Workspace schemas & types ────────────────────────────────────────────────
// Mirrors the core_workspaces table.

export interface Workspace {
  id: string;                 // CORE:ULID
  slug: string;
  title: string;
  description_md: string | null;
  workspace_type: string;     // personal | team | class | org | …
  owner_id: string;           // CORE:ULID → core_users
  status: string;             // active | archived
  allow_guests: number;
  allow_public_publish: number;
  default_visibility: string;
  settings_json: string;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceCreate {
  title: string;
  slug?: string;
  workspace_type?: string;
  description_md?: string;
  default_visibility?: string;
}

export interface WorkspacePatch {
  title?: string;
  description_md?: string | null;
  workspace_type?: string;
  default_visibility?: string;
  status?: string;
}

const SLUG_RE = /^[a-z0-9-]+$/;

export function validateWorkspaceCreate(
  body: unknown,
): { data: WorkspaceCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b['title'] !== 'string' || !b['title'].trim()) return { error: 'title is required' };
  const data: WorkspaceCreate = { title: b['title'].trim() };

  if (b['slug'] !== undefined) {
    if (typeof b['slug'] !== 'string' || !SLUG_RE.test(b['slug'])) {
      return { error: 'slug must be lowercase alphanumeric with hyphens' };
    }
    data.slug = b['slug'];
  }
  if (typeof b['workspace_type'] === 'string' && b['workspace_type'].trim()) {
    data.workspace_type = b['workspace_type'].trim();
  }
  if (typeof b['description_md'] === 'string') data.description_md = b['description_md'];
  if (typeof b['default_visibility'] === 'string' && b['default_visibility'].trim()) {
    data.default_visibility = b['default_visibility'].trim();
  }
  return { data };
}

export function validateWorkspacePatch(
  body: unknown,
): { data: WorkspacePatch } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  const data: WorkspacePatch = {};

  if (b['title'] !== undefined) {
    if (typeof b['title'] !== 'string' || !b['title'].trim()) return { error: 'title must be a non-empty string' };
    data.title = b['title'].trim();
  }
  if (b['description_md'] !== undefined) {
    if (b['description_md'] !== null && typeof b['description_md'] !== 'string') {
      return { error: 'description_md must be a string or null' };
    }
    data.description_md = b['description_md'] as string | null;
  }
  if (b['workspace_type'] !== undefined) {
    if (typeof b['workspace_type'] !== 'string' || !b['workspace_type'].trim()) {
      return { error: 'workspace_type must be a non-empty string' };
    }
    data.workspace_type = b['workspace_type'].trim();
  }
  if (b['default_visibility'] !== undefined) {
    if (typeof b['default_visibility'] !== 'string' || !b['default_visibility'].trim()) {
      return { error: 'default_visibility must be a non-empty string' };
    }
    data.default_visibility = b['default_visibility'].trim();
  }
  if (b['status'] !== undefined) {
    if (b['status'] !== 'active' && b['status'] !== 'archived') {
      return { error: "status must be 'active' or 'archived'" };
    }
    data.status = b['status'];
  }
  if (Object.keys(data).length === 0) return { error: 'At least one field is required' };
  return { data };
}
