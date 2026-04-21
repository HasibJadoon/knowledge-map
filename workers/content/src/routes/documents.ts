// ─── /cm/documents routes ─────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ContentEnv } from '../env';
import { DocumentRepo } from '../repositories/document.repo';

export function documentRoutes(router: Router<ContentEnv>) {

  // GET /cm/documents?ref=QR:ULID
  router.get('/cm/documents', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new DocumentRepo(env.DB_CM).list(
        url.searchParams.get('ref'),
        parsePagination(url),
      ),
    );
  });

  // GET /cm/documents/:id
  router.get('/cm/documents/:id', async (_req, env, { id }) => {
    const row = await new DocumentRepo(env.DB_CM).findById(id);
    return row ? ok(row) : notFound(`document ${id}`);
  });

  // POST /cm/documents
  router.post('/cm/documents', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title) return badRequest('title required');
    return created(await new DocumentRepo(env.DB_CM).create({
      title:        String(b.title),
      doc_type:     b.doc_type ? String(b.doc_type) : undefined,
      resource_ref: (b.resource_ref as string | null) ?? null,
      body_md:      (b.body_md as string | null) ?? null,
    }));
  });

  // PATCH /cm/documents/:id
  router.patch('/cm/documents/:id', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    const row = await new DocumentRepo(env.DB_CM).patch(id, {
      title:   b.title   as string | undefined,
      body_md: b.body_md as string | undefined,
      status:  b.status  as 'draft' | 'published' | 'archived' | undefined,
    });
    return row ? ok(row) : notFound(`document ${id}`);
  });
}
