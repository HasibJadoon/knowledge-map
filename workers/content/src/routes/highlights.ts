// ─── /cm/highlights routes ────────────────────────────────────────────────────
// Ranged highlights within a source, with positional anchors for UI re-rendering.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ContentEnv } from '../env';
import { HighlightRepo } from '../repositories/highlight.repo';

export function highlightRoutes(router: Router<ContentEnv>) {

  // GET /cm/highlights?ref=QR:ULID — all highlights for a resource
  router.get('/cm/highlights', async (req, env) => {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref');
    if (!ref) {
      // Paginated list without filter
      return paginated(
        await new HighlightRepo(env.DB_CM).list(null, parsePagination(url)),
      );
    }
    // Non-paginated array when ref is given — UI renders all at once
    return ok(await new HighlightRepo(env.DB_CM).byResource(ref));
  });

  // GET /cm/highlights/:id
  router.get('/cm/highlights/:id', async (_req, env, { id }) => {
    const row = await new HighlightRepo(env.DB_CM).findById(id);
    return row ? ok(row) : notFound(`highlight ${id}`);
  });

  // POST /cm/highlights
  router.post('/cm/highlights', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.resource_ref || !b.anchor_start || !b.anchor_end)
      return badRequest('resource_ref, anchor_start, and anchor_end required');
    return created(await new HighlightRepo(env.DB_CM).create({
      resource_ref:  String(b.resource_ref),
      anchor_start:  String(b.anchor_start),
      anchor_end:    String(b.anchor_end),
      text_excerpt:  (b.text_excerpt as string | null) ?? null,
      color:         (b.color as string | null) ?? null,
      note_ref:      (b.note_ref as string | null) ?? null,
    }));
  });

  // DELETE /cm/highlights/:id
  router.delete('/cm/highlights/:id', async (_req, env, { id }) => {
    await new HighlightRepo(env.DB_CM).delete(id);
    return ok({ deleted: id });
  });
}
