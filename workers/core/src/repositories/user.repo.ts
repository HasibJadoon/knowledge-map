// ─── UserRepo — all SQL for core_users ────────────────────────────────────────
// The DB columns are `platform_role` / `account_status`; they are aliased to
// `role` / `status` so the rest of the worker sees stable names.

import { queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type { User, UserCreate, UserPatch } from '../schemas/user.schema';

const SELECT = `
  id, email, display_name, username, avatar_url, user_type,
  platform_role AS role, account_status AS status, created_at
FROM core_users`;

export class UserRepo {
  constructor(private db: D1Database) {}

  list(opts: PaginateOptions = {}) {
    return paginate<User>(
      this.db,
      `SELECT ${SELECT} WHERE account_status != 'suspended' ORDER BY display_name`,
      `SELECT COUNT(*) AS count FROM core_users WHERE account_status != 'suspended'`,
      [],
      opts,
    );
  }

  findById(id: string): Promise<User | null> {
    return queryOne<User>(this.db, `SELECT ${SELECT} WHERE id = ?`, [id]);
  }

  findByEmail(email: string): Promise<User | null> {
    return queryOne<User>(this.db, `SELECT ${SELECT} WHERE email = ?`, [email]);
  }

  async create(input: UserCreate): Promise<User> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_users
         (id, email, display_name, username, platform_role, account_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, input.email, input.display_name, input.username ?? null, input.role ?? 'member', now, now],
    );
    return (await this.findById(id))!;
  }

  // ── OAuth provisioning ──
  // Provider linkage is kept in core_users.meta_json under `oauth.<provider>`,
  // so no extra table is needed. Email remains the primary identity key.

  findByOAuthSubject(provider: 'google' | 'apple', subject: string): Promise<User | null> {
    return queryOne<User>(
      this.db,
      `SELECT ${SELECT} WHERE json_extract(meta_json, ?) = ?`,
      [`$.oauth.${provider}`, subject],
    );
  }

  async createOAuthUser(input: {
    email: string;
    display_name: string;
    avatar_url?: string | null;
    email_verified?: boolean;
    provider: 'google' | 'apple';
    subject: string;
  }): Promise<User> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    const meta = JSON.stringify({ oauth: { [input.provider]: input.subject } });
    await execute(
      this.db,
      `INSERT INTO core_users
         (id, email, display_name, username, avatar_url, platform_role,
          account_status, email_verified, meta_json, last_active_at, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, 'member', 'active', ?, ?, ?, ?, ?)`,
      [
        id,
        input.email,
        input.display_name,
        input.avatar_url ?? null,
        input.email_verified ? 1 : 0,
        meta,
        now,
        now,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  /** Record a provider linkage on an existing account (idempotent). */
  async linkOAuth(
    userId: string,
    provider: 'google' | 'apple',
    subject: string,
    avatarUrl?: string | null,
  ): Promise<void> {
    const row = await queryOne<{ meta_json: string | null }>(
      this.db,
      `SELECT meta_json FROM core_users WHERE id = ?`,
      [userId],
    );
    let meta: Record<string, unknown> = {};
    try {
      meta = row?.meta_json ? (JSON.parse(row.meta_json) as Record<string, unknown>) : {};
    } catch {
      meta = {};
    }
    const oauth =
      meta['oauth'] && typeof meta['oauth'] === 'object'
        ? (meta['oauth'] as Record<string, string>)
        : {};
    oauth[provider] = subject;
    meta['oauth'] = oauth;
    const now = new Date().toISOString();
    await execute(
      this.db,
      `UPDATE core_users
         SET meta_json = ?, last_active_at = ?, updated_at = ?,
             avatar_url = COALESCE(avatar_url, ?)
       WHERE id = ?`,
      [JSON.stringify(meta), now, now, avatarUrl ?? null, userId],
    );
  }

  async update(id: string, patch: UserPatch): Promise<User | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.display_name !== undefined) { sets.push('display_name = ?'); vals.push(patch.display_name); }
    if (patch.role !== undefined)         { sets.push('platform_role = ?'); vals.push(patch.role); }
    if (patch.status !== undefined)       { sets.push('account_status = ?'); vals.push(patch.status); }
    if (sets.length === 0) return this.findById(id);

    sets.push('updated_at = ?');
    vals.push(new Date().toISOString(), id);
    await execute(this.db, `UPDATE core_users SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }
}
