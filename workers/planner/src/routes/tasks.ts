// ─── /pl/tasks routes ─────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { PlannerEnv } from '../env';
import { TaskRepo } from '../repositories/task.repo';

export function taskRoutes(router: Router<PlannerEnv>) {

  // GET /pl/tasks?status=pending&plan=PL:ULID
  router.get('/pl/tasks', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new TaskRepo(env.DB_PL).list(
        {
          status: url.searchParams.get('status'),
          planId: url.searchParams.get('plan'),
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
    const b = await req.json() as Record<string, unknown>;
    if (!b.plan_id || !b.title) return badRequest('plan_id and title required');
    return created(await new TaskRepo(env.DB_PL).create({
      plan_id:      String(b.plan_id),
      title:        String(b.title),
      task_type:    b.task_type  ? String(b.task_type)  : undefined,
      priority:     (b.priority  as string | null) ?? null,
      due_date:     (b.due_date  as string | null) ?? null,
      resource_ref: (b.resource_ref as string | null) ?? null,
    }));
  });

  // PATCH /pl/tasks/:id/complete
  router.patch('/pl/tasks/:id/complete', async (_req, env, { id }) => {
    const row = await new TaskRepo(env.DB_PL).complete(id);
    return row ? ok(row) : notFound(`task ${id}`);
  });

  // PATCH /pl/tasks/:id — update status, priority, due_date, title
  router.patch('/pl/tasks/:id', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    const row = await new TaskRepo(env.DB_PL).patch(id, {
      status:   b.status   as string | undefined,
      priority: b.priority as string | undefined,
      due_date: b.due_date as string | undefined,
      title:    b.title    as string | undefined,
    });
    return row ? ok(row) : notFound(`task ${id}`);
  });
}
