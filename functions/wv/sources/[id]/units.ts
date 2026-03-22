import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const sourceId = ctx.params['id'] as string;

    const { results } = await ctx.env.DB.prepare(`
      SELECT
        su.id, su.unit_type, su.title, su.order_index, su.parent_unit_id,
        su.start_ref, su.end_ref, su.summary, su.created_at,
        (
          COALESCE((SELECT COUNT(*) FROM wv_notes n WHERE n.source_unit_id = su.id), 0) +
          COALESCE((SELECT COUNT(*) FROM wv_highlights h WHERE h.source_unit_id = su.id), 0)
        ) AS note_count
      FROM wv_source_units su
      WHERE su.source_id = ?1
      ORDER BY su.order_index ASC, su.created_at ASC
    `).bind(sourceId).all();

    return new Response(
      JSON.stringify({ ok: true, units: results ?? [] }),
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
    const sourceId = ctx.params['id'] as string;
    let body: any;
    try { body = await ctx.request.json(); }
    catch { return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders }); }

    const title = (body?.title ?? '').trim() || null;
    const unitType = (body?.unit_type ?? 'chapter').trim();
    const orderIndex = typeof body?.order_index === 'number' ? body.order_index : 0;
    const summary = (body?.summary ?? '').trim() || null;
    const parentUnitId = (body?.parent_unit_id ?? '').trim() || null;

    const slug = [sourceId, unitType, orderIndex, title]
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 100);
    const id = `sru-${slug}`;
    const canonical = `unit:${slug}`;

    const workspaceId = (body?.workspace_id ?? 'ws_user_1').trim();

    await ctx.env.DB.prepare(`
      INSERT OR IGNORE INTO wv_source_units
        (id, canonical_input, workspace_id, source_id, parent_unit_id, unit_type, title, order_index, summary, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))
    `).bind(id, canonical, workspaceId, sourceId, parentUnitId, unitType, title, orderIndex, summary).run();

    return new Response(JSON.stringify({ ok: true, id }), { status: 201, headers: jsonHeaders });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
