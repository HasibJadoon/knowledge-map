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
  const lemmaId = toInt(url.searchParams.get('lemma_id'), 0);
  const surah = toInt(url.searchParams.get('surah'), 0);
  const ayah = toInt(url.searchParams.get('ayah'), 0);

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

  if (lemmaId) {
    whereParts.push('loc.lemma_id = ?');
    binds.push(lemmaId);
  }

  if (surah) {
    whereParts.push('loc.surah = ?');
    binds.push(surah);
  }

  if (ayah) {
    whereParts.push('loc.ayah = ?');
    binds.push(ayah);
  }

  if (q) {
    const like = `%${q}%`;
    whereParts.push('(l.lemma_text LIKE ? OR l.lemma_text_clean LIKE ?)');
    binds.push(like, like);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  try {
    const countStmt = ctx.env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM quran_ayah_lemma_location loc
      LEFT JOIN quran_ayah_lemmas l ON l.lemma_id = loc.lemma_id
      ${whereClause}
    `);
    const countRes = await countStmt.bind(...binds).first();
    const total = Number(countRes?.total ?? 0);

    const dataStmt = ctx.env.DB.prepare(`
      SELECT
        loc.id,
        loc.lemma_id,
        l.lemma_text,
        l.lemma_text_clean,
        loc.word_location,
        loc.surah,
        loc.ayah,
        loc.token_index,
        loc.word_simple,
        loc.word_diacritic,
        loc.ar_u_token,
        loc.ar_token_occ_id
      FROM quran_ayah_lemma_location loc
      LEFT JOIN quran_ayah_lemmas l ON l.lemma_id = loc.lemma_id
      ${whereClause}
      ORDER BY loc.surah ASC, loc.ayah ASC, loc.token_index ASC
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
    console.error('lemma locations error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load lemma locations' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
