// ─── km-core-worker entry point ───────────────────────────────────────────────
// Owns DB_CORE (km_core). Issues and verifies JWT tokens. Manages users,
// workspaces, roles, and resource grants. Calls no other domain Worker.

import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { CoreEnv } from './env';

import { authRoutes } from './routes/auth';
import { oauthRoutes } from './routes/oauth';
import { userRoutes } from './routes/users';
import { workspaceRoutes } from './routes/workspaces';
import { workspaceRoleRoutes } from './routes/workspace-roles';
import { activityRoutes } from './routes/activity';
import { grantRoutes } from './routes/grants';

const router = new Router<CoreEnv>();

// Health
router.get('/health', async (_req, env) =>
  ok({ domain: 'core', db: 'DB_CORE', db_ok: await dbHealth(env.DB_CORE) }),
);

// Domain routes
authRoutes(router);
oauthRoutes(router);
userRoutes(router);
workspaceRoutes(router);
workspaceRoleRoutes(router);
activityRoutes(router);
grantRoutes(router);

export default {
  fetch: (request: Request, env: CoreEnv) => router.handle(request, env),
} satisfies ExportedHandler<CoreEnv>;
