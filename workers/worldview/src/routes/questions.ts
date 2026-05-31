// ─── /worldview/questions + /worldview/topics routes ──────────────────────────
// Read access to wv_questions + wv_topics.
//
// GET /worldview/questions?source_id=   — questions for a source
// GET /worldview/questions?unit_id=     — questions for a source unit
// GET /worldview/questions/:id          — single question
// GET /worldview/topics                 — topic taxonomy
// GET /worldview/topics/:id             — single topic

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import type { WorldviewEnv } from '../env';
import { QuestionRepo } from '../repositories/question.repo';

export function questionRoutes(router: Router<WorldviewEnv>) {

  router.get('/worldview/questions', async (req, env) => {
    const url = new URL(req.url);
    const unitId = url.searchParams.get('unit_id');
    const sourceId = url.searchParams.get('source_id');
    const repo = new QuestionRepo(env.DB_WV);
    if (unitId) return ok(await repo.byUnit(unitId));
    if (sourceId) return ok(await repo.bySource(sourceId));
    return badRequest('source_id or unit_id required');
  });

  router.get('/worldview/questions/:id', async (_req, env, { id }) => {
    const row = await new QuestionRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`question ${id}`);
  });

  router.get('/worldview/topics', async (_req, env) => {
    return ok(await new QuestionRepo(env.DB_WV).topics());
  });

  router.get('/worldview/topics/:id', async (_req, env, { id }) => {
    const row = await new QuestionRepo(env.DB_WV).topicById(id);
    return row ? ok(row) : notFound(`topic ${id}`);
  });
}
