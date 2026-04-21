// ─── WorkspaceRoleRepo — core_workspace_roles + core_workspace_member_roles ───

import { query, queryOne, execute } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface WorkspaceRole {
  id: string;
  workspace_id: string;
  role_key: string;
  title: string;
  permissions_json: string;
  is_system_role: number;
  created_at: string;
}

export interface WorkspaceRoleCreate {
  workspaceId: string;
  roleKey: string;
  title: string;
  permissionsJson?: string;
  isSystemRole?: boolean;
}

export interface WorkspaceMemberRole {
  id: string;
  member_id: string;
  role_id: string;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
}

export interface MemberRoleAssign {
  memberId: string;
  roleId: string;
  grantedBy?: string;
  expiresAt?: string;
}

// ── Column fragments ──────────────────────────────────────────────────────────

const ROLE_COLS = `
  id, workspace_id, role_key, title, permissions_json, is_system_role, created_at
FROM core_workspace_roles`;

const MEMBER_ROLE_COLS = `
  id, member_id, role_id, granted_by, granted_at, expires_at
FROM core_workspace_member_roles`;

// ── Repo ──────────────────────────────────────────────────────────────────────

export class WorkspaceRoleRepo {
  constructor(private db: D1Database) {}

  // ── Roles ──

  list(workspaceId: string): Promise<WorkspaceRole[]> {
    return query<WorkspaceRole>(
      this.db,
      `SELECT ${ROLE_COLS} WHERE workspace_id = ? ORDER BY is_system_role DESC, title`,
      [workspaceId],
    );
  }

  findById(id: string): Promise<WorkspaceRole | null> {
    return queryOne<WorkspaceRole>(
      this.db,
      `SELECT ${ROLE_COLS} WHERE id = ?`,
      [id],
    );
  }

  findByKey(workspaceId: string, roleKey: string): Promise<WorkspaceRole | null> {
    return queryOne<WorkspaceRole>(
      this.db,
      `SELECT ${ROLE_COLS} WHERE workspace_id = ? AND role_key = ?`,
      [workspaceId, roleKey],
    );
  }

  async create(input: WorkspaceRoleCreate): Promise<WorkspaceRole> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_workspace_roles
         (id, workspace_id, role_key, title, permissions_json, is_system_role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.workspaceId,
        input.roleKey,
        input.title,
        input.permissionsJson ?? '{}',
        input.isSystemRole ? 1 : 0,
        now,
      ],
    );
    return (await this.findById(id))!;
  }

  async updatePermissions(id: string, permissionsJson: string): Promise<void> {
    await execute(
      this.db,
      `UPDATE core_workspace_roles SET permissions_json = ? WHERE id = ?`,
      [permissionsJson, id],
    );
  }

  async delete(id: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM core_workspace_member_roles WHERE role_id = ?`,
      [id],
    );
    await execute(this.db, `DELETE FROM core_workspace_roles WHERE id = ?`, [id]);
  }

  // ── Member role assignments ──

  async assignToMember(input: MemberRoleAssign): Promise<WorkspaceMemberRole> {
    const id = typedId('CORE');
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT OR IGNORE INTO core_workspace_member_roles
         (id, member_id, role_id, granted_by, granted_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.memberId,
        input.roleId,
        input.grantedBy ?? null,
        now,
        input.expiresAt ?? null,
      ],
    );
    return (await queryOne<WorkspaceMemberRole>(
      this.db,
      `SELECT ${MEMBER_ROLE_COLS} WHERE member_id = ? AND role_id = ?`,
      [input.memberId, input.roleId],
    ))!;
  }

  async revokeFromMember(memberId: string, roleId: string): Promise<void> {
    await execute(
      this.db,
      `DELETE FROM core_workspace_member_roles WHERE member_id = ? AND role_id = ?`,
      [memberId, roleId],
    );
  }

  memberRoles(memberId: string): Promise<WorkspaceMemberRole[]> {
    return query<WorkspaceMemberRole>(
      this.db,
      `SELECT ${MEMBER_ROLE_COLS} WHERE member_id = ? ORDER BY granted_at`,
      [memberId],
    );
  }

  /** Full role objects for a member (joins roles table). */
  memberRolesFull(memberId: string): Promise<WorkspaceRole[]> {
    return query<WorkspaceRole>(
      this.db,
      `SELECT r.id, r.workspace_id, r.role_key, r.title, r.permissions_json,
              r.is_system_role, r.created_at
       FROM core_workspace_roles r
       JOIN core_workspace_member_roles mr ON mr.role_id = r.id
       WHERE mr.member_id = ?
         AND (mr.expires_at IS NULL OR mr.expires_at > datetime('now'))
       ORDER BY r.title`,
      [memberId],
    );
  }
}
