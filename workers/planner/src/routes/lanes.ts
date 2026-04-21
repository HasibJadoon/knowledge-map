// ─── /pl/lanes routes — Kanban lane management ────────────────────────────────
// Custom kanban columns per plan. Default status lanes (pending / in_progress /
// done / skipped) are virtual; this route manages user-defined custom lanes.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest } from '../../../shared/src/response';
import type { PlannerEnv } from '../env';
import { LaneRepo } from '../repositories/lane.repo';

export function laneRoutes(router: Router<PlannerEnv>) {

  // GET /pl/plans/:id/lanes — all lanes for a plan, ordered
  router.get('/pl/plans/:id/lanes', async (_req, env, { id }) => {
    return ok(await new LaneRepo(env.DB_PL).byPlan(id));
  });

  // POST /pl/plans/:id/lanes — add a lane to a plan
  router.post('/pl/plans/:id/lanes', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.label || b.lane_order === undefined)
      return badRequest('label and lane_order required');
    return created(await new LaneRepo(env.DB_PL).create({
      plan_id:        id,
      label:          String(b.label),
      lane_order:     Number(b.lane_order),
      color:          (b.color          as string | null) ?? null,
      maps_to_status: (b.maps_to_status as string | null) ?? null,
    }));
  });

  // PATCH /pl/plans/:id/lanes/reorder — reorder lanes by providing ordered ID array
  router.patch('/pl/plans/:id/lanes/reorder', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    if (!Array.isArray(b.ids)) return badRequest('ids array required');
    await new LaneRepo(env.DB_PL).reorder(id, b.ids as string[]);
    return ok({ reordered: true, plan_id: id });
  });

  // GET /pl/lanes/:id
  router.get('/pl/lanes/:id', async (_req, env, { id }) => {
    const row = await new LaneRepo(env.DB_PL).findById(id);
    return row ? ok(row) : notFound(`lane ${id}`);
  });
}
