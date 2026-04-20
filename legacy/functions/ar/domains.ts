import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const { results } = await ctx.env.DB.prepare(
      `SELECT
        d.*,
        COUNT(p.id) AS phrase_count
       FROM ar_domain d
       LEFT JOIN ar_domain_phrase p ON p.domain_id = d.id
       GROUP BY d.id
       ORDER BY d.sort_order ASC, d.name ASC`
    ).all();

    return new Response(
      JSON.stringify({ ok: true, domains: results ?? [] }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const nameAr = typeof body?.name_ar === 'string' ? body.name_ar.trim() : '';

    if (!name) {
      return new Response(
        JSON.stringify({ ok: false, error: 'name is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (!nameAr) {
      return new Response(
        JSON.stringify({ ok: false, error: 'name_ar is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const description = typeof body?.description === 'string' ? body.description.trim() || null : null;
    const icon = typeof body?.icon === 'string' ? body.icon.trim() || null : null;
    const sortOrder = typeof body?.sort_order === 'number' ? body.sort_order : null;

    const result = await ctx.env.DB.prepare(
      `INSERT INTO ar_domain (name, name_ar, description, icon, sort_order, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))`
    )
      .bind(name, nameAr, description, icon, sortOrder)
      .run();

    const id = result.meta?.last_row_id ?? null;

    return new Response(
      JSON.stringify({ ok: true, id }),
      { status: 201, headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
