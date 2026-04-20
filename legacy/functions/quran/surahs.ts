import type { D1Database } from '@cloudflare/workers-types';

interface Env {
  DB_QR?: D1Database;
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

interface SurahRow {
  id: number;
  name_ar: string;
  name_en: string | null;
  name_transliteration: string | null;
  revelation_type: 'makki' | 'madani' | null;
  ayah_count: number | null;
  juz_start: number | null;
}

function toSlug(nameEn: string | null): string {
  if (!nameEn) return '';
  return nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const db = ctx.env.DB_QR;
  if (!db) {
    return new Response(
      JSON.stringify({ ok: false, error: 'DB_QR binding is not configured' }),
      { status: 500, headers: JSON_HEADERS },
    );
  }

  try {
    const { results = [] } = await db
      .prepare(
        `SELECT
           s.id,
           s.name_ar,
           s.name_en,
           s.name_transliteration,
           s.revelation_type,
           s.ayah_count,
           COALESCE(s.juz_start, a.juz) AS juz_start
         FROM qr_surahs s
         LEFT JOIN qr_surah_ayah_meta a ON a.surah = s.id AND a.ayah = 1
         ORDER BY s.id ASC`
      )
      .all<SurahRow>();

    const surahs = (results as SurahRow[]).map((row) => {
      const englishName = row.name_en ?? row.name_transliteration ?? '';
      return {
        id: String(row.id),
        surahNumber: row.id,
        slug: toSlug(englishName),
        arabicName: row.name_ar,
        transliteratedName: row.name_transliteration ?? englishName,
        englishName,
        ayahCount: row.ayah_count ?? 0,
        revelationType: row.revelation_type ?? 'makki',
        juz: row.juz_start ?? null,
      };
    });

    return new Response(JSON.stringify({ ok: true, surahs }), { headers: JSON_HEADERS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[/api/quran/surahs]', msg);
    return new Response(
      JSON.stringify({ ok: false, error: 'Failed to load surahs', detail: msg }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
};
