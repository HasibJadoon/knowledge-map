// ─── WorkspaceRepo — all SQL for core_workspaces ─────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions } from '../../../shared/src/types';
import type { Workspace, WorkspaceCreate } from '../schemas/workspace.schema';

const SELECT = `
  id, name, slug, owner_id, visibility, status, created_at
FROM core_workspaces`;

export class WorkspaceRepo {
  constructor(private db: D1Database) {}

  findById(id: string): Promise<Workspace | null> {
    return queryOne<Workspace>(
      this.db,
      `SELECT ${SELECT} WHERE id = ?`,
      [id],
    );
  }

  findBySlug(slug: string): Promise<Workspace | null> {
    return queryOne<Workspace>(
      this.db,
      `SELECT ${SELECT} WHERE slug = ?`,
      [slug],
    );
  }

  /** All workspaces the user owns or is a member of. */
  byUser(userId: string, opts: PaginateOptions = {}) {
    return paginate<Workspace>(
      this.db,
      `SELECT w.id, w.name, w.slug, w.owner_id, w.visibility, w.status, w.created_at
       FROM core_workspaces w
       LEFT JOIN core_workspace_members m ON m.workspace_id = w.id
       WHERE (w.owner_id = ? OR m.user_id = ?) AND w.status = 'active'
       GROUP BY w.id
       ORDER BY w.name`,
      `SELECT COUNT(DISTINCT w.id) AS count
       FROM core_workspaces w
       LEFT JOIN core_workspace_members m ON m.workspace_id = w.id
       WHERE (w.owner_id = ? OR m.user_id = ?) AND w.status = 'active'`,
      [userId, userId],
      opts,
    );
  }

  async create(input: WorkspaceCreate, ownerId: string): Promise<Workspace> {
    const id  = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_workspaces (id, name, slug, owner_id, visibility, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      [id, input.name, input.slug, ownerId, input.visibility ?? 'private', now],
    );
    return (await this.findById(id))!;
  }

  members(workspaceId: string): Promise<Array<{ user_id: string; role: string; joined_at: string }>> {
    return query(
      this.db,
      `SELECT user_id, role, joined_at FROM core_workspace_members
       WHERE workspace_id = ? ORDER BY joined_at`,
      [workspaceId],
    );
  }
}
