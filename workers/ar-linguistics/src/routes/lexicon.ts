// ─── /al/lexicon routes ───────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { LexiconRepo } from '../repositories/lexicon.repo';

export function lexiconRoutes(router: Router<ArLinguisticsEnv>) {

  // GET /al/lexicon/search?q=كتاب
  router.get('/al/lexicon/search', async (req, env) => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    if (!q) return badRequest('q param required');
    return paginated(await new LexiconRepo(env.DB_AL).search(q, parsePagination(url)));
  });

  // GET /al/lexicon/:id — entry + senses
  router.get('/al/lexicon/:id', async (_req, env, { id }) => {
    const repo = new LexiconRepo(env.DB_AL);
    const entry = await repo.findById(id);
    if (!entry) return notFound(`lexicon entry ${id}`);
    const senses = await repo.sensesByEntry(id);
    return ok({ ...entry, senses });
  });

  // GET /al/lexicon?lemma=AL:ULID — all entries for a lemma
  router.get('/al/lexicon', async (req, env) => {
    const url = new URL(req.url);
    const lemmaId = url.searchParams.get('lemma');
    if (!lemmaId) return badRequest('lemma (AL:ULID) param required');
    return ok(await new LexiconRepo(env.DB_AL).byLemma(lemmaId));
  });
}
