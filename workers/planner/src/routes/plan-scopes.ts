// ─── /pl plan-scope routes — domain scoping for a plan ───────────────────────
// A scope binds a plan to domain content (Quran range, Arabic class, WV node,
// CM document) via a typed cross-module resource_ref.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest } from '../../../shared/src/response';
import type { PlannerEnv } from '../env';
import { PlanScopeRepo } from '../repositories/plan-scope.repo';
import { validatePlanScopeCreate, validatePlanScopePatch } from '../schemas/plan-scope.schema';

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function planScopeRoutes(router: Router<PlannerEnv>) {

  // GET /pl/plans/:id/scopes — scopes for a plan
  router.get('/pl/plans/:id/scopes', async (_req, env, { id }) => {
    return ok(await new PlanScopeRepo(env.DB_PL).list(id));
  });

  // POST /pl/plans/:id/scopes — add a scope to a plan
  router.post('/pl/plans/:id/scopes', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const merged = {
      ...(body && typeof body === 'object' ? (body as Record<string, unknown>) : {}),
      plan_id: id,
    };
    const result = validatePlanScopeCreate(merged);
    if ('error' in result) return badRequest(result.error);
    return created(await new PlanScopeRepo(env.DB_PL).create(result.data));
  });

  // GET /pl/scopes/:id
  router.get('/pl/scopes/:id', async (_req, env, { id }) => {
    const row = await new PlanScopeRepo(env.DB_PL).findById(id);
    return row ? ok(row) : notFound(`scope ${id}`);
  });

  // PATCH /pl/scopes/:id/progress — update completed unit count
  router.patch('/pl/scopes/:id/progress', async (req, env, { id }) => {
    const body = await readJson(req);
    const completed = Number((body as Record<string, unknown>)?.['completed_units']);
    if (!Number.isInteger(completed) || completed < 0) {
      return badRequest('completed_units must be a non-negative integer');
    }
    const row = await new PlanScopeRepo(env.DB_PL).updateProgress(id, completed);
    return row ? ok(row) : notFound(`scope ${id}`);
  });

  // PATCH /pl/scopes/:id — update scope fields
  router.patch('/pl/scopes/:id', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validatePlanScopePatch(body);
    if ('error' in result) return badRequest(result.error);
    const row = await new PlanScopeRepo(env.DB_PL).patch(id, result.data);
    return row ? ok(row) : notFound(`scope ${id}`);
  });
}
