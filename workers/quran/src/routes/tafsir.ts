// ─── /qr/tafsir routes ────────────────────────────────────────────────────────
// Exposes qr_tafsir_entries for the source-rag bundle endpoint.
// The backend composite route at /api/quran/:surah/:ayah/sources calls this.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { TafsirRepo } from '../repositories/tafsir.repo';

export function tafsirRoutes(router: Router<QuranEnv>) {

  // GET /qr/scholars — list all scholars with entry counts and works
  router.get('/qr/scholars', async (_req, env) => {
    const { results: scholars } = await env.DB_QR
      .prepare(`
        SELECT sp.id, sp.name_ar, sp.name_en, sp.kunya, sp.laqab,
               sp.birth_year_hijri, sp.death_year_hijri,
               sp.birth_year_ce, sp.death_year_ce,
               sp.era, sp.madhab, sp.specialization,
               COUNT(te.id) AS entry_count
        FROM qr_scholar_profiles sp
        LEFT JOIN qr_tafsir_entries te ON te.scholar_id = sp.id
        GROUP BY sp.id
        ORDER BY entry_count DESC
      `)
      .all<{
        id: string; name_ar: string; name_en: string | null;
        kunya: string | null; laqab: string | null;
        birth_year_hijri: number | null; death_year_hijri: number | null;
        birth_year_ce: number | null; death_year_ce: number | null;
        era: string | null; madhab: string | null; specialization: string | null;
        entry_count: number;
      }>();
    return ok({ scholars });
  });

  // GET /qr/works?work_type=tafsir|irab — list works joined with scholar info and entry counts
  router.get('/qr/works', async (req, env) => {
    const url = new URL(req.url);
    const workType = url.searchParams.get('work_type');

    const typeClause = workType ? `WHERE sw.work_type = ?` : '';
    const params: unknown[] = workType ? [workType] : [];

    const { results: works } = await env.DB_QR
      .prepare(`
        SELECT sw.id, sw.scholar_id, sw.title_ar, sw.title_en, sw.work_type,
               sw.composition_year_hijri, sw.composition_year_ce,
               sw.volumes, sw.is_complete, sw.print_edition, sw.summary,
               sp.name_ar AS scholar_name_ar, sp.name_en AS scholar_name_en,
               sp.era, sp.madhab, sp.specialization,
               sp.birth_year_hijri, sp.death_year_hijri,
               sp.birth_year_ce, sp.death_year_ce,
               COUNT(te.id) AS entry_count
        FROM qr_scholar_works sw
        LEFT JOIN qr_scholar_profiles sp ON sp.id = sw.scholar_id
        LEFT JOIN qr_tafsir_entries te ON te.work_id = sw.id
        ${typeClause}
        GROUP BY sw.id
        ORDER BY entry_count DESC
      `)
      .bind(...params)
      .all();
    return ok({ works });
  });

  // GET /qr/tafsir?surah=X[&ayah=Y][&work_id=Z][&limit=N][&page=N]
  // Returns tafsir entries joined with qr_ayah.text_uthmani for verse-by-verse display.
  router.get('/qr/tafsir', async (req, env) => {
    const url    = new URL(req.url);
    const surah  = parseInt(url.searchParams.get('surah') ?? '');
    const ayah   = parseInt(url.searchParams.get('ayah')  ?? '');
    const workId = url.searchParams.get('work_id');

    if (isNaN(surah)) return badRequest('surah param required');

    const where: string[] = ['te.surah = ?'];
    const params: unknown[] = [surah];

    if (!isNaN(ayah)) {
      where.push('te.ayah_from <= ? AND te.ayah_to >= ?');
      params.push(ayah, ayah);
    }
    if (workId) {
      where.push('te.work_id = ?');
      params.push(workId);
    }

    const limit  = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') ?? '200', 10) || 200));
    const page   = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const offset = (page - 1) * limit;

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const [countRes, dataRes] = await Promise.all([
      env.DB_QR
        .prepare(`SELECT COUNT(*) AS count FROM qr_tafsir_entries te ${whereClause}`)
        .bind(...params)
        .first<{ count: number }>(),
      env.DB_QR
        .prepare(`
          SELECT te.id, te.surah, te.ayah_from, te.ayah_to, te.entry_type,
                 te.scholar_id, te.work_id, te.content_ar, te.content_en,
                 te.source_page,
                 a.text_uthmani AS ayah_text
          FROM qr_tafsir_entries te
          LEFT JOIN qr_ayah a ON a.surah = te.surah AND a.ayah = te.ayah_from
          ${whereClause}
          ORDER BY te.surah, te.ayah_from, te.created_at
          LIMIT ? OFFSET ?
        `)
        .bind(...params, limit, offset)
        .all<{
          id: string; surah: number; ayah_from: number; ayah_to: number;
          entry_type: string; scholar_id: string | null; work_id: string | null;
          content_ar: string; content_en: string | null; source_page: string | null;
          ayah_text: string | null;
        }>(),
    ]);

    const total = countRes?.count ?? 0;
    const rows  = dataRes.results;

    // Batch-fetch scholar and work metadata
    const scholarIds = [...new Set(rows.map(e => e.scholar_id).filter(Boolean))] as string[];
    const workIds    = [...new Set(rows.map(e => e.work_id).filter(Boolean))] as string[];

    let scholars: Record<string, { name_ar: string; name_en: string | null }> = {};
    let works:    Record<string, { title_ar: string; title_en: string | null; work_type: string }> = {};

    await Promise.all([
      scholarIds.length
        ? env.DB_QR
            .prepare(`SELECT id, name_ar, name_en FROM qr_scholar_profiles WHERE id IN (${scholarIds.map(() => '?').join(',')})`)
            .bind(...scholarIds)
            .all<{ id: string; name_ar: string; name_en: string | null }>()
            .then(r => r.results.forEach(s => { scholars[s.id] = { name_ar: s.name_ar, name_en: s.name_en }; }))
        : Promise.resolve(),
      workIds.length
        ? env.DB_QR
            .prepare(`SELECT id, title_ar, title_en, work_type FROM qr_scholar_works WHERE id IN (${workIds.map(() => '?').join(',')})`)
            .bind(...workIds)
            .all<{ id: string; title_ar: string; title_en: string | null; work_type: string }>()
            .then(r => r.results.forEach(w => { works[w.id] = { title_ar: w.title_ar, title_en: w.title_en, work_type: w.work_type }; }))
        : Promise.resolve(),
    ]);

    const enriched = rows.map(e => ({
      ...e,
      scholar: e.scholar_id ? (scholars[e.scholar_id] ?? null) : null,
      work:    e.work_id    ? (works[e.work_id]       ?? null) : null,
    }));

    return ok({ rows: enriched, total, page, per_page: limit, has_more: offset + rows.length < total });
  });

  // GET /qr/tafsir/by-ids?ids=id1,id2,...
  // Batch-fetch specific qr_tafsir_entries rows by ID.
  // Used by the backend composite endpoint to resolve Qdrant hit target_ids.
  router.get('/qr/tafsir/by-ids', async (req, env) => {
    const url = new URL(req.url);
    const idsParam = url.searchParams.get('ids') ?? '';
    const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 100);

    if (!ids.length) return badRequest('ids param required (comma-separated)');

    const ph = ids.map(() => '?').join(',');
    const { results } = await env.DB_QR
      .prepare(
        `SELECT te.id, te.surah, te.ayah_from, te.ayah_to,
                te.entry_type, te.scholar_id, te.work_id,
                te.content_ar, te.content_en, te.source_page,
                sp.name_ar AS scholar_name_ar, sp.name_en AS scholar_name_en,
                sw.title_ar AS work_title_ar, sw.title_en AS work_title_en,
                sw.work_type
         FROM qr_tafsir_entries te
         LEFT JOIN qr_scholar_profiles sp ON sp.id = te.scholar_id
         LEFT JOIN qr_scholar_works    sw ON sw.id = te.work_id
         WHERE te.id IN (${ph})`,
      )
      .bind(...ids)
      .all();

    return ok({ entries: results, total: results.length });
  });
}
