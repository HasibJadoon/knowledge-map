// ─── /al/word-analysis — deep root layer for the word modal ───────────────────

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { ArLinguisticsEnv } from '../env';
import { WordAnalysisRepo } from '../repositories/word_analysis.repo';

export function wordAnalysisRoutes(router: Router<ArLinguisticsEnv>) {
  // GET /al/word-analysis?roots=زلف,كتب,…  → { [root_norm]: RootAnalysis }
  router.get('/al/word-analysis', async (req, env) => {
    const url = new URL(req.url);
    const raw = url.searchParams.get('roots');
    if (!raw) return badRequest('roots (comma-separated root_norm list) param required');
    const roots = raw.split(',').map(r => r.trim()).filter(Boolean);
    if (!roots.length) return badRequest('no valid roots supplied');
    return ok(await new WordAnalysisRepo(env.DB_AL).byRoots(roots));
  });
}
