import { requireAuth } from '../../_utils/auth';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
};

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  try {
    const user = await requireAuth(ctx);
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const { results = [] } = await ctx.env.DB.prepare(
      `
      SELECT id, source_type, title, identifier, notes, meta_json
      FROM ar_sources
      WHERE source_type LIKE 'grammar%'
      ORDER BY title ASC
      `
    ).all();

    const sources = (results as any[]).map((row) => ({
      id: row.id,
      source_type: row.source_type,
      title: row.title,
      identifier: row.identifier,
      notes: row.notes,
      meta: row.meta_json ? JSON.parse(row.meta_json) : null,
    }));

    return new Response(JSON.stringify({ ok: true, results: sources }), {
      headers: jsonHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message ?? String(err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
