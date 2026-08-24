// ─── /pl/templates routes — reusable plan blueprints ─────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination, readJson } from '../../../shared/src/validate';
import type { PlannerEnv } from '../env';
import { TemplateRepo } from '../repositories/template.repo';
import { validatePlanTemplateCreate, validatePlanTemplatePatch } from '../schemas/template.schema';
import { actorRef } from '../auth';


export function templateRoutes(router: Router<PlannerEnv>) {

  // GET /pl/templates — public templates plus the caller's own private ones
  router.get('/pl/templates', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new TemplateRepo(env.DB_PL).list({
        ...parsePagination(url),
        createdByRef: actorRef(req),
        includePrivate: true,
      }),
    );
  });

  // GET /pl/templates/:id
  router.get('/pl/templates/:id', async (_req, env, { id }) => {
    const row = await new TemplateRepo(env.DB_PL).findById(id);
    return row ? ok(row) : notFound(`template ${id}`);
  });

  // POST /pl/templates — create a template owned by the authenticated user
  router.post('/pl/templates', async (req, env) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const merged = {
      ...(body && typeof body === 'object' ? (body as Record<string, unknown>) : {}),
      created_by_ref: actorRef(req),
    };
    const result = validatePlanTemplateCreate(merged);
    if ('error' in result) return badRequest(result.error);
    return created(await new TemplateRepo(env.DB_PL).create(result.data));
  });

  // PATCH /pl/templates/:id — update template fields
  router.patch('/pl/templates/:id', async (req, env, { id }) => {
    const body = await readJson(req);
    if (body === undefined) return badRequest('Request body must be valid JSON');
    const result = validatePlanTemplatePatch(body);
    if ('error' in result) return badRequest(result.error);
    const row = await new TemplateRepo(env.DB_PL).patch(id, result.data);
    return row ? ok(row) : notFound(`template ${id}`);
  });
}
