import type { D1Database, PagesFunction } from '@cloudflare/workers-types';
import { requireAuth } from '../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function toInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
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
    return new Response(JSON.stringify({ ok: false, error: 'surah query param is required (1-114).' }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const page = Math.max(1, toInt(url.searchParams.get('page'), 1));
  const pageSize = Math.min(500, Math.max(25, toInt(url.searchParams.get('pageSize'), 300)));
  let limit = pageSize;
  let offset = (page - 1) * pageSize;
  const offsetParam = url.searchParams.get('offset');
  const limitParam = url.searchParams.get('limit');
  if (offsetParam !== null || limitParam !== null) {
    limit = Math.min(500, Math.max(1, toInt(limitParam, pageSize)));
    offset = Math.max(0, toInt(offsetParam, 0));
  }

  try {
    const countStmt = ctx.env.DB.prepare(`SELECT COUNT(*) AS total FROM ar_quran_ayah WHERE surah = ?1`).bind(surah);
    const countRes = await countStmt.first();
    const total = Number(countRes?.total ?? 0);

    const dataStmt = ctx.env.DB.prepare(`
      SELECT
        surah,
        ayah,
        surah_ayah,
        page,
        text,
        text_simple,
        text_normalized,
        verse_mark,
        verse_full,
        word_count,
        char_count,
        surah_name_ar,
        surah_name_en
      FROM ar_quran_ayah
      WHERE surah = ?1
      ORDER BY ayah ASC
      LIMIT ?2
      OFFSET ?3
    `);

    const { results = [] } = await dataStmt.bind(surah, limit, offset).all();

    return new Response(
      JSON.stringify({
        ok: true,
        total,
        page,
        pageSize: limit,
        results,
      }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    console.error('ayah list error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load ayahs' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
