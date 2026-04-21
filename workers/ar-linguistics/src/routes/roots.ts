// ─── /al/roots routes ─────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { RootRepo } from '../repositories/root.repo';
import { validateRootCreate } from '../schemas/root.schema';

export function rootRoutes(router: Router<ArLinguisticsEnv>) {

  // GET /al/roots?page=1&per_page=20
  router.get('/al/roots', async (req, env) => {
    return paginated(await new RootRepo(env.DB_AL).list(parsePagination(new URL(req.url))));
  });

  // GET /al/roots/search?q=كتب
  router.get('/al/roots/search', async (req, env) => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    if (!q) return badRequest('q param required');
    return paginated(await new RootRepo(env.DB_AL).search(q, parsePagination(url)));
  });

  // GET /al/roots/:id
  router.get('/al/roots/:id', async (_req, env, { id }) => {
    const root = await new RootRepo(env.DB_AL).findById(id);
    return root ? ok(root) : notFound(`root ${id}`);
  });

  // POST /al/roots — admin
  router.post('/al/roots', async (req, env) => {
    const body = await req.json();
    const result = validateRootCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new RootRepo(env.DB_AL).create(result.data));
  });
}
