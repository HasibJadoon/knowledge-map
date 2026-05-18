// ─── /pl/goals routes — goals, snapshots & streaks ───────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated, unauthorized } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { PlannerEnv } from '../env';
import { GoalRepo } from '../repositories/goal.repo';
import { validateGoalCreate, validateGoalPatch, validateGoalSnapshotAdd } from '../schemas/goal.schema';
import { actorRef } from '../auth';

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function goalRoutes(router: Router<PlannerEnv>) {

  // GET /pl/goals — goals owned by the authenticated user
  router.get('/pl/goals', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    return paginated(
      await new GoalRepo(env.DB_PL).list(user, parsePagination(new URL(req.url))),
    );
  });

  // GET /pl/streaks?plan=PL:ULID — streaks for the authenticated user
  router.get('/pl/streaks', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const plan = new URL(req.url).searchParams.get('plan');
    return ok(await new GoalRepo(env.DB_PL).streaks(user, plan));
  });

  // GET /pl/goals/:id
  router.get('/pl/goals/:id', async (_req, env, { id }) => {
    const row = await new GoalRepo(env.DB_PL).findById(id);
    return row ? ok(row) : notFound(`goal ${id}`);
  });

  // GET /pl/goals/:id/snapshots
  router.get('/pl/goals/:id/snapshots', async (_req, env, { id }) => {
    return ok(await new GoalRepo(env.DB_PL).snapshots(id));
  });

  // POST /pl/goals — create a goal owned by the authenticated user
  router.post('/pl/goals', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const merged = {
      ...(body && typeof body === 'object' ? (body as Record<string, unknown>) : {}),
      core_user_ref: user,
    };
    const result = validateGoalCreate(merged);
    if ('error' in result) return badRequest(result.error);
    return created(await new GoalRepo(env.DB_PL).create(result.data));
  });

  // POST /pl/goals/:id/snapshots — record a progress snapshot
  router.post('/pl/goals/:id/snapshots', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validateGoalSnapshotAdd(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new GoalRepo(env.DB_PL).addSnapshot(id, result.data.value, result.data.note));
  });

  // PATCH /pl/goals/:id/value — shortcut for a current-value update
  router.patch('/pl/goals/:id/value', async (req, env, { id }) => {
    const body = await readJson(req);
    const value = Number((body as Record<string, unknown>)?.['value']);
    if (!Number.isFinite(value)) return badRequest('value must be a number');
    const row = await new GoalRepo(env.DB_PL).updateValue(id, value);
    return row ? ok(row) : notFound(`goal ${id}`);
  });

  // PATCH /pl/goals/:id — update goal fields
  router.patch('/pl/goals/:id', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validateGoalPatch(body);
    if ('error' in result) return badRequest(result.error);
    const row = await new GoalRepo(env.DB_PL).patch(id, result.data);
    return row ? ok(row) : notFound(`goal ${id}`);
  });
}
