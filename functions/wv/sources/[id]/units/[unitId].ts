import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env { DB: D1Database; }

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

// GET single unit with anchor_text
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const unitId = ctx.params['unitId'] as string;
    const { results } = await ctx.env.DB.prepare(`
      SELECT id, unit_type, title, order_index, parent_unit_id, anchor_text, summary, created_at
      FROM wv_source_units WHERE id = ?1
    `).bind(unitId).all();

    const unit = results?.[0] ?? null;
    return new Response(JSON.stringify({ ok: true, unit }), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), { status: 500, headers: jsonHeaders });
  }
};

// PUT — update anchor_text (the readable passage text) and optionally summary
export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  try {
    const unitId = ctx.params['unitId'] as string;
    let body: any;
    try { body = await ctx.request.json(); }
    catch { return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), { status: 400, headers: jsonHeaders }); }

    const anchorText = typeof body?.anchor_text === 'string' ? body.anchor_text : null;
    const summary = typeof body?.summary === 'string' ? body.summary.trim() || null : undefined;
    const title = typeof body?.title === 'string' ? body.title.trim() || null : undefined;

    const fields: string[] = [];
    const binds: (string | null)[] = [];
    let idx = 1;

    if (anchorText !== null) { fields.push(`anchor_text = ?${idx++}`); binds.push(anchorText); }
    if (summary !== undefined) { fields.push(`summary = ?${idx++}`); binds.push(summary); }
    if (title !== undefined) { fields.push(`title = ?${idx++}`); binds.push(title); }
    fields.push(`updated_at = datetime('now')`);

    if (fields.length === 1) {
      return new Response(JSON.stringify({ ok: false, error: 'No fields to update' }), { status: 400, headers: jsonHeaders });
    }

    binds.push(unitId);
    await ctx.env.DB.prepare(`UPDATE wv_source_units SET ${fields.join(', ')} WHERE id = ?${idx}`).bind(...binds).run();

    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), { status: 500, headers: jsonHeaders });
  }
};
