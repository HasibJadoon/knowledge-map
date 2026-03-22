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
    const sourceId = url.searchParams.get('source_id') ?? '';
    const sourceUnitId = url.searchParams.get('source_unit_id') ?? '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 500);

    const conditions: string[] = [];
    const binds: (string | number)[] = [];
    let idx = 1;

    if (sourceId) {
      conditions.push(`source_id = ?${idx++}`);
      binds.push(sourceId);
    }

    if (sourceUnitId) {
      conditions.push(`source_unit_id = ?${idx++}`);
      binds.push(sourceUnitId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    binds.push(limit);

    const { results } = await ctx.env.DB.prepare(`
      SELECT
        id,
        source_id,
        source_unit_id,
        locator,
        anchor_text,
        selected_text,
        start_offset,
        end_offset,
        color,
        meta_json,
        created_at
      FROM wv_highlights
      ${where}
      ORDER BY created_at ASC
      LIMIT ?${idx}
    `).bind(...binds).all();

    return new Response(
      JSON.stringify({ ok: true, highlights: results ?? [] }),
      { headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
      { status: 500, headers: jsonHeaders }
    );
  }
};
