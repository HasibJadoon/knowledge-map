// ─── /al/coverage routes ──────────────────────────────────────────────────────
// Root completeness, computed from ar_ling_reg_sub_layer at request time.
// Never store a coverage snapshot: qr_morph_display_root.lens_coverage_json was
// exactly that and drifted out of sync with the blocks it described.

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { queryOne, query } from '../../../shared/src/db';
import type { ArLinguisticsEnv } from '../env';
import { CoverageRepo } from '../repositories/coverage.repo';

interface RootRow {
  id: string;
  root_text: string;
  canonical_id: string | null;
  buckwalter: string | null;
  frequency_quran: number;
}

export function coverageRoutes(router: Router<ArLinguisticsEnv>) {

  // GET /al/coverage/layers — the checklist itself (what "complete" means)
  router.get('/al/coverage/layers', async (_req, env) => {
    return ok(await new CoverageRepo(env.DB_AL).subLayers());
  });

  // GET /al/coverage/drift — standing registry integrity check
  router.get('/al/coverage/drift', async (_req, env) => {
    const [dead, unmapped, idDrift] = await Promise.all([
      query(env.DB_AL, `SELECT source, ref, ctx FROM v_registry_dead_refs`),
      query(env.DB_AL, `SELECT table_name FROM v_registry_unmapped ORDER BY table_name`),
      query(env.DB_AL, `SELECT tbl, id FROM v_id_convention_drift LIMIT 50`),
    ]);
    return ok({
      dead_refs: dead,
      unmapped_tables: unmapped,
      id_convention_drift: idDrift,
      clean: dead.length === 0 && idDrift.length === 0,
    });
  });

  // GET /al/coverage/root/:root — per-sub-layer completeness for one root
  router.get('/al/coverage/root/:root', async (_req, env, { root }) => {
    const rootNorm = decodeURIComponent(root ?? '').trim();
    if (!rootNorm) return badRequest('root param required');

    const row = await queryOne<RootRow>(
      env.DB_AL,
      `SELECT id, root_text, canonical_id, buckwalter, frequency_quran
         FROM ar_ling_roots
        WHERE root_text = ? OR root_normalized = ?
        LIMIT 1`,
      [rootNorm, rootNorm],
    );
    if (!row) return notFound(`root ${rootNorm}`);

    const layers = await new CoverageRepo(env.DB_AL).forRoot({
      root_norm: row.root_text,
      root_id: row.id,
      buckwalter: row.buckwalter,
    });
    const applicable = layers.filter((l) => l.state !== 'no_carrier');
    const built = applicable.filter((l) => l.state === 'built');

    return ok({
      root: row.root_text,
      root_id: row.id,
      // canonical_id is the cross-domain join key: qr_root_registry.root_uid
      qr_root_uid: row.canonical_id,
      frequency_quran: row.frequency_quran,
      is_quranic: row.frequency_quran > 0,
      summary: {
        layers_total: layers.length,
        layers_applicable: applicable.length,
        layers_built: built.length,
        percent: applicable.length
          ? Math.round((built.length / applicable.length) * 100)
          : 0,
      },
      layers,
    });
  });
}
