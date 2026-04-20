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
    const workspaceId = (url.searchParams.get('workspace_id') ?? '').trim();

    const conditions: string[] = [];
    const binds: (string | null)[] = [];
    let bindIdx = 1;

    if (status) {
      conditions.push(`status = ?${bindIdx++}`);
      binds.push(status);
    }
    if (type) {
      conditions.push(`type = ?${bindIdx++}`);
      binds.push(type);
    }
    if (workspaceId) {
      conditions.push(`workspace_id = ?${bindIdx++}`);
      binds.push(workspaceId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM wv_plan ${where} ORDER BY start_date ASC, created_at DESC`;

    const stmt = conditions.length
      ? ctx.env.DB.prepare(sql).bind(...binds)
      : ctx.env.DB.prepare(sql);

    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ ok: true, plans: results ?? [] }),
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
    const startDate = typeof body?.start_date === 'string' ? body.start_date.trim() : '';

    if (!title) {
      return new Response(
        JSON.stringify({ ok: false, error: 'title is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (!startDate) {
      return new Response(
        JSON.stringify({ ok: false, error: 'start_date is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const description = typeof body?.description === 'string' ? body.description.trim() || null : null;
    const type = typeof body?.type === 'string' ? body.type.trim() || null : null;
    const endDate = typeof body?.end_date === 'string' ? body.end_date.trim() || null : null;
    const status = typeof body?.status === 'string' ? body.status.trim() || 'active' : 'active';
    const workspaceId = typeof body?.workspace_id === 'string' ? body.workspace_id.trim() || null : null;

    const result = await ctx.env.DB.prepare(
      `INSERT INTO wv_plan (title, description, type, start_date, end_date, status, workspace_id, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'), datetime('now'))`
    )
      .bind(title, description, type, startDate, endDate, status, workspaceId)
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
