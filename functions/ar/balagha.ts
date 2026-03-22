import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

const VALID_BRANCHES = new Set(['bayan', 'maani', 'badi']);

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const branch = (url.searchParams.get('branch') ?? '').trim();
    const search = (url.searchParams.get('search') ?? '').trim();

    const conditions: string[] = [];
    const binds: (string | null)[] = [];
    let bindIdx = 1;

    if (branch) {
      if (!VALID_BRANCHES.has(branch)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'branch must be one of: bayan, maani, badi' }),
          { status: 400, headers: jsonHeaders }
        );
      }
      conditions.push(`branch = ?${bindIdx++}`);
      binds.push(branch);
    }

    if (search) {
      const like = `%${search}%`;
      conditions.push(`(term_ar LIKE ?${bindIdx} OR term_en LIKE ?${bindIdx} OR definition LIKE ?${bindIdx})`);
      bindIdx++;
      binds.push(like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM ar_balagha ${where} ORDER BY branch ASC, term_en ASC`;

    const stmt = conditions.length
      ? ctx.env.DB.prepare(sql).bind(...binds)
      : ctx.env.DB.prepare(sql);

    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ ok: true, terms: results ?? [] }),
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

    const termAr = typeof body?.term_ar === 'string' ? body.term_ar.trim() : '';
    const termEn = typeof body?.term_en === 'string' ? body.term_en.trim() : '';
    const branch = typeof body?.branch === 'string' ? body.branch.trim() : '';
    const definition = typeof body?.definition === 'string' ? body.definition.trim() : '';

    if (!termAr) {
      return new Response(
        JSON.stringify({ ok: false, error: 'term_ar is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (!termEn) {
      return new Response(
        JSON.stringify({ ok: false, error: 'term_en is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (!branch) {
      return new Response(
        JSON.stringify({ ok: false, error: 'branch is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (!VALID_BRANCHES.has(branch)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'branch must be one of: bayan, maani, badi' }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (!definition) {
      return new Response(
        JSON.stringify({ ok: false, error: 'definition is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // JSON-stringify arrays before storing
    let examplesJson: string | null = null;
    if (body?.examples !== undefined && body.examples !== null) {
      const examples = Array.isArray(body.examples) ? body.examples : [body.examples];
      examplesJson = JSON.stringify(examples);
    }

    let quranRefsJson: string | null = null;
    if (body?.quran_refs !== undefined && body.quran_refs !== null) {
      const quranRefs = Array.isArray(body.quran_refs) ? body.quran_refs : [body.quran_refs];
      quranRefsJson = JSON.stringify(quranRefs);
    }

    const result = await ctx.env.DB.prepare(
      `INSERT INTO ar_balagha (term_ar, term_en, branch, definition, examples, quran_refs, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), datetime('now'))`
    )
      .bind(termAr, termEn, branch, definition, examplesJson, quranRefsJson)
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
