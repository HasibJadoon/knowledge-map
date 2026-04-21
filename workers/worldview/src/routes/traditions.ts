// ─── /wv/traditions routes ────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { TraditionRepo } from '../repositories/tradition.repo';

export function traditionRoutes(router: Router<WorldviewEnv>) {

  // GET /wv/traditions?category=abrahamic
  router.get('/wv/traditions', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new TraditionRepo(env.DB_WV).list(
        url.searchParams.get('category'), parsePagination(url),
      ),
    );
  });

  // GET /wv/traditions/:id
  router.get('/wv/traditions/:id', async (_req, env, { id }) => {
    const row = await new TraditionRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`tradition ${id}`);
  });

  // GET /wv/traditions/by-slug/:slug
  router.get('/wv/traditions/by-slug/:slug', async (_req, env, { slug }) => {
    const row = await new TraditionRepo(env.DB_WV).findBySlug(slug);
    return row ? ok(row) : notFound(`tradition slug:${slug}`);
  });

  // POST /wv/traditions
  router.post('/wv/traditions', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.slug || !b.label_en) return badRequest('slug and label_en required');
    return created(await new TraditionRepo(env.DB_WV).create({
      slug:      String(b.slug),
      label_en:  String(b.label_en),
      label_ar:  (b.label_ar as string | null) ?? null,
      category:  b.category ? String(b.category) : undefined,
      parent_id: (b.parent_id as string | null) ?? null,
    }));
  });
}
