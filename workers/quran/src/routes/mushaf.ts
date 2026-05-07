// ─── /qr/mushaf routes — Quran.com-style Mushaf layout pages ─────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, internalError } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import {
  QR_MUSHAF_DEFAULT_LAYOUT,
  QR_MUSHAF_MAX_PAGE,
  QR_MUSHAF_MIN_PAGE,
} from '../schemas/mushaf.schema';
import { MushafRepo } from '../repositories/mushaf.repo';

export function mushafRoutes(router: Router<QuranEnv>) {
  router.get('/qr/mushaf/pages/:page', async (req, env, { page }) => {
    const pageNo = parseIntParam(page);
    if (!pageNo || pageNo < QR_MUSHAF_MIN_PAGE || pageNo > QR_MUSHAF_MAX_PAGE) {
      return badRequest(`page must be an integer between ${QR_MUSHAF_MIN_PAGE} and ${QR_MUSHAF_MAX_PAGE}`);
    }

    const url = new URL(req.url);
    const layout = url.searchParams.get('layout') || QR_MUSHAF_DEFAULT_LAYOUT;

    try {
      const data = await new MushafRepo(env.DB_QR).byPageNumber(pageNo, layout);
      return data ? ok(data) : notFound(`mushaf page ${pageNo}`);
    } catch (err) {
      console.error('[qr/mushaf/pages]', err);
      return internalError('Failed to load mushaf page');
    }
  });
}
