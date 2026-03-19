import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

type SurahRow = {
  surah: number;
  name_ar: string;
  name_en: string | null;
  ayah_count: number | null;
};

type PassageRow = {
  id: number;
  source_key: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  passage_index: number;
  page_pdf: number | null;
  page_book: number | null;
  text: string | null;
  meta_json: unknown;
};

function safeJson(value: unknown) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try { return JSON.parse(trimmed); } catch { return null; }
  }
  return null;
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const user = await requireAuth(ctx);
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const url = new URL(ctx.request.url);
  const surah = Number.parseInt(String(url.searchParams.get('surah') ?? ''), 10);
  if (!Number.isFinite(surah) || surah < 1 || surah > 114) {
    return new Response(JSON.stringify({ ok: false, error: 'surah query param required (1-114).' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const passageParam = url.searchParams.get('passage');
  const passageIndex = passageParam !== null ? Number.parseInt(passageParam, 10) : null;

  try {
    const surahRow = (await ctx.env.DB
      .prepare(`SELECT surah, name_ar, name_en, ayah_count FROM ar_quran_surahs WHERE surah = ?1`)
      .bind(surah)
      .first()) as SurahRow | null;

    if (!surahRow) {
      return new Response(JSON.stringify({ ok: false, error: `Surah ${surah} not found.` }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    const sourceKey = 'haleem-2004';

    let passageRows: PassageRow[];

    if (passageIndex !== null && Number.isFinite(passageIndex)) {
      // Single passage by index
      const row = (await ctx.env.DB
        .prepare(
          `SELECT id, source_key, surah, ayah_from, ayah_to, passage_index, page_pdf, page_book, text, meta_json
           FROM ar_quran_translation_passages
           WHERE source_key = ?1 AND surah = ?2 AND passage_index = ?3
           LIMIT 1`
        )
        .bind(sourceKey, surah, passageIndex)
        .first()) as PassageRow | null;

      passageRows = row ? [row] : [];
    } else {
      // All passages for the surah
      const { results = [] } = await ctx.env.DB
        .prepare(
          `SELECT id, source_key, surah, ayah_from, ayah_to, passage_index, page_pdf, page_book, text, meta_json
           FROM ar_quran_translation_passages
           WHERE source_key = ?1 AND surah = ?2
           ORDER BY passage_index ASC`
        )
        .bind(sourceKey, surah)
        .all<PassageRow>();
      passageRows = (results ?? []) as PassageRow[];
    }

    const passages = passageRows.map((row) => ({
      id: row.id,
      source_key: row.source_key,
      surah: row.surah,
      ayah_from: row.ayah_from,
      ayah_to: row.ayah_to,
      passage_index: row.passage_index,
      page_pdf: row.page_pdf ?? null,
      page_book: row.page_book ?? null,
      text: row.text ?? null,
      meta: safeJson(row.meta_json),
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        surah: {
          surah: surahRow.surah,
          name_ar: surahRow.name_ar,
          name_en: surahRow.name_en ?? null,
          ayah_count: surahRow.ayah_count ?? null,
        },
        source_key: sourceKey,
        passages,
        passage: passageIndex !== null ? (passages[0] ?? null) : null,
      }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    console.error('passages error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load passages' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
