// ─── /cm/notes routes ─────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ContentEnv } from '../env';
import { NoteRepo } from '../repositories/note.repo';

export function noteRoutes(router: Router<ContentEnv>) {

  // GET /cm/notes?ref=WV:ULID
  router.get('/cm/notes', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new NoteRepo(env.DB_CM).list(
        url.searchParams.get('ref'),
        parsePagination(url),
      ),
    );
  });

  // GET /cm/notes/:id
  router.get('/cm/notes/:id', async (_req, env, { id }) => {
    const row = await new NoteRepo(env.DB_CM).findById(id);
    return row ? ok(row) : notFound(`note ${id}`);
  });

  // POST /cm/notes
  router.post('/cm/notes', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.content_md) return badRequest('content_md required');
    return created(await new NoteRepo(env.DB_CM).create({
      content_md:   String(b.content_md),
      title:        (b.title as string | null) ?? null,
      resource_ref: (b.resource_ref as string | null) ?? null,
    }));
  });

  // PATCH /cm/notes/:id
  router.patch('/cm/notes/:id', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.content_md) return badRequest('content_md required');
    const row = await new NoteRepo(env.DB_CM).update(
      id,
      String(b.content_md),
      b.title !== undefined ? (b.title as string | null) : undefined,
    );
    return row ? ok(row) : notFound(`note ${id}`);
  });
}
