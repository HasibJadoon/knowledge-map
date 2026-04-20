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
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const session = await ctx.env.DB.prepare(
      `SELECT * FROM wv_brainstorm_session WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!session) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Session not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, session }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    let body: any;
    try {
      body = await ctx.request.json();
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const existing = await ctx.env.DB.prepare(
      `SELECT id FROM wv_brainstorm_session WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Session not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const setCols: string[] = [];
    const binds: (string | null)[] = [];
    let bindIdx = 1;

    if (Object.prototype.hasOwnProperty.call(body, 'title') && typeof body.title === 'string') {
      setCols.push(`title = ?${bindIdx++}`);
      binds.push(body.title.trim() || null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'content')) {
      setCols.push(`content = ?${bindIdx++}`);
      binds.push(typeof body.content === 'string' ? body.content.trim() || null : null);
    }
    if (Object.prototype.hasOwnProperty.call(body, 'status') && typeof body.status === 'string') {
      setCols.push(`status = ?${bindIdx++}`);
      binds.push(body.status.trim() || null);
    }

    if (!setCols.length) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No fields to update' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    setCols.push(`updated_at = datetime('now')`);
    binds.push(id);

    await ctx.env.DB.prepare(
      `UPDATE wv_brainstorm_session SET ${setCols.join(', ')} WHERE id = ?${bindIdx}`
    )
      .bind(...binds)
      .run();

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const existing = await ctx.env.DB.prepare(
      `SELECT id FROM wv_brainstorm_session WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Session not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    await ctx.env.DB.prepare(`DELETE FROM wv_brainstorm_session WHERE id = ?1`)
      .bind(id)
      .run();

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
