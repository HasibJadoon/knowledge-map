// ─── /qr/tafsir routes ────────────────────────────────────────────────────────
// Exposes qr_tafsir_entries for the source-rag bundle endpoint.
// The backend composite route at /api/quran/:surah/:ayah/sources calls this.

import type { Router } from '../../../shared/src/router';
import { ok, badRequest } from '../../../shared/src/response';
import { parsePagination } from '../../../shared/src/validate';
import type { QuranEnv } from '../env';
import { TafsirRepo } from '../repositories/tafsir.repo';

export function tafsirRoutes(router: Router<QuranEnv>) {

  // GET /qr/tafsir?surah=78&ayah=1[&work_id=QR:WORK:...]
  // Returns tafsir entries overlapping the given ayah, joined with scholar + work names.
  router.get('/qr/tafsir', async (req, env) => {
    const url   = new URL(req.url);
    const surah = parseInt(url.searchParams.get('surah') ?? '');
    const ayah  = parseInt(url.searchParams.get('ayah')  ?? '');
    const workId = url.searchParams.get('work_id');

    if (isNaN(surah)) return badRequest('surah param required');

    const repo = new TafsirRepo(env.DB_QR);
    const pagination = parsePagination(url, { defaultPerPage: 50, maxPerPage: 200 });

    const result = await repo.entries(
      surah,
      isNaN(ayah) ? undefined : ayah,
      undefined,  // scholarId filter not used here
      pagination,
    );

    // If work_id filter provided, filter in-place (repo doesn't support it natively)
    const entries = workId
      ? { ...result, rows: result.rows.filter((e: { work_id: string | null }) => e.work_id === workId) }
      : result;

    // Enrich with scholar + work metadata in a single batch query
    const scholarIds = [...new Set(entries.rows.map((e: { scholar_id: string | null }) => e.scholar_id).filter(Boolean))] as string[];
    const workIds    = [...new Set(entries.rows.map((e: { work_id: string | null }) => e.work_id).filter(Boolean))] as string[];

    let scholars: Record<string, { name_ar: string; name_en: string | null }> = {};
    let works:    Record<string, { title_ar: string; title_en: string | null; work_type: string }> = {};

    if (scholarIds.length) {
      const ph = scholarIds.map(() => '?').join(',');
      const rows = await env.DB_QR
        .prepare(`SELECT id, name_ar, name_en FROM qr_scholar_profiles WHERE id IN (${ph})`)
        .bind(...scholarIds)
        .all<{ id: string; name_ar: string; name_en: string | null }>();
      rows.results.forEach(r => { scholars[r.id] = { name_ar: r.name_ar, name_en: r.name_en }; });
    }

    if (workIds.length) {
      const ph = workIds.map(() => '?').join(',');
      const rows = await env.DB_QR
        .prepare(`SELECT id, title_ar, title_en, work_type FROM qr_scholar_works WHERE id IN (${ph})`)
        .bind(...workIds)
        .all<{ id: string; title_ar: string; title_en: string | null; work_type: string }>();
      rows.results.forEach(r => { works[r.id] = { title_ar: r.title_ar, title_en: r.title_en, work_type: r.work_type }; });
    }

    const enriched = entries.rows.map((e: {
      scholar_id: string | null;
      work_id: string | null;
      [key: string]: unknown;
    }) => ({
      ...e,
      scholar: e.scholar_id ? (scholars[e.scholar_id] ?? null) : null,
      work:    e.work_id    ? (works[e.work_id]       ?? null) : null,
    }));

    return ok({ ...entries, rows: enriched });
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
