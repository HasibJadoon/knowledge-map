// ─── /wv/insights routes — AI review queue ────────────────────────────────────
// Claude writes suggestions here; Hub Review Queue lets humans approve/reject.
// Status flow: suggested → approved | edited | rejected → saved

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { InsightRepo } from '../repositories/insight.repo';

export function insightRoutes(router: Router<WorldviewEnv>) {

  // GET /wv/insights?status=suggested&batch=WV:ULID — review queue
  router.get('/wv/insights', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new InsightRepo(env.DB_WV).queue(
        url.searchParams.get('status'),
        url.searchParams.get('batch'),
        parsePagination(url),
      ),
    );
  });

  // GET /wv/insights/:id
  router.get('/wv/insights/:id', async (_req, env, { id }) => {
    const row = await new InsightRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`insight ${id}`);
  });

  // POST /wv/insights — AI pipeline writes suggestions here
  router.post('/wv/insights', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.suggestion_type || !b.payload_json)
      return badRequest('suggestion_type and payload_json required');
    return created(await new InsightRepo(env.DB_WV).create({
      suggestion_type:  String(b.suggestion_type),
      payload_json:     typeof b.payload_json === 'string'
                          ? b.payload_json
                          : JSON.stringify(b.payload_json),
      batch_id:         (b.batch_id as string | null) ?? null,
      source_chunk_ref: (b.source_chunk_ref as string | null) ?? null,
    }));
  });

  // PATCH /wv/insights/:id/approve — human approves (optionally edits payload)
  router.patch('/wv/insights/:id/approve', async (req, env, { id }) => {
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const payload = b.payload_json != null
      ? (typeof b.payload_json === 'string' ? b.payload_json : JSON.stringify(b.payload_json))
      : undefined;
    const row = await new InsightRepo(env.DB_WV).setStatus(
      id, payload ? 'edited' : 'approved', payload,
    );
    return row ? ok(row) : notFound(`insight ${id}`);
  });

  // PATCH /wv/insights/:id/reject
  router.patch('/wv/insights/:id/reject', async (_req, env, { id }) => {
    const row = await new InsightRepo(env.DB_WV).setStatus(id, 'rejected');
    return row ? ok(row) : notFound(`insight ${id}`);
  });

  // PATCH /wv/insights/:id/save — mark as written to target DB tables
  router.patch('/wv/insights/:id/save', async (_req, env, { id }) => {
    const row = await new InsightRepo(env.DB_WV).setStatus(id, 'saved');
    return row ? ok(row) : notFound(`insight ${id}`);
  });
}
