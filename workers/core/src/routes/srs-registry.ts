// ─── /core/srs/registry routes — cross-domain SRS enrollment index ───────────
// CORE tracks which user is learning which resource, in which module. The
// actual card data (FSRS state, front/back) lives in the AR worker; this is
// the lookup that answers "is this verse / concept already in my SRS?".

import type { Router } from '../../../shared/src/router';
import { ok, created, badRequest, notFound } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { SrsRegistryRepo } from '../repositories/srs-registry.repo';
import { validateSrsCardInput } from '../schemas/srs-registry.schema';

export function srsRegistryRoutes(router: Router<CoreEnv>) {

  // GET /core/srs/registry?module=QR — the user's enrolled resources
  router.get('/core/srs/registry', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const module = new URL(req.url).searchParams.get('module') ?? undefined;
    const rows = await new SrsRegistryRepo(env.DB_CORE).userCards(ctx.userId, module);
    return ok(rows);
  });

  // POST /core/srs/registry — enroll a resource (idempotent on resource_ref)
  router.post('/core/srs/registry', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    // The authenticated user always owns the enrollment — never trust a body userRef.
    const merged = {
      ...(body && typeof body === 'object' ? body as Record<string, unknown> : {}),
      userRef: ctx.userId,
    };
    const result = validateSrsCardInput(merged);
    if ('error' in result) return badRequest(result.error);

    const repo = new SrsRegistryRepo(env.DB_CORE);
    const existing = await repo.findCardByResource(ctx.userId, result.data.resourceRef);
    const card = await repo.upsertCard(result.data);
    return existing ? ok(card) : created(card);
  });

  // DELETE /core/srs/registry/:id — un-enroll a resource
  router.delete('/core/srs/registry/:id', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    const removed = await new SrsRegistryRepo(env.DB_CORE).deleteCard(ctx.userId, id);
    return removed ? ok({ deleted: id }) : notFound(`registry card ${id}`);
  });
}
