// ─── /qr/passages routes ──────────────────────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, notFound, created, noContent, badRequest } from '../../../shared/src/response';
import { parseIntParam } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { PassageRepo } from '../repositories/passage.repo';
import { validatePassageCreate } from '../schemas/passage.schema';

export function passageRoutes(router: Router<QuranEnv>) {

  // GET /qr/passages?surah=1 — passages for a surah
  router.get('/qr/passages', async (req, env) => {
    const url = new URL(req.url);
    const surah = parseIntParam(url.searchParams.get('surah') ?? '');
    if (!surah) return badRequest('surah query param is required');
    return ok(await new PassageRepo(env.DB_QR).bySurah(surah));
  });

  // GET /qr/passages/by-ayah?surah=2&ayah=255
  router.get('/qr/passages/by-ayah', async (req, env) => {
    const url = new URL(req.url);
    const s = parseIntParam(url.searchParams.get('surah') ?? '');
    const a = parseIntParam(url.searchParams.get('ayah') ?? '');
    if (!s || !a) return badRequest('surah and ayah params required');
    return ok(await new PassageRepo(env.DB_QR).byAyah(s, a));
  });

  // GET /qr/passages/:id — single passage by QR:ULID
  router.get('/qr/passages/:id', async (_req, env, { id }) => {
    const passage = await new PassageRepo(env.DB_QR).findById(id);
    return passage ? ok(passage) : notFound(`passage ${id}`);
  });

  // POST /qr/passages — create new passage
  router.post('/qr/passages', async (req, env) => {
    const body = await req.json();
    const result = validatePassageCreate(body);
    if ('error' in result) return badRequest(result.error);
    return created(await new PassageRepo(env.DB_QR).create(result.data));
  });

  // DELETE /qr/passages/:id
  router.delete('/qr/passages/:id', async (_req, env, { id }) => {
    const deleted = await new PassageRepo(env.DB_QR).delete(id);
    return deleted ? noContent() : notFound(`passage ${id}`);
  });
}
