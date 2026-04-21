// ─── People schemas & types ────────────────────────────────────────────────────

// core_people
// NOTE: personal address book / social profile — NOT the scholarly/historical registry (wv_people)
import type { PaginateOptions } from '../../../shared/src/types';

export interface Person {
  id: string;                                           // CORE:ULID
  workspace_id: string;                                 // CORE:ULID → core_workspaces
  name: string;
  name_ar: string | null;
  email: string | null;
  relationship: string | null;                          // 'family'|'colleague'|'friend'|'contact'|'other'
  linked_user_id: string | null;                        // CORE:ULID → core_users if they have an account
  visibility: 'private' | 'workspace' | 'public';
  notes_md: string | null;
  meta_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonCreate {
  workspace_id: string;
  name: string;
  name_ar?: string;
  email?: string;
  relationship?: string;
  visibility?: 'private' | 'workspace' | 'public';
}

export interface PersonPatch {
  name?: string;
  name_ar?: string | null;
  email?: string | null;
  relationship?: string | null;
  linked_user_id?: string | null;
  visibility?: 'private' | 'workspace' | 'public';
  notes_md?: string | null;
  meta_json?: string | null;
}

// ─── Validators ────────────────────────────────────────────────────────────────

export function validatePersonCreate(
  body: unknown,
): { data: PersonCreate } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  if (typeof b.workspace_id !== 'string' || !b.workspace_id.trim())
    return { error: 'workspace_id is required' };
  if (typeof b.name !== 'string' || !b.name.trim())
    return { error: 'name is required' };

  const visibilityOptions = ['private', 'workspace', 'public'] as const;
  const visibility = (b.visibility as string) ?? 'private';
  if (!visibilityOptions.includes(visibility as never))
    return { error: `visibility must be one of: ${visibilityOptions.join(', ')}` };

  const data: PersonCreate = {
    workspace_id: b.workspace_id.trim(),
    name: b.name.trim(),
    visibility: visibility as PersonCreate['visibility'],
  };

  if (typeof b.name_ar === 'string') data.name_ar = b.name_ar;
  if (typeof b.email === 'string') {
    if (!b.email.includes('@')) return { error: 'email must be a valid email address' };
    data.email = b.email;
  }
  if (typeof b.relationship === 'string') data.relationship = b.relationship;

  return { data };
}

export function validatePersonPatch(
  body: unknown,
): { data: PersonPatch } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Body must be an object' };
  const b = body as Record<string, unknown>;

  const data: PersonPatch = {};

  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || !b.name.trim()) return { error: 'name must be a non-empty string' };
    data.name = b.name.trim();
  }

  if (b.email !== undefined) {
    if (b.email !== null) {
      if (typeof b.email !== 'string' || !b.email.includes('@'))
        return { error: 'email must be a valid email address or null' };
      data.email = b.email;
    } else {
      data.email = null;
    }
  }

  if (b.visibility !== undefined) {
    const visibilityOptions = ['private', 'workspace', 'public'] as const;
    if (!visibilityOptions.includes(b.visibility as never))
      return { error: `visibility must be one of: ${visibilityOptions.join(', ')}` };
    data.visibility = b.visibility as PersonPatch['visibility'];
  }

  if (b.name_ar !== undefined)
    data.name_ar = typeof b.name_ar === 'string' ? b.name_ar : null;
  if (b.relationship !== undefined)
    data.relationship = typeof b.relationship === 'string' ? b.relationship : null;
  if (b.linked_user_id !== undefined)
    data.linked_user_id = typeof b.linked_user_id === 'string' ? b.linked_user_id : null;
  if (b.notes_md !== undefined)
    data.notes_md = typeof b.notes_md === 'string' ? b.notes_md : null;
  if (b.meta_json !== undefined)
    data.meta_json = typeof b.meta_json === 'string' ? b.meta_json : null;

  return { data };
}

// ─── Repository-compatible contracts ─────────────────────────────────────────

export interface PeopleListOptions extends PaginateOptions {
  visibility?: 'private' | 'workspace';
  relationship?: string;
}
