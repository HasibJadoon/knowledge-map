import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) {
    return Response.json({ ok: false, error: 'Missing DB' }, { status: 500 });
  }

  const res = await env.DB.prepare(`
    SELECT id, user_id, event_type, target_type, target_id, ref, note, event_json, created_at
    FROM user_activity_logs
    ORDER BY created_at DESC
    LIMIT 50
  `).all<{ id: number; user_id: number; event_type: string; target_type: string | null; target_id: string | null; ref: string | null; note: string | null; event_json: string | null; created_at: string }>();

  return Response.json({
    ok: true,
    logs: res.results ?? [],
  });
};
