// ─── /pl/tasks routes ─────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { PlannerEnv } from '../env';
import { TaskRepo } from '../repositories/task.repo';
import { validateTaskCreate, validateTaskPatch } from '../schemas/task.schema';

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function taskRoutes(router: Router<PlannerEnv>) {

  // GET /pl/tasks?status=pending&plan=PL:ULID&due_before=YYYY-MM-DD
  router.get('/pl/tasks', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new TaskRepo(env.DB_PL).list(
        {
          status: url.searchParams.get('status'),
          planId: url.searchParams.get('plan'),
          dueBefore: url.searchParams.get('due_before'),
        },
        parsePagination(url),
      ),
    );
  });

  // GET /pl/tasks/:id
  router.get('/pl/tasks/:id', async (_req, env, { id }) => {
    const row = await new TaskRepo(env.DB_PL).findById(id);
    return row ? ok(row) : notFound(`task ${id}`);
  });

  // POST /pl/tasks — create a new task under a plan
  router.post('/pl/tasks', async (req, env) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validateTaskCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new TaskRepo(env.DB_PL).create(result.data));
  });

  // PATCH /pl/tasks/:id/complete
  router.patch('/pl/tasks/:id/complete', async (_req, env, { id }) => {
    const row = await new TaskRepo(env.DB_PL).complete(id);
    return row ? ok(row) : notFound(`task ${id}`);
  });

  // PATCH /pl/tasks/:id — update any task field
  router.patch('/pl/tasks/:id', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validateTaskPatch(body);
    if ('error' in result) return badRequest(result.error);
    const row = await new TaskRepo(env.DB_PL).patch(id, result.data);
    return row ? ok(row) : notFound(`task ${id}`);
  });
}
