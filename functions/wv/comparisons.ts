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
    const topicId = (url.searchParams.get('topic_id') ?? '').trim();
    const status = (url.searchParams.get('status') ?? '').trim();

    const conditions: string[] = [];
    const binds: (string | null)[] = [];
    let bindIdx = 1;

    if (topicId) {
      conditions.push(`c.topic_id = ?${bindIdx++}`);
      binds.push(topicId);
    }
    if (status) {
      conditions.push(`c.status = ?${bindIdx++}`);
      binds.push(status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        c.*,
        COUNT(t.id) AS tab_count
      FROM wv_comparison c
      LEFT JOIN wv_comparison_tab t ON t.comparison_id = c.id
      ${where}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `;

    const stmt = conditions.length
      ? ctx.env.DB.prepare(sql).bind(...binds)
      : ctx.env.DB.prepare(sql);

    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ ok: true, comparisons: results ?? [] }),
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

    const topicId = typeof body?.topic_id === 'string' ? body.topic_id.trim() || null : null;
    const description = typeof body?.description === 'string' ? body.description.trim() || null : null;
    const status = typeof body?.status === 'string' ? body.status.trim() || 'draft' : 'draft';

    const result = await ctx.env.DB.prepare(
      `INSERT INTO wv_comparison (title, topic_id, description, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, datetime('now'), datetime('now'))`
    )
      .bind(title, topicId, description, status)
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
