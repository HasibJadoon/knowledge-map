// ─── /st/templates routes — reusable episode skeletons ────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, notFound, badRequest, unauthorized } from '../../../shared/src/response';
import type { StudioEnv } from '../env';
import { TemplateRepo, TemplateRow } from '../repositories/template.repo';
import { EPISODE_FORMATS } from '../repositories/episode.repo';
import { actorRef } from '../auth';
import { readJson } from '../../../shared/src/validate';


function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** DB row → API shape: structure_json is parsed into a structure object. */
function toApi(row: TemplateRow) {
  let structure: unknown = {};
  try {
    structure = JSON.parse(row.structure_json);
  } catch {
    structure = {};
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    format: row.format,
    is_builtin: row.is_builtin === 1,
    structure,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function templateRoutes(router: Router<StudioEnv>) {

  // GET /st/templates — built-in templates plus the caller's own
  router.get('/st/templates', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const rows = await new TemplateRepo(env.DB_ST).list(user);
    return ok(rows.map(toApi));
  });

  // GET /st/templates/:id
  router.get('/st/templates/:id', async (_req, env, { id }) => {
    const row = await new TemplateRepo(env.DB_ST).findById(id);
    return row ? ok(toApi(row)) : notFound(`template ${id}`);
  });

  // POST /st/templates — save a private template (e.g. "save episode as template")
  router.post('/st/templates', async (req, env) => {
    const user = actorRef(req);
    if (!user) return unauthorized('Authenticated user required');
    const body = await readJson(req);
    if (!isObj(body)) return badRequest('Request body must be a JSON object');

    const name = typeof body['name'] === 'string' ? body['name'].trim() : '';
    if (!name) return badRequest('name is required');

    const format = typeof body['format'] === 'string' ? body['format'] : 'podcast';
    if (!(EPISODE_FORMATS as readonly string[]).includes(format)) {
      return badRequest(`format must be one of: ${EPISODE_FORMATS.join(', ')}`);
    }

    if (!isObj(body['structure'])) {
      return badRequest('structure is required and must be a JSON object');
    }
    const description = typeof body['description'] === 'string' ? body['description'].trim() : null;

    const row = await new TemplateRepo(env.DB_ST).create({
      core_user_ref: user,
      name,
      description,
      format,
      structure_json: JSON.stringify(body['structure']),
    });
    return created(toApi(row));
  });
}
