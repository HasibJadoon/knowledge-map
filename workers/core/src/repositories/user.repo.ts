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
