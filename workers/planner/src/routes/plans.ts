// ─── /pl/plans routes ─────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated, unauthorized } from '../../../shared/src/response';
import { parsePagination, readJson } from '../../../shared/src/validate';
import type { PlannerEnv } from '../env';
import { PlanRepo } from '../repositories/plan.repo';
import { validatePlanCreate, validatePlanPatch } from '../schemas/plan.schema';
import { actorRef } from '../auth';


export function planRoutes(router: Router<PlannerEnv>) {

  // GET /pl/plans — plans owned by the authenticated user
  router.get('/pl/plans', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new PlanRepo(env.DB_PL).list(actorRef(req), parsePagination(url)),
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

  // POST /pl/plans — create a plan owned by the authenticated user
  router.post('/pl/plans', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const merged = {
      ...(body && typeof body === 'object' ? (body as Record<string, unknown>) : {}),
      core_user_ref: user,
    };
    const result = validatePlanCreate(merged);
    if ('error' in result) return badRequest(result.error);
    return created(await new PlanRepo(env.DB_PL).create(result.data));
  });

  // PATCH /pl/plans/:id — update plan fields
  router.patch('/pl/plans/:id', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validatePlanPatch(body);
    if ('error' in result) return badRequest(result.error);
    const row = await new PlanRepo(env.DB_PL).patch(id, result.data);
    return row ? ok(row) : notFound(`plan ${id}`);
  });

  // PATCH /pl/plans/:id/status — shortcut for a status change
  router.patch('/pl/plans/:id/status', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validatePlanPatch({ status: (body as Record<string, unknown>)?.['status'] });
    if ('error' in result) return badRequest(result.error);
    if (result.data.status === undefined) return badRequest('status required');
    const row = await new PlanRepo(env.DB_PL).setStatus(id, result.data.status);
    return row ? ok(row) : notFound(`plan ${id}`);
  });
}
