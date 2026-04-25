// ─── /qr/ayahs routes ─────────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, badRequest, paginated } from '../../../shared/src/response';
import { parsePagination, parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { AyahRepo } from '../repositories/ayah.repo';
import { validateAyahPatch } from '../schemas/ayah.schema';

export function ayahRoutes(router: Router<QuranEnv>) {

  // GET /qr/ayahs?surah=1[&from=1&to=7][&words=1]
  router.get('/qr/ayahs', async (req, env) => {
    const url = new URL(req.url);
    const surah = parseIntParam(url.searchParams.get('surah') ?? '');
    if (!surah) return badRequest('surah query param is required');

    const repo      = new AyahRepo(env.DB_QR);
    const withWords = url.searchParams.get('words') === '1';
    const fromStr   = url.searchParams.get('from');
    const toStr     = url.searchParams.get('to');
    const hasRange  = fromStr && toStr;

    let ayahs;
    if (hasRange) {
      const from = parseIntParam(fromStr);
      const to   = parseIntParam(toStr);
      if (!from || !to || to < from) return badRequest('Invalid from/to range');
      ayahs = await repo.byRange(surah, from, to);
    } else {
      ayahs = await repo.bySurah(surah);
    }

    if (!withWords) return ok(ayahs);

    // Fetch words in a second query and group them by ayah number.
    const rawWords = hasRange
      ? await repo.wordsByRange(surah,
          parseIntParam(fromStr) ?? 1,
          parseIntParam(toStr)   ?? 999)
      : await repo.wordsBySurah(surah);

    const wordMap = new Map<number, typeof rawWords>();
    for (const w of rawWords) {
      if (!wordMap.has(w.ayah)) wordMap.set(w.ayah, []);
      wordMap.get(w.ayah)!.push(w);
    }

    return ok(ayahs.map(a => ({ ...a, words: wordMap.get(a.ayah) ?? [] })));
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
