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

// GET /ar/units/:id — returns a single unit with FULL text (no truncation)
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing id' }), { status: 400, headers: jsonHeaders });
    }

    const row = await ctx.env.DB.prepare(
      `SELECT u.id, u.container_id, u.unit_type, u.order_index,
              u.start_ref, u.end_ref, u.surah, u.surah_ref,
              u.text_cache AS full_text,
              u.meta_json,
              c.title AS container_title,
              c.meta_json AS container_meta_json
       FROM ar_container_units u
       LEFT JOIN ar_containers c ON c.id = u.container_id
       WHERE u.id = ?1`
    ).bind(id).first<any>();

    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Unit not found' }), { status: 404, headers: jsonHeaders });
    }

    const result = {
      ...row,
      meta: safeJson(row.meta_json),
      meta_json: undefined,
      container_meta: safeJson(row.container_meta_json),
      container_meta_json: undefined,
    };

    return new Response(JSON.stringify({ ok: true, result }), { headers: jsonHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: jsonHeaders });
  }
};
