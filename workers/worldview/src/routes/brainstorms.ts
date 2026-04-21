// ─── /wv/brainstorm routes ────────────────────────────────────────────────────
// Brainstorm sessions (loose ideation + research capture).
// Table: wv_brainstorm_sessions (canonical name — NOT wv_brainstorms).
//
// The UI calls the SINGULAR path /wv/brainstorm — these routes match that exactly.
// Additional /wv/brainstorms (plural) aliases kept for compatibility with any
// Hub or internal tooling that may use the plural form.
//
// GET    /wv/brainstorm?limit=30       — list sessions
// POST   /wv/brainstorm               — create
// GET    /wv/brainstorm/:id            — detail
// PATCH  /wv/brainstorm/:id           — update
// GET    /wv/brainstorms              — alias for list (plural)
// GET    /wv/brainstorms/:id          — alias for detail (plural)
// POST   /wv/brainstorms              — alias for create (plural)
// PATCH  /wv/brainstorms/:id         — alias for patch (plural)

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { BrainstormRepo } from '../repositories/brainstorm.repo';

const DEFAULT_USER = 'CORE:00000000000000000000000000';  // placeholder when no auth context

export function brainstormRoutes(router: Router<WorldviewEnv>) {

  // ── List (singular — UI path) ─────────────────────────────────────────────

  router.get('/wv/brainstorm', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new BrainstormRepo(env.DB_WV).list({
        topic_id:    url.searchParams.get('topic') ?? undefined,
        status:      url.searchParams.get('status') ?? undefined,
        core_ws_ref: url.searchParams.get('workspace') ?? undefined,
        ...parsePagination(url),
      }),
    );
  });

  // ── Detail (singular) ────────────────────────────────────────────────────

  router.get('/wv/brainstorm/:id', async (_req, env, { id }) => {
    const row = await new BrainstormRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`brainstorm ${id}`);
  });

  // ── Create (singular — UI path) ──────────────────────────────────────────

  router.post('/wv/brainstorm', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title) return badRequest('title required');
    return created(await new BrainstormRepo(env.DB_WV).create({
      title:          String(b.title),
      topic_id:       (b.topic_id       as string | null) ?? null,
      tradition_id:   (b.tradition_id   as string | null) ?? null,
      moral_axis_id:  (b.moral_axis_id  as string | null) ?? null,
      body_md:        (b.body_md        as string | null) ?? null,
      tags_json:      (b.tags_json      as string | null) ?? null,
      core_user_ref:  b.core_user_ref ? String(b.core_user_ref) : DEFAULT_USER,
      core_ws_ref:    (b.core_ws_ref    as string | null) ?? null,
    }));
  });

  // ── Patch (singular) ─────────────────────────────────────────────────────

  router.patch('/wv/brainstorm/:id', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    const row = await new BrainstormRepo(env.DB_WV).patch(id, {
      title:        b.title        as string | undefined,
      topic_id:     b.topic_id     as string | null | undefined,
      tradition_id: b.tradition_id as string | null | undefined,
      body_md:      b.body_md      as string | null | undefined,
      tags_json:    b.tags_json    as string | null | undefined,
      status:       b.status       as 'active' | 'paused' | 'complete' | 'archived' | undefined,
    });
    return row ? ok(row) : notFound(`brainstorm ${id}`);
  });

  // ── Plural aliases (Hub / internal) ──────────────────────────────────────

  router.get('/wv/brainstorms', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new BrainstormRepo(env.DB_WV).list({
        topic_id: url.searchParams.get('topic') ?? undefined,
        ...parsePagination(url),
      }),
    );
  });

  router.get('/wv/brainstorms/:id', async (_req, env, { id }) => {
    const row = await new BrainstormRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`brainstorm ${id}`);
  });

  router.post('/wv/brainstorms', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title) return badRequest('title required');
    return created(await new BrainstormRepo(env.DB_WV).create({
      title:         String(b.title),
      topic_id:      (b.topic_id as string | null) ?? null,
      body_md:       (b.body_md  as string | null) ?? null,
      core_user_ref: b.core_user_ref ? String(b.core_user_ref) : DEFAULT_USER,
    }));
  });

  router.patch('/wv/brainstorms/:id', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    const row = await new BrainstormRepo(env.DB_WV).patch(id, {
      title:   b.title   as string | undefined,
      body_md: b.body_md as string | null | undefined,
      status:  b.status  as 'active' | 'paused' | 'complete' | 'archived' | undefined,
    });
    return row ? ok(row) : notFound(`brainstorm ${id}`);
  });
}
