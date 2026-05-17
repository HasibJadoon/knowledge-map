// ─── /core/auth routes — token issuance ───────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, unauthorized, forbidden, badRequest } from '../../../shared/src/response';
import type { CoreEnv } from '../env';
import { UserRepo } from '../repositories/user.repo';
import { AuthRepo } from '../repositories/auth.repo';
import { verifyPassword, hashPassword } from '../password';
import { signJwt, issueSessionToken } from '../jwt';

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

  // ── First-run setup ───────────────────────────────────────────────────────
  // GET /core/auth/bootstrap — is the one-time admin setup still available?
  router.get('/core/auth/bootstrap', async (_req, env) => {
    const adminExists = await new UserRepo(env.DB_CORE).adminExists();
    return ok({ needs_setup: !adminExists });
  });

  // POST /core/auth/bootstrap — create the very first administrator.
  // Public so a fresh install can be set up, but self-disabling: it refuses
  // as soon as any admin account exists, so it never needs manual teardown.
  router.post('/core/auth/bootstrap', async (req, env) => {
    const userRepo = new UserRepo(env.DB_CORE);
    if (await userRepo.adminExists()) {
      return forbidden('Setup is already complete — an administrator exists.');
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const email = typeof b['email'] === 'string' ? b['email'].trim() : '';
    const displayName = typeof b['display_name'] === 'string' ? b['display_name'].trim() : '';
    const password = typeof b['password'] === 'string' ? b['password'] : '';
    if (!email || !email.includes('@')) return badRequest('A valid email is required');
    if (!displayName) return badRequest('display_name is required');
    if (password.length < 8) return badRequest('password must be at least 8 characters');
    if (await userRepo.findByEmail(email)) {
      return badRequest('An account with that email already exists');
    }

    const user = await userRepo.create({ email, display_name: displayName, role: 'admin' });
    await new AuthRepo(env.DB_CORE).setPassword(user.id, await hashPassword(password));

    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry);
    return created({ token, expires_in, user });
  });
}
