// ─── /qr/pages routes — Mushaf page rendering ─────────────────────────────────
// GET /qr/pages/:page        — single mushaf page (ayahs + words + layout lines)
// GET /qr/surahs/:id/pages   — all page numbers for a surah (navigation index)

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { PageRepo } from '../repositories/page.repo';

export function pageRoutes(router: Router<QuranEnv>) {

  // GET /qr/pages/:page — full mushaf page payload
  router.get('/qr/pages/:page', async (_req, env, { page }) => {
    const pageNo = parseIntParam(page);
    if (!pageNo || pageNo < 1 || pageNo > 604)
      return badRequest('page must be an integer between 1 and 604');

    const data = await new PageRepo(env.DB_QR).byPageNumber(pageNo);
    return data ? ok(data) : notFound(`page ${pageNo}`);
  });

  // GET /qr/surahs/:id/pages — sorted list of page numbers for a surah
  router.get('/qr/surahs/:id/pages', async (_req, env, { id }) => {
    const surahId = parseIntParam(id);
    if (!surahId || surahId < 1 || surahId > 114)
      return badRequest('surah id must be between 1 and 114');

    const rows = await new PageRepo(env.DB_QR).pagesBySurah(surahId);
    return ok({ surah_id: surahId, pages: rows.map(r => r.page_number) });
  });
}
