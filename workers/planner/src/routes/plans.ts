// ─── /pl/plans routes ─────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { PlannerEnv } from '../env';
import { PlanRepo } from '../repositories/plan.repo';

export function planRoutes(router: Router<PlannerEnv>) {

  // GET /pl/plans?workspace=CORE:ULID
  router.get('/pl/plans', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new PlanRepo(env.DB_PL).list(
        url.searchParams.get('workspace'),
        parsePagination(url),
      ),
    );
  });

  // GET /pl/plans/:id
  router.get('/pl/plans/:id', async (_req, env, { id }) => {
    const row = await new PlanRepo(env.DB_PL).findById(id);
    return row ? ok(row) : notFound(`plan ${id}`);
  });

  // GET /pl/plans/:id/tasks
  router.get('/pl/plans/:id/tasks', async (req, env, { id }) => {
    return paginated(
      await new PlanRepo(env.DB_PL).tasks(id, parsePagination(new URL(req.url))),
    );
  });

  // POST /pl/plans
  router.post('/pl/plans', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title) return badRequest('title required');
    return created(await new PlanRepo(env.DB_PL).create({
      title:        String(b.title),
      workspace_id: (b.workspace_id as string | null) ?? null,
      source_ref:   (b.source_ref   as string | null) ?? null,
      target_date:  (b.target_date  as string | null) ?? null,
    }));
  });

  // PATCH /pl/plans/:id/status
  router.patch('/pl/plans/:id/status', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.status) return badRequest('status required');
    const row = await new PlanRepo(env.DB_PL).setStatus(id, String(b.status));
    return row ? ok(row) : notFound(`plan ${id}`);
  });
}
