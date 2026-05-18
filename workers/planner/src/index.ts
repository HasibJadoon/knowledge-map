// ─── km-planner-worker entry point ────────────────────────────────────────────
// Owns DB_PL (km_planner). Operational study execution only.
// Never stores canonical scholarly truth — uses typed refs to QR, WV, AL.

import { Router } from '../../shared/src/router';
import { dbHealth } from '../../shared/src/http';
import { ok } from '../../shared/src/response';
import type { PlannerEnv } from './env';

import { planRoutes } from './routes/plans';
import { taskRoutes } from './routes/tasks';
import { reviewRoutes } from './routes/review';
import { laneRoutes } from './routes/lanes';
import { sprintRoutes } from './routes/sprint';
import { goalRoutes } from './routes/goals';
import { sessionRoutes } from './routes/sessions';
import { calendarRoutes } from './routes/calendar';
import { planScopeRoutes } from './routes/plan-scopes';
import { reviewCycleRoutes } from './routes/review-cycles';
import { templateRoutes } from './routes/templates';
import { captureRoutes } from './routes/captures';

const router = new Router<PlannerEnv>();

router.get('/health', async (_req, env) =>
  ok({ domain: 'planner', db: 'DB_PL', db_ok: await dbHealth(env.DB_PL) }),
);

planRoutes(router);        // GET/POST/PATCH /pl/plans, /pl/plans/:id/tasks
taskRoutes(router);        // GET/POST/PATCH /pl/tasks — full task CRUD including POST
reviewRoutes(router);      // GET /pl/review/due, POST /pl/review/feedback
laneRoutes(router);        // GET/POST/PATCH /pl/plans/:id/lanes, reorder, /pl/lanes/:id
goalRoutes(router);        // GET/POST/PATCH /pl/goals, snapshots, /pl/streaks
sessionRoutes(router);     // GET/POST/PATCH /pl/sessions, complete
calendarRoutes(router);    // GET/POST/PATCH /pl/calendar, /pl/plans/:id/calendar
planScopeRoutes(router);   // GET/POST/PATCH /pl/plans/:id/scopes, /pl/scopes/:id
reviewCycleRoutes(router); // GET/POST/PATCH /pl/plans/:id/review-cycles, events
templateRoutes(router);    // GET/POST/PATCH /pl/templates
captureRoutes(router);     // GET/POST/PATCH /pl/captures — quick-capture TipTap notes
sprintRoutes(router);      // GET/POST/PUT /planner/week, /planner/task, /week/* — sprint API

export default {
  fetch: (request: Request, env: PlannerEnv) => router.handle(request, env),
} satisfies ExportedHandler<PlannerEnv>;
