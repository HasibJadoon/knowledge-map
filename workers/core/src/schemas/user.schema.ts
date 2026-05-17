// ─── User schemas & types ─────────────────────────────────────────────────────
// `role` / `status` are exposed as clean names; the repository maps them to the
// real core_users columns `platform_role` / `account_status`.

export interface User {
  id: string;             // CORE:ULID
  email: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  user_type: string;
  role: string;           // platform_role — admin | member | guest
  status: string;         // account_status — active | suspended | pending
  created_at: string;
}

export interface UserCreate {
  email: string;
  display_name: string;
  role?: string;
  username?: string | null;
  password?: string;
}

export interface UserPatch {
  display_name?: string;
  role?: string;
  status?: string;
}

const ROLES = ['admin', 'member', 'guest'];
const STATUSES = ['active', 'suspended', 'pending'];

export function validateUserCreate(body: unknown): { data: UserCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b['email'] !== 'string' || !b['email'].includes('@')) {
    return { error: 'Valid email is required' };
  }
  if (typeof b['display_name'] !== 'string' || !b['display_name'].trim()) {
    return { error: 'display_name is required' };
  }
  const role = typeof b['role'] === 'string' && b['role'] ? b['role'] : 'member';
  if (!ROLES.includes(role)) return { error: `role must be one of: ${ROLES.join(', ')}` };

  const data: UserCreate = {
    email: b['email'].trim(),
    display_name: b['display_name'].trim(),
    role,
  };
  if (typeof b['username'] === 'string' && b['username'].trim()) {
    data.username = b['username'].trim();
  }
  if (b['password'] !== undefined) {
    if (typeof b['password'] !== 'string' || b['password'].length < 6) {
      return { error: 'password must be at least 6 characters' };
    }
    data.password = b['password'];
  }
  return { data };
}

export function validateUserPatch(body: unknown): { data: UserPatch } | { error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'Body must be an object' };
  }
  const b = body as Record<string, unknown>;
  const data: UserPatch = {};

  if (b['display_name'] !== undefined) {
    if (typeof b['display_name'] !== 'string' || !b['display_name'].trim()) {
      return { error: 'display_name must be a non-empty string' };
    }
    data.display_name = b['display_name'].trim();
  }
  if (b['role'] !== undefined) {
    if (typeof b['role'] !== 'string' || !ROLES.includes(b['role'])) {
      return { error: `role must be one of: ${ROLES.join(', ')}` };
    }
    data.role = b['role'];
  }
  if (b['status'] !== undefined) {
    if (typeof b['status'] !== 'string' || !STATUSES.includes(b['status'])) {
      return { error: `status must be one of: ${STATUSES.join(', ')}` };
    }
    data.status = b['status'];
  }
  if (Object.keys(data).length === 0) return { error: 'At least one field is required' };
  return { data };
}
