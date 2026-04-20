import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const url = new URL(ctx.request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
    const sourceType = url.searchParams.get('source_type') ?? '';

    const conditions: string[] = [];
    const binds: (string | number)[] = [];

    if (sourceType) {
      conditions.push(`source_type = ?1`);
      binds.push(sourceType);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        s.id, s.source_type, s.title, s.subtitle, s.creator, s.publisher,
        s.publication_year, s.language, s.status, s.created_at,
        COUNT(DISTINCT su.id) AS unit_count,
        COUNT(DISTINCT n.id) AS note_count
      FROM wv_sources s
      LEFT JOIN wv_source_units su ON su.source_id = s.id
      LEFT JOIN wv_notes n ON n.source_id = s.id
      ${where}
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT ?${binds.length + 1}
    `;
    binds.push(limit);

    const { results } = await ctx.env.DB.prepare(sql).bind(...binds).all();

    return new Response(
      JSON.stringify({ ok: true, sources: results ?? [] }),
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
    try { body = await ctx.request.json(); }
    catch { return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders }); }

    const title = (body?.title ?? '').trim();
    if (!title) return new Response(JSON.stringify({ ok: false, error: 'title required' }), { status: 400, headers: jsonHeaders });

    const sourceType = (body?.source_type ?? 'book').trim();
    const creator = (body?.creator ?? body?.author ?? '').trim() || null;
    const subtitle = (body?.subtitle ?? '').trim() || null;
    const publisher = (body?.publisher ?? '').trim() || null;
    const language = (body?.language ?? 'en').trim() || null;
    const publicationYear = body?.publication_year ? parseInt(body.publication_year, 10) : null;

    // Generate a stable id from title+creator+year
    const slug = [title, creator, publicationYear]
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 80);
    const id = `src-${slug}`;
    const canonical = `${sourceType}:${slug}`;

    const workspaceId = (body?.workspace_id ?? 'ws_user_1').trim();

    await ctx.env.DB.prepare(`
      INSERT OR IGNORE INTO wv_sources
        (id, canonical_input, workspace_id, source_type, title, subtitle, creator, publisher, publication_year, language, status, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'active', datetime('now'))
    `).bind(id, canonical, workspaceId, sourceType, title, subtitle, creator, publisher, publicationYear, language).run();

    return new Response(JSON.stringify({ ok: true, id }), { status: 201, headers: jsonHeaders });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
