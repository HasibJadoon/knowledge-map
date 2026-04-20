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
    const url  = new URL(ctx.request.url);
    const limit       = Math.min(200, Math.max(1, Number(url.searchParams.get('limit')  ?? 50)));
    const offset      = Math.max(0,               Number(url.searchParams.get('offset') ?? 0));
    const containerId = (url.searchParams.get('container_id') ?? '').trim();
    const q           = (url.searchParams.get('q') ?? '').trim();

    const where: string[] = [];
    const binds: unknown[] = [];

    if (containerId) {
      where.push(`container_id = ?${binds.length + 1}`);
      binds.push(containerId);
    }
    if (q) {
      where.push(`(id LIKE ?${binds.length + 1} OR text_cache LIKE ?${binds.length + 2})`);
      binds.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [countRow, dataRes] = await Promise.all([
      ctx.env.DB.prepare(`SELECT COUNT(*) AS n FROM ar_container_units ${whereClause}`)
        .bind(...binds).first<{ n: number }>(),
      ctx.env.DB.prepare(
        `SELECT u.id, u.container_id, u.unit_type, u.order_index,
                u.start_ref, u.end_ref, u.surah, u.surah_ref,
                SUBSTR(u.text_cache, 1, 120) AS text_preview,
                u.meta_json, u.created_at,
                c.title AS container_title
         FROM ar_container_units u
         LEFT JOIN ar_containers c ON c.id = u.container_id
         ${whereClause}
         ORDER BY u.container_id, u.order_index
         LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
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

    const id           = (body.id ?? '').trim();
    const container_id = (body.container_id ?? '').trim();
    const unit_type    = (body.unit_type ?? 'chapter').trim();
    const order_index  = Number(body.order_index ?? 0);
    if (!id || !container_id) {
      return new Response(JSON.stringify({ ok: false, error: 'id and container_id are required' }), { status: 400, headers: jsonHeaders });
    }

    const meta_json  = body.meta ? JSON.stringify(body.meta) : null;
    const text_cache = body.text_cache ?? null;
    const start_ref  = body.start_ref ?? null;
    const end_ref    = body.end_ref ?? null;
    const surah      = body.surah ?? null;
    const surah_ref  = body.surah_ref ?? null;

    await ctx.env.DB.prepare(
      `INSERT INTO ar_container_units
         (id, container_id, unit_type, order_index, start_ref, end_ref, surah, surah_ref, text_cache, meta_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
       ON CONFLICT(id) DO UPDATE SET
         unit_type   = excluded.unit_type,
         order_index = excluded.order_index,
         start_ref   = excluded.start_ref,
         end_ref     = excluded.end_ref,
         surah       = excluded.surah,
         surah_ref   = excluded.surah_ref,
         text_cache  = excluded.text_cache,
         meta_json   = excluded.meta_json,
         updated_at  = datetime('now')`
    ).bind(id, container_id, unit_type, order_index, start_ref, end_ref, surah, surah_ref, text_cache, meta_json).run();

    return new Response(JSON.stringify({ ok: true, id }), { status: 201, headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), { status: 500, headers: jsonHeaders });
  }
};
