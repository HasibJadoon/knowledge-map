// ─── /pl/sessions routes — study / execution session logs ────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated, unauthorized } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { PlannerEnv } from '../env';
import { SessionRepo } from '../repositories/session.repo';
import { validateSessionCreate, validateSessionComplete } from '../schemas/session.schema';
import { actorRef } from '../auth';

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function sessionRoutes(router: Router<PlannerEnv>) {

  // GET /pl/sessions?plan=PL:ULID — sessions for the authenticated user
  router.get('/pl/sessions', async (req, env) => {
    const url = new URL(req.url);
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    return paginated(
      await new SessionRepo(env.DB_PL).list(url.searchParams.get('plan'), user, parsePagination(url)),
    );
  });

  // GET /pl/sessions/:id
  router.get('/pl/sessions/:id', async (_req, env, { id }) => {
    const row = await new SessionRepo(env.DB_PL).findById(id);
    return row ? ok(row) : notFound(`session ${id}`);
  });

  // POST /pl/sessions — open a session for the authenticated user
  router.post('/pl/sessions', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const merged = {
      ...(body && typeof body === 'object' ? (body as Record<string, unknown>) : {}),
      core_user_ref: user,
    };
    const result = validateSessionCreate(merged);
    if ('error' in result) return badRequest(result.error);
    return created(await new SessionRepo(env.DB_PL).create(result.data));
  });

  // PATCH /pl/sessions/:id/complete — close a session with duration & rating
  router.patch('/pl/sessions/:id/complete', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validateSessionComplete(body);
    if ('error' in result) return badRequest(result.error);
    const row = await new SessionRepo(env.DB_PL).complete(
      id,
      result.data.duration_mins,
      result.data.rating ?? null,
      result.data.notes_md,
    );
    return row ? ok(row) : notFound(`session ${id}`);
  });
}
