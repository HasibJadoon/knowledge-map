// ─── /qr/srs routes — Spaced Repetition System queue ─────────────────────────
// GET /qr/srs?filter=due|upcoming|all|suspended&surah=1&limit=80

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import type { QuranEnv } from '../env';
import { SrsRepo, type SrsFilter } from '../repositories/srs.repo';

const VALID_FILTERS = new Set<SrsFilter>(['due', 'upcoming', 'all', 'suspended']);

export function srsRoutes(router: Router<QuranEnv>) {

  // GET /qr/srs — SRS review queue with summary counts
  router.get('/qr/srs', async (req, env) => {
    const url = new URL(req.url);

    const rawFilter = url.searchParams.get('filter') ?? 'due';
    if (!VALID_FILTERS.has(rawFilter as SrsFilter))
      return badRequest(`filter must be one of: ${[...VALID_FILTERS].join(', ')}`);
    const filter = rawFilter as SrsFilter;

    const rawSurah = url.searchParams.get('surah');
    const surahId  = rawSurah ? parseInt(rawSurah, 10) : null;
    if (rawSurah && (!Number.isInteger(surahId) || surahId! < 1 || surahId! > 114))
      return badRequest('surah must be an integer between 1 and 114');

    const rawLimit = url.searchParams.get('limit');
    const limit    = rawLimit ? Math.min(250, Math.max(1, parseInt(rawLimit, 10) || 80)) : 80;

    return ok(await new SrsRepo(env.DB_QR).list(filter, surahId, limit));
  });
}
