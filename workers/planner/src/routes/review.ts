// ─── /pl/review routes — review queue ─────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { PlannerEnv } from '../env';
import { ReviewRepo } from '../repositories/review.repo';

export function reviewRoutes(router: Router<PlannerEnv>) {

  // GET /pl/review/due?plan=PL:ULID&limit=50 — open tasks due now
  router.get('/pl/review/due', async (req, env) => {
    const url = new URL(req.url);
    const limit = url.searchParams.get('limit');
    return ok(
      await new ReviewRepo(env.DB_PL).due(
        url.searchParams.get('plan'),
        limit ? Number(limit) : 50,
      ),
    );
  });

  // POST /pl/review/feedback — record a review score (0-5) for a task
  router.post('/pl/review/feedback', async (req, env) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    if (typeof b['task_id'] !== 'string' || b['quality'] === undefined) {
      return badRequest('task_id and quality (0-5) required');
    }
    const quality = Number(b['quality']);
    if (!Number.isFinite(quality) || quality < 0 || quality > 5) {
      return badRequest('quality must be 0-5');
    }
    return ok(await new ReviewRepo(env.DB_PL).feedback(b['task_id'], quality));
  });
}
