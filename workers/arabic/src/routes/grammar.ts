// ─── /ar/grammar routes ───────────────────────────────────────────────────────
// Learner grammar items. lx_nahw_ref → AL:ULID in ar_ling_nahw_concepts.
// AR never stores grammar definitions — only pedagogical presentation.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { GrammarRepo } from '../repositories/grammar.repo';

export function grammarRoutes(router: Router<ArabicEnv>) {

  // GET /ar/grammar?container=AR:ULID
  router.get('/ar/grammar', async (req, env) => {
    const url         = new URL(req.url);
    const containerId = url.searchParams.get('container');
    if (!containerId) return badRequest('container (AR:ULID) param required');
    return paginated(
      await new GrammarRepo(env.DB_AR).byContainer(containerId, parsePagination(url)),
    );
  });

  // GET /ar/grammar/by-concept?ref=AL:ULID
  // All grammar items pointing to the same nahw concept across all containers
  router.get('/ar/grammar/by-concept', async (req, env) => {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref');
    if (!ref) return badRequest('ref (AL:ULID) param required');
    return paginated(
      await new GrammarRepo(env.DB_AR).byNahwRef(ref, parsePagination(url)),
    );
  });

  // GET /ar/grammar/:id
  router.get('/ar/grammar/:id', async (_req, env, { id }) => {
    const row = await new GrammarRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`grammar item ${id}`);
  });

  // POST /ar/grammar
  router.post('/ar/grammar', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.container_id || !b.lx_nahw_ref || !b.label)
      return badRequest('container_id, lx_nahw_ref, label required');
    return created(await new GrammarRepo(env.DB_AR).create({
      container_id: String(b.container_id),
      lx_nahw_ref:  String(b.lx_nahw_ref),
      label:        String(b.label),
      example_ar:   (b.example_ar as string | null) ?? null,
      explanation:  (b.explanation as string | null) ?? null,
      sort_order:   typeof b.sort_order === 'number' ? b.sort_order : 0,
    }));
  });
}
