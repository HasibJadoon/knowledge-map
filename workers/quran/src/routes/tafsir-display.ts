// ─── /qr/tafsir/display routes ────────────────────────────────────────────────
// Worker API over the qr_tafsir_book_display_* projection (migration 012).
// Parallel to /qr/iraab/display. DISJOINT from iʿrāb: this layer ONLY serves
// the 8 tafsir scholars (TABARI, ZAMAKHSHARI, IBN_ATIYYA, RAZI, ABU_HAYYAN,
// IBN_KATHIR, ALUSI, IBN_ASHUR). DARWISH and SAFI live in /qr/iraab/display.
//
// Routes:
//   GET /qr/tafsir/display/sources             — display-tier source registry
//   GET /qr/tafsir/display?surah=N&ayah=M      — per-verse × per-scholar payload
//                                                (optional scholar_id, work_id, madhab)
//   GET /qr/tafsir/display/search?q=…          — FTS5-backed search (AR+EN, diacritic-folded)
//   GET /qr/tafsir/display/compare?surah=N&ayah=M&scholar_ids=A,B,C — side-by-side ≤6

import type { Router } from '../../../shared/src/router';
import { ok, badRequest, notFound } from '../../../shared/src/response';
import { cached } from '../../../shared/src/cache';
import type { QuranEnv } from '../env';

type BlockRow = Record<string, unknown> & { id: string };

const parseArr = <T = unknown>(s: string | null): T[] => {
  if (!s) return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch { return []; }
};
const parseObj = <T extends object>(s: string | null): T => {
  if (!s) return {} as T;
  try { const v = JSON.parse(s); return (v && typeof v === 'object') ? v as T : ({} as T); } catch { return {} as T; }
};
const parseOrNull = <T extends object>(s: string | null): T | null => {
  if (!s) return null;
  try { const v = JSON.parse(s); return (v && typeof v === 'object') ? v as T : null; } catch { return null; }
};

function hydrateBlock(r: Record<string, unknown>) {
  const {
    ayah_keys_json, tags_json, grammar_tags_json, theology_tags_json, narration_tags_json,
    quran_refs_json, scholar_refs_json, backlinks_json, related_links_json,
    external_resource_json, meta_json,
    ...rest
  } = r as Record<string, string | null> & { [k: string]: unknown };
  return {
    ...rest,
    ayah_keys: parseArr<string>(ayah_keys_json as string | null),
    tags: parseArr<string>(tags_json as string | null),
    grammar_tags: parseArr<string>(grammar_tags_json as string | null),
    theology_tags: parseArr<string>(theology_tags_json as string | null),
    narration_tags: parseArr<string>(narration_tags_json as string | null),
    quran_refs: parseArr(quran_refs_json as string | null),
    scholar_refs: parseArr(scholar_refs_json as string | null),
    backlinks: parseArr(backlinks_json as string | null),
    related_links: parseArr(related_links_json as string | null),
    external_resource: parseOrNull(external_resource_json as string | null),
    meta: parseObj(meta_json as string | null),
  };
}

type GroupResolverRow = {
  source_slug: string;
  scholar_id: string;
  ayah_group_key: string;
  group_start: number;
  group_end: number;
};

