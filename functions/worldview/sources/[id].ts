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

async function hasTable(db: D1Database, tableName: string): Promise<boolean> {
  const row = await db
    .prepare(
      `
      SELECT 1 AS ok
      FROM sqlite_master
      WHERE type = 'table' AND name = ?1
      LIMIT 1
      `
    )
    .bind(tableName)
    .first<{ ok: number }>();

  return !!row?.ok;
}

// GET /worldview/sources/:id  — single source + its top-level units
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) return new Response(JSON.stringify({ ok: false, error: 'Missing id' }), { status: 400, headers: h });

    const db = ctx.env.DB;
    const [hasSourcePeople, hasPeople, sourceRow, unitsRes] = await Promise.all([
      hasTable(db, 'wv_source_people'),
      hasTable(db, 'wv_people'),
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
                SUBSTR(COALESCE(unit_json->>'$.reading_body', unit_json->>'$.readingBody'), 1, 200) AS body_preview,
                meta_json
         FROM wv_source_units
         WHERE source_id = ?1
         ORDER BY order_index ASC, id ASC`
      ).bind(id).all(),
    ]);

    if (!sourceRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Source not found' }), { status: 404, headers: h });
    }

    const peopleRes =
      hasSourcePeople && hasPeople
        ? await db
            .prepare(
              `
              SELECT
                p.id,
                p.display_name,
                p.sort_name,
                p.person_type,
                p.bio_short,
                p.website_url,
                sp.role,
                sp.is_primary,
                sp.order_index,
                p.meta_json
              FROM wv_source_people sp
              INNER JOIN wv_people p ON p.id = sp.person_id
              WHERE sp.source_id = ?1
              ORDER BY sp.is_primary DESC, sp.order_index ASC, p.display_name ASC
              `
            )
            .bind(id)
            .all()
        : { results: [] as any[] };

    const source = {
      ...sourceRow,
      meta: safeJson(sourceRow.meta_json),
      meta_json: undefined,
      people: (peopleRes.results ?? []).map((row: any) => ({
        ...row,
        meta: safeJson(row.meta_json),
        meta_json: undefined,
      })),
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
