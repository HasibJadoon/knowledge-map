// ─── /ar/exercises routes ─────────────────────────────────────────────────────
// Practice exercises: flashcard, fill-blank, MCQ, translation, parsing.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { ArabicEnv } from '../env';
import { ExerciseRepo } from '../repositories/exercise.repo';

export function exerciseRoutes(router: Router<ArabicEnv>) {

  // GET /ar/exercises?lesson=AR:ULID
  router.get('/ar/exercises', async (req, env) => {
    const url      = new URL(req.url);
    const lessonId = url.searchParams.get('lesson');
    if (!lessonId) return badRequest('lesson (AR:ULID) param required');
    return paginated(
      await new ExerciseRepo(env.DB_AR).byLesson(lessonId, parsePagination(url)),
    );
  });

  // GET /ar/exercises/sample?lesson=AR:ULID&limit=10 — random practice session
  router.get('/ar/exercises/sample', async (req, env) => {
    const url      = new URL(req.url);
    const lessonId = url.searchParams.get('lesson');
    if (!lessonId) return badRequest('lesson (AR:ULID) param required');
    const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '10', 10) || 10);
    return ok(await new ExerciseRepo(env.DB_AR).sample(lessonId, limit));
  });

  // GET /ar/exercises/:id
  router.get('/ar/exercises/:id', async (_req, env, { id }) => {
    const row = await new ExerciseRepo(env.DB_AR).findById(id);
    return row ? ok(row) : notFound(`exercise ${id}`);
  });


  // POST /ar/exercises
  router.post('/ar/exercises', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.lesson_id || !b.exercise_type || !b.prompt)
      return badRequest('lesson_id, exercise_type, prompt required');
    return created(await new ExerciseRepo(env.DB_AR).create({
      lesson_id:     String(b.lesson_id),
      exercise_type: String(b.exercise_type),
      prompt:        String(b.prompt),
      answer:        (b.answer as string | null) ?? null,
      options_json:  (b.options_json as string | null) ?? null,
      sort_order:    typeof b.sort_order === 'number' ? b.sort_order : 0,
    }));
  });
}
