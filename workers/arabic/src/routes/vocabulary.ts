// ─── /ar/vocabulary routes ────────────────────────────────────────────────────
// ar_vocabulary: learner SRS vocabulary cards.
// lx_lemma_ref = AL:ULID — linguistic truth lives in km_arabic_linguistic.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { VocabularyRepo } from '../repositories/vocabulary.repo';

export function vocabularyRoutes(router: Router<ArabicEnv>) {

  // GET /ar/vocabulary?container=AR:ULID
  router.get('/ar/vocabulary', async (req, env) => {
    const url         = new URL(req.url);
    const containerId = url.searchParams.get('container');
    if (!containerId) return badRequest('container (AR:ULID) param required');
    return paginated(
      await new VocabularyRepo(env.DB_AR).byContainer(containerId, parsePagination(url)),
    );
  });

  // GET /ar/vocabulary/:id
  router.get('/ar/vocabulary/:id', async (_req, env, { id }) => {
    const row = await new VocabularyRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`vocab card ${id}`);
  });

  // GET /ar/vocabulary/due?container=AR:ULID&limit=20 — SRS review queue
  router.get('/ar/vocabulary/due', async (req, env) => {
    const url         = new URL(req.url);
    const containerId = url.searchParams.get('container');
    if (!containerId) return badRequest('container (AR:ULID) param required');
    const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20);
    return ok(await new VocabularyRepo(env.DB_AR).dueCards(containerId, limit));
  });

  // POST /ar/vocabulary
  router.post('/ar/vocabulary', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.container_id || !b.lx_lemma_ref || !b.display_ar)
      return badRequest('container_id, lx_lemma_ref, display_ar required');
    return created(await new VocabularyRepo(env.DB_AR).create({
      container_id: String(b.container_id),
      lx_lemma_ref: String(b.lx_lemma_ref),
      display_ar:   String(b.display_ar),
      gloss_en:     (b.gloss_en as string | null) ?? null,
      sort_order:   typeof b.sort_order === 'number' ? b.sort_order : 0,
    }));
  });

  // POST /ar/vocabulary/:id/review — record SRS result (quality 0-5)
  router.post('/ar/vocabulary/:id/review', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    if (b.quality === undefined) return badRequest('quality (0-5) required');
    const card = await new VocabularyRepo(env.DB_AR).recordReview(id, Number(b.quality));
    return card ? ok(card) : notFound(`vocab card ${id}`);
  });
}
