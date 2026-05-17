// ─── /core/workspaces/:id/activity — workspace audit feed ─────────────────────
// Read-only view over core_activity_events for a single workspace. Admin,
// the workspace owner, or any active member may read it.

import type { Router } from '../../../shared/src/router';
import { paginated, notFound, forbidden } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { WorkspaceRepo } from '../repositories/workspace.repo';
import { ActivityRepo } from '../repositories/activity.repo';

export function activityRoutes(router: Router<CoreEnv>) {

  // GET /core/workspaces/:id/activity
  router.get('/core/workspaces/:id/activity', async (req, env, { id }) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    const repo = new WorkspaceRepo(env.DB_CORE);
    const ws = await repo.findById(id);
    if (!ws) return notFound(`workspace ${id}`);

    const allowed =
      ctx.isAdmin ||
      ctx.userId === ws.owner_id ||
      (await repo.findMemberByUser(id, ctx.userId)) !== null;
    if (!allowed) return forbidden('You do not have access to this workspace');

    const url = new URL(req.url);
    return paginated(
      await new ActivityRepo(env.DB_CORE).workspaceEvents(id, {
        ...parsePagination(url),
        eventType: url.searchParams.get('event_type') ?? undefined,
      }),
    );
  });
}
