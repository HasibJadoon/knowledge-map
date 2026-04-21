// ─── /wv/thinkers routes ──────────────────────────────────────────────────────
// Scholars, philosophers, theologians — intellectual actors in the worldview.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { ThinkerRepo } from '../repositories/thinker.repo';

export function thinkerRoutes(router: Router<WorldviewEnv>) {

  // GET /wv/thinkers?tradition=WV:ULID
  router.get('/wv/thinkers', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new ThinkerRepo(env.DB_WV).list(
        url.searchParams.get('tradition'),
        parsePagination(url),
      ),
    );
  });

  // GET /wv/thinkers/:id
  router.get('/wv/thinkers/:id', async (_req, env, { id }) => {
    const row = await new ThinkerRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`thinker ${id}`);
  });

  // POST /wv/thinkers
  router.post('/wv/thinkers', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.name_en) return badRequest('name_en required');
    return created(await new ThinkerRepo(env.DB_WV).create({
      name_en:      String(b.name_en),
      name_ar:      (b.name_ar as string | null) ?? null,
      tradition_id: (b.tradition_id as string | null) ?? null,
      birth_year:   b.birth_year  != null ? Number(b.birth_year)  : null,
      death_year:   b.death_year  != null ? Number(b.death_year)  : null,
      bio_summary:  (b.bio_summary as string | null) ?? null,
    }));
  });
}
