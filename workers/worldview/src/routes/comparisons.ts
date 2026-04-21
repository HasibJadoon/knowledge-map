// ─── /wv/comparisons routes ───────────────────────────────────────────────────
// Parallel comparison grids — the /worldview/compare/:cid experience screen.
// Schema: wv_comparisons + wv_comparison_axes + wv_comparison_rows + cells.
//
// GET  /wv/comparisons?limit=20              — list comparisons
// GET  /wv/comparisons/:id                   — full detail (axes + rows + cells)
// POST /wv/comparisons                        — create comparison
// PATCH /wv/comparisons/:id                  — patch title / type
// POST /wv/comparisons/:id/axes             — add an axis (what is compared)
// POST /wv/comparisons/:id/rows             — add a row (entity being compared)
// PUT  /wv/comparisons/cells                 — upsert a cell (row × axis)
// PATCH /wv/comparisons/cells/:cellId        — update cell content

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { WorldviewEnv } from '../env';
import { ComparisonRepo } from '../repositories/comparison.repo';

export function comparisonRoutes(router: Router<WorldviewEnv>) {

  // ── List ──────────────────────────────────────────────────────────────────

  // GET /wv/comparisons?comparison_type=tradition&limit=20
  router.get('/wv/comparisons', async (req, env) => {
    const url = new URL(req.url);
    return paginated(
      await new ComparisonRepo(env.DB_WV).list({
        comparison_type: url.searchParams.get('comparison_type'),
        ...parsePagination(url),
      }),
    );
  });

  // ── Detail ────────────────────────────────────────────────────────────────

  // GET /wv/comparisons/:id — full comparison with axes + rows + cells
  router.get('/wv/comparisons/:id', async (_req, env, { id }) => {
    const detail = await new ComparisonRepo(env.DB_WV).findById(id);
    return detail ? ok(detail) : notFound(`comparison ${id}`);
  });

  // ── Create ────────────────────────────────────────────────────────────────

  // POST /wv/comparisons
  router.post('/wv/comparisons', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.title) return badRequest('title required');
    return created(await new ComparisonRepo(env.DB_WV).create({
      title:           String(b.title),
      slug:            b.slug            ? String(b.slug)            : undefined,
      comparison_type: b.comparison_type ? String(b.comparison_type) : undefined,
      description_md:  (b.description_md as string | null) ?? null,
    }));
  });

  // ── Patch ─────────────────────────────────────────────────────────────────

  // PATCH /wv/comparisons/:id
  router.patch('/wv/comparisons/:id', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    const row = await new ComparisonRepo(env.DB_WV).patch(id, {
      title:           b.title           as string | undefined,
      comparison_type: b.comparison_type as string | undefined,
      description_md:  b.description_md  as string | null | undefined,
    });
    return row ? ok(row) : notFound(`comparison ${id}`);
  });

  // ── Axes (what is being compared) ─────────────────────────────────────────

  // POST /wv/comparisons/:id/axes — add comparison axis
  router.post('/wv/comparisons/:id/axes', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.axis_label) return badRequest('axis_label required');
    return created(await new ComparisonRepo(env.DB_WV).addAxis({
      comparison_id:   id,
      axis_label:      String(b.axis_label),
      moral_axis_id:   (b.moral_axis_id as string | null) ?? null,
      axis_description: (b.axis_description as string | null) ?? null,
      sort_order:      b.sort_order != null ? Number(b.sort_order) : 0,
    }));
  });

  // ── Rows (entities being compared — appear as columns in the UI) ──────────

  // POST /wv/comparisons/:id/rows — add a comparison row (tradition/school/etc.)
  router.post('/wv/comparisons/:id/rows', async (req, env, { id }) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.entity_type || !b.entity_id || !b.row_label)
      return badRequest('entity_type, entity_id, and row_label required');
    return created(await new ComparisonRepo(env.DB_WV).addRow({
      comparison_id: id,
      entity_type:   String(b.entity_type),
      entity_id:     String(b.entity_id),
      row_label:     String(b.row_label),
      sort_order:    b.sort_order != null ? Number(b.sort_order) : 0,
    }));
  });

  // ── Cells ─────────────────────────────────────────────────────────────────

  // PUT /wv/comparisons/cells — upsert a cell (row × axis)
  router.put('/wv/comparisons/cells', async (req, env) => {
    const b = await req.json() as Record<string, unknown>;
    if (!b.comparison_id || !b.row_id || !b.axis_id)
      return badRequest('comparison_id, row_id, and axis_id required');
    const cell = await new ComparisonRepo(env.DB_WV).upsertCell({
      comparison_id: String(b.comparison_id),
      row_id:        String(b.row_id),
      axis_id:       String(b.axis_id),
      cell_text:     (b.cell_text     as string | null) ?? null,
      stance:        (b.stance        as string | null) ?? null,
      evidence_ids:  (b.evidence_ids  as string | null) ?? null,
      tension_note:  (b.tension_note  as string | null) ?? null,
    });
    return ok(cell);
  });

  // PATCH /wv/comparisons/cells/:cellId — edit cell content
  router.patch('/wv/comparisons/cells/:cellId', async (req, env, { cellId }) => {
    const b    = await req.json() as Record<string, unknown>;
    const cell = await new ComparisonRepo(env.DB_WV).patchCell(cellId, {
      cell_text:    b.cell_text    as string | null | undefined,
      stance:       b.stance       as string | null | undefined,
      tension_note: b.tension_note as string | null | undefined,
    });
    return cell ? ok(cell) : notFound(`cell ${cellId}`);
  });
}
