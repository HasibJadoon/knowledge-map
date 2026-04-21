// ─── /al/lemmas routes ────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArLinguisticsEnv } from '../env';
import { LemmaRepo } from '../repositories/lemma.repo';
import { validateLemmaCreate } from '../schemas/lemma.schema';

export function lemmaRoutes(router: Router<ArLinguisticsEnv>) {

  // GET /al/lemmas/search?q=كتاب
  router.get('/al/lemmas/search', async (req, env) => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    if (!q) return badRequest('q param required');
    return paginated(await new LemmaRepo(env.DB_AL).search(q, parsePagination(url)));
  });

  // GET /al/lemmas?root=AL:ULID — lemmas for a root
  router.get('/al/lemmas', async (req, env) => {
    const url = new URL(req.url);
    const rootId = url.searchParams.get('root');
    if (!rootId) return badRequest('root (AL:ULID) param required');
    return ok(await new LemmaRepo(env.DB_AL).byRoot(rootId));
  });

  // GET /al/lemmas/:id
  router.get('/al/lemmas/:id', async (_req, env, { id }) => {
    const lemma = await new LemmaRepo(env.DB_AL).findById(id);
    return lemma ? ok(lemma) : notFound(`lemma ${id}`);
  });

  // POST /al/lemmas — admin
  router.post('/al/lemmas', async (req, env) => {
    const body = await req.json();
    const result = validateLemmaCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new LemmaRepo(env.DB_AL).create(result.data));
  });
}
