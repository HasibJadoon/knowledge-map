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
    const url = new URL(ctx.request.url);
    const parentId = url.searchParams.get('parent_id');

    let stmt;
    if (parentId !== null) {
      if (parentId === '') {
        stmt = ctx.env.DB.prepare(
          `SELECT * FROM wv_worldview WHERE parent_id IS NULL ORDER BY name ASC`
        );
      } else {
        stmt = ctx.env.DB.prepare(
          `SELECT * FROM wv_worldview WHERE parent_id = ?1 ORDER BY name ASC`
        ).bind(parentId);
      }
    } else {
      stmt = ctx.env.DB.prepare(
        `SELECT * FROM wv_worldview ORDER BY name ASC`
      );
    }

    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ ok: true, worldviews: results ?? [] }),
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
    const type = typeof body?.type === 'string' ? body.type.trim() : '';

    if (!name) {
      return new Response(
        JSON.stringify({ ok: false, error: 'name is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (!type) {
      return new Response(
        JSON.stringify({ ok: false, error: 'type is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const parentId = typeof body?.parent_id === 'string' ? body.parent_id.trim() || null : null;
    const description = typeof body?.description === 'string' ? body.description.trim() || null : null;
    const color = typeof body?.color === 'string' ? body.color.trim() || null : null;
    const icon = typeof body?.icon === 'string' ? body.icon.trim() || null : null;

    const result = await ctx.env.DB.prepare(
      `INSERT INTO wv_worldview (name, type, parent_id, description, color, icon, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), datetime('now'))`
    )
      .bind(name, type, parentId, description, color, icon)
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
