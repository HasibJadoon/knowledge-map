// ─── /al/nahw routes ──────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { NahwRepo } from '../repositories/nahw.repo';

export function nahwRoutes(router: Router<ArLinguisticsEnv>) {

  // GET /al/nahw?category=syntax — all nahw concepts, optionally filtered
  router.get('/al/nahw', async (req, env) => {
    const url = new URL(req.url);
    const category = url.searchParams.get('category') ?? undefined;
    return paginated(await new NahwRepo(env.DB_AL).list(category, parsePagination(url)));
  });

  // GET /al/nahw/:id
  router.get('/al/nahw/:id', async (_req, env, { id }) => {
    const concept = await new NahwRepo(env.DB_AL).findById(id);
    return concept ? ok(concept) : notFound(`nahw concept ${id}`);
  });

  // GET /al/nahw/:id/children — child concepts
  router.get('/al/nahw/:id/children', async (_req, env, { id }) => {
    return ok(await new NahwRepo(env.DB_AL).children(id));
  });

  // GET /al/nahw/key/:key — lookup by canonical key (e.g. 'mubtada')
  router.get('/al/nahw/key/:key', async (_req, env, { key }) => {
    const concept = await new NahwRepo(env.DB_AL).findByKey(key);
    return concept ? ok(concept) : notFound(`nahw key ${key}`);
  });
}
