import { verifyPassword } from './_utils/crypto';
import { signToken } from './_utils/jwt';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

type LoginBody = {
  email: string;
  password: string;
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  // ---------- Parse body safely ----------
  let body: LoginBody;

  try {
    body = (await ctx.request.json()) as LoginBody;
  } catch {
    return Response.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { email, password } = body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return Response.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  // ---------- Fetch user ----------
  const user = await ctx.env.DB
    .prepare('SELECT id, password_hash FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: number; password_hash: string }>();

  if (!user) {
    return Response.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // ---------- Verify password ----------
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return Response.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }

  // ---------- Create 24h token ----------
  const expiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  ).toISOString();

  const token = await signToken(
    { sub: user.id, exp: expiresAt },
    ctx.env.JWT_SECRET
  );

  // ---------- Success ----------
  return Response.json({
    ok: true,
    token,
    expiresAt,
  });
};
