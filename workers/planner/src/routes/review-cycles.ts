// ─── /pl review-cycle routes — periodic review workflows ─────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { PlannerEnv } from '../env';
import { ReviewCycleRepo } from '../repositories/review-cycle.repo';
import {
  validateReviewCycleCreate,
  validateReviewCyclePatch,
  validateReviewEventCreate,
  validateReviewEventUpdate,
} from '../schemas/review-cycle.schema';

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function reviewCycleRoutes(router: Router<PlannerEnv>) {

  // GET /pl/plans/:id/review-cycles — cycles for a plan
  router.get('/pl/plans/:id/review-cycles', async (req, env, { id }) => {
    return paginated(
      await new ReviewCycleRepo(env.DB_PL).list(id, parsePagination(new URL(req.url))),
    );
  });

  // POST /pl/plans/:id/review-cycles — start a cycle on a plan
  router.post('/pl/plans/:id/review-cycles', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const merged = {
      ...(body && typeof body === 'object' ? (body as Record<string, unknown>) : {}),
      plan_id: id,
    };
    const result = validateReviewCycleCreate(merged);
    if ('error' in result) return badRequest(result.error);
    return created(await new ReviewCycleRepo(env.DB_PL).create(result.data));
  });

  // GET /pl/review-cycles/:id
  router.get('/pl/review-cycles/:id', async (_req, env, { id }) => {
    const row = await new ReviewCycleRepo(env.DB_PL).findById(id);
    return row ? ok(row) : notFound(`review cycle ${id}`);
  });

  // GET /pl/review-cycles/:id/events
  router.get('/pl/review-cycles/:id/events', async (req, env, { id }) => {
    return paginated(
      await new ReviewCycleRepo(env.DB_PL).events(id, parsePagination(new URL(req.url))),
    );
  });

  // POST /pl/review-cycles/:id/events — record a review event
  router.post('/pl/review-cycles/:id/events', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const merged = {
      ...(body && typeof body === 'object' ? (body as Record<string, unknown>) : {}),
      cycle_id: id,
    };
    const result = validateReviewEventCreate(merged);
    if ('error' in result) return badRequest(result.error);
    return created(await new ReviewCycleRepo(env.DB_PL).createEvent(id, result.data));
  });

  // PATCH /pl/review-cycles/:id — update cycle fields
  router.patch('/pl/review-cycles/:id', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validateReviewCyclePatch(body);
    if ('error' in result) return badRequest(result.error);
    const row = await new ReviewCycleRepo(env.DB_PL).patch(id, result.data);
    return row ? ok(row) : notFound(`review cycle ${id}`);
  });

  // PATCH /pl/review-events/:id — resolve a review event
  router.patch('/pl/review-events/:id', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validateReviewEventUpdate(body);
    if ('error' in result) return badRequest(result.error);
    const row = await new ReviewCycleRepo(env.DB_PL).updateEventStatus(id, result.data.status, result.data.score);
    return row ? ok(row) : notFound(`review event ${id}`);
  });
}
