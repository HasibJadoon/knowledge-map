// ─── /core/workspaces routes ──────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import {
  ok, notFound, created, badRequest, forbidden, conflict, noContent, paginated,
} from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { requireAuth, requireAdmin } from '../../../shared/src/auth';
import type { AuthContext } from '../../../shared/src/types';
import type { CoreEnv } from '../env';
import { WorkspaceRepo } from '../repositories/workspace.repo';
import { UserRepo } from '../repositories/user.repo';
import { ActivityRepo } from '../repositories/activity.repo';
import { validateWorkspaceCreate, validateWorkspacePatch } from '../schemas/workspace.schema';

const MEMBERSHIP_ROLES = ['owner', 'admin', 'member', 'guest'];
const MEMBER_STATUSES = ['active', 'invited', 'suspended'];

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
      resourceType: 'workspace',
      payloadJson: payload ? JSON.stringify(payload) : undefined,
    });
  } catch {
    /* audit logging is non-critical */
  }
}

export function workspaceRoutes(router: Router<CoreEnv>) {

  // GET /core/workspaces/mine — workspaces for the authenticated user
  router.get('/core/workspaces/mine', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return paginated(
      await new WorkspaceRepo(env.DB_CORE).byUser(ctx.userId, parsePagination(new URL(req.url))),
    );
  });

  // GET /core/workspaces — every workspace (admin only)
  router.get('/core/workspaces', async (req, env) => {
    const ctx = await requireAdmin(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return paginated(
      await new WorkspaceRepo(env.DB_CORE).listAll(parsePagination(new URL(req.url))),
    );
  });

  // GET /core/workspaces/:id
  router.get('/core/workspaces/:id', async (_req, env, { id }) => {
    const ws = await new WorkspaceRepo(env.DB_CORE).findById(id);
    return ws ? ok(ws) : notFound(`workspace ${id}`);
  });

  // GET /core/workspaces/slug/:slug
  router.get('/core/workspaces/slug/:slug', async (_req, env, { slug }) => {
    const ws = await new WorkspaceRepo(env.DB_CORE).findBySlug(slug);
    return ws ? ok(ws) : notFound(`workspace ${slug}`);
  });

  // GET /core/workspaces/:id/members
  router.get('/core/workspaces/:id/members', async (_req, env, { id }) => {
    return ok(await new WorkspaceRepo(env.DB_CORE).members(id));
  });

  // POST /core/workspaces — create a workspace
  router.post('/core/workspaces', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const body = await readJson(req);
    if (!body) return badRequest('Request body must be a JSON object');
    const result = validateWorkspaceCreate(body);
    if ('error' in result) return badRequest(result.error);
    const ws = await new WorkspaceRepo(env.DB_CORE).create(result.data, ctx.userId);
    await logEvent(env, ws.id, ctx.userId, 'workspace.created', { title: ws.title });
    return created(ws);
  });

  // PATCH /core/workspaces/:id — update / archive a workspace (admin or owner)
  router.patch('/core/workspaces/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new WorkspaceRepo(env.DB_CORE);
    const ws = await repo.findById(id);
    if (!ws) return notFound(`workspace ${id}`);
    if (!canManage(ctx, ws.owner_id)) return forbidden('Admin or workspace owner required');

    const body = await readJson(req);
    if (!body) return badRequest('Request body must be a JSON object');
    const result = validateWorkspacePatch(body);
    if ('error' in result) return badRequest(result.error);

    const updated = await repo.update(id, result.data);
    await logEvent(env, id, ctx.userId, 'workspace.updated', result.data as Record<string, unknown>);
    return ok(updated);
  });

  // POST /core/workspaces/:id/members — add a member (admin or owner)
  router.post('/core/workspaces/:id/members', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const wsRepo = new WorkspaceRepo(env.DB_CORE);
    const ws = await wsRepo.findById(id);
    if (!ws) return notFound(`workspace ${id}`);
    if (!canManage(ctx, ws.owner_id)) return forbidden('Admin or workspace owner required');

    const body = await readJson(req);
    if (!body) return badRequest('Request body must be a JSON object');

    const userRepo = new UserRepo(env.DB_CORE);
    let userId = typeof body['user_id'] === 'string' ? body['user_id'].trim() : '';
    if (!userId && typeof body['email'] === 'string' && body['email'].trim()) {
      const user = await userRepo.findByEmail(body['email'].trim());
      if (!user) return notFound(`user ${body['email']}`);
      userId = user.id;
    }
    if (!userId) return badRequest('user_id or email is required');
    if (!(await userRepo.findById(userId))) return notFound(`user ${userId}`);

    const role = typeof body['membership_role'] === 'string' ? body['membership_role'] : 'member';
    if (!MEMBERSHIP_ROLES.includes(role)) {
      return badRequest(`membership_role must be one of: ${MEMBERSHIP_ROLES.join(', ')}`);
    }
    if (await wsRepo.findMemberByUser(id, userId)) {
      return conflict('That user is already a member of this workspace');
    }

    const member = await wsRepo.addMember(id, userId, role, ctx.userId);
    await logEvent(env, id, ctx.userId, 'member.added', { user_id: userId, role });
    return created(member);
  });

  // PATCH /core/workspaces/:id/members/:memberId — change role / status
  router.patch('/core/workspaces/:id/members/:memberId', async (req, env, { id, memberId }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new WorkspaceRepo(env.DB_CORE);
    const ws = await repo.findById(id);
    if (!ws) return notFound(`workspace ${id}`);
    if (!canManage(ctx, ws.owner_id)) return forbidden('Admin or workspace owner required');
    if (!(await repo.findMemberById(memberId))) return notFound(`member ${memberId}`);

    const body = await readJson(req);
    if (!body) return badRequest('Request body must be a JSON object');
    const patch: { membership_role?: string; status?: string } = {};
    if (body['membership_role'] !== undefined) {
      const role = body['membership_role'];
      if (typeof role !== 'string' || !MEMBERSHIP_ROLES.includes(role)) {
        return badRequest(`membership_role must be one of: ${MEMBERSHIP_ROLES.join(', ')}`);
      }
      patch.membership_role = role;
    }
    if (body['status'] !== undefined) {
      const status = body['status'];
      if (typeof status !== 'string' || !MEMBER_STATUSES.includes(status)) {
        return badRequest(`status must be one of: ${MEMBER_STATUSES.join(', ')}`);
      }
      patch.status = status;
    }
    if (Object.keys(patch).length === 0) return badRequest('At least one field is required');

    const member = await repo.updateMember(memberId, patch);
    await logEvent(env, id, ctx.userId, 'member.updated', { member_id: memberId, ...patch });
    return ok(member);
  });

  // DELETE /core/workspaces/:id/members/:memberId — remove a member
  router.delete('/core/workspaces/:id/members/:memberId', async (req, env, { id, memberId }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const repo = new WorkspaceRepo(env.DB_CORE);
    const ws = await repo.findById(id);
    if (!ws) return notFound(`workspace ${id}`);
    if (!canManage(ctx, ws.owner_id)) return forbidden('Admin or workspace owner required');
    const member = await repo.findMemberById(memberId);
    if (!member) return notFound(`member ${memberId}`);
    if (member.membership_role === 'owner') {
      return conflict('The workspace owner cannot be removed');
    }

    await repo.removeMember(memberId);
    await logEvent(env, id, ctx.userId, 'member.removed', { member_id: memberId });
    return noContent();
  });
}

function canManage(ctx: AuthContext, ownerId: string): boolean {
  return ctx.isAdmin || ctx.userId === ownerId;
}
