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
    const worldviewId = (url.searchParams.get('worldview_id') ?? '').trim();
    const topicId = (url.searchParams.get('topic_id') ?? '').trim();
    const status = (url.searchParams.get('status') ?? '').trim();

    const conditions: string[] = [];
    const binds: (string | null)[] = [];
    let bindIdx = 1;

    if (worldviewId) {
      conditions.push(`worldview_id = ?${bindIdx++}`);
      binds.push(worldviewId);
    }
    if (topicId) {
      conditions.push(`topic_id = ?${bindIdx++}`);
      binds.push(topicId);
    }
    if (status) {
      conditions.push(`status = ?${bindIdx++}`);
      binds.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM wv_brainstorm_session ${where} ORDER BY created_at DESC`;

    const stmt = conditions.length
      ? ctx.env.DB.prepare(sql).bind(...binds)
      : ctx.env.DB.prepare(sql);

    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ ok: true, sessions: results ?? [] }),
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

    const title = typeof body?.title === 'string' ? body.title.trim() : '';

    if (!title) {
      return new Response(
        JSON.stringify({ ok: false, error: 'title is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const content = typeof body?.content === 'string' ? body.content.trim() || null : null;
    const worldviewId = typeof body?.worldview_id === 'string' ? body.worldview_id.trim() || null : null;
    const topicId = typeof body?.topic_id === 'string' ? body.topic_id.trim() || null : null;
    const status = typeof body?.status === 'string' ? body.status.trim() || 'draft' : 'draft';

    const result = await ctx.env.DB.prepare(
      `INSERT INTO wv_brainstorm_session (title, content, worldview_id, topic_id, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))`
    )
      .bind(title, content, worldviewId, topicId, status)
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
