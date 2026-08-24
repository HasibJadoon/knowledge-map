// ─── /pl/lanes routes — Kanban lane management ────────────────────────────────
// Custom kanban columns per plan. Default status lanes (pending / in_progress /
// done / skipped) are virtual; this route manages user-defined custom lanes.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest } from '../../../shared/src/response';
import type { PlannerEnv } from '../env';
import { LaneRepo } from '../repositories/lane.repo';
import { validateLaneCreate } from '../schemas/lane.schema';
import { readJson } from '../../../shared/src/validate';


export function laneRoutes(router: Router<PlannerEnv>) {

  // GET /pl/plans/:id/lanes — all lanes for a plan, ordered
  router.get('/pl/plans/:id/lanes', async (_req, env, { id }) => {
    return ok(await new LaneRepo(env.DB_PL).byPlan(id));
  });

  // POST /pl/plans/:id/lanes — add a lane to a plan
  router.post('/pl/plans/:id/lanes', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const merged = {
      ...(body && typeof body === 'object' ? (body as Record<string, unknown>) : {}),
      plan_id: id,
    };
    const result = validateLaneCreate(merged);
    if ('error' in result) return badRequest(result.error);
    return created(await new LaneRepo(env.DB_PL).create(result.data));
  });

  // PATCH /pl/plans/:id/lanes/reorder — reorder lanes by ordered ID array
  router.patch('/pl/plans/:id/lanes/reorder', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const ids = (body as Record<string, unknown>)?.['ids'];
    if (!Array.isArray(ids) || !ids.every((v) => typeof v === 'string')) {
      return badRequest('ids must be an array of lane ids');
    }
    await new LaneRepo(env.DB_PL).reorder(id, ids as string[]);
    return ok({ reordered: true, plan_id: id });
  });

  // GET /pl/lanes/:id
  router.get('/pl/lanes/:id', async (_req, env, { id }) => {
    const row = await new LaneRepo(env.DB_PL).findById(id);
    return row ? ok(row) : notFound(`lane ${id}`);
  });
}
