// ─── /qr/irab routes ──────────────────────────────────────────────────────────
// Exposes qr_irab_sources and qr_irab_book_entries from km_quran D1.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import { parsePagination } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';

export function irabRoutes(router: Router<QuranEnv>) {

  // GET /qr/irab/book-sources — all irab source books with entry counts
  // Edge-cached: entry-count aggregate over qr_irab_book_entries is the
  // long pole here (>1.5s cold). Source list changes only on ingest.
  router.get('/qr/irab/book-sources', (req, env) => cached(req, async () => {
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
  }));

  // GET /qr/irab/book-entries?surah=X[&ayah=Y][&source_slug=S][&limit=N][&page=N]
  // Returns irab entries for a surah, joined with qr_ayah.text_uthmani for verse-by-verse display.
  // Edge-cached per query string — entries only change on ingest.
  router.get('/qr/irab/book-entries', (req, env) => cached(req, async () => {
    const url   = new URL(req.url);
    const surah = parseInt(url.searchParams.get('surah') ?? '');
    const ayah  = parseInt(url.searchParams.get('ayah')  ?? '');
    const slug  = url.searchParams.get('source_slug');

    if (isNaN(surah)) return badRequest('surah param required');

    const where: string[] = ['e.surah = ?'];
    const params: unknown[] = [surah];

    if (!isNaN(ayah)) {
      where.push('e.ayah_from <= ? AND e.ayah_to >= ?');
      params.push(ayah, ayah);
    }
    if (slug) {
      where.push('e.source_slug = ?');
      params.push(slug);
    }

    const limit  = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') ?? '500', 10) || 500));
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const offset = (page - 1) * limit;

    const whereClause = `WHERE ${where.join(' AND ')}`;
    const countSql = `SELECT COUNT(*) AS count FROM qr_irab_book_entries e ${whereClause}`;
    const dataSql  = `
      SELECT e.id, e.source_slug, e.source_title, e.ayah_key,
             e.surah, e.ayah_from, e.ayah_to,
             e.irab_text_ar, e.source_quote_ar,
             e.target_text_ar, e.target_text_bare,
             e.grammar_role_ar, e.grammar_role_norm,
             e.grammar_case_ar, e.mahal_ar,
             e.grammar_concept_ref, e.case_concept_ref, e.mahal_concept_ref,
             e.entry_order,
             a.text_uthmani AS ayah_text
      FROM qr_irab_book_entries e
      LEFT JOIN qr_ayah a ON a.surah = e.surah AND a.ayah = e.ayah_from
      ${whereClause}
      ORDER BY e.surah, e.ayah_from, e.entry_order, e.id
      LIMIT ? OFFSET ?
    `;

    const [countRes, dataRes] = await Promise.all([
      env.DB_QR.prepare(countSql).bind(...params).first<{ count: number }>(),
      env.DB_QR.prepare(dataSql).bind(...params, limit, offset).all(),
    ]);

    const total = countRes?.count ?? 0;
    return ok({
      rows: dataRes.results,
      total,
      page,
      per_page: limit,
      has_more: offset + dataRes.results.length < total,
    });
  }));
}
