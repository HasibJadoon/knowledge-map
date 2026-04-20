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

    const comparison = await ctx.env.DB.prepare(
      `SELECT * FROM wv_comparison WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!comparison) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Comparison not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const { results: tabs } = await ctx.env.DB.prepare(
      `SELECT * FROM wv_comparison_tab WHERE comparison_id = ?1 ORDER BY sort_order ASC, id ASC`
    )
      .bind(id)
      .all();

    const { results: rows } = await ctx.env.DB.prepare(
      `SELECT * FROM wv_comparison_row WHERE comparison_id = ?1 ORDER BY sort_order ASC, id ASC`
    )
      .bind(id)
      .all();

    const { results: cells } = await ctx.env.DB.prepare(
      `SELECT * FROM wv_comparison_cell WHERE comparison_id = ?1`
    )
      .bind(id)
      .all();

    return new Response(
      JSON.stringify({
        ok: true,
        comparison,
        tabs: tabs ?? [],
        rows: rows ?? [],
        cells: cells ?? [],
      }),
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
      `SELECT id FROM wv_comparison WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Comparison not found' }),
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
    if (Object.prototype.hasOwnProperty.call(body, 'description')) {
      setCols.push(`description = ?${bindIdx++}`);
      binds.push(typeof body.description === 'string' ? body.description.trim() || null : null);
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
      `UPDATE wv_comparison SET ${setCols.join(', ')} WHERE id = ?${bindIdx}`
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
      `SELECT id FROM wv_comparison WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Comparison not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    // Soft delete: set status to 'archived'
    await ctx.env.DB.prepare(
      `UPDATE wv_comparison SET status = 'archived', updated_at = datetime('now') WHERE id = ?1`
    )
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
