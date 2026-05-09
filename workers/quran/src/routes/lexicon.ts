// ─── /qr/lexicon routes ───────────────────────────────────────────────────────
// Exposes qr_lemmas and qr_lemma_occurrences from km_quran D1.
// Lexicon search is root-primary: search by 3-letter root, then by lemma text.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';

export function lexiconRoutes(router: Router<QuranEnv>) {

  // GET /qr/lexicon/lemmas?root=كتب&q=كتاب&limit=50
  // Root search is primary — returns all lemmas sharing a root.
  // If root is absent, falls back to text LIKE search on lemma_text.
  router.get('/qr/lexicon/lemmas', async (req, env) => {
    const url   = new URL(req.url);
    const root  = url.searchParams.get('root')?.trim();
    const q     = url.searchParams.get('q')?.trim();

    if (!root && !q) return badRequest('root or q param required');

    const pagination = parsePagination(url, { defaultPerPage: 100, maxPerPage: 500 });

    let where: string;
    let params: unknown[];

    if (root) {
      where = 'WHERE root = ?';
      params = [root];
    } else {
      where = 'WHERE lemma_text LIKE ?';
      params = [`%${q}%`];
    }

    const countSql = `SELECT COUNT(*) AS count FROM qr_lemmas ${where}`;
    const dataSql  = `
      SELECT id, lemma_text, root, total_occurrences, lx_lemma_ref
      FROM qr_lemmas
      ${where}
      ORDER BY total_occurrences DESC, lemma_text
      LIMIT ? OFFSET ?
    `;

    const offset = (pagination.page - 1) * pagination.per_page;
    const [countRes, dataRes] = await Promise.all([
      env.DB_QR.prepare(countSql).bind(...params).first<{ count: number }>(),
      env.DB_QR.prepare(dataSql).bind(...params, pagination.per_page, offset).all<{
        id: string; lemma_text: string; root: string;
        total_occurrences: number; lx_lemma_ref: string | null;
      }>(),
    ]);

    return ok({
      rows: dataRes.results,
      total: countRes?.count ?? 0,
      page: pagination.page,
      per_page: pagination.per_page,
    });
  });

  // GET /qr/lexicon/lemmas/:id/occurrences — all Quran locations for one lemma
  router.get('/qr/lexicon/lemmas/:id/occurrences', async (req, env) => {
    const id = (req as Request & { params?: Record<string, string> }).params?.['id'] ?? '';
    if (!id) return badRequest('lemma id required');

    const url = new URL(req.url);
    const pagination = parsePagination(url, { defaultPerPage: 300, maxPerPage: 500 });
    const offset = (pagination.page - 1) * pagination.per_page;

    const [lemmaRes, occRes] = await Promise.all([
      env.DB_QR
        .prepare(`SELECT id, lemma_text, root, total_occurrences FROM qr_lemmas WHERE id = ?`)
        .bind(id)
        .first<{ id: string; lemma_text: string; root: string; total_occurrences: number }>(),
      env.DB_QR
        .prepare(`
          SELECT lo.id, lo.surah, lo.ayah, lo.word_index,
                 a.text_bare AS ayah_text
          FROM qr_lemma_occurrences lo
          LEFT JOIN qr_ayah a ON a.surah = lo.surah AND a.ayah = lo.ayah
          WHERE lo.lemma_id = ?
          ORDER BY lo.surah, lo.ayah, lo.word_index
          LIMIT ? OFFSET ?
        `)
        .bind(id, pagination.per_page, offset)
        .all<{
          id: string; surah: number; ayah: number; word_index: number;
          ayah_text: string | null;
        }>(),
    ]);

    if (!lemmaRes) return ok({ lemma: null, occurrences: [] });

    return ok({
      lemma: lemmaRes,
      occurrences: occRes.results,
      total: lemmaRes.total_occurrences,
      page: pagination.page,
      per_page: pagination.per_page,
    });
  });

  // GET /qr/lexicon/roots?q=كتب — distinct roots matching a prefix/query
  router.get('/qr/lexicon/roots', async (req, env) => {
    const url = new URL(req.url);
    const q   = url.searchParams.get('q')?.trim();
    if (!q) return badRequest('q param required');

    const { results } = await env.DB_QR
      .prepare(`
        SELECT root, COUNT(*) AS lemma_count, SUM(total_occurrences) AS total_occurrences
        FROM qr_lemmas
        WHERE root LIKE ?
        GROUP BY root
        ORDER BY total_occurrences DESC
        LIMIT 50
      `)
      .bind(`${q}%`)
      .all<{ root: string; lemma_count: number; total_occurrences: number }>();

    return ok({ roots: results });
  });
}
