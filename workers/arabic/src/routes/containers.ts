// ─── /ar/containers routes ────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { ContainerRepo } from '../repositories/container.repo';

export function containerRoutes(router: Router<ArabicEnv>) {

  // GET /ar/containers?type=course
  router.get('/ar/containers', async (req, env) => {
    const url  = new URL(req.url);
    return paginated(
      await new ContainerRepo(env.DB_AR).list(
        url.searchParams.get('type'), parsePagination(url),
      ),
    );
  });

  // GET /ar/containers/:id
  router.get('/ar/containers/:id', async (_req, env, { id }) => {
    const row = await new ContainerRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`container ${id}`);
  });

  // GET /ar/containers/:id/children
  router.get('/ar/containers/:id/children', async (_req, env, { id }) => {
    return ok(await new ContainerRepo(env.DB_AR).children(id));
  });

  // POST /ar/containers
  router.post('/ar/containers', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title || !b.container_type)
      return badRequest('title and container_type required');
    return created(await new ContainerRepo(env.DB_AR).create({
      title:          String(b.title),
      container_type: String(b.container_type),
      parent_id:      (b.parent_id as string | null) ?? null,
      sort_order:     typeof b.sort_order === 'number' ? b.sort_order : 0,
    }));
  });

  // PATCH /ar/containers/:id
  router.patch('/ar/containers/:id', async (req, env, { id }) => {
    const b   = await req.json() as Record<string, unknown>;
    const row = await new ContainerRepo(env.DB_AR).update(id, {
      title:      b.title      !== undefined ? String(b.title)  : undefined,
      status:     b.status     !== undefined ? String(b.status) : undefined,
      sort_order: typeof b.sort_order === 'number' ? b.sort_order : undefined,
    });
    return row ? ok(row) : notFound(`container ${id}`);
  });
}
