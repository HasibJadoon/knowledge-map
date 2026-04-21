// ─── /cm/sources routes ───────────────────────────────────────────────────────
// CM sources: books, articles, podcasts, videos — content items owned by CM.
// These are distinct from wv_sources (research artefacts in the worldview engine).

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ContentEnv } from '../env';
import { CmSourceRepo } from '../repositories/source.repo';

export function cmSourceRoutes(router: Router<ContentEnv>) {

  // GET /cm/sources?type=book
  router.get('/cm/sources', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new CmSourceRepo(env.DB_CM).list(
        url.searchParams.get('type'),
        parsePagination(url),
      ),
    );
  });

  // GET /cm/sources/:id
  router.get('/cm/sources/:id', async (_req, env, { id }) => {
    const row = await new CmSourceRepo(env.DB_CM).findById(id);
    return row ? ok(row) : notFound(`source ${id}`);
  });

  // POST /cm/sources
  router.post('/cm/sources', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title) return badRequest('title required');
    return created(await new CmSourceRepo(env.DB_CM).create({
      title:        String(b.title),
      source_type:  b.source_type   ? String(b.source_type)  : undefined,
      author_ref:   (b.author_ref   as string | null) ?? null,
      author_name:  (b.author_name  as string | null) ?? null,
      language:     b.language      ? String(b.language)     : undefined,
      url:          (b.url          as string | null) ?? null,
      published_at: (b.published_at as string | null) ?? null,
    }));
  });
}
