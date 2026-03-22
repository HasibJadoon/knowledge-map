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
    const visibility = (url.searchParams.get('visibility') ?? '').trim();

    // Personal app: return all records with visibility flag so UI can filter.
    // Private contacts are never hidden from the owner at the API level.
    let stmt;
    if (visibility) {
      stmt = ctx.env.DB.prepare(
        `SELECT * FROM wv_person WHERE visibility = ?1 ORDER BY name ASC`
      ).bind(visibility);
    } else {
      stmt = ctx.env.DB.prepare(`SELECT * FROM wv_person ORDER BY name ASC`);
    }

    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ ok: true, people: results ?? [] }),
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

    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const relationship = typeof body?.relationship === 'string' ? body.relationship.trim() : '';

    if (!name) {
      return new Response(
        JSON.stringify({ ok: false, error: 'name is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }
    if (!relationship) {
      return new Response(
        JSON.stringify({ ok: false, error: 'relationship is required' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const nickname = typeof body?.nickname === 'string' ? body.nickname.trim() || null : null;
    const familyRole = typeof body?.family_role === 'string' ? body.family_role.trim() || null : null;
    const visibility = typeof body?.visibility === 'string' ? body.visibility.trim() || 'private' : 'private';
    const bio = typeof body?.bio === 'string' ? body.bio.trim() || null : null;
    const scholarId = typeof body?.scholar_id === 'string' ? body.scholar_id.trim() || null : null;
    const avatarUrl = typeof body?.avatar_url === 'string' ? body.avatar_url.trim() || null : null;

    const result = await ctx.env.DB.prepare(
      `INSERT INTO wv_person (name, nickname, relationship, family_role, visibility, bio, scholar_id, avatar_url, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))`
    )
      .bind(name, nickname, relationship, familyRole, visibility, bio, scholarId, avatarUrl)
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
