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

// Canonical Makki/Madani classification — all 114 surahs
// Source: classical Islamic scholarship (matches original component data)
const MADANI_SURAHS = new Set([
  2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55,
  57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110,
]);

function getRevelationType(surahNumber: number, meta: Record<string, unknown>): 'makki' | 'madani' {
  // Try meta_json first (allows DB override)
  const raw = (
    meta['revelation_place'] ??
    meta['revelation_type'] ??
    meta['place'] ??
    meta['type'] ??
    ''
  ) as string;
  const v = raw.toString().toLowerCase();
  if (v.includes('makk') || v === 'meccan') return 'makki';
  if (v.includes('madin') || v === 'medinan') return 'madani';
  // Fall back to canonical classification
  return MADANI_SURAHS.has(surahNumber) ? 'madani' : 'makki';
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
        revelationType: getRevelationType(row.surah, meta),
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
