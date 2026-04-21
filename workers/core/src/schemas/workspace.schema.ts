// ─── Workspace schemas & types ────────────────────────────────────────────────

export interface Workspace {
  id: string;              // CORE:ULID
  name: string;
  slug: string;
  owner_id: string;        // CORE:ULID → core_users
  visibility: 'private' | 'friends' | 'public';
  status: 'active' | 'archived';
  created_at: string;
}

export interface WorkspaceCreate {
  name: string;
  slug: string;
  visibility?: 'private' | 'friends' | 'public';
}

export function validateWorkspaceCreate(
  body: unknown,
): { data: WorkspaceCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.name !== 'string' || !b.name.trim()) return { error: 'name is required' };
  if (typeof b.slug !== 'string' || !/^[a-z0-9-]+$/.test(b.slug))
    return { error: 'slug must be lowercase alphanumeric with hyphens' };
  return {
    data: {
      name: b.name.trim(),
      slug: b.slug,
      visibility: (b.visibility as 'private') ?? 'private',
    },
  };
}
