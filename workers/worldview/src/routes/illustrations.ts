// ─── /worldview/illustrations routes ──────────────────────────────────────────
// Per-source-unit visual illustrations (wv_source_unit_illustrations). A unit
// owns 1..N illustrations, each a complete self-contained HTML document stored
// verbatim and served as-is. Plural GET paths match the source/unit reader
// convention; singular POST/PUT/DELETE match /worldview/source + /worldview/unit.
//
// GET    /worldview/units/:id/illustrations        — list for a unit (no html_content)
// GET    /worldview/sources/:id/illustrations      — list for a whole source
// GET    /worldview/illustrations/:id              — JSON detail (includes html_content)
// GET    /worldview/illustrations/:id/page         — raw HTML document (text/html)
// POST   /worldview/illustration                   — create (body.source_unit_id + html_content)
// PUT    /worldview/illustration                   — update (body.id required)
// DELETE /worldview/illustration/:id               — delete

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { IllustrationRepo } from '../repositories/illustration.repo';

/** Serve a full HTML document verbatim. */
function htmlPage(html: string): Response {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
    },
  });
}

export function illustrationRoutes(router: Router<WorldviewEnv>) {

  // ── List for a unit ───────────────────────────────────────────────────────────

  router.get('/worldview/units/:id/illustrations', async (req, env, { id }) => {
    const url = new URL(req.url);
    return paginated(
      await new IllustrationRepo(env.DB_WV).listByUnit(id, parsePagination(url)),
    );
  });

  // Legacy alias for Hub / internal callers.
  router.get('/wv/units/:id/illustrations', async (req, env, { id }) => {
    const url = new URL(req.url);
    return paginated(
      await new IllustrationRepo(env.DB_WV).listByUnit(id, parsePagination(url)),
    );
  });

  // ── List for a reading session (the reading block within a chapter) ───────────

  router.get('/worldview/reading-sessions/:id/illustrations', async (req, env, { id }) => {
    const url = new URL(req.url);
    return paginated(
      await new IllustrationRepo(env.DB_WV).listByReadingSession(id, parsePagination(url)),
    );
  });

  // ── List for a whole source ───────────────────────────────────────────────────

  router.get('/worldview/sources/:id/illustrations', async (req, env, { id }) => {
    const url = new URL(req.url);
    return paginated(
      await new IllustrationRepo(env.DB_WV).listBySource(id, parsePagination(url)),
    );
  });

  // ── Detail (JSON, includes html_content) ──────────────────────────────────────

  router.get('/worldview/illustrations/:id', async (_req, env, { id }) => {
    const row = await new IllustrationRepo(env.DB_WV).findById(id);
    return row ? ok(row) : notFound(`illustration ${id}`);
  });

  // ── Rendered page (raw HTML — for <iframe> embedding or opening directly) ──────

  router.get('/worldview/illustrations/:id/page', async (_req, env, { id }) => {
    const row = await new IllustrationRepo(env.DB_WV).findById(id);
    if (!row) return notFound(`illustration ${id}`);
    return htmlPage(row.html_content);
  });

  // ── Create (singular — UI path) ──────────────────────────────────────────────

  router.post('/worldview/illustration', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.source_unit_id) return badRequest('source_unit_id required');
    if (!b.html_content)   return badRequest('html_content required');
    return created(await new IllustrationRepo(env.DB_WV).create({
      source_unit_id: String(b.source_unit_id),
      source_id:      (b.source_id   as string | null) ?? null,
      slug:           (b.slug        as string | null) ?? null,
      order_index:    b.order_index != null ? Number(b.order_index) : undefined,
      title:          (b.title       as string | null) ?? null,
      caption:        (b.caption     as string | null) ?? null,
      theme:          b.theme ? String(b.theme) : undefined,
      html_content:   String(b.html_content),
      meta_json:      (b.meta_json   as string | null) ?? null,
      reading_session_id: (b.reading_session_id as string | null) ?? null,
    }));
  });

  // ── Update (singular — body.id required) ─────────────────────────────────────

  router.put('/worldview/illustration', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.id) return badRequest('id required');
    const row = await new IllustrationRepo(env.DB_WV).patch(String(b.id), {
      source_unit_id: b.source_unit_id as string | undefined,
      source_id:      b.source_id      as string | null | undefined,
      slug:           b.slug           as string | null | undefined,
      order_index:    b.order_index != null ? Number(b.order_index) : undefined,
      title:          b.title          as string | null | undefined,
      caption:        b.caption        as string | null | undefined,
      theme:          b.theme          as string | undefined,
      html_content:   b.html_content   as string | undefined,
      meta_json:      b.meta_json      as string | null | undefined,
      reading_session_id: b.reading_session_id as string | null | undefined,
    });
    return row ? ok(row) : notFound(`illustration ${b.id}`);
  });

  // ── Delete (singular) ────────────────────────────────────────────────────────

  router.delete('/worldview/illustration/:id', async (_req, env, { id }) => {
    await new IllustrationRepo(env.DB_WV).delete(id);
    return ok({ id, deleted: true });
  });
}
