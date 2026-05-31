// ─── km-worldview-worker entry point ──────────────────────────────────────────
// Owns DB_WV (km_worldview). 10-layer civilizational engine.
// Cross-domain reads via CONTENT, QURAN, and CORE service bindings.
//
// UI-facing route groups:
//   /worldview/*   — primary paths called by Ionic + Desktop apps
//   /wv/*          — canonical REST paths (Hub, internal tooling)

import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { WorldviewEnv } from './env';

import { traditionRoutes }  from './routes/traditions';
import { nodeRoutes }        from './routes/nodes';
import { sourceRoutes }      from './routes/sources';
import { illustrationRoutes } from './routes/illustrations';
import { readingSessionRoutes } from './routes/reading-sessions';
import { timelineRoutes }    from './routes/timeline';
import { questionRoutes }    from './routes/questions';
import { thinkerRoutes }     from './routes/thinkers';
import { brainstormRoutes }  from './routes/brainstorms';
import { comparisonRoutes }  from './routes/comparisons';
import { insightRoutes }     from './routes/insights';
import { distillRoutes }     from './routes/distill';

const router = new Router<WorldviewEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'worldview', db: 'DB_WV', db_ok: await dbHealth(env.DB_WV) }),
);

// ── Core reference data ───────────────────────────────────────────────────────
traditionRoutes(router);   // GET/POST /wv/traditions, by-slug
thinkerRoutes(router);     // GET/POST /wv/thinkers

// ── Knowledge graph ──────────────────────────────────────────────────────────
nodeRoutes(router);         // GET/POST /wv/nodes, edges, node-edges

// ── Sources, units, content pipeline ────────────────────────────────────────
sourceRoutes(router);
// GET    /worldview/sources               list (+ /wv/sources alias)
// GET    /worldview/sources/:id           detail with units
// POST   /worldview/source                create
// PUT    /worldview/source                update (body.id)
// GET    /worldview/units/:id             unit detail
// POST   /worldview/unit                  create unit
// PUT    /worldview/unit                  update unit (body.id)
// GET    /worldview/units/:id/annotations highlights for unit
// GET    /worldview/source-content        chunks (?source_id=&source_unit_id=)
// GET    /worldview/workflow              composite source list for UI

// ── Source-unit illustrations (1..N visual HTML pages per unit) ───────────────
illustrationRoutes(router);
// GET    /worldview/units/:id/illustrations    list for a unit (no html_content)
// GET    /worldview/reading-sessions/:id/illustrations  list for a reading session
// GET    /worldview/sources/:id/illustrations  list for a whole source
// GET    /worldview/illustrations/:id          detail (includes html_content)
// GET    /worldview/illustrations/:id/page     raw HTML document (text/html)
// POST   /worldview/illustration               create (body.source_unit_id + html_content)
// PUT    /worldview/illustration               update (body.id)
// DELETE /worldview/illustration/:id           delete

// ── Reading sessions ─────────────────────────────────────────────────────────
readingSessionRoutes(router);
// GET    /worldview/reading-sessions          list (?source_id=&user=&status=)
// GET    /worldview/reading-sessions/active    active session for a source
// GET    /worldview/reading-sessions/:id       detail
// POST   /worldview/reading-session            create (body.source_id)
// PUT    /worldview/reading-session            update (body.id)
// DELETE /worldview/reading-session/:id        delete

// ── Timeline + questions/topics (canonical viz backing) ──────────────────────
timelineRoutes(router);
// GET /worldview/timeline?source_id=|unit_id=   era ranges + dated incidents
questionRoutes(router);
// GET /worldview/questions?source_id=|unit_id=  open questions
// GET /worldview/topics                          topic taxonomy

// ── Distillation workflow ────────────────────────────────────────────────────
distillRoutes(router);
// POST /worldview/distill/generate        create batch + seed items
// GET  /worldview/distill/batch           poll progress (?batchId=)
// GET  /worldview/distill/by-unit         batch by source unit
// POST /worldview/distill/decision        approve|edit|reject one item
// POST /worldview/distill/approve         bulk approve all pending

// ── Brainstorm sessions ──────────────────────────────────────────────────────
brainstormRoutes(router);
// GET    /wv/brainstorm                   list (UI path — singular)
// POST   /wv/brainstorm                   create
// GET    /wv/brainstorm/:id               detail
// PATCH  /wv/brainstorm/:id               update
// (+ /wv/brainstorms plural aliases)

// ── Comparisons ──────────────────────────────────────────────────────────────
comparisonRoutes(router);
// GET    /wv/comparisons                  list
// GET    /wv/comparisons/:id              detail (axes + rows + cells)
// POST   /wv/comparisons                  create
// PATCH  /wv/comparisons/:id             patch
// POST   /wv/comparisons/:id/axes        add axis
// POST   /wv/comparisons/:id/rows        add row
// PUT    /wv/comparisons/cells           upsert cell
// PATCH  /wv/comparisons/cells/:cellId   patch cell

// ── AI review queue ──────────────────────────────────────────────────────────
insightRoutes(router);     // GET/POST/PATCH /wv/insights — AI review queue

export default {
  fetch: (request: Request, env: WorldviewEnv) => router.handle(request, env),
} satisfies ExportedHandler<WorldviewEnv>;
