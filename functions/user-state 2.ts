import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) {
    return Response.json({ ok: false, error: 'Missing DB' }, { status: 500 });
  }

  const res = await env.DB.prepare(`
    SELECT user_id, current_type, current_id, current_unit_id, focus_mode, state_json, updated_at
    FROM user_state
    ORDER BY updated_at DESC
    LIMIT 200
  `).all<{ user_id: number; current_type: string | null; current_id: string | null; current_unit_id: string | null; focus_mode: string | null; state_json: string | null; updated_at: string }>();

  return Response.json({
    ok: true,
    states: res.results ?? [],
  });
};
