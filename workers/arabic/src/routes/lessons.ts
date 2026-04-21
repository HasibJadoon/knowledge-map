// ─── /ar/lessons routes ───────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { LessonRepo } from '../repositories/lesson.repo';

export function lessonRoutes(router: Router<ArabicEnv>) {

  // GET /ar/lessons?container=AR:ULID
  router.get('/ar/lessons', async (req, env) => {
    const url         = new URL(req.url);
    const containerId = url.searchParams.get('container');
    if (!containerId) return badRequest('container (AR:ULID) param required');
    return paginated(
      await new LessonRepo(env.DB_AR).byContainer(containerId, parsePagination(url)),
    );
  });

  // GET /ar/lessons/:id
  router.get('/ar/lessons/:id', async (_req, env, { id }) => {
    const row = await new LessonRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`lesson ${id}`);
  });

  // POST /ar/lessons
  router.post('/ar/lessons', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.container_id || !b.title || !b.lesson_type)
      return badRequest('container_id, title, lesson_type required');
    return created(await new LessonRepo(env.DB_AR).create({
      container_id: String(b.container_id),
      title:        String(b.title),
      lesson_type:  String(b.lesson_type),
      sort_order:   typeof b.sort_order === 'number' ? b.sort_order : 0,
    }));
  });

  // POST /ar/lessons/:id/publish
  router.post('/ar/lessons/:id/publish', async (_req, env, { id }) => {
    const row = await new LessonRepo(env.DB_AR).publish(id);
    return row ? ok(row) : notFound(`lesson ${id}`);
  });
}
