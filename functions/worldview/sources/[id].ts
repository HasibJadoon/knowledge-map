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
                  (
                    SELECT b.text_plain
                    FROM wv_documents d
                    LEFT JOIN wv_document_blocks b ON b.document_id = d.id
                    WHERE d.doc_type = 'study_note'
                      AND d.domain = 'worldview'
                      AND d.source_id = ?1
                      AND (d.source_unit_id = wv_source_units.id OR d.unit_id = wv_source_units.id)
                      AND b.text_plain IS NOT NULL
                    ORDER BY b.order_index ASC, b.created_at ASC
                    LIMIT 1
                  ),
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
