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

    const person = await ctx.env.DB.prepare(
      `SELECT * FROM wv_person WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!person) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Person not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, person }),
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
      `SELECT id FROM wv_person WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Person not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const stringFields = [
      'name',
      'nickname',
      'relationship',
      'family_role',
      'visibility',
      'bio',
      'scholar_id',
      'avatar_url',
    ] as const;

    const setCols: string[] = [];
    const binds: (string | null)[] = [];
    let bindIdx = 1;

    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setCols.push(`${field} = ?${bindIdx++}`);
        binds.push(typeof body[field] === 'string' ? body[field].trim() || null : null);
      }
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
      `UPDATE wv_person SET ${setCols.join(', ')} WHERE id = ?${bindIdx}`
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
      `SELECT id FROM wv_person WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Person not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    // Hard delete — no cascade at DB level; API is the enforcement point
    await ctx.env.DB.prepare(`DELETE FROM wv_person WHERE id = ?1`)
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
