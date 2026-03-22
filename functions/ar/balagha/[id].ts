import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

function parseJsonField(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const id = ctx.params['id'] as string;
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const row = await ctx.env.DB.prepare(
      `SELECT * FROM ar_balagha WHERE id = ?1`
    )
      .bind(id)
      .first<Record<string, unknown>>();

    if (!row) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Term not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const term = {
      ...row,
      examples: parseJsonField(row['examples']),
      quran_refs: parseJsonField(row['quran_refs']),
    };

    return new Response(
      JSON.stringify({ ok: true, term }),
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
      `SELECT id FROM ar_balagha WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Term not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const VALID_BRANCHES = new Set(['bayan', 'maani', 'badi']);
    const setCols: string[] = [];
    const binds: (string | null)[] = [];
    let bindIdx = 1;

    const stringFields = ['term_ar', 'term_en', 'definition'] as const;
    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setCols.push(`${field} = ?${bindIdx++}`);
        binds.push(typeof body[field] === 'string' ? body[field].trim() || null : null);
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'branch') && typeof body.branch === 'string') {
      const branch = body.branch.trim();
      if (!VALID_BRANCHES.has(branch)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'branch must be one of: bayan, maani, badi' }),
          { status: 400, headers: jsonHeaders }
        );
      }
      setCols.push(`branch = ?${bindIdx++}`);
      binds.push(branch);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'examples')) {
      const examples = body.examples !== null && body.examples !== undefined
        ? JSON.stringify(Array.isArray(body.examples) ? body.examples : [body.examples])
        : null;
      setCols.push(`examples = ?${bindIdx++}`);
      binds.push(examples);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'quran_refs')) {
      const quranRefs = body.quran_refs !== null && body.quran_refs !== undefined
        ? JSON.stringify(Array.isArray(body.quran_refs) ? body.quran_refs : [body.quran_refs])
        : null;
      setCols.push(`quran_refs = ?${bindIdx++}`);
      binds.push(quranRefs);
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
      `UPDATE ar_balagha SET ${setCols.join(', ')} WHERE id = ?${bindIdx}`
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
      `SELECT id FROM ar_balagha WHERE id = ?1`
    )
      .bind(id)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Term not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    await ctx.env.DB.prepare(`DELETE FROM ar_balagha WHERE id = ?1`)
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
