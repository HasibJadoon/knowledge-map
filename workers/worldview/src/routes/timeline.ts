// ─── /worldview/timeline routes ──────────────────────────────────────────────
// Read access to wv_timeline_events for the dual-register reader timeline.
//
// GET /worldview/timeline?source_id=   — events for a source
// GET /worldview/timeline?unit_id=     — events for a source unit
// GET /worldview/timeline/:id          — single event

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import type { WorldviewEnv } from '../env';
import { TimelineRepo } from '../repositories/timeline.repo';

export function timelineRoutes(router: Router<WorldviewEnv>) {

  router.get('/worldview/timeline', async (req, env) => {
    const url = new URL(req.url);
    const unitId = url.searchParams.get('unit_id');
    const sourceId = url.searchParams.get('source_id');
    const repo = new TimelineRepo(env.DB_WV);
    if (unitId) return ok(await repo.byUnit(unitId));
    if (sourceId) return ok(await repo.bySource(sourceId));
    return badRequest('source_id or unit_id required');
  });

  router.get('/worldview/timeline/:id', async (_req, env, { id }) => {
    const row = await new TimelineRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`timeline event ${id}`);
  });

  // Legacy alias
  router.get('/wv/timeline', async (req, env) => {
    const url = new URL(req.url);
    const unitId = url.searchParams.get('unit_id');
    const sourceId = url.searchParams.get('source_id');
    const repo = new TimelineRepo(env.DB_WV);
    if (unitId) return ok(await repo.byUnit(unitId));
    if (sourceId) return ok(await repo.bySource(sourceId));
    return badRequest('source_id or unit_id required');
  });
}
