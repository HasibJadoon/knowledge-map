// ─── /core/workspaces/:id/roles routes — workspace role management ────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, noContent, notFound } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { WorkspaceRoleRepo } from '../repositories/workspace-role.repo';
import { ActivityRepo } from '../repositories/activity.repo';
import { readJsonObject } from '../../../shared/src/validate';


/** Best-effort activity log — never let an audit write break the action. */
async function logEvent(
  env: CoreEnv,
  workspaceId: string,
  actor: string,
  eventType: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await new ActivityRepo(env.DB_CORE).log({
      workspaceId,
      actorUserRef: actor,
      eventType,
      resourceRef: workspaceId,
      resourceType: 'workspace_role',
      payloadJson: payload ? JSON.stringify(payload) : undefined,
    });
  } catch {
    /* audit logging is non-critical */
  }
}

export function workspaceRoleRoutes(router: Router<CoreEnv>) {

  // GET /core/workspaces/:id/roles — roles defined in a workspace
  router.get('/core/workspaces/:id/roles', async (_req, env, { id }) => {
    return ok(await new WorkspaceRoleRepo(env.DB_CORE).list(id));
  });

  // POST /core/workspaces/:id/roles — define a role
  router.post('/core/workspaces/:id/roles', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJsonObject(req);
    if (!body) return badRequest('Request body must be a JSON object');
    const roleKey = typeof body['role_key'] === 'string' ? body['role_key'].trim() : '';
    const title = typeof body['title'] === 'string' ? body['title'].trim() : '';
    if (!roleKey) return badRequest('role_key is required');
    if (!title) return badRequest('title is required');
    const permissionsJson = typeof body['permissions_json'] === 'string'
      ? body['permissions_json']
      : undefined;
    const role = await new WorkspaceRoleRepo(env.DB_CORE).create({
      workspaceId: id,
      roleKey,
      title,
      permissionsJson,
    });
    await logEvent(env, id, ctx.userId, 'role.created', { role_key: roleKey, title });
    return created(role);
  });

  // PATCH /core/workspaces/:id/roles/:roleId — update role permissions
  router.patch('/core/workspaces/:id/roles/:roleId', async (req, env, { id, roleId }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJsonObject(req);
    if (!body || typeof body['permissions_json'] !== 'string') {
      return badRequest('permissions_json (a JSON string) is required');
    }
    const repo = new WorkspaceRoleRepo(env.DB_CORE);
    if (!(await repo.findById(roleId))) return notFound(`role ${roleId}`);
    await repo.updatePermissions(roleId, body['permissions_json']);
    await logEvent(env, id, ctx.userId, 'role.permissions_updated', { role_id: roleId });
    return ok(await repo.findById(roleId));
  });

  // DELETE /core/workspaces/:id/roles/:roleId
  router.delete('/core/workspaces/:id/roles/:roleId', async (req, env, { id, roleId }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    await new WorkspaceRoleRepo(env.DB_CORE).delete(roleId);
    await logEvent(env, id, ctx.userId, 'role.deleted', { role_id: roleId });
    return noContent();
  });

  // GET /core/workspaces/:id/members/:memberId/roles — a member's effective roles
  router.get('/core/workspaces/:id/members/:memberId/roles', async (_req, env, { memberId }) => {
    return ok(await new WorkspaceRoleRepo(env.DB_CORE).memberRolesFull(memberId));
  });

  // POST /core/workspaces/:id/members/:memberId/roles — assign a role to a member
  router.post('/core/workspaces/:id/members/:memberId/roles', async (req, env, { id, memberId }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJsonObject(req);
    const roleId = body && typeof body['role_id'] === 'string' ? body['role_id'] : '';
    if (!roleId) return badRequest('role_id is required');
    const assignment = await new WorkspaceRoleRepo(env.DB_CORE).assignToMember({
      memberId,
      roleId,
      grantedBy: ctx.userId,
    });
    await logEvent(env, id, ctx.userId, 'role.assigned', { member_id: memberId, role_id: roleId });
    return created(assignment);
  });

  // DELETE /core/workspaces/:id/members/:memberId/roles/:roleId — revoke a role
  router.delete(
    '/core/workspaces/:id/members/:memberId/roles/:roleId',
    async (req, env, { id, memberId, roleId }) => {
      const ctx = await requireAuth(req, env.JWT_SECRET);
      if (ctx instanceof Response) return ctx;
      await new WorkspaceRoleRepo(env.DB_CORE).revokeFromMember(memberId, roleId);
      await logEvent(env, id, ctx.userId, 'role.revoked', { member_id: memberId, role_id: roleId });
      return noContent();
    },
  );
}
