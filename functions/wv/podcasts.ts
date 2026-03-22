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
    const status = (url.searchParams.get('status') ?? '').trim();
    const type = (url.searchParams.get('type') ?? '').trim();

    const conditions: string[] = [];
    const binds: (string | null)[] = [];
    let bindIdx = 1;

    if (status) {
      conditions.push(`p.status = ?${bindIdx++}`);
      binds.push(status);
    }
    if (type) {
      conditions.push(`p.type = ?${bindIdx++}`);
      binds.push(type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        p.*,
        COUNT(pp.id) AS participant_count
      FROM wv_podcast p
      LEFT JOIN wv_podcast_participant pp ON pp.podcast_id = p.id
      ${where}
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    const stmt = conditions.length
      ? ctx.env.DB.prepare(sql).bind(...binds)
      : ctx.env.DB.prepare(sql);

    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ ok: true, podcasts: results ?? [] }),
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

    const description = typeof body?.description === 'string' ? body.description.trim() || null : null;
    const type = typeof body?.type === 'string' ? body.type.trim() || null : null;
    const status = typeof body?.status === 'string' ? body.status.trim() || 'draft' : 'draft';
    const docId = typeof body?.doc_id === 'string' ? body.doc_id.trim() || null : null;
    const recordedAt = typeof body?.recorded_at === 'string' ? body.recorded_at.trim() || null : null;
    const publishedUrl = typeof body?.published_url === 'string' ? body.published_url.trim() || null : null;

    const result = await ctx.env.DB.prepare(
      `INSERT INTO wv_podcast (title, description, type, status, doc_id, recorded_at, published_url, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'), datetime('now'))`
    )
      .bind(title, description, type, status, docId, recordedAt, publishedUrl)
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
