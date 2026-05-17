// ─── /core/auth routes — token issuance ───────────────────────────────────────

import type { Router } from '../../../shared/src/router';
import { ok, created, unauthorized, forbidden, badRequest } from '../../../shared/src/response';
import { requireAuth } from '../../../shared/src/auth';
import type { CoreEnv } from '../env';
import { UserRepo } from '../repositories/user.repo';
import { AuthRepo } from '../repositories/auth.repo';
import { verifyPassword, hashPassword } from '../password';
import { issueSessionToken } from '../jwt';

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

    const userRepo = new UserRepo(env.DB_CORE);
    const user = await userRepo.findByEmail(email);
    if (!user || user.status !== 'active') return unauthorized('Invalid credentials');

    const hash = await new AuthRepo(env.DB_CORE).findPasswordHash(user.id);
    if (!hash || !(await verifyPassword(password, hash))) {
      return unauthorized('Invalid credentials');
    }

    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const mustChange = await userRepo.getMustChangePassword(user.id);
    const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry, {
      mustChangePassword: mustChange,
    });
    return ok({ token, expires_in, user, must_change_password: mustChange });
  };

  router.post('/core/auth/login', login);
  router.post('/core/auth/token', login); // alias

  // POST /core/auth/verify — check token validity and return the auth context
  router.post('/core/auth/verify', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;
    return ok(ctx);
  });

  // POST /core/auth/change-password — the signed-in user sets a new password.
  // Verifies the current password, clears any forced-change flag, and issues
  // a fresh token so the `mcp` claim is dropped immediately.
  router.post('/core/auth/change-password', async (req, env) => {
    const ctx = await requireAuth(req, env.JWT_SECRET);
    if (ctx instanceof Response) return ctx;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Request body must be valid JSON');
    }
    const b = (body ?? {}) as Record<string, unknown>;
    const current = typeof b['current_password'] === 'string' ? b['current_password'] : '';
    const next = typeof b['new_password'] === 'string' ? b['new_password'] : '';
    if (!current) return badRequest('current_password is required');
    if (next.length < 8) return badRequest('new_password must be at least 8 characters');
    if (next === current) return badRequest('New password must differ from the current one');

    const userRepo = new UserRepo(env.DB_CORE);
    const authRepo = new AuthRepo(env.DB_CORE);
    const user = await userRepo.findById(ctx.userId);
    if (!user) return unauthorized('Account not found');

    const hash = await authRepo.findPasswordHash(user.id);
    if (!hash || !(await verifyPassword(current, hash))) {
      return unauthorized('Current password is incorrect');
    }

    await authRepo.setPassword(user.id, await hashPassword(next));
    await userRepo.setMustChangePassword(user.id, false);

    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry);
    return ok({ token, expires_in });
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
    // Suspend the legacy admin@k-maps.local placeholder, if present, so the
    // known default credentials can no longer be used.
    await userRepo.retireLegacyAdmin();

    const expiry = parseInt(env.JWT_EXPIRY_SECONDS ?? '3600', 10);
    const { token, expires_in } = await issueSessionToken(user, env.JWT_SECRET, expiry);
    return created({ token, expires_in, user });
  });
}
