// ─── /core/auth routes — token issuance ───────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, unauthorized, badRequest } from '../../../shared/src/response';
import type { CoreEnv } from '../env';
import { UserRepo } from '../repositories/user.repo';
import { AuthRepo } from '../repositories/auth.repo';
import { verifyPassword } from '../password';
import { signJwt } from '../jwt';

// ── Routes ────────────────────────────────────────────────────────────────────

export function authRoutes(router: Router<CoreEnv>) {

  // POST /core/auth/login — email + password → JWT
  const login = async (req: Request, env: CoreEnv): Promise<Response> => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const email = typeof b['email'] === 'string' ? b['email'].trim() : '';
    const password = typeof b['password'] === 'string' ? b['password'] : '';
    if (!email || !password) return badRequest('email and password required');

    const user = await new UserRepo(env.DB_CORE).findByEmail(email);
    if (!user || user.status !== 'active') return unauthorized('Invalid credentials');

    const hash = await new AuthRepo(env.DB_CORE).findPasswordHash(user.id);
    if (!hash || !(await verifyPassword(password, hash))) {
      return unauthorized('Invalid credentials');
    }

    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(
      { sub: user.id, role: user.role, iat: now, exp: now + expiry },
      env.JWT_SECRET,
    );
    return ok({ token, expires_in: expiry, user });
  };

  router.post('/core/auth/login', login);
  router.post('/core/auth/token', login); // alias

  // POST /core/auth/verify — check token validity and return the auth context
  router.post('/core/auth/verify', async (req, env) => {
    const { requireAuth } = await import('../../../shared/src/auth');
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return ok(ctx);
  });
}
