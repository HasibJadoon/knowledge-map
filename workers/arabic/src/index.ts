// ─── km-arabic-worker entry point ─────────────────────────────────────────────
// Owns DB_AR (km_arabic). Arabic pedagogy: curriculum, SRS vocabulary, lessons,
// grammar items, exercises. All linguistic truth references AL:ULID — never
// duplicated here.

import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { ArabicEnv } from './env';

import { containerRoutes } from './routes/containers';
import { vocabularyRoutes } from './routes/vocabulary';
import { lessonRoutes } from './routes/lessons';
import { grammarRoutes } from './routes/grammar';
import { exerciseRoutes } from './routes/exercises';

const router = new Router<ArabicEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'arabic', db: 'DB_AR', db_ok: await dbHealth(env.DB_AR) }),
);

containerRoutes(router);   // GET/POST /ar/containers, /ar/containers/:id/children
lessonRoutes(router);      // GET/POST /ar/lessons, publish
vocabularyRoutes(router);  // GET/POST /ar/vocabulary, /due, /review
grammarRoutes(router);     // GET/POST /ar/grammar, /by-concept
exerciseRoutes(router);    // GET/POST /ar/exercises, /sample

export default {
  fetch: (request: Request, env: ArabicEnv) => router.handle(request, env),
} satisfies ExportedHandler<ArabicEnv>;
