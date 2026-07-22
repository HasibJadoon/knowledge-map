// ─── /core/dashboard — km-core control-system snapshot ────────────────────────
// Higher-level aggregate over the entire km_core database. Read-only. Powers
// the "control systems" command deck in the web app. Admin-only: it exposes
// platform-wide identity, session, audit, and access-control state.

import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { requireAdmin } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { DashboardRepo } from '../repositories/dashboard.repo';

export function dashboardRoutes(router: Router<CoreEnv>) {

  // GET /core/dashboard — full control-system snapshot in one call.
  router.get('/core/dashboard', async (req, env) => {
    const ctx = await requireAdmin(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const snapshot = await new DashboardRepo(env.DB_CORE).snapshot();
    return ok(snapshot);
  });
}
