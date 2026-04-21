// ─── /qr/translations routes ──────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { TranslationRepo } from '../repositories/translation.repo';

export function translationRoutes(router: Router<QuranEnv>) {

  // GET /qr/translation-sources — list all translation editions
  router.get('/qr/translation-sources', async (_req, env) => {
    return ok(await new TranslationRepo(env.DB_QR).listSources());
  });

  // GET /qr/translation-sources/:id
  router.get('/qr/translation-sources/:id', async (_req, env, { id }) => {
    const src = await new TranslationRepo(env.DB_QR).findSource(id);
    return src ? ok(src) : notFound(`translation source ${id}`);
  });

  // GET /qr/translations?surah=1&ayah=1 — all translations for one ayah
  router.get('/qr/translations', async (req, env) => {
    const url   = new URL(req.url);
    const surah = parseIntParam(url.searchParams.get('surah') ?? '');
    const ayah  = parseIntParam(url.searchParams.get('ayah')  ?? '');
    if (!surah || !ayah) return badRequest('surah and ayah params required');
    return ok(await new TranslationRepo(env.DB_QR).byAyah(surah, ayah));
  });

  // GET /qr/translations/range?source=QR:...&surah=2&from=1&to=10
  router.get('/qr/translations/range', async (req, env) => {
    const url    = new URL(req.url);
    const source = url.searchParams.get('source');
    const surah  = parseIntParam(url.searchParams.get('surah') ?? '');
    const from   = parseIntParam(url.searchParams.get('from')  ?? '');
    const to     = parseIntParam(url.searchParams.get('to')    ?? '');

    if (!source) return badRequest('source param (QR:ULID) required');
    if (!surah || !from || !to) return badRequest('surah, from, to required');
    if (to < from) return badRequest('to must be >= from');

    return ok(await new TranslationRepo(env.DB_QR).bySourceAndRange(source, surah, from, to));
  });
}
