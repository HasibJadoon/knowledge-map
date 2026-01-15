import { verifyPassword } from './_utils/crypto';
import { signToken } from './_utils/jwt';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type LoginBody = { email: string; password: string };

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  try {
    if (!ctx.env.DB) {
      return Response.json({ error: 'Missing DB binding' }, { status: 500 });
    }
    if (!ctx.env.JWT_SECRET) {
      return Response.json({ error: 'Missing JWT_SECRET' }, { status: 500 });
    }

    // ---------- parse body ----------
    let body: LoginBody;
    try {
      body = (await ctx.request.json()) as LoginBody;
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // ---------- fetch user ----------
    const user = await ctx.env.DB
      .prepare(`
        SELECT id, password, role
        FROM users
        WHERE lower(trim(email)) = lower(trim(?1))
        LIMIT 1
      `)
      .bind(email)
      .first<{ id: number; password: string; role?: string }>();

    if (!user?.password) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // ---------- verify password ----------
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // ---------- JWT (STANDARD) ----------
    const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // seconds
    const expiresAt = new Date(exp * 1000).toISOString();

    const token = await signToken(
      {
        sub: user.id,
        role: user.role ?? 'user',
        exp,
      },
      ctx.env.JWT_SECRET
    );

    return Response.json({ ok: true, token, expiresAt });
  } catch (err: any) {
    return Response.json(
      { error: 'SERVER_ERROR', message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
};
