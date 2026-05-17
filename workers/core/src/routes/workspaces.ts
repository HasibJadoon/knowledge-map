// ─── /core/workspaces routes ──────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { WorkspaceRepo } from '../repositories/workspace.repo';
import { validateWorkspaceCreate } from '../schemas/workspace.schema';

export function workspaceRoutes(router: Router<CoreEnv>) {

  // GET /core/workspaces/mine — workspaces for the authenticated user
  router.get('/core/workspaces/mine', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return paginated(
      await new WorkspaceRepo(env.DB_CORE).byUser(ctx.userId, parsePagination(new URL(req.url))),
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
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const result = validateWorkspaceCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new WorkspaceRepo(env.DB_CORE).create(result.data, ctx.userId));
  });
}
