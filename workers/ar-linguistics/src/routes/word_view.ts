// ─── /al word-view panels: verb government, antonyms, idioms-by-root ──────────

import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { WordViewRepo } from '../repositories/word_view.repo';

export function wordViewRoutes(router: Router<ArLinguisticsEnv>) {
  // GET /al/verb-government/زلف — transitivity + preposition government
  router.get('/al/verb-government/:root', async (_req, env, { root }) =>
    ok(await new WordViewRepo(env.DB_AL).verbGovernment(decodeURIComponent(root))),
  );

  // GET /al/root-antonyms/زلف — cross-root opposites
  router.get('/al/root-antonyms/:root', async (_req, env, { root }) =>
    ok(await new WordViewRepo(env.DB_AL).antonyms(decodeURIComponent(root))),
  );

  // GET /al/expressions/by-root/زلف — Mir verbal idioms for the root
  router.get('/al/expressions/by-root/:root', async (_req, env, { root }) =>
    ok(await new WordViewRepo(env.DB_AL).expressionsByRoot(decodeURIComponent(root))),
  );
}
