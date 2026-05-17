// ─── WorkspaceRepo — all SQL for core_workspaces ─────────────────────────────

import { query, queryOne, execute, paginate } from '../../../shared/src/db';
import { typedId } from '../../../shared/src/ulid';
import type { PaginateOptions, PaginatedRows } from '../../../shared/src/types';
import type { Workspace, WorkspaceCreate, WorkspacePatch } from '../schemas/workspace.schema';

/** A workspace row plus its member count, used in list views. */
export interface WorkspaceSummary extends Workspace {
  member_count: number;
}

/** A workspace member joined with the user's display fields. */
export interface WorkspaceMemberRow {
  id: string;
  user_id: string;
  membership_role: string;
  status: string;
  joined_at: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const COLS = `id, slug, title, description_md, workspace_type, owner_id, status,
  allow_guests, allow_public_publish, default_visibility, settings_json,
  meta_json, created_at, updated_at`;

const COLS_W = `w.id, w.slug, w.title, w.description_md, w.workspace_type, w.owner_id,
  w.status, w.allow_guests, w.allow_public_publish, w.default_visibility,
  w.settings_json, w.meta_json, w.created_at, w.updated_at`;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'workspace';
}

export class WorkspaceRepo {
  constructor(private db: D1Database) {}

  findById(id: string): Promise<Workspace | null> {
    return queryOne<Workspace>(this.db, `SELECT ${COLS} FROM core_workspaces WHERE id = ?`, [id]);
  }

  findBySlug(slug: string): Promise<Workspace | null> {
    return queryOne<Workspace>(this.db, `SELECT ${COLS} FROM core_workspaces WHERE slug = ?`, [slug]);
  }

  /** Workspaces the user owns or is a member of, each with a member count. */
  byUser(userId: string, opts: PaginateOptions = {}): Promise<PaginatedRows<WorkspaceSummary>> {
    return paginate<WorkspaceSummary>(
      this.db,
      `SELECT ${COLS_W},
        (SELECT COUNT(*) FROM core_workspace_members mc WHERE mc.workspace_id = w.id) AS member_count
       FROM core_workspaces w
       LEFT JOIN core_workspace_members m ON m.workspace_id = w.id
       WHERE (w.owner_id = ? OR m.user_id = ?) AND w.status = 'active'
       GROUP BY w.id
       ORDER BY w.updated_at DESC`,
      `SELECT COUNT(DISTINCT w.id) AS count
       FROM core_workspaces w
       LEFT JOIN core_workspace_members m ON m.workspace_id = w.id
       WHERE (w.owner_id = ? OR m.user_id = ?) AND w.status = 'active'`,
      [userId, userId],
      opts,
    );
  }

