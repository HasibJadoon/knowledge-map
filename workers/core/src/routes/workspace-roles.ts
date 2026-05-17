// ─── /core/workspaces/:id/roles routes — workspace role management ────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, noContent, notFound } from '../../../shared/src/response';
import type { CoreEnv } from '../env';
import { WorkspaceRoleRepo } from '../repositories/workspace-role.repo';

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function workspaceRoleRoutes(router: Router<CoreEnv>) {

  // GET /core/workspaces/:id/roles — roles defined in a workspace
  router.get('/core/workspaces/:id/roles', async (_req, env, { id }) => {
    return ok(await new WorkspaceRoleRepo(env.DB_CORE).list(id));
  });

  // POST /core/workspaces/:id/roles — define a role
  router.post('/core/workspaces/:id/roles', async (req, env, { id }) => {
    const body = await readJson(req);
    if (!body) return badRequest('Request body must be a JSON object');
    const roleKey = typeof body['role_key'] === 'string' ? body['role_key'].trim() : '';
    const title = typeof body['title'] === 'string' ? body['title'].trim() : '';
    if (!roleKey) return badRequest('role_key is required');
    if (!title) return badRequest('title is required');
    const permissionsJson = typeof body['permissions_json'] === 'string'
      ? body['permissions_json']
      : undefined;
    return created(
      await new WorkspaceRoleRepo(env.DB_CORE).create({
        workspaceId: id,
        roleKey,
        title,
        permissionsJson,
      }),
    );
  });

  // PATCH /core/workspaces/:id/roles/:roleId — update role permissions
  router.patch('/core/workspaces/:id/roles/:roleId', async (req, env, { roleId }) => {
    const body = await readJson(req);
    if (!body || typeof body['permissions_json'] !== 'string') {
      return badRequest('permissions_json (a JSON string) is required');
    }
    const repo = new WorkspaceRoleRepo(env.DB_CORE);
    if (!(await repo.findById(roleId))) return notFound(`role ${roleId}`);
    await repo.updatePermissions(roleId, body['permissions_json']);
    return ok(await repo.findById(roleId));
  });

  // DELETE /core/workspaces/:id/roles/:roleId
  router.delete('/core/workspaces/:id/roles/:roleId', async (_req, env, { roleId }) => {
    await new WorkspaceRoleRepo(env.DB_CORE).delete(roleId);
    return noContent();
  });

  // GET /core/workspaces/:id/members/:memberId/roles — a member's effective roles
  router.get('/core/workspaces/:id/members/:memberId/roles', async (_req, env, { memberId }) => {
    return ok(await new WorkspaceRoleRepo(env.DB_CORE).memberRolesFull(memberId));
  });

  // POST /core/workspaces/:id/members/:memberId/roles — assign a role to a member
  router.post('/core/workspaces/:id/members/:memberId/roles', async (req, env, { memberId }) => {
    const body = await readJson(req);
    const roleId = body && typeof body['role_id'] === 'string' ? body['role_id'] : '';
    if (!roleId) return badRequest('role_id is required');
    return created(
      await new WorkspaceRoleRepo(env.DB_CORE).assignToMember({ memberId, roleId }),
    );
  });

  // DELETE /core/workspaces/:id/members/:memberId/roles/:roleId — revoke a role
  router.delete(
    '/core/workspaces/:id/members/:memberId/roles/:roleId',
    async (_req, env, { memberId, roleId }) => {
      await new WorkspaceRoleRepo(env.DB_CORE).revokeFromMember(memberId, roleId);
      return noContent();
    },
  );
}
