// ─── /qr/pages routes — Mushaf page rendering ─────────────────────────────────
// GET /qr/pages/:page        — single mushaf page (ayahs + words + layout lines)
// GET /qr/surahs/:id/pages   — all page numbers for a surah (navigation index)

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import type { QuranEnv } from '../env';
import { PageRepo } from '../repositories/page.repo';
import {
  validateQrPageParams,
  validateQrSurahPagesParams,
  type QrSurahPages,
} from '../schemas/page.schema';

export function pageRoutes(router: Router<QuranEnv>) {

  // GET /qr/pages/:page — full mushaf page payload
  router.get('/qr/pages/:page', async (_req, env, { page }) => {
    const result = validateQrPageParams(page);
    if ('error' in result) return badRequest(result.error);
    const pageNo = result.data.page;

    const data = await new PageRepo(env.DB_QR).byPageNumber(pageNo);
    return data ? ok(data) : notFound(`page ${pageNo}`);
  });

  // GET /qr/surahs/:id/pages — sorted list of page numbers for a surah
  router.get('/qr/surahs/:id/pages', async (_req, env, { id }) => {
    const result = validateQrSurahPagesParams(id);
    if ('error' in result) return badRequest(result.error);
    const surahId = result.data.surah_id;

    const rows = await new PageRepo(env.DB_QR).pagesBySurah(surahId);
    const data: QrSurahPages = { surah_id: surahId, pages: rows.map(r => r.page_number) };
    return ok(data);
  });
}
