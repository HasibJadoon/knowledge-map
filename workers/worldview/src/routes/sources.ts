// ─── /worldview/sources + /worldview/units routes ─────────────────────────────
// These are the PRIMARY UI-facing endpoints used by both Ionic and Desktop apps.
// Paths match what the frontend services call exactly:
//
// GET    /worldview/sources              — list (also: /wv/sources legacy)
// GET    /worldview/sources/:id          — source detail with units
// POST   /worldview/source               — create (note: singular in UI)
// PUT    /worldview/source               — update (note: singular in UI, body.id required)
// GET    /worldview/units/:id            — unit detail
// POST   /worldview/unit                 — create unit
// PUT    /worldview/unit                 — update unit (body.id required)
// GET    /worldview/units/:id/annotations — highlights for a unit
// GET    /worldview/source-content        — chunks (?source_id=&source_unit_id=)
// GET    /worldview/workflow              — composite: sources + people + notes summary

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { SourceRepo } from '../repositories/source.repo';
import { HighlightRepo } from '../repositories/highlight.repo';

export function sourceRoutes(router: Router<WorldviewEnv>) {

  // ── Source list ───────────────────────────────────────────────────────────

  // GET /worldview/sources?domain=&source_type=&limit=
  router.get('/worldview/sources', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new SourceRepo(env.DB_WV).list({
        domain:      url.searchParams.get('domain'),
        source_type: url.searchParams.get('source_type'),
        ...parsePagination(url),
      }),
    );
  });

  // Legacy alias: GET /wv/sources (same behaviour)
  router.get('/wv/sources', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new SourceRepo(env.DB_WV).list({
        domain: url.searchParams.get('domain'),
        ...parsePagination(url),
      }),
    );
  });

  // ── Source detail ─────────────────────────────────────────────────────────

  // GET /worldview/sources/:id  — source row + all units
  router.get('/worldview/sources/:id', async (_req, env, { id }) => {
    const repo   = new SourceRepo(env.DB_WV);
    const source = await repo.findById(id);
    if (!source) return notFound(`source ${id}`);

    const unitsPage = await repo.units(id, { per_page: 200 });
    return ok({ ...source, units: unitsPage.rows });
  });

  // Legacy alias: GET /wv/sources/:id
  router.get('/wv/sources/:id', async (_req, env, { id }) => {
    const repo   = new SourceRepo(env.DB_WV);
    const source = await repo.findById(id);
    if (!source) return notFound(`source ${id}`);
    const unitsPage = await repo.units(id, { per_page: 200 });
    return ok({ ...source, units: unitsPage.rows });
  });

  // ── Source CRUD ───────────────────────────────────────────────────────────

  // POST /worldview/source — create
  router.post('/worldview/source', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title) return badRequest('title required');
    return created(await new SourceRepo(env.DB_WV).create({
      title:          String(b.title),
      title_ar:       (b.title_ar as string | null) ?? null,
      source_type:    b.source_type  ? String(b.source_type)  : undefined,
      source_domain:  b.source_domain ? String(b.source_domain) : undefined,
      tradition_id:   (b.tradition_id as string | null) ?? null,
      language:       b.language ? String(b.language) : undefined,
      published_year: b.published_year ? Number(b.published_year) : undefined,
      publisher:      (b.publisher as string | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
      url:            (b.url as string | null) ?? null,
      slug:           (b.slug as string | null) ?? null,
    }));
  });

  // PUT /worldview/source — update (body must include id)
  router.put('/worldview/source', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.id) return badRequest('id required');
    const row = await new SourceRepo(env.DB_WV).patch(String(b.id), {
      title:          b.title          as string | undefined,
      title_ar:       b.title_ar       as string | null | undefined,
      source_type:    b.source_type    as string | undefined,
      source_domain:  b.source_domain  as string | undefined,
      tradition_id:   b.tradition_id   as string | null | undefined,
      language:       b.language       as string | undefined,
      published_year: b.published_year != null ? Number(b.published_year) : undefined,
      publisher:      b.publisher      as string | null | undefined,
      description_md: b.description_md as string | null | undefined,
      url:            b.url            as string | null | undefined,
      slug:           b.slug           as string | null | undefined,
    });
    return row ? ok(row) : notFound(`source ${b.id}`);
  });

  // ── Unit detail ───────────────────────────────────────────────────────────

  // GET /worldview/units/:id
  router.get('/worldview/units/:id', async (_req, env, { id }) => {
    const unit = await new SourceRepo(env.DB_WV).findUnitById(id);
    return unit ? ok(unit) : notFound(`unit ${id}`);
  });

  // ── Unit CRUD ─────────────────────────────────────────────────────────────

  // POST /worldview/unit — create
  router.post('/worldview/unit', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.source_id) return badRequest('source_id required');
    return created(await new SourceRepo(env.DB_WV).createUnit({
      source_id:      String(b.source_id),
      parent_id:      (b.parent_id as string | null) ?? null,
      unit_type:      b.unit_type ? String(b.unit_type) : undefined,
      title:          (b.title as string | null) ?? null,
      unit_index:     b.unit_index != null ? Number(b.unit_index) : undefined,
      page_start:     b.page_start != null ? Number(b.page_start) : undefined,
      page_end:       b.page_end   != null ? Number(b.page_end)   : undefined,
      text_excerpt:   (b.text_excerpt   as string | null) ?? null,
      description_md: (b.description_md as string | null) ?? null,
    }));
  });

  // PUT /worldview/unit — update (body must include id)
  router.put('/worldview/unit', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.id) return badRequest('id required');
    const unit = await new SourceRepo(env.DB_WV).patchUnit(String(b.id), {
      title:          b.title          as string | null | undefined,
      unit_type:      b.unit_type      as string | undefined,
      unit_index:     b.unit_index != null ? Number(b.unit_index) : undefined,
      page_start:     b.page_start != null ? Number(b.page_start) : undefined,
      page_end:       b.page_end   != null ? Number(b.page_end)   : undefined,
      text_excerpt:   b.text_excerpt   as string | null | undefined,
      description_md: b.description_md as string | null | undefined,
    });
    return unit ? ok(unit) : notFound(`unit ${b.id}`);
  });

  // ── Legacy: /wv/sources/:id/units ────────────────────────────────────────

  router.get('/wv/sources/:id/units', async (req, env, { id }) => {
    const url  = new URL(req.url);
    const page = await new SourceRepo(env.DB_WV).units(id, parsePagination(url));
    return paginated(page);
  });

  // ── Annotations (highlights for a unit) ──────────────────────────────────

  // GET /worldview/units/:id/annotations
  router.get('/worldview/units/:id/annotations', async (_req, env, { id }) => {
    const highlights = await new HighlightRepo(env.DB_WV).byUnit(id);
    return ok({ unit_id: id, annotations: highlights });
  });

  // ── Source content (chunks) ───────────────────────────────────────────────

  // GET /worldview/source-content?source_id=&source_unit_id=&limit=
  router.get('/worldview/source-content', async (req, env) => {
    const url          = new URL(req.url);
    const source_id    = url.searchParams.get('source_id');
    const unit_id      = url.searchParams.get('source_unit_id');
    if (!source_id) return badRequest('source_id required');

    const page = await new SourceRepo(env.DB_WV).chunksBySource(
      source_id, unit_id, parsePagination(url),
    );
    return paginated(page);
  });

  // ── Workflow composite ────────────────────────────────────────────────────

  // GET /worldview/workflow — sources list enriched with unit counts
  // Used by the Ionic WorldviewApiService to bootstrap the whole workflow screen.
  router.get('/worldview/workflow', async (_req, env) => {
    const sources = await new SourceRepo(env.DB_WV).workflowSources();
    return ok({ sources });
  });

  // ── POST /wv/sources (legacy) ─────────────────────────────────────────────

  router.post('/wv/sources', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title) return badRequest('title required');
    return created(await new SourceRepo(env.DB_WV).create({
      title:         String(b.title),
      source_domain: b.source_domain ? String(b.source_domain) : undefined,
      tradition_id:  (b.tradition_id as string | null) ?? null,
      language:      b.language ? String(b.language) : undefined,
    }));
  });
}
