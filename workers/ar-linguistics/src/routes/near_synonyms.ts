// ─── /al/near-synonyms routes ─────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { NearSynonymRepo } from '../repositories/near_synonym.repo';

export function nearSynonymRoutes(router: Router<ArLinguisticsEnv>) {

  // GET /al/near-synonyms?domain=SF:NS:AFTERLIFE&page=1&limit=50
  router.get('/al/near-synonyms', async (req, env) => {
    const url = new URL(req.url);
    const domain = url.searchParams.get('domain') ?? undefined;
    return paginated(
      await new NearSynonymRepo(env.DB_AL).listSets({ domain, ...parsePagination(url) }),
    );
  });

  // GET /al/near-synonyms/by-quran/2:4
  // Returns all near-synonym sets that have Quran evidence in that ayah
  router.get('/al/near-synonyms/by-quran/:ref', async (_req, env, { ref }) => {
    const result = await new NearSynonymRepo(env.DB_AL).byQuranRef(ref);
    return result ? ok(result) : notFound(`no near-synonyms for ${ref}`);
  });

  // GET /al/near-synonyms/by-surah/2
  // Returns all near-synonym sets that have evidence anywhere in that surah
  router.get('/al/near-synonyms/by-surah/:surah', async (_req, env, { surah }) => {
    const n = parseInt(surah, 10);
    if (!n || n < 1 || n > 114) return badRequest('surah must be 1–114');
    return ok(await new NearSynonymRepo(env.DB_AL).bySurah(n));
  });

  // GET /al/near-synonyms/by-lemma/:lemmaId
  router.get('/al/near-synonyms/by-lemma/:lemmaId', async (_req, env, { lemmaId }) => {
    return ok(await new NearSynonymRepo(env.DB_AL).byLemma(lemmaId));
  });

  // GET /al/near-synonyms/:id — full set with members
  router.get('/al/near-synonyms/:id', async (_req, env, { id }) => {
    const set = await new NearSynonymRepo(env.DB_AL).getSetDetail(id);
    return set ? ok(set) : notFound(`near-synonym set ${id}`);
  });

  // GET /al/near-synonyms/:id/evidence — Quran evidence rows for a set
  router.get('/al/near-synonyms/:id/evidence', async (_req, env, { id }) => {
    const evidence = await new NearSynonymRepo(env.DB_AL).evidenceForSet(id);
    return ok(evidence);
  });
}
