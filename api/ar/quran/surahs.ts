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

function parseJson(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
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
  const pageSize = Math.min(200, Math.max(25, toInt(url.searchParams.get('pageSize'), 200)));
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
    whereParts.push('(name_ar LIKE ? OR name_en LIKE ?)');
    binds.push(like, like);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  try {
    const countStmt = ctx.env.DB.prepare(`SELECT COUNT(*) AS total FROM ar_surahs ${whereClause}`);
    const countRes = await countStmt.bind(...binds).first();
    const total = Number(countRes?.total ?? 0);

    const dataStmt = ctx.env.DB.prepare(`
      SELECT
        surah,
        name_ar,
        name_en,
        ayah_count,
        meta_json
      FROM ar_surahs
      ${whereClause}
      ORDER BY surah ASC
      LIMIT ?
      OFFSET ?
    `);

    const { results = [] } = await dataStmt.bind(...binds, limit, offset).all();
    const rows = (results as any[]).map((row) => ({
      surah: row.surah,
      name_ar: row.name_ar,
      name_en: row.name_en,
      ayah_count: row.ayah_count,
      meta: parseJson(row.meta_json),
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        total,
        page,
        pageSize: limit,
        results: rows,
      }),
      { headers: jsonHeaders }
    );
  } catch (err) {
    console.error('surah list error', err);
    return new Response(JSON.stringify({ ok: false, error: 'Failed to load surahs' }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
