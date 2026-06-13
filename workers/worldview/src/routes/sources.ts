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
import { query } from '../../../shared/src/db';
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
    if (!unit) return notFound(`unit ${id}`);

    // Structured reader content (headings, paragraphs, quotes, …) is stored in
    // meta_json so the reader can render real blocks instead of guessing types
    // heuristically from flat text.
    let meta: Record<string, unknown> | null = null;
    if (typeof unit.meta_json === 'string') {
      try { meta = JSON.parse(unit.meta_json) as Record<string, unknown>; } catch { meta = null; }
    }

    // Node-based reading content: assemble readingBlocks from the normalized
    // wv_unit_blocks rows when present; fall back to the meta_json blob.
    const blockRows = await query<Record<string, unknown>>(
      env.DB_WV,
      `SELECT id, parent_block_id, block_type, heading_level, order_index, text, cite,
              href, label, src, alt, title, ordered, items_json, table_json, anchor_slug, meta_json
         FROM wv_unit_blocks
        WHERE source_unit_id = ?
        ORDER BY order_index`,
      [id],
    ).catch(() => []);

    const parseJson = (v: unknown): unknown => {
      if (typeof v !== 'string') return undefined;
      try { return JSON.parse(v); } catch { return undefined; }
    };
    const assembledBlocks = blockRows.map((r) => {
      // Lossless rows store the full original block (e.g. couplets with
      // hemistichs + translation layers) in meta_json — use it verbatim.
      const full = parseJson(r['meta_json']);
      if (full && typeof full === 'object' && !Array.isArray(full)) return full;
      const table = parseJson(r['table_json']) as { headerRow?: unknown; rows?: unknown } | undefined;
      return {
        type: r['block_type'],
        level: r['heading_level'] ?? undefined,
        text: r['text'] ?? undefined,
        cite: r['cite'] ?? undefined,
        href: r['href'] ?? undefined,
        label: r['label'] ?? undefined,
        src: r['src'] ?? undefined,
        alt: r['alt'] ?? undefined,
        title: r['title'] ?? undefined,
        ordered: r['ordered'] == null ? undefined : !!r['ordered'],
        items: parseJson(r['items_json']) ?? undefined,
        headerRow: table?.headerRow ?? undefined,
        rows: table?.rows ?? undefined,
      };
    });

    // Attached documents / content / episodes for this section (typed CM refs).
    const attachments = await query<Record<string, unknown>>(
      env.DB_WV,
      `SELECT id, attachment_type, target_ref, target_kind, title, subtitle, summary,
              thumbnail_url, media_url, duration_sec, locator, link_role, order_index, block_ref, meta_json
         FROM wv_unit_attachments
        WHERE source_unit_id = ? AND status = 'active'
        ORDER BY attachment_type, order_index, created_at`,
      [id],
    ).catch(() => []);

    const byType = (type: string) => attachments.filter((a) => a['attachment_type'] === type);

    return ok({
      ...unit,
      readingBlocks: assembledBlocks.length ? assembledBlocks : (meta?.['readingBlocks'] ?? null),
      readingBody:   meta?.['readingBody']   ?? null,
      locatorLabel:  meta?.['locatorLabel']  ?? null,
      poem:          meta?.['poem']          ?? null,
      documents: byType('document'),
      content:   byType('content'),
      episodes:  byType('episode'),
    });
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

  // ── Unit attachments (documents / content / episodes per section) ─────────

  // POST /worldview/unit-attachment — attach a CM document/content/episode to a section
  router.post('/worldview/unit-attachment', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.source_unit_id) return badRequest('source_unit_id required');
    if (!b.target_ref) return badRequest('target_ref required');
    const type = String(b.attachment_type ?? 'document');
    if (!['document', 'content', 'episode'].includes(type)) {
      return badRequest('attachment_type must be document | content | episode');
    }
    const id = String(b.id ?? `wva-${crypto.randomUUID()}`);
    await query(env.DB_WV, `
      INSERT OR REPLACE INTO wv_unit_attachments
        (id, source_unit_id, source_id, attachment_type, target_ref, target_kind,
         title, subtitle, summary, thumbnail_url, media_url, duration_sec, locator,
         link_role, order_index, status, meta_json, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
    `, [
      id,
      String(b.source_unit_id),
      (b.source_id as string | null) ?? null,
      type,
      String(b.target_ref),
      (b.target_kind as string | null) ?? null,
      (b.title as string | null) ?? null,
      (b.subtitle as string | null) ?? null,
      (b.summary as string | null) ?? null,
      (b.thumbnail_url as string | null) ?? null,
      (b.media_url as string | null) ?? null,
      b.duration_sec != null ? Number(b.duration_sec) : null,
      (b.locator as string | null) ?? null,
      String(b.link_role ?? 'related'),
      b.order_index != null ? Number(b.order_index) : 0,
      String(b.status ?? 'active'),
      b.meta_json != null ? JSON.stringify(b.meta_json) : null,
    ]);
    return created({ id });
  });

  // DELETE /worldview/unit-attachment/:id
  router.delete('/worldview/unit-attachment/:id', async (_req, env, { id }) => {
    await query(env.DB_WV, `DELETE FROM wv_unit_attachments WHERE id = ?`, [id]);
    return ok({ id, deleted: true });
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
    const nodeScopeSql = `
      SELECT n.id
      FROM wv_nodes n
      WHERE json_extract(n.data_json, '$.source_unit_id') = ?
         OR json_extract(n.meta_json, '$.source_unit_id') = ?
    `;

    const [highlights, notes, wv, wv_node_edges, wv_evidence_links] = await Promise.all([
      query(env.DB_WV, `
        SELECT
          id,
          highlight_type AS note_kind,
          note AS title,
          text_excerpt AS body_md,
          text_excerpt AS excerpt_text,
          locator,
          color,
          created_at,
          'highlight' AS source
        FROM wv_highlights
        WHERE source_unit_id = ?
        ORDER BY created_at
      `, [id]),
      query(env.DB_WV, `
        SELECT
          id,
          note_type AS note_kind,
          title,
          body_md,
          json_extract(meta_json, '$.excerpt_text') AS excerpt_text,
          json_extract(meta_json, '$.locator') AS locator,
          created_at
        FROM wv_notes
        WHERE json_extract(meta_json, '$.source_unit_id') = ?
        ORDER BY created_at
      `, [id]),
      query(env.DB_WV, `
        SELECT
          id,
          node_type,
          title,
          COALESCE(json_extract(data_json, '$.text_plain'), summary, title) AS text_plain,
          summary,
          json_extract(data_json, '$.slug') AS slug,
          data_json,
          meta_json,
          created_at
        FROM wv_nodes
        WHERE json_extract(data_json, '$.source_unit_id') = ?
           OR json_extract(meta_json, '$.source_unit_id') = ?
        ORDER BY created_at
      `, [id, id]),
      query(env.DB_WV, `
        SELECT
          e.id,
          e.from_node_id,
          e.to_node_id,
          e.relation_type,
          e.weight AS strength,
          e.note,
          e.meta_json,
          e.created_at
        FROM wv_node_edges e
        WHERE e.from_node_id IN (${nodeScopeSql})
           OR e.to_node_id IN (${nodeScopeSql})
        ORDER BY e.created_at
      `, [id, id, id, id]),
      query(env.DB_WV, `
        SELECT
          id,
          json_extract(meta_json, '$.source_type') AS source_type,
          json_extract(meta_json, '$.source_ref_id') AS source_id,
          json_extract(meta_json, '$.target_node_id') AS target_node_id,
          json_extract(meta_json, '$.relation') AS relation,
          excerpt AS evidence_text,
          locator,
          title AS note,
          meta_json,
          created_at
        FROM wv_evidence_items
        WHERE source_unit_id = ?
           OR json_extract(meta_json, '$.source_unit_id') = ?
        ORDER BY created_at
      `, [id, id]),
    ]);

    return ok({
      unit_id: id,
      annotations: highlights,
      highlights,
      notes,
      wv,
      wv_node_edges,
      wv_evidence_links,
    });
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
