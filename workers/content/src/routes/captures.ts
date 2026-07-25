// ─── /cm/captures routes ──────────────────────────────────────────────────────
// Quick captures: highlights, quotes, bookmarks from any source.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ContentEnv } from '../env';
import { CaptureRepo } from '../repositories/capture.repo';

export function captureRoutes(router: Router<ContentEnv>) {

  // GET /cm/captures?ref=QR:ULID
  router.get('/cm/captures', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new CaptureRepo(env.DB_CM).list(
        url.searchParams.get('ref'),
        parsePagination(url),
      ),
    );
  });

  // GET /cm/captures/:id
  router.get('/cm/captures/:id', async (_req, env, { id }) => {
    const row = await new CaptureRepo(env.DB_CM).findById(id);
    return row ? ok(row) : notFound(`capture ${id}`);
  });

  // POST /cm/captures
  router.post('/cm/captures', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.text) return badRequest('text required');
    // cm_capture_entries.core_user_ref is NOT NULL — the gateway injects the
    // caller's id after validating the JWT.
    const userId = req.headers.get('X-KM-User-Id');
    if (!userId) return badRequest('authenticated user required');
    return created(await new CaptureRepo(env.DB_CM).create({
      text:          String(b.text),
      core_user_ref: `CORE:${userId}`,
      capture_type:  b.capture_type ? String(b.capture_type) : undefined,
      source_ref:    (b.source_ref as string | null) ?? null,
      color:         (b.color as string | null) ?? null,
    }));
  });
}
