import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function safeJson(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const limit  = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')  ?? 50)));
    const offset = Math.max(0,               Number(url.searchParams.get('offset') ?? 0));
    const q      = (url.searchParams.get('q') ?? '').trim();
    const type   = (url.searchParams.get('type') ?? '').trim();

    const where: string[] = [];
    const binds: unknown[] = [];

    if (q) {
      where.push(`(title LIKE ?${binds.length + 1} OR id LIKE ?${binds.length + 2})`);
      binds.push(`%${q}%`, `%${q}%`);
    }
    if (type) {
      where.push(`container_type = ?${binds.length + 1}`);
      binds.push(type);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRow, dataRes] = await Promise.all([
      ctx.env.DB.prepare(`SELECT COUNT(*) AS n FROM ar_containers ${whereClause}`)
        .bind(...binds).first<{ n: number }>(),
      ctx.env.DB.prepare(
        `SELECT id, container_type, container_key, title, meta_json, created_at, updated_at
         FROM ar_containers ${whereClause}
         ORDER BY created_at DESC LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
      ).bind(...binds, limit, offset).all(),
    ]);

    const total = Number(countRow?.n ?? 0);
    const results = (dataRes.results ?? []).map((r: any) => ({
      ...r,
      meta: safeJson(r.meta_json),
      meta_json: undefined,
    }));

    return new Response(
      JSON.stringify({ ok: true, total, limit, offset, hasMore: offset + results.length < total, results }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), { status: 500, headers: jsonHeaders });
  }
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    const body: any = await ctx.request.json().catch(() => null);
    if (!body) return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders });

    const id             = (body.id ?? '').trim();
    const container_type = (body.container_type ?? body.type ?? '').trim();
    const container_key  = (body.container_key ?? body.key ?? '').trim();
    const title          = (body.title ?? '').trim();
    if (!id || !container_type || !container_key || !title) {
      return new Response(JSON.stringify({ ok: false, error: 'id, container_type, container_key, title are required' }), { status: 400, headers: jsonHeaders });
    }
    const meta_json = body.meta ? JSON.stringify(body.meta) : null;

    await ctx.env.DB.prepare(
      `INSERT INTO ar_containers (id, container_type, container_key, title, meta_json)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(id) DO UPDATE SET
         container_type = excluded.container_type,
         container_key  = excluded.container_key,
         title          = excluded.title,
         meta_json      = excluded.meta_json,
         updated_at     = datetime('now')`
    ).bind(id, container_type, container_key, title, meta_json).run();

    return new Response(JSON.stringify({ ok: true, id }), { status: 201, headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), { status: 500, headers: jsonHeaders });
  }
};
