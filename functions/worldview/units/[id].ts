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

// GET /worldview/units/:id  — single unit with full reading body + child units
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) return new Response(JSON.stringify({ ok: false, error: 'Missing id' }), { status: 400, headers: h });

    const [unitRow, childrenRes] = await Promise.all([
      ctx.env.DB.prepare(
        `SELECT u.id, u.source_id, u.parent_unit_id, u.unit_type, u.title,
                u.order_index, u.start_ref, u.end_ref, u.anchor_text, u.summary,
                u.unit_json, u.meta_json,
                s.title AS source_title, s.source_type, s.creator
         FROM wv_source_units u
         LEFT JOIN wv_sources s ON s.id = u.source_id
         WHERE u.id = ?1`
      ).bind(id).first<any>(),
      ctx.env.DB.prepare(
        `SELECT id, unit_type, title, order_index, start_ref, end_ref, anchor_text, summary
         FROM wv_source_units
         WHERE parent_unit_id = ?1
         ORDER BY order_index ASC`
      ).bind(id).all(),
    ]);

    if (!unitRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Unit not found' }), { status: 404, headers: h });
    }

    const unitJson = safeJson(unitRow.unit_json);
    const result = {
      ...unitRow,
      reading_body: unitJson?.reading_body ?? null,
      unit_json: undefined,
      meta: safeJson(unitRow.meta_json),
      meta_json: undefined,
      children: childrenRes.results ?? [],
    };

    return new Response(JSON.stringify({ ok: true, result }), { headers: h });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: h });
  }
};
