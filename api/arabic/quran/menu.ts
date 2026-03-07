import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

type SurahMenuRow = {
  surah: number;
  name_ar: string;
  name_en: string | null;
  ayah_count: number | null;
  meta_json: unknown;
  start_page: number | null;
  start_juz: number | null;
};

type JuzRangeRow = {
  juz: number;
  start_page: number | null;
  end_page: number | null;
  ayah_count: number;
};

type PageRangeRow = {
  max_page: number | null;
};

function safeJson(value: unknown): Record<string, unknown> {
  if (value == null) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return {};
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function textValue(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function intValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function summarizeSurahMeta(value: unknown) {
  const meta = safeJson(value);
  const revelationRaw = meta['revelation'];
  const revelation =
    revelationRaw && typeof revelationRaw === 'object' && !Array.isArray(revelationRaw)
      ? (revelationRaw as Record<string, unknown>)
      : {};

  return {
    name_simple: textValue(meta['nameSimple']),
    revelation_place: textValue(revelation['place']),
    revelation_order: intValue(revelation['order']),
    bismillah_pre: boolValue(revelation['bismillahPre']),
  };
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    const surahStmt = ctx.env.DB.prepare(
      `
      SELECT
        s.surah,
        s.name_ar,
        s.name_en,
        s.ayah_count,
        s.meta_json,
        a.page AS start_page,
        a.juz AS start_juz
      FROM ar_quran_surahs s
      LEFT JOIN ar_quran_ayah a
        ON a.surah = s.surah
       AND a.ayah = 1
      ORDER BY s.surah ASC
    `
    );

    const juzStmt = ctx.env.DB.prepare(
      `
      SELECT
        juz,
        MIN(page) AS start_page,
        MAX(page) AS end_page,
        COUNT(*) AS ayah_count
      FROM ar_quran_ayah
      WHERE juz IS NOT NULL
      GROUP BY juz
      ORDER BY juz ASC
    `
    );

    const pageRangeStmt = ctx.env.DB.prepare(`
      SELECT MAX(page) AS max_page
      FROM ar_quran_ayah
    `);

    const [{ results: surahRowsRaw = [] }, { results: juzRowsRaw = [] }, pageRangeRow] = await Promise.all([
      surahStmt.all<SurahMenuRow>(),
      juzStmt.all<JuzRangeRow>(),
      pageRangeStmt.first<PageRangeRow>(),
    ]);

    const surahs = (surahRowsRaw ?? []).map((row) => ({
      surah: row.surah,
      name_ar: row.name_ar,
      name_en: row.name_en ?? null,
      ayah_count: row.ayah_count ?? null,
      start_page: row.start_page ?? null,
      start_juz: row.start_juz ?? null,
      meta: summarizeSurahMeta(row.meta_json),
    }));

    const surahsByJuz = new Map<number, typeof surahs>();
    for (const surah of surahs) {
      if (surah.start_juz == null) continue;
      const group = surahsByJuz.get(surah.start_juz) ?? [];
      group.push(surah);
      surahsByJuz.set(surah.start_juz, group);
    }

    const juzs = (juzRowsRaw ?? []).map((row) => ({
      juz: row.juz,
      start_page: row.start_page ?? null,
      end_page: row.end_page ?? null,
      ayah_count: row.ayah_count,
      surahs: surahsByJuz.get(row.juz) ?? [],
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        stats: {
          total_pages: pageRangeRow?.max_page ?? 0,
          total_surahs: surahs.length,
          total_juzs: juzs.length,
        },
        surahs,
        juzs,
      }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    console.error('quran menu load error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load Quran menu.' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
