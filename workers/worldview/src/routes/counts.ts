// ─── /worldview/counts route ──────────────────────────────────────────────────
// Lightweight aggregate counts backing the Worldview home stat strip
// (Worldviews · Sources · Units · People).
//
// GET /worldview/counts → { worldviews, sources, source_units, people }

import type { Router } from '../../../shared/src/router';
import { ok } from '../../../shared/src/response';
import { queryOne } from '../../../shared/src/db';
import type { WorldviewEnv } from '../env';

interface WorldviewCounts {
  worldviews: number;
  sources: number;
  source_units: number;
  people: number;
}

export function countsRoutes(router: Router<WorldviewEnv>) {
  router.get('/worldview/counts', async (_req, env) => {
    const row = await queryOne<WorldviewCounts>(
      env.DB_WV,
      `SELECT
         (SELECT COUNT(*) FROM wv_traditions)   AS worldviews,
         (SELECT COUNT(*) FROM wv_sources)      AS sources,
         (SELECT COUNT(*) FROM wv_source_units) AS source_units,
         (SELECT COUNT(*) FROM wv_people)       AS people`,
    );
    return ok<WorldviewCounts>(
      row ?? { worldviews: 0, sources: 0, source_units: 0, people: 0 },
    );
  });
}
