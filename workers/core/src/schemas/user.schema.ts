// ─── User schemas & types ─────────────────────────────────────────────────────

export interface User {
  id: string;             // CORE:ULID
  email: string;
  display_name: string;
  role: 'admin' | 'member' | 'guest';
  status: 'active' | 'suspended' | 'pending';
  created_at: string;
}

export interface UserCreate {
  email: string;
  display_name: string;
  role?: 'admin' | 'member' | 'guest';
}

export interface UserPatch {
  display_name?: string;
  role?: 'admin' | 'member' | 'guest';
  status?: 'active' | 'suspended';
}

export function validateUserCreate(body: unknown): { data: UserCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;
  if (typeof b.email !== 'string' || !b.email.includes('@'))
    return { error: 'Valid email is required' };
  if (typeof b.display_name !== 'string' || !b.display_name.trim())
    return { error: 'display_name is required' };
  const roles = ['admin', 'member', 'guest'] as const;
  const role = (b.role as string) ?? 'member';
  if (!roles.includes(role as never)) return { error: `role must be one of: ${roles.join(', ')}` };
  return { data: { email: b.email, display_name: b.display_name.trim(), role: role as 'member' } };
}

// ─── Additional validators ───────────────────────────────────────────────────

type SchemaValidationResult<T> = { data: T } | { error: string };

function isSchemaRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

export function validateUserPatch(body: unknown): SchemaValidationResult<UserPatch> {
  if (!isSchemaRecord(body)) return { error: 'Body must be an object' };
  const b = body;
  const data: Record<string, unknown> = {};

  if ('display_name' in b) {
    if (typeof b.display_name !== 'string') return { error: 'display_name must be a string' };
    data.display_name = b.display_name;
  }
  if ('role' in b) {
    if (typeof b.role !== 'string') return { error: 'role must be a string' };
    data.role = b.role;
  }
  if ('status' in b) {
    if (typeof b.status !== 'string') return { error: 'status must be a string' };
    data.status = b.status;
  }

  return { data: data as unknown as UserPatch };
}
