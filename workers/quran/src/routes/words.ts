// ─── /qr/words routes ─────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination, parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { WordRepo } from '../repositories/word.repo';

export function wordRoutes(router: Router<QuranEnv>) {

  // GET /qr/words?surah=1&ayah=1 — word list for an ayah
  router.get('/qr/words', async (req, env) => {
    const url = new URL(req.url);
    const surah = parseIntParam(url.searchParams.get('surah') ?? '');
    const ayah  = parseIntParam(url.searchParams.get('ayah')  ?? '');
    if (!surah) return badRequest('surah param is required');

    const repo = new WordRepo(env.DB_QR);

    // Single ayah
    if (ayah) return ok(await repo.byAyah(surah, ayah));

    // Range: ?surah=2&from=1&to=7
    const from = parseIntParam(url.searchParams.get('from') ?? '');
    const to   = parseIntParam(url.searchParams.get('to')   ?? '');
    if (from && to) return ok(await repo.byRange(surah, from, to));

    return badRequest('Provide ayah or from+to range');
  });

  // GET /qr/words/by-lemma?ref=AL:01HY2...&page=1
  router.get('/qr/words/by-lemma', async (req, env) => {
    const url  = new URL(req.url);
    const ref  = url.searchParams.get('ref');
    if (!ref) return badRequest('ref (AL:ULID) param required');
    return paginated(await new WordRepo(env.DB_QR).byLemmaRef(ref, parsePagination(url)));
  });

  // GET /qr/words/by-root?root=كتب&page=1
  router.get('/qr/words/by-root', async (req, env) => {
    const url  = new URL(req.url);
    const root = url.searchParams.get('root');
    if (!root) return badRequest('root param required');
    return paginated(await new WordRepo(env.DB_QR).byRoot(root, parsePagination(url)));
  });
}
