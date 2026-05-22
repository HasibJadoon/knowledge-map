// ─── km-studio-worker entry point ─────────────────────────────────────────────
// Owns DB_ST (km_studio). Episode Studio: build podcast / tutorial /
// talking-head / conversation episodes from reusable templates.
// Internal-only — reached through the km-backend-worker service binding.

import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { StudioEnv } from './env';

import { templateRoutes } from './routes/templates';
import { episodeRoutes } from './routes/episodes';

const router = new Router<StudioEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'studio', db: 'DB_ST', db_ok: await dbHealth(env.DB_ST) }),
);

templateRoutes(router);   // GET /st/templates, GET/POST /st/templates(/:id)
episodeRoutes(router);    // /st/episodes + participants / sections / points

export default {
  fetch: (request: Request, env: StudioEnv) => router.handle(request, env),
} satisfies ExportedHandler<StudioEnv>;
