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
    const domainId = ctx.params['id'] as string;
    if (!domainId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const url = new URL(ctx.request.url);
    const level = (url.searchParams.get('level') ?? '').trim();
    const search = (url.searchParams.get('search') ?? '').trim();

    const conditions: string[] = [`domain_id = ?1`];
    const binds: (string | null)[] = [domainId];
    let bindIdx = 2;

    if (level) {
      conditions.push(`level = ?${bindIdx++}`);
      binds.push(level);
    }
    if (search) {
      const like = `%${search}%`;
      conditions.push(`(phrase_ar LIKE ?${bindIdx} OR phrase_en LIKE ?${bindIdx} OR transliteration LIKE ?${bindIdx})`);
      bindIdx++;
      binds.push(like);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const sql = `SELECT * FROM ar_domain_phrase ${where} ORDER BY sort_order ASC, id ASC`;

    const { results } = await ctx.env.DB.prepare(sql).bind(...binds).all();

    return new Response(
      JSON.stringify({ ok: true, phrases: results ?? [] }),
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
    const domainId = ctx.params['id'] as string;
    if (!domainId) {
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

    const phraseAr = typeof body?.phrase_ar === 'string' ? body.phrase_ar.trim() : '';
    const phraseEn = typeof body?.phrase_en === 'string' ? body.phrase_en.trim() : '';

    if (!phraseAr) {
      return new Response(
        JSON.stringify({ ok: false, error: 'phrase_ar is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (!phraseEn) {
      return new Response(
        JSON.stringify({ ok: false, error: 'phrase_en is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // Verify domain exists
    const domain = await ctx.env.DB.prepare(
      `SELECT id FROM ar_domain WHERE id = ?1`
    )
      .bind(domainId)
      .first();

    if (!domain) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Domain not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const transliteration = typeof body?.transliteration === 'string' ? body.transliteration.trim() || null : null;
    const audioUrl = typeof body?.audio_url === 'string' ? body.audio_url.trim() || null : null;
    const level = typeof body?.level === 'string' ? body.level.trim() || null : null;
    const sortOrder = typeof body?.sort_order === 'number' ? body.sort_order : null;

    const result = await ctx.env.DB.prepare(
      `INSERT INTO ar_domain_phrase (domain_id, phrase_ar, phrase_en, transliteration, audio_url, level, sort_order, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'), datetime('now'))`
    )
      .bind(domainId, phraseAr, phraseEn, transliteration, audioUrl, level, sortOrder)
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

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const domainId = ctx.params['id'] as string;
    if (!domainId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const url = new URL(ctx.request.url);
    const phraseId = (url.searchParams.get('phraseId') ?? '').trim();
    if (!phraseId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'phraseId query parameter is required' }),
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
      `SELECT id FROM ar_domain_phrase WHERE id = ?1 AND domain_id = ?2`
    )
      .bind(phraseId, domainId)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Phrase not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    const setCols: string[] = [];
    const binds: (string | number | null)[] = [];
    let bindIdx = 1;

    const stringFields = ['phrase_ar', 'phrase_en', 'transliteration', 'audio_url', 'level'] as const;
    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        setCols.push(`${field} = ?${bindIdx++}`);
        binds.push(typeof body[field] === 'string' ? body[field].trim() || null : null);
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, 'sort_order')) {
      setCols.push(`sort_order = ?${bindIdx++}`);
      binds.push(typeof body.sort_order === 'number' ? body.sort_order : null);
    }

    if (!setCols.length) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No fields to update' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    setCols.push(`updated_at = datetime('now')`);
    binds.push(phraseId);

    await ctx.env.DB.prepare(
      `UPDATE ar_domain_phrase SET ${setCols.join(', ')} WHERE id = ?${bindIdx}`
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
    const domainId = ctx.params['id'] as string;
    if (!domainId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'id is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const url = new URL(ctx.request.url);
    const phraseId = (url.searchParams.get('phraseId') ?? '').trim();
    if (!phraseId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'phraseId query parameter is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const existing = await ctx.env.DB.prepare(
      `SELECT id FROM ar_domain_phrase WHERE id = ?1 AND domain_id = ?2`
    )
      .bind(phraseId, domainId)
      .first();

    if (!existing) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Phrase not found' }),
        { status: 404, headers: jsonHeaders }
      );
    }

    await ctx.env.DB.prepare(`DELETE FROM ar_domain_phrase WHERE id = ?1`)
      .bind(phraseId)
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
