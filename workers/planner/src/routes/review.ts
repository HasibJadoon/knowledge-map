// ─── /pl/review routes — SRS review queue ─────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { PlannerEnv } from '../env';
import { ReviewRepo } from '../repositories/review.repo';

export function reviewRoutes(router: Router<PlannerEnv>) {

  // GET /pl/review/due?plan=PL:ULID&limit=50 — tasks due for review now
  router.get('/pl/review/due', async (req, env) => {
    const url   = new URL(req.url);
    const limit = url.searchParams.get('limit');
    return ok(
      await new ReviewRepo(env.DB_PL).due(
        url.searchParams.get('plan'),
        limit ? Math.min(Number(limit), 200) : 50,
      ),
    );
  });

  // POST /pl/review/feedback — record SRS quality score (0-5)
  router.post('/pl/review/feedback', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.task_id || b.quality === undefined)
      return badRequest('task_id and quality (0-5) required');
    const quality = Number(b.quality);
    if (quality < 0 || quality > 5) return badRequest('quality must be 0-5');
    return ok(await new ReviewRepo(env.DB_PL).feedback(String(b.task_id), quality));
  });
}
