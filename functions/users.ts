import { hashPassword } from './_utils/crypto';
import type { D1Database, PagesFunction } from '@cloudflare/workers-types';

interface Env {
  DB: D1Database;
}

const userRow = (row: any) => ({
  id: row.id,
  email: row.email,
  role: row.role,
  last_seen_at: row.last_seen_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.DB) {
    return Response.json({ ok: false, error: 'Missing D1' }, { status: 500 });
  }

  const res = await env.DB.prepare(`
    SELECT id, email, role, last_seen_at, created_at, updated_at
    FROM users
    ORDER BY id DESC
    LIMIT 200
  `).all<{ id: number; email: string; role: string; last_seen_at: string | null; created_at: string; updated_at: string | null }>();

  return Response.json({
    ok: true,
    users: res.results?.map(userRow) ?? [],
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.DB) {
    return Response.json({ ok: false, error: 'Missing D1' }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    role?: 'admin' | 'editor' | 'user';
  };
  const email = body?.email?.trim().toLowerCase() || '';
  const password = body?.password || '';
  const role = body?.role ?? 'user';

  if (!email || !password) {
    return Response.json({ ok: false, error: 'Email and password required' }, { status: 400 });
  }

  const hash = await hashPassword(password);
  const res = await env.DB
    .prepare(
      `
    INSERT INTO users (email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email, role, last_seen_at, created_at, updated_at
      `
    )
    .bind(email, hash, role)
    .run();

  const inserted = res?.results?.[0];
  if (!inserted) {
    return Response.json({ ok: false, error: 'Failed to create user' }, { status: 500 });
  }

  return Response.json({
    ok: true,
    user: userRow(inserted),
  });
};
