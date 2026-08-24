// ─── /pl/calendar routes — calendar entries & time-blocking ──────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated, unauthorized } from '../../../shared/src/response';
import { parsePagination, readJson } from '../../../shared/src/validate';
import type { PlannerEnv } from '../env';
import { CalendarRepo } from '../repositories/calendar.repo';
import { validateCalendarEntryCreate, validateCalendarEntryPatch } from '../schemas/calendar.schema';
import { actorRef } from '../auth';


function isoOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function calendarRoutes(router: Router<PlannerEnv>) {

  // GET /pl/calendar?start=ISO&end=ISO — entries in a window for the user
  router.get('/pl/calendar', async (req, env) => {
    const url = new URL(req.url);
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const start = url.searchParams.get('start') ?? isoOffset(-31);
    const end = url.searchParams.get('end') ?? isoOffset(93);
    return ok(await new CalendarRepo(env.DB_PL).list(user, start, end));
  });

  // GET /pl/plans/:id/calendar — entries attached to a plan
  router.get('/pl/plans/:id/calendar', async (req, env, { id }) => {
    return paginated(
      await new CalendarRepo(env.DB_PL).forPlan(id, parsePagination(new URL(req.url))),
    );
  });

  // GET /pl/calendar/:id
  router.get('/pl/calendar/:id', async (_req, env, { id }) => {
    const row = await new CalendarRepo(env.DB_PL).findById(id);
    return row ? ok(row) : notFound(`calendar entry ${id}`);
  });

  // POST /pl/calendar — create an entry for the authenticated user
  router.post('/pl/calendar', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const merged = {
      ...(body && typeof body === 'object' ? (body as Record<string, unknown>) : {}),
      core_user_ref: user,
    };
    const result = validateCalendarEntryCreate(merged);
    if ('error' in result) return badRequest(result.error);
    return created(await new CalendarRepo(env.DB_PL).create(result.data));
  });

  // PATCH /pl/calendar/:id/complete — mark an entry done
  router.patch('/pl/calendar/:id/complete', async (_req, env, { id }) => {
    const row = await new CalendarRepo(env.DB_PL).complete(id);
    return row ? ok(row) : notFound(`calendar entry ${id}`);
  });

  // PATCH /pl/calendar/:id — update entry fields
  router.patch('/pl/calendar/:id', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validateCalendarEntryPatch(body);
    if ('error' in result) return badRequest(result.error);
    const row = await new CalendarRepo(env.DB_PL).patch(id, result.data);
    return row ? ok(row) : notFound(`calendar entry ${id}`);
  });
}
