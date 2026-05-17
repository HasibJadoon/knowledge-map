// ─── /core/workspaces routes ──────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { CoreEnv } from '../env';
import { WorkspaceRepo } from '../repositories/workspace.repo';
import { validateWorkspaceCreate } from '../schemas/workspace.schema';

/**
 * Resolve the acting user. Authentication is currently disabled, so the
 * gateway-injected X-KM-User-Id header is used when present, otherwise a
 * shared local identity is assumed.
 */
function currentUser(req: Request): string {
  return req.headers.get('X-KM-User-Id') ?? 'CORE:local';
}

export function workspaceRoutes(router: Router<CoreEnv>) {

  // GET /core/workspaces/mine — workspaces for the acting user
  router.get('/core/workspaces/mine', async (req, env) => {
    return paginated(
      await new WorkspaceRepo(env.DB_CORE).byUser(
        currentUser(req),
        parsePagination(new URL(req.url)),
      ),
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
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const result = validateWorkspaceCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new WorkspaceRepo(env.DB_CORE).create(result.data, currentUser(req)));
  });
}
