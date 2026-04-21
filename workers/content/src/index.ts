// ─── km-content-worker entry point ────────────────────────────────────────────
// Owns DB_CM (km_content). All authored artifacts: documents, notes, captures,
// highlights, sources. ACL via CORE service binding (never grows its own ACL).

import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { ContentEnv } from './env';

import { documentRoutes } from './routes/documents';
import { noteRoutes } from './routes/notes';
import { captureRoutes } from './routes/captures';
import { highlightRoutes } from './routes/highlights';
import { cmSourceRoutes } from './routes/sources';

const router = new Router<ContentEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'content', db: 'DB_CM', db_ok: await dbHealth(env.DB_CM) }),
);

documentRoutes(router);   // CM documents, blocks, links, versions
noteRoutes(router);        // GET/POST/PATCH /cm/notes
captureRoutes(router);     // GET/POST /cm/captures
highlightRoutes(router);   // GET/POST/DELETE /cm/highlights
cmSourceRoutes(router);    // GET/POST /cm/sources

export default {
  fetch: (request: Request, env: ContentEnv) => router.handle(request, env),
} satisfies ExportedHandler<ContentEnv>;
