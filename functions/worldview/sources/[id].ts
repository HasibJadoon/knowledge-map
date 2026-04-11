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

// GET /worldview/sources/:id  — single source + its top-level units
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) return new Response(JSON.stringify({ ok: false, error: 'Missing id' }), { status: 400, headers: h });

    const [sourceRow, unitsRes] = await Promise.all([
      ctx.env.DB.prepare(
        `SELECT id, source_type, title, subtitle, creator, publisher,
                publication_year, language, source_url, source_domain,
                source_language, era_ce, status, created_at, meta_json
         FROM wv_sources WHERE id = ?1`
      ).bind(id).first<any>(),
      // Fetch all units for this source (flat, with parent info for tree building)
      ctx.env.DB.prepare(
        `SELECT id, source_id, parent_unit_id, unit_type, title,
                order_index, start_ref, end_ref, anchor_text, summary,
                COALESCE(
                  json_extract(unit_json, '$.readingBody[0]'),
                  json_extract(unit_json, '$.reading_body[0]'),
                  summary,
                  anchor_text
                ) AS body_preview,
                meta_json
         FROM wv_source_units
         WHERE source_id = ?1
         ORDER BY order_index ASC, id ASC`
      ).bind(id).all(),
    ]);

    if (!sourceRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Source not found' }), { status: 404, headers: h });
    }

    const source = {
      ...sourceRow,
      meta: safeJson(sourceRow.meta_json),
      meta_json: undefined,
    };

    const units = (unitsRes.results ?? []).map((r: any) => ({
      ...r,
      meta: safeJson(r.meta_json),
      meta_json: undefined,
    }));

    return new Response(JSON.stringify({ ok: true, source, units }), { headers: h });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: h });
  }
};
