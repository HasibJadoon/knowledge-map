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
    const search = (url.searchParams.get('search') ?? '').trim();

    let stmt;
    if (search) {
      const like = `%${search}%`;
      stmt = ctx.env.DB.prepare(
        `SELECT * FROM wv_topic WHERE name LIKE ?1 ORDER BY name ASC`
      ).bind(like);
    } else {
      stmt = ctx.env.DB.prepare(`SELECT * FROM wv_topic ORDER BY name ASC`);
    }

    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ ok: true, topics: results ?? [] }),
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

    if (!name) {
      return new Response(
        JSON.stringify({ ok: false, error: 'name is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const description = typeof body?.description === 'string' ? body.description.trim() || null : null;
    const parentId = typeof body?.parent_id === 'string' ? body.parent_id.trim() || null : null;

    // Tags stored as JSON string
    let tagsJson: string | null = null;
    if (body?.tags !== undefined && body.tags !== null) {
      const tags = Array.isArray(body.tags) ? body.tags : [body.tags];
      tagsJson = JSON.stringify(tags);
    }

    const result = await ctx.env.DB.prepare(
      `INSERT INTO wv_topic (name, description, parent_id, tags, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, datetime('now'), datetime('now'))`
    )
      .bind(name, description, parentId, tagsJson)
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
