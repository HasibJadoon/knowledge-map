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
