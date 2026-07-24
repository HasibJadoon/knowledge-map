// ─── /al citations — Roam-style backlinks for root layers ────────────────────
// Forward:  GET /al/citations/:root            → every source a root's layers cite
//           GET /al/citations/:root/resources  → distinct resources + ref counts
// Reverse:  GET /al/referenced-by?ref=ALB:...   → a resource's "Linked References"

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { CitationRepo } from '../repositories/citation.repo';

export function citationRoutes(router: Router<ArLinguisticsEnv>) {
  // GET /al/citations/بين — forward links, grouped by layer
  router.get('/al/citations/:root', async (_req, env, { root }) => {
    const rows = await new CitationRepo(env.DB_AL).byRoot(decodeURIComponent(root));
    const byLayer: Record<string, typeof rows> = {};
    for (const r of rows) (byLayer[r.fromLayer] ??= []).push(r);
    return ok({ root: decodeURIComponent(root), total: rows.length, byLayer });
  });

  // GET /al/citations/بين/resources — distinct resources this root grounds in
  router.get('/al/citations/:root/resources', async (_req, env, { root }) =>
    ok(await new CitationRepo(env.DB_AL).resources(decodeURIComponent(root))),
  );

  // GET /al/referenced-by?ref=ALB:blk_mqy2_p1 — reverse "Linked References"
  router.get('/al/referenced-by', async (req, env) => {
    const ref = new URL(req.url).searchParams.get('ref');
    if (!ref) return badRequest('ref param required (e.g. ALB:blk_..., ALE:..., SRC:slug)');
    const rows = await new CitationRepo(env.DB_AL).referencedBy(ref);
    return ok({ ref, referencedBy: rows, count: rows.length });
  });
}
