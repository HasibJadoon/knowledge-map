// ─── /qr/ayahs routes ─────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination, parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { AyahRepo } from '../repositories/ayah.repo';
import { validateAyahPatch } from '../schemas/ayah.schema';

export function ayahRoutes(router: Router<QuranEnv>) {

  // GET /qr/ayahs?surah=1[&from=1&to=7]
  router.get('/qr/ayahs', async (req, env) => {
    const url = new URL(req.url);
    const surah = parseIntParam(url.searchParams.get('surah') ?? '');
    if (!surah) return badRequest('surah query param is required');

    const repo = new AyahRepo(env.DB_QR);
    const fromStr = url.searchParams.get('from');
    const toStr   = url.searchParams.get('to');

    if (fromStr && toStr) {
      const from = parseIntParam(fromStr);
      const to   = parseIntParam(toStr);
      if (!from || !to || to < from) return badRequest('Invalid from/to range');
      return ok(await repo.byRange(surah, from, to));
    }

    return ok(await repo.bySurah(surah));
  });

  // GET /qr/ayahs/search?q=...&page=1
  router.get('/qr/ayahs/search', async (req, env) => {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    if (!q || q.length < 2) return badRequest('q must be at least 2 characters');
    const opts = parsePagination(url);
    return paginated(await new AyahRepo(env.DB_QR).search(q, opts));
  });

  // GET /qr/ayahs/:surah/:ayah — single ayah
  router.get('/qr/ayahs/:surah/:ayah', async (_req, env, { surah, ayah }) => {
    const s = parseIntParam(surah);
    const a = parseIntParam(ayah);
    if (!s || !a) return badRequest('Invalid surah or ayah');

    const row = await new AyahRepo(env.DB_QR).find(s, a);
    return row ? ok(row) : notFound(`ayah ${surah}:${ayah}`);
  });

  // PATCH /qr/ayahs/:surah/:ayah — admin: update verse mark / translation
  router.patch('/qr/ayahs/:surah/:ayah', async (req, env, { surah, ayah }) => {
    const s = parseIntParam(surah);
    const a = parseIntParam(ayah);
    if (!s || !a) return badRequest('Invalid surah or ayah');

    const body = await req.json();
    const result = validateAyahPatch(body);
    if ('error' in result) return badRequest(result.error);

    const updated = await new AyahRepo(env.DB_QR).update(s, a, result.data);
    return updated ? ok(updated) : notFound(`ayah ${surah}:${ayah}`);
  });
}
