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
  const q = (url.searchParams.get('q') ?? '').trim();

  const page = Math.max(1, toInt(url.searchParams.get('page'), 1));
  const pageSize = Math.min(200, Math.max(25, toInt(url.searchParams.get('pageSize'), 50)));
  let limit = pageSize;
  let offset = (page - 1) * pageSize;
  const offsetParam = url.searchParams.get('offset');
  const limitParam = url.searchParams.get('limit');
  if (offsetParam !== null || limitParam !== null) {
    limit = Math.min(500, Math.max(1, toInt(limitParam, pageSize)));
    offset = Math.max(0, toInt(offsetParam, 0));
  }

  const whereParts: string[] = [];
  const binds: (string | number)[] = [];
  if (q) {
    const like = `%${q}%`;
    whereParts.push('(lemma_text LIKE ? OR lemma_text_clean LIKE ?)');
    binds.push(like, like);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  try {
    const countStmt = ctx.env.DB.prepare(`SELECT COUNT(*) AS total FROM quran_ayah_lemmas ${whereClause}`);
    const countRes = await countStmt.bind(...binds).first();
    const total = Number(countRes?.total ?? 0);

    const dataStmt = ctx.env.DB.prepare(`
      SELECT
        lemma_id,
        lemma_text,
        lemma_text_clean,
        words_count,
        uniq_words_count,
        primary_ar_u_token
      FROM quran_ayah_lemmas
      ${whereClause}
      ORDER BY lemma_text_clean ASC
      LIMIT ?
      OFFSET ?
    `);

    const { results = [] } = await dataStmt.bind(...binds, limit, offset).all();

    return new Response(
      JSON.stringify({
        ok: true,
        total,
        page,
        pageSize: limit,
        hasMore: offset + (results as any[]).length < total,
        results,
      }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    console.error('lemma list error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load lemmas' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
