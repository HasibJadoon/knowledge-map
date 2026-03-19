import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

interface SurahRow {
  surah: number;
  name_ar: string;
  name_en: string | null;
  ayah_count: number | null;
  meta_json: string | null;
  juz: number | null;
}

function parseMeta(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toRevelationType(meta: Record<string, unknown>): 'makki' | 'madani' | null {
  const raw = (
    meta['revelation_place'] ??
    meta['revelation_type'] ??
    meta['place'] ??
    meta['type'] ??
    ''
  ) as string;
  const v = raw.toString().toLowerCase();
  if (v.includes('makk') || v === 'makki' || v === 'meccan') return 'makki';
  if (v.includes('madin') || v === 'madani' || v === 'medinan') return 'madani';
  return null;
}

function toSlug(nameEn: string | null): string {
  if (!nameEn) return '';
  return nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const { results = [] } = await ctx.env.DB
      .prepare(
        `SELECT
           s.surah,
           s.name_ar,
           s.name_en,
           s.ayah_count,
           s.meta_json,
           (SELECT a.juz FROM ar_quran_ayah a WHERE a.surah = s.surah AND a.ayah = 1 LIMIT 1) AS juz
         FROM ar_quran_surahs s
         ORDER BY s.surah ASC`
      )
      .all<SurahRow>();

    const surahs = (results as SurahRow[]).map((row) => {
      const meta = parseMeta(row.meta_json);
      return {
        id: String(row.surah),
        surahNumber: row.surah,
        slug: toSlug(row.name_en),
        arabicName: row.name_ar,
        transliteratedName: row.name_en ?? '',
        englishName: row.name_en ?? '',
        ayahCount: row.ayah_count ?? 0,
        revelationType: toRevelationType(meta),
        juz: row.juz ?? null,
      };
    });

    return new Response(JSON.stringify({ ok: true, surahs }), { headers: JSON_HEADERS });
  } catch (err) {
    console.error('[/api/quran/surahs]', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load surahs' }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
};
