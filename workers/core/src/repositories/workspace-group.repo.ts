// ─── WorkspaceGroupRepo — core_workspace_groups + core_workspace_group_members ─

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface WorkspaceGroup {
  id: string;
  workspace_id: string;
  name: string;
  group_type: 'team' | 'class' | 'cohort' | 'role_group' | 'other';
  description: string | null;
  created_by_id: string;
  meta_json: string | null;
  created_at: string;
}

export interface WorkspaceGroupCreate {
  workspaceId: string;
  name: string;
  groupType?: 'team' | 'class' | 'cohort' | 'role_group' | 'other';
  description?: string;
  createdById: string;
  metaJson?: string;
}

export interface WorkspaceGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

// ── Column fragments ──────────────────────────────────────────────────────────

const GROUP_COLS = `
  id, workspace_id, name, group_type, description, created_by_id,
  meta_json, created_at
FROM core_workspace_groups`;

const MEMBER_COLS = `
  id, group_id, user_id, role, joined_at
FROM core_workspace_group_members`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class WorkspaceGroupRepo {
  constructor(private db: D1Database) {}

  // ── Groups ──

  list(workspaceId: string): Promise<WorkspaceGroup[]> {
    return query<WorkspaceGroup>(
      this.db,
      `SELECT ${GROUP_COLS} WHERE workspace_id = ? ORDER BY name`,
      [workspaceId],
    );
  }

  findById(id: string): Promise<WorkspaceGroup | null> {
    return queryOne<WorkspaceGroup>(
      this.db,
      `SELECT ${GROUP_COLS} WHERE id = ?`,
      [id],
    );
  }

  async create(input: WorkspaceGroupCreate): Promise<WorkspaceGroup> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_workspace_groups
         (id, workspace_id, name, group_type, description, created_by_id,
          meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.workspaceId,
        input.name,
        input.groupType ?? 'team',
        input.description ?? null,
        input.createdById,
        input.metaJson ?? null,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async delete(id: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM core_workspace_group_members WHERE group_id = ?`,
      [id],
    );
    await execute(
      this.db,
      `DELETE FROM core_workspace_groups WHERE id = ?`,
      [id],
    );
  }

  // ── Members ──

  members(groupId: string): Promise<WorkspaceGroupMember[]> {
    return query<WorkspaceGroupMember>(
      this.db,
      `SELECT ${MEMBER_COLS} WHERE group_id = ? ORDER BY joined_at`,
      [groupId],
    );
  }

  async addMember(
    groupId: string,
    userId: string,
    role: 'admin' | 'member' = 'member',
  ): Promise<WorkspaceGroupMember> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT OR IGNORE INTO core_workspace_group_members
         (id, group_id, user_id, role, joined_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, groupId, userId, role, now],
    );
    return (await queryOne<WorkspaceGroupMember>(
      this.db,
      `SELECT ${MEMBER_COLS} WHERE group_id = ? AND user_id = ?`,
      [groupId, userId],
    ))!;
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM core_workspace_group_members WHERE group_id = ? AND user_id = ?`,
      [groupId, userId],
    );
  }

  /** Update a member's role within the group. */
  async updateMemberRole(
    groupId: string,
    userId: string,
    role: 'admin' | 'member',
  ): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_workspace_group_members SET role = ? WHERE group_id = ? AND user_id = ?`,
      [role, groupId, userId],
    );
  }

  /** Groups a user belongs to within a workspace. */
  userGroups(workspaceId: string, userId: string): Promise<WorkspaceGroup[]> {
    return query<WorkspaceGroup>(
      this.db,
      `SELECT g.id, g.workspace_id, g.name, g.group_type, g.description,
              g.created_by_id, g.meta_json, g.created_at
       FROM core_workspace_groups g
       JOIN core_workspace_group_members m ON m.group_id = g.id
       WHERE g.workspace_id = ? AND m.user_id = ?
       ORDER BY g.name`,
      [workspaceId, userId],
    );
  }
}
