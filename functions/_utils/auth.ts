interface Env {
  DB: D1Database;
}

export type AuthedUser = {
  id: number;
  role: string;
};

export async function requireAuth(ctx: { request: Request; env: Env }) {
  const h = ctx.request.headers.get('authorization') || '';
  if (!h.startsWith('Bearer ')) return null;

  const token = h.slice(7).trim();
  if (!token) return null;

  const row = await ctx.env.DB
    .prepare(
      `SELECT id, role, token_expires_at
       FROM users
       WHERE token = ?`
    )
    .bind(token)
    .first<{ id: number; role: string; token_expires_at: string }>();

  if (!row) return null;

  const exp = Date.parse(row.token_expires_at);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;

  return { id: row.id, role: row.role } satisfies AuthedUser;
}
