// ─── /qr/irab routes ──────────────────────────────────────────────────────────
// Exposes qr_irab_sources and qr_irab_book_entries from km_quran D1.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';

export function irabRoutes(router: Router<QuranEnv>) {

  // GET /qr/irab/book-sources — all irab source books with entry counts
  router.get('/qr/irab/book-sources', async (_req, env) => {
    const { results } = await env.DB_QR
      .prepare(`
        SELECT s.id, s.source_slug, s.source_title_ar, s.source_title_en,
               s.source_kind, s.note_md,
               COUNT(e.id) AS entry_count
        FROM qr_irab_sources s
        LEFT JOIN qr_irab_book_entries e ON e.source_slug = s.source_slug
        WHERE s.source_kind = 'irab_book'
        GROUP BY s.id
        ORDER BY entry_count DESC
      `)
      .all<{
        id: string;
        source_slug: string;
        source_title_ar: string;
        source_title_en: string | null;
        source_kind: string;
        note_md: string | null;
        entry_count: number;
      }>();
    return ok({ sources: results });
  });

  // GET /qr/irab/book-entries?surah=X[&ayah=Y][&source_slug=S]
  // Returns irab entries for a surah (and optionally a specific ayah / source).
  router.get('/qr/irab/book-entries', async (req, env) => {
    const url    = new URL(req.url);
    const surah  = parseInt(url.searchParams.get('surah') ?? '');
    const ayah   = parseInt(url.searchParams.get('ayah')  ?? '');
    const slug   = url.searchParams.get('source_slug');

    if (isNaN(surah)) return badRequest('surah param required');

    const where: string[] = ['surah = ?'];
    const params: unknown[] = [surah];

    if (!isNaN(ayah)) {
      where.push('ayah_from <= ? AND ayah_to >= ?');
      params.push(ayah, ayah);
    }
    if (slug) {
      where.push('source_slug = ?');
      params.push(slug);
    }

    const pagination = parsePagination(url, { defaultPerPage: 100, maxPerPage: 500 });
    const whereClause = `WHERE ${where.join(' AND ')}`;
    const countSql = `SELECT COUNT(*) AS count FROM qr_irab_book_entries ${whereClause}`;
    const dataSql  = `
      SELECT id, source_slug, source_title, ayah_key,
             surah, ayah_from, ayah_to,
             irab_text_ar, source_quote_ar,
             target_text_ar, target_text_bare,
             grammar_role_ar, grammar_role_norm,
             grammar_case_ar, mahal_ar,
             grammar_concept_ref, case_concept_ref, mahal_concept_ref,
             entry_order
      FROM qr_irab_book_entries
      ${whereClause}
      ORDER BY surah, ayah_from, entry_order, id
      LIMIT ? OFFSET ?
    `;

    const offset = (pagination.page - 1) * pagination.per_page;
    const [countRes, dataRes] = await Promise.all([
      env.DB_QR.prepare(countSql).bind(...params).first<{ count: number }>(),
      env.DB_QR.prepare(dataSql).bind(...params, pagination.per_page, offset).all(),
    ]);

    const total = countRes?.count ?? 0;
    return ok({
      rows: dataRes.results,
      total,
      page: pagination.page,
      per_page: pagination.per_page,
      has_more: offset + dataRes.results.length < total,
    });
  });
}
