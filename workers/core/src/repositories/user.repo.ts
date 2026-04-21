// ─── UserRepo — all SQL for core_users ────────────────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type { User, UserCreate, UserPatch } from '../schemas/user.schema';

const SELECT = `
  id, email, display_name, role, status, created_at
FROM core_users`;

export class UserRepo {
  constructor(private db: D1Database) {}

  list(opts: PaginateOptions = {}) {
    return paginate<User>(
      this.db,
      `SELECT ${SELECT} WHERE status != 'suspended' ORDER BY display_name`,
      `SELECT COUNT(*) AS count FROM core_users WHERE status != 'suspended'`,
      [],
      opts,
    );
  }

  findById(id: string): Promise<User | null> {
    return queryOne<User>(
      this.db,
      `SELECT ${SELECT} WHERE id = ?`,
      [id],
    );
  }

  findByEmail(email: string): Promise<User | null> {
    return queryOne<User>(
      this.db,
      `SELECT ${SELECT} WHERE email = ?`,
      [email],
    );
  }

  async create(input: UserCreate): Promise<User> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_users (id, email, display_name, role, status, created_at)
       VALUES (?, ?, ?, ?, 'active', ?)`,
      [id, input.email, input.display_name, input.role ?? 'member', now],
    );
    return (await this.findById(id))!;
  }

  async update(id: string, patch: UserPatch): Promise<User | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.display_name !== undefined) { sets.push('display_name = ?'); vals.push(patch.display_name); }
    if (patch.role !== undefined)         { sets.push('role = ?');         vals.push(patch.role); }
    if (patch.status !== undefined)       { sets.push('status = ?');       vals.push(patch.status); }
    if (sets.length === 0) return this.findById(id);

    vals.push(id);
    await execute(this.db, `UPDATE core_users SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  /** For auth: find user and verify password hash. */
  findWithCredentials(email: string): Promise<(User & { password_hash: string | null }) | null> {
    return queryOne<User & { password_hash: string | null }>(
      this.db,
      `SELECT id, email, display_name, role, status, created_at, password_hash
       FROM core_users WHERE email = ?`,
      [email],
    );
  }
}
