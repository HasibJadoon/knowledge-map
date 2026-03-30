import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const h = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function safeJson(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// GET /worldview/sources — list all sources
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url    = new URL(ctx.request.url);
    const limit  = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')  ?? 100)));
    const offset = Math.max(0,               Number(url.searchParams.get('offset') ?? 0));
    const type   = (url.searchParams.get('type') ?? '').trim();
    const domain = (url.searchParams.get('domain') ?? '').trim();
    const q      = (url.searchParams.get('q') ?? '').trim();

    const where: string[] = ["status != 'archived'"];
    const binds: unknown[] = [];

    if (type) {
      where.push(`source_type = ?${binds.length + 1}`);
      binds.push(type);
    }
    if (domain) {
      where.push(`source_domain = ?${binds.length + 1}`);
      binds.push(domain);
    }
    if (q) {
      where.push(`(title LIKE ?${binds.length + 1} OR creator LIKE ?${binds.length + 2})`);
      binds.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const [countRow, dataRes] = await Promise.all([
      ctx.env.DB.prepare(`SELECT COUNT(*) AS n FROM wv_sources ${whereClause}`)
        .bind(...binds).first<{ n: number }>(),
      ctx.env.DB.prepare(
        `SELECT id, source_type, title, subtitle, creator, publisher,
                publication_year, language, source_url, source_domain,
                source_language, era_ce, status, created_at,
                meta_json
         FROM wv_sources
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
      ).bind(...binds, limit, offset).all(),
    ]);

    const total   = Number(countRow?.n ?? 0);
    const results = (dataRes.results ?? []).map((r: any) => ({
      ...r,
      meta: safeJson(r.meta_json),
      meta_json: undefined,
    }));

    return new Response(JSON.stringify({
      ok: true, total, limit, offset,
      hasMore: offset + results.length < total,
      results,
    }), { headers: h });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: h });
  }
};