  async create(input: WorkspaceCreate, ownerId: string): Promise<Workspace> {
    const id = typedId('CORE');
    const now = new Date().toISOString();

    let slug = input.slug ?? slugify(input.title);
    if (await this.findBySlug(slug)) slug = `${slug}-${id.slice(-6).toLowerCase()}`;

    await execute(
      this.db,
      `INSERT INTO core_workspaces
         (id, slug, title, description_md, workspace_type, owner_id, status,
          default_visibility, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        id,
        slug,
        input.title,
        input.description_md ?? null,
        input.workspace_type ?? 'personal',
        ownerId,
        input.default_visibility ?? 'workspace',
        now,
        now,
      ],
    );

    // Register the creator as the workspace owner-member.
    await execute(
      this.db,
      `INSERT INTO core_workspace_members
         (id, workspace_id, user_id, membership_role, status, joined_at, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)`,
      [typedId('CORE'), id, ownerId, now, now, now],
    );

    return (await this.findById(id))!;
  }

  /** Every workspace, with member counts — admin-wide listing. */
  listAll(opts: PaginateOptions = {}): Promise<PaginatedRows<WorkspaceSummary>> {
    return paginate<WorkspaceSummary>(
      this.db,
      `SELECT ${COLS_W},
        (SELECT COUNT(*) FROM core_workspace_members mc WHERE mc.workspace_id = w.id) AS member_count
       FROM core_workspaces w
       ORDER BY w.status = 'active' DESC, w.updated_at DESC`,
      `SELECT COUNT(*) AS count FROM core_workspaces`,
      [],
      opts,
    );
  }

  async update(id: string, patch: WorkspacePatch): Promise<Workspace | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.title !== undefined)              { sets.push('title = ?'); vals.push(patch.title); }
    if (patch.description_md !== undefined)     { sets.push('description_md = ?'); vals.push(patch.description_md); }
    if (patch.workspace_type !== undefined)     { sets.push('workspace_type = ?'); vals.push(patch.workspace_type); }
    if (patch.default_visibility !== undefined) { sets.push('default_visibility = ?'); vals.push(patch.default_visibility); }
    if (patch.status !== undefined)             { sets.push('status = ?'); vals.push(patch.status); }
    if (sets.length === 0) return this.findById(id);

    sets.push('updated_at = ?');
    vals.push(new Date().toISOString(), id);
    await execute(this.db, `UPDATE core_workspaces SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  }

  members(workspaceId: string): Promise<WorkspaceMemberRow[]> {
    return query<WorkspaceMemberRow>(
      this.db,
      `SELECT m.id, m.user_id, m.membership_role, m.status, m.joined_at,
              u.display_name, u.email, u.avatar_url
       FROM core_workspace_members m
       LEFT JOIN core_users u ON u.id = m.user_id
       WHERE m.workspace_id = ?
       ORDER BY m.joined_at`,
      [workspaceId],
    );
  }

  // ── Member management ──

  findMemberById(memberId: string): Promise<WorkspaceMemberRow | null> {
    return queryOne<WorkspaceMemberRow>(
      this.db,
      `SELECT m.id, m.user_id, m.membership_role, m.status, m.joined_at,
              u.display_name, u.email, u.avatar_url
       FROM core_workspace_members m
       LEFT JOIN core_users u ON u.id = m.user_id
       WHERE m.id = ?`,
      [memberId],
    );
  }

  findMemberByUser(workspaceId: string, userId: string): Promise<WorkspaceMemberRow | null> {
    return queryOne<WorkspaceMemberRow>(
      this.db,
      `SELECT m.id, m.user_id, m.membership_role, m.status, m.joined_at,
              u.display_name, u.email, u.avatar_url
       FROM core_workspace_members m
       LEFT JOIN core_users u ON u.id = m.user_id
       WHERE m.workspace_id = ? AND m.user_id = ?`,
      [workspaceId, userId],
    );
  }

  async addMember(
    workspaceId: string,
    userId: string,
    membershipRole: string,
    invitedById?: string,
  ): Promise<WorkspaceMemberRow> {
    const now = new Date().toISOString();
    await execute(
      this.db,
      `INSERT INTO core_workspace_members
         (id, workspace_id, user_id, membership_role, status, invited_by_id,
          joined_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
      [typedId('CORE'), workspaceId, userId, membershipRole, invitedById ?? null, now, now, now],
    );
    return (await this.findMemberByUser(workspaceId, userId))!;
  }

  async updateMember(
    memberId: string,
    patch: { membership_role?: string; status?: string },
  ): Promise<WorkspaceMemberRow | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.membership_role !== undefined) { sets.push('membership_role = ?'); vals.push(patch.membership_role); }
    if (patch.status !== undefined)          { sets.push('status = ?'); vals.push(patch.status); }
    if (sets.length === 0) return this.findMemberById(memberId);

    sets.push('updated_at = ?');
    vals.push(new Date().toISOString(), memberId);
    await execute(this.db, `UPDATE core_workspace_members SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findMemberById(memberId);
  }

  async removeMember(memberId: string): Promise<void> {
    await execute(this.db, `DELETE FROM core_workspace_member_roles WHERE member_id = ?`, [memberId]);
    await execute(this.db, `DELETE FROM core_workspace_members WHERE id = ?`, [memberId]);
  }
}