export function tafsirDisplayRoutes(router: Router<QuranEnv>) {

  // ── GET /qr/tafsir/display/sources ─────────────────────────────────────────
  router.get('/qr/tafsir/display/sources', (req, env) => cached(req, async () => {
    const { results } = await env.DB_QR
      .prepare(`
        SELECT s.id, s.source_slug, s.scholar_id, s.work_id,
               s.book_title_ar, s.book_title_en,
               s.author_name_ar, s.author_name_en, s.author_kunya, s.author_laqab,
               s.death_year_hijri, s.death_year_ce, s.era, s.madhab, s.kalam_school,
               s.specialization, s.badge_color, s.badge_glyph, s.markup_tier,
               s.short_description, s.long_description, s.cover_image_url,
               s.display_order, s.is_visible,
               (SELECT COUNT(*) FROM qr_tafsir_book_display_block b WHERE b.source_slug = s.source_slug) AS block_count
        FROM qr_tafsir_book_display_source s
        WHERE s.is_visible = 1
        ORDER BY s.death_year_hijri ASC NULLS LAST, s.display_order ASC
      `).all();
    return ok({ sources: results });
  }));

  // ── GET /qr/tafsir/display?surah=N&ayah=M[&scholar_id=S][&work_id=W][&madhab=M] ──
  router.get('/qr/tafsir/display', (req, env) => cached(req, async () => {
    const url = new URL(req.url);
    const surah = parseInt(url.searchParams.get('surah') ?? '');
    const ayah  = parseInt(url.searchParams.get('ayah')  ?? '');
    const scholarId = url.searchParams.get('scholar_id');
    const workId    = url.searchParams.get('work_id');
    const madhab    = url.searchParams.get('madhab');
    if (isNaN(surah)) return badRequest('surah param required');
    if (isNaN(ayah))  return badRequest('ayah param required');

    // 1) Resolve groups per scholar (different scholars may anchor differently)
    const groupFilters: string[] = [
      'surah_no = ?',
      'ayah_no <= ?',
      'COALESCE(ayah_to, ayah_no) >= ?',
      "review_status != 'rejected'",
      "block_type = 'tafsir_card'",          // pin to the card so each scholar gives one anchor row
    ];
    const groupParams: unknown[] = [surah, ayah, ayah];
    if (scholarId) { groupFilters.push('scholar_id = ?'); groupParams.push(scholarId); }
    if (workId)    { groupFilters.push('work_id = ?');    groupParams.push(workId); }
    if (madhab)    { groupFilters.push('madhab = ?');     groupParams.push(madhab); }

    const groupSql = `
      SELECT DISTINCT source_slug, scholar_id, ayah_group_key,
             MIN(ayah_no) AS group_start,
             MAX(COALESCE(ayah_to, ayah_no)) AS group_end
      FROM qr_tafsir_book_display_block
      WHERE ${groupFilters.join(' AND ')}
      GROUP BY source_slug, scholar_id, ayah_group_key
    `;
    const groupRes = await env.DB_QR.prepare(groupSql).bind(...groupParams).all<GroupResolverRow>();
    if (!groupRes.results.length) {
      return notFound('no tafsir display blocks for this ayah');
    }

    // 2) Pull ALL blocks for the resolved (scholar, group) pairs
    const groupKeys = [...new Set(groupRes.results.map((r: GroupResolverRow) => r.ayah_group_key))];
    const ph = groupKeys.map(() => '?').join(',');
    const blockFilters: string[] = [
      'surah_no = ?',
      `ayah_group_key IN (${ph})`,
      "review_status != 'rejected'",
    ];
    const blockParams: unknown[] = [surah, ...groupKeys];
    if (scholarId) { blockFilters.push('scholar_id = ?'); blockParams.push(scholarId); }
    if (workId)    { blockFilters.push('work_id = ?');    blockParams.push(workId); }
    if (madhab)    { blockFilters.push('madhab = ?');     blockParams.push(madhab); }

    const blockSql = `
      SELECT * FROM qr_tafsir_book_display_block
      WHERE ${blockFilters.join(' AND ')}
      ORDER BY death_year_hijri ASC NULLS LAST, scholar_id, display_order, paragraph_index NULLS FIRST, id
    `;
    const blockRes = await env.DB_QR.prepare(blockSql).bind(...blockParams).all<BlockRow>();
    const blocks = blockRes.results.map((r: BlockRow) => hydrateBlock(r as Record<string, unknown>));
    if (!blocks.length) return notFound('no display blocks');

    // 3) Side tables
    const blockIds: string[] = blocks.map((b: { id: string }) => b.id);
    const idPh = blockIds.map(() => '?').join(',');
    const [tagsRes, refsRes, notesRes, linksRes] = await Promise.all([
      env.DB_QR.prepare(`SELECT * FROM qr_tafsir_book_display_tag WHERE block_id IN (${idPh})`).bind(...blockIds).all(),
      env.DB_QR.prepare(`SELECT * FROM qr_tafsir_book_display_ref WHERE block_id IN (${idPh})`).bind(...blockIds).all(),
      env.DB_QR.prepare(`SELECT * FROM qr_tafsir_book_display_note WHERE block_id IN (${idPh}) AND review_status != 'rejected'`).bind(...blockIds).all(),
      env.DB_QR.prepare(`SELECT * FROM qr_tafsir_book_display_link WHERE from_block_id IN (${idPh}) OR to_block_id IN (${idPh})`).bind(...blockIds, ...blockIds).all(),
    ]);

    // 4) Sources actually present
    const presentSlugs: string[] = Array.from(new Set(blocks.map((b: { source_slug: string }) => b.source_slug)));
    const slugPh = presentSlugs.map(() => '?').join(',');
    const sourcesRes = await env.DB_QR
      .prepare(`SELECT * FROM qr_tafsir_book_display_source WHERE source_slug IN (${slugPh}) ORDER BY death_year_hijri ASC NULLS LAST, display_order ASC`)
      .bind(...presentSlugs).all();

    // 5) Envelope
    const minStart = Math.min(...groupRes.results.map((r: GroupResolverRow) => r.group_start));
    const maxEnd   = Math.max(...groupRes.results.map((r: GroupResolverRow) => r.group_end));
    const canonical = minStart === maxEnd ? `${surah}:${minStart}` : `${surah}:${minStart}-${maxEnd}`;
    const ayahKeys: string[] = [];
    for (let a = minStart; a <= maxEnd; a++) ayahKeys.push(`${surah}:${a}`);

    return ok({
      ayah_group_key: canonical,
      surah_no: surah,
      ayah_no: minStart,
      ayah_to: maxEnd,
      ayah_keys: ayahKeys,
      requested_ayah_no: ayah,
      source_groups: groupRes.results,
      sources: sourcesRes.results,
      blocks,
      tags: tagsRes.results,
      refs: refsRes.results,
      links: linksRes.results,
      notes: notesRes.results,
    });
  }));

  // ── GET /qr/tafsir/display/search?q=…[&surah=N][&scholar_id=S][&madhab=M][&block_type=T][&limit=N] ──
  router.get('/qr/tafsir/display/search', (req, env) => cached(req, async () => {
    const url = new URL(req.url);
    const q          = url.searchParams.get('q')?.trim();
    const surah      = url.searchParams.get('surah');
    const scholarId  = url.searchParams.get('scholar_id');
    const madhab     = url.searchParams.get('madhab');
    const era        = url.searchParams.get('era');
    const blockType  = url.searchParams.get('block_type');
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '25', 10) || 25));
    if (!q) return badRequest('q param required');

    const where: string[] = ['qr_tafsir_book_display_blocks_fts MATCH ?'];
    const params: unknown[] = [q];
    if (surah)      { where.push('surah_no = ?');   params.push(parseInt(surah, 10)); }
    if (scholarId)  { where.push('scholar_id = ?'); params.push(scholarId); }
    if (madhab)     { where.push('madhab = ?');     params.push(madhab); }
    if (era)        { where.push('era = ?');        params.push(era); }
    if (blockType)  { where.push('block_type = ?'); params.push(blockType); }

    const sql = `
      SELECT block_id, source_slug, scholar_id, madhab, era,
             surah_no, ayah_no, ayah_key, ayah_group_key, block_type,
             snippet(qr_tafsir_book_display_blocks_fts, -1, '«', '»', '…', 12) AS hit,
             bm25(qr_tafsir_book_display_blocks_fts) AS rank_score
      FROM qr_tafsir_book_display_blocks_fts
      WHERE ${where.join(' AND ')}
      ORDER BY rank_score
      LIMIT ?
    `;
    params.push(limit);
    const { results } = await env.DB_QR.prepare(sql).bind(...params).all();
    return ok({ q, hits: results });
  }));

  // ── GET /qr/tafsir/display/compare?surah=N&ayah=M&scholar_ids=A,B,C ──────
  // Side-by-side payload for up to 6 scholars on one ayah. Useful for the
  // multi-column comparison view in the UI.
  router.get('/qr/tafsir/display/compare', (req, env) => cached(req, async () => {
    const url = new URL(req.url);
    const surah = parseInt(url.searchParams.get('surah') ?? '');
    const ayah  = parseInt(url.searchParams.get('ayah')  ?? '');
    const scholarIdsParam = url.searchParams.get('scholar_ids') ?? '';
    if (isNaN(surah) || isNaN(ayah)) return badRequest('surah and ayah params required');
    const scholarIds = scholarIdsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 6);
    if (!scholarIds.length) return badRequest('scholar_ids param required (comma-separated, max 6)');

    const ph = scholarIds.map(() => '?').join(',');
    const sql = `
      SELECT * FROM qr_tafsir_book_display_block
      WHERE surah_no = ?
        AND ayah_no <= ? AND COALESCE(ayah_to, ayah_no) >= ?
        AND scholar_id IN (${ph})
        AND review_status != 'rejected'
      ORDER BY scholar_id, display_order, paragraph_index NULLS FIRST, id
    `;
    const { results } = await env.DB_QR.prepare(sql).bind(surah, ayah, ayah, ...scholarIds).all<BlockRow>();
    const blocks = results.map((r: BlockRow) => hydrateBlock(r as Record<string, unknown>));

    // Group blocks by scholar_id for the UI
    const byScholar: Record<string, ReturnType<typeof hydrateBlock>[]> = {};
    for (const b of blocks) {
      const sid = (b as { scholar_id?: string }).scholar_id ?? 'unknown';
      (byScholar[sid] ||= []).push(b);
    }

    return ok({
      surah_no: surah,
      ayah_no: ayah,
      scholar_ids: scholarIds,
      columns: scholarIds.map(sid => ({ scholar_id: sid, blocks: byScholar[sid] ?? [] })),
      total_blocks: blocks.length,
    });
  }));
}
